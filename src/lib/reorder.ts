/** Moves arr[from] to position `to` (in place). Out-of-range or no-op moves are ignored. */
export function moveItem<T>(arr: T[], from: number, to: number): boolean {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return false
  const [x] = arr.splice(from, 1)
  arr.splice(to, 0, x)
  return true
}

/**
 * Where a dragged row would land. `center` is the dragged row's vertical centre,
 * `mids` the vertical centres of all rows before the drag started (same coordinates).
 * The row passes another row once its centre crosses that row's centre.
 */
export function targetIndex(center: number, mids: number[], from: number): number {
  for (let i = 0; i < from; i++) if (center < mids[i]) return i
  for (let i = mids.length - 1; i > from; i--) if (center > mids[i]) return i
  return from
}

/** How far row `i` must shift (in px) to open a gap at `to` while row `from` is dragged. */
export function shiftFor(i: number, from: number, to: number, step: number): number {
  if (from < i && i <= to) return -step
  if (to <= i && i < from) return step
  return 0
}

/** A run of rows [start, end) that moves as one block. */
export type Unit = [start: number, end: number]

/** Each row is its own unit. */
export const singleUnits = (n: number): Unit[] => Array.from({ length: n }, (_, i) => [i, i + 1] as Unit)

/**
 * Groups items into units: a top-level item together with the bullets (level 1) that follow it.
 * A bullet with no item above it forms a unit of its own.
 */
export function itemUnits(levels: number[]): Unit[] {
  const units: Unit[] = []
  levels.forEach((level, i) => {
    if (level === 1 && units.length) units[units.length - 1][1] = i + 1
    else units.push([i, i + 1])
  })
  return units
}

/** Index of the unit that contains row i. */
export const unitOf = (units: Unit[], i: number) => units.findIndex(([s, e]) => i >= s && i < e)

/**
 * Moves unit `from` to the position of unit `to` (in place), keeping each unit's rows together.
 * Moving down places the block after unit `to`; moving up places it before.
 */
export function moveUnit<T>(arr: T[], units: Unit[], from: number, to: number): boolean {
  if (from === to || from < 0 || to < 0 || from >= units.length || to >= units.length) return false
  const [s, e] = units[from]
  const block = arr.splice(s, e - s)
  const insertAt = to > from ? units[to][1] - block.length : units[to][0]
  arr.splice(insertAt, 0, ...block)
  return true
}
