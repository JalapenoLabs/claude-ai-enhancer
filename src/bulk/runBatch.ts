export type BatchFailure<Item> = {
  item: Item
  error: unknown
}

/**
 * Runs `task` over every item with at most `concurrency` in flight. One failure never stops
 * the rest: every item ends up in exactly one of `succeeded` or `failed`, so callers can
 * report partial results and retry only what failed.
 */
export async function runBatch<Item>(
  items: readonly Item[],
  task: (item: Item) => Promise<unknown>,
  concurrency: number,
) {
  const succeeded: Item[] = []
  const failed: BatchFailure<Item>[] = []

  // Workers share one iterator, so each item is taken by exactly one worker.
  const queue = items.values()
  async function work() {
    for (const item of queue) {
      try {
        await task(item)
        succeeded.push(item)
      }
      catch (error) {
        failed.push({ item, error })
      }
    }
  }

  const workerCount = Math.min(concurrency, items.length)
  await Promise.all(Array.from({ length: workerCount }, work))

  return { succeeded, failed } as const
}
