import { describe, expect, it } from 'vitest'
import { moveItem, shiftFor, targetIndex } from './reorder'

describe('moveItem', () => {
  it('moves down and up', () => {
    const a = ['a', 'b', 'c', 'd']
    moveItem(a, 0, 2)
    expect(a).toEqual(['b', 'c', 'a', 'd'])
    moveItem(a, 3, 0)
    expect(a).toEqual(['d', 'b', 'c', 'a'])
  })
  it('ignores out-of-range and no-op moves', () => {
    const a = [1, 2, 3]
    expect(moveItem(a, 0, -1)).toBe(false)
    expect(moveItem(a, 2, 3)).toBe(false)
    expect(moveItem(a, 1, 1)).toBe(false)
    expect(a).toEqual([1, 2, 3])
  })
})

describe('targetIndex', () => {
  const mids = [10, 30, 50, 70] // rows 20px tall
  it('stays put until the centre crosses a neighbour', () => {
    expect(targetIndex(29, mids, 0)).toBe(0)
    expect(targetIndex(31, mids, 0)).toBe(1)
  })
  it('finds positions further down and up', () => {
    expect(targetIndex(71, mids, 0)).toBe(3)
    expect(targetIndex(9, mids, 3)).toBe(0)
    expect(targetIndex(45, mids, 3)).toBe(2)
  })
})

describe('shiftFor', () => {
  it('opens a gap below when dragging down', () => {
    // row 0 dragged to 2: rows 1 and 2 move up one step, row 3 stays
    expect([1, 2, 3].map((i) => shiftFor(i, 0, 2, 20))).toEqual([-20, -20, 0])
  })
  it('opens a gap above when dragging up', () => {
    expect([0, 1, 2].map((i) => shiftFor(i, 3, 1, 20))).toEqual([0, 20, 20])
  })
})
