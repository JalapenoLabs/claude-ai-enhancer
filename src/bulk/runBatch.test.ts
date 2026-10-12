// Core
import { describe, expect, it } from 'vitest'

// Misc
import { runBatch } from './runBatch'

describe('runBatch', () => {
  it('keeps going after failures and reports every item exactly once', async () => {
    const items = [1, 2, 3, 4, 5, 6, 7]
    const failure = new Error('odd')

    const { succeeded, failed } = await runBatch(items, async (item) => {
      if (item % 2) {
        throw failure
      }
    }, 3)

    expect(succeeded.toSorted()).toEqual([2, 4, 6])
    expect(failed.map((entry) => entry.item).toSorted()).toEqual([1, 3, 5, 7])
    expect(failed.every((entry) => entry.error === failure)).toBe(true)
  })

  it('never exceeds the concurrency limit', async () => {
    let inFlight = 0
    let peak = 0

    await runBatch(Array.from({ length: 10 }, (_, index) => index), async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight -= 1
    }, 4)

    expect(peak).toBe(4)
  })

  it('resolves immediately for an empty batch', async () => {
    const result = await runBatch([], async () => {}, 4)
    expect(result).toEqual({ succeeded: [], failed: [] })
  })
})
