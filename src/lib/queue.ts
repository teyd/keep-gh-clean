export type Settled<T> = { item: T; ok: true } | { item: T; ok: false; error: unknown }

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
      let result: Settled<T>
      try {
        await fn(item)
        result = { item, ok: true }
      } catch (error) {
        result = { item, ok: false, error }
      }
      results.push(result)
      onSettled?.(result, results.length)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}
