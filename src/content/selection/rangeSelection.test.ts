// Core
import { describe, expect, it } from 'vitest'

// Misc
import { getShiftClickRange } from './rangeSelection'

const items = ['/chat/a', '/chat/b', '/chat/c', '/chat/d', '/chat/e'].map((pathname) => ({ pathname }))

function pathnames(range: { pathname: string }[] | undefined) {
  return range?.map((item) => item.pathname)
}

describe('getShiftClickRange', () => {
  it('selects from the anchor down to the clicked item, inclusive', () => {
    expect(pathnames(getShiftClickRange(items, '/chat/b', 3))).toEqual(['/chat/b', '/chat/c', '/chat/d'])
  })

  it('selects upward when the click is above the anchor', () => {
    expect(pathnames(getShiftClickRange(items, '/chat/d', 0))).toEqual(['/chat/a', '/chat/b', '/chat/c', '/chat/d'])
  })

  it('uses the anchor occurrence nearest the click when a conversation appears twice', () => {
    // Pinned "a" at the top and again in the recent list at index 3.
    const withDuplicate = [...items.slice(0, 3), { pathname: '/chat/a' }, ...items.slice(3)]
    expect(pathnames(getShiftClickRange(withDuplicate, '/chat/a', 5))).toEqual(['/chat/a', '/chat/d', '/chat/e'])
  })

  it('returns undefined when there is no anchor or it is not on the page', () => {
    expect(getShiftClickRange(items, undefined, 2)).toBeUndefined()
    expect(getShiftClickRange(items, '/chat/gone', 2)).toBeUndefined()
  })
})
