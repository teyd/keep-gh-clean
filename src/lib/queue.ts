export type Settled<T> = { item: T; error: unknown | null }

/** Runs `fn` over `items` with at most `concurrency` in flight, never rejecting. */
export async function runQueue<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<unknown>,
  onSettled?: (result: Settled<T>, done: number) => void,
): Promise<Settled<T>[]> {
  const results: Settled<T>[] = []
  let next = 0

  async function worker() {
    while (next < items.length) {
      const item = items[next++]
      let error: unknown | null = null
      try {
        await fn(item)
      } catch (err) {
        error = err
      }
      const result = { item, error }
      results.push(result)
      onSettled?.(result, results.length)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}
