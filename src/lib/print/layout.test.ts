import { describe, expect, it } from 'vitest'
import { layout, type MeasuredSection } from './layout'

const sec = (n: number, levels: number[] = []): MeasuredSection => ({
  title: 10,
  items: Array(n).fill(10),
  levels: Array.from({ length: n }, (_, i) => levels[i] ?? 0),
  border: 2,
})

describe('layout', () => {
  it('puts sections that fit in one column', () => {
    const pages = layout([sec(3), sec(3)], { columnHeight: 200, columns: 2, gap: 5 })
    expect(pages).toHaveLength(1)
    expect(pages[0][0].map((s) => s.section)).toEqual([0, 1])
    expect(pages[0][1]).toEqual([])
  })

  it('moves a small section to the next column instead of splitting it', () => {
    // column fits 100px: first section uses 52, second needs 52 + gap 5
    const pages = layout([sec(4), sec(4)], { columnHeight: 100, columns: 2, gap: 5 })
    expect(pages[0][0]).toEqual([{ section: 0, from: 0, to: 4, showTitle: true }])
    expect(pages[0][1]).toEqual([{ section: 1, from: 0, to: 4, showTitle: true }])
  })

  it('never splits an emergency box that fits in a column', () => {
    const emergency = { ...sec(12), keepTogether: true }
    const pages = layout([sec(3), emergency], { columnHeight: 150, columns: 2, gap: 5 })
    expect(pages[0][1]).toEqual([{ section: 1, from: 0, to: 12, showTitle: true }])
  })

  it('splits a long section across columns and pages, title only on the first part', () => {
    const pages = layout([sec(25)], { columnHeight: 100, columns: 2, gap: 5 })
    const segs = pages.flat(2)
    expect(segs[0]).toMatchObject({ from: 0, showTitle: true })
    expect(segs.slice(1).every((s) => !s.showTitle)).toBe(true)
    expect(segs.at(-1)!.to).toBe(25)
    // contiguous, nothing lost or duplicated
    segs.forEach((s, i) => i && expect(s.from).toBe(segs[i - 1].to))
    expect(pages.length).toBeGreaterThan(1)
  })

  it('keeps a bullet group with its parent item', () => {
    // 9 rows fit in the first column; rows 7..10 are parent + bullets
    const s = sec(12, [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0])
    const pages = layout([s], { columnHeight: 102, columns: 2, gap: 5 })
    expect(pages[0][0][0].to).toBe(7) // split before the parent (index 7), not inside the group
  })

  it('always returns at least one empty page', () => {
    expect(layout([], { columnHeight: 100, columns: 1, gap: 5 })).toEqual([[[]]])
  })
})
