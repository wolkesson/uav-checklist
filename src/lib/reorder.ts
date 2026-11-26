/** A run of rows [start, end) that moves as one block. */
export type Unit = [start: number, end: number]

/** Each row is its own unit. */
export const singleUnits = (n: number): Unit[] => Array.from({ length: n }, (_, i) => [i, i + 1] as Unit)

/**
 * Groups rows into units: a top-level row together with the bullet rows (flag 1) that follow it.
 * A bullet with no row above it forms a unit of its own.
 */
export function itemUnits(bullets: number[]): Unit[] {
  const units: Unit[] = []
  bullets.forEach((b, i) => {
    if (b === 1 && units.length) units[units.length - 1][1] = i + 1
    else units.push([i, i + 1])
  })
  return units
}

/** Index of the unit that contains row i. */
export const unitOf = (units: Unit[], i: number) => units.findIndex(([s, e]) => i >= s && i < e)

/**
 * Moves rows [start, end) of `src` into `dst` before index `at` (an index in `dst` as it is
 * before the move). `src` and `dst` may be the same array. Returns false for a no-op.
 */
export function moveBlock<T>(src: T[], [start, end]: Unit, dst: T[], at: number): boolean {
  if (start < 0 || end > src.length || start >= end || at < 0 || at > dst.length) return false
  if (src === dst && at >= start && at <= end) return false // dropped onto itself
  const block = src.splice(start, end - start)
  if (src === dst && at > start) at -= block.length
  dst.splice(at, 0, ...block)
  return true
}

/** Index of the value in `positions` closest to `y`. */
export function nearestIndex(y: number, positions: number[]): number {
  let best = 0
  positions.forEach((p, i) => { if (Math.abs(p - y) < Math.abs(positions[best] - y)) best = i })
  return best
}
