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
