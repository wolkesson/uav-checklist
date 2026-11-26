/**
 * Flows measured section boxes into columns and pages, the way Word flows
 * tables in a multi-column layout. Pure function: all sizes are in px.
 */
export interface MeasuredSection {
  /** Height of the title row. */
  title: number
  /** Height of each item row. */
  items: number[]
  /** 1 = item is an indented bullet that belongs to the item above it. */
  levels: number[]
  /** Top + bottom border thickness together. */
  border: number
  /** Never split this box unless it is taller than a whole column (e.g. emergency procedures). */
  keepTogether?: boolean
}

export interface Segment {
  section: number
  /** First and last+1 item index shown in this box. */
  from: number
  to: number
  showTitle: boolean
}

export type Page = Segment[][] // page -> columns -> segments

export interface LayoutOptions {
  columnHeight: number
  columns: number
  /** Vertical space between two boxes in the same column. */
  gap: number
  /** Sections with this many items or fewer are never split. */
  keepTogether?: number
}

const sum = (a: number[], from: number, to: number) => a.slice(from, to).reduce((x, y) => x + y, 0)

export function layout(sections: MeasuredSection[], o: LayoutOptions): Page[] {
  const keepTogether = o.keepTogether ?? 8
  const pages: Page[] = []
  let page: Segment[][] = []
  let col: Segment[] = []
  let used = 0

  const nextColumn = () => {
    page.push(col)
    col = []
    used = 0
    if (page.length === o.columns) {
      pages.push(page)
      page = []
    }
  }

  sections.forEach((s, si) => {
    const n = s.items.length
    let i = 0
    let first = true
    while (first || i < n) {
      const gap = used > 0 ? o.gap : 0
      const avail = o.columnHeight - used - gap
      const head = s.border + (first ? s.title : 0)

      if (head + sum(s.items, i, n) <= avail) {
        col.push({ section: si, from: i, to: n, showTitle: first })
        used += gap + head + sum(s.items, i, n)
        break
      }

      // Never leave a title or a continuation with fewer than 2 rows at the bottom of a column.
      const minNeed = head + sum(s.items, i, i + Math.min(2, n - i))
      const fitsInEmptyColumn = s.border + s.title + sum(s.items, 0, n) <= o.columnHeight
      const unsplittable = first && fitsInEmptyColumn && (n <= keepTogether || s.keepTogether)
      if (used > 0 && (unsplittable || minNeed > avail)) {
        nextColumn()
        continue
      }

      // Fit as many rows as possible; at least one so we always make progress.
      let k = i
      let h = head
      while (k < n && h + s.items[k] <= avail) h += s.items[k++]
      if (k === i) k = i + 1
      // Don't split inside a bullet group: move the break back to before its parent item.
      while (k > i + 1 && k < n && s.levels[k] === 1) k--

      col.push({ section: si, from: i, to: k, showTitle: first })
      i = k
      first = false
      nextColumn()
    }
  })
  if (col.length) page.push(col)
  if (page.length) pages.push(page)
  for (const p of pages) while (p.length < o.columns) p.push([])
  return pages.length ? pages : [Array.from({ length: o.columns }, () => [])]
}
