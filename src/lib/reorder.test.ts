import { describe, expect, it } from 'vitest'
import { itemUnits, moveBlock, nearestIndex, singleUnits, unitOf } from './reorder'

describe('units (items with their bullets)', () => {
  // A, a1, a2 (bullets of A), B, C, c1
  const bullets = [0, 1, 1, 0, 0, 1]
  it('groups each item with the bullets below it', () => {
    expect(itemUnits(bullets)).toEqual([[0, 3], [3, 4], [4, 6]])
    expect(itemUnits([1, 0, 1])).toEqual([[0, 1], [1, 3]]) // a leading bullet stands alone
    expect(singleUnits(2)).toEqual([[0, 1], [1, 2]])
  })
  it('finds the unit of a row', () => {
    const u = itemUnits(bullets)
    expect([0, 2, 3, 5].map((i) => unitOf(u, i))).toEqual([0, 0, 1, 2])
  })
})

describe('moveBlock', () => {
  const list = () => ['A', 'a1', 'a2', 'B', 'C', 'c1']
  it('moves a group down within a list', () => {
    const a = list()
    expect(moveBlock(a, [0, 3], a, 4)).toBe(true) // before C
    expect(a).toEqual(['B', 'A', 'a1', 'a2', 'C', 'c1'])
  })
  it('moves a group to the end and to the top', () => {
    const a = list()
    moveBlock(a, [0, 3], a, 6)
    expect(a).toEqual(['B', 'C', 'c1', 'A', 'a1', 'a2'])
    const b = list()
    moveBlock(b, [4, 6], b, 0)
    expect(b).toEqual(['C', 'c1', 'A', 'a1', 'a2', 'B'])
  })
  it('ignores drops onto the block itself', () => {
    const a = list()
    expect(moveBlock(a, [0, 3], a, 0)).toBe(false)
    expect(moveBlock(a, [0, 3], a, 3)).toBe(false)
    expect(a).toEqual(list())
  })
  it('moves a block to another list', () => {
    const a = list()
    const b = ['X', 'Y']
    expect(moveBlock(a, [0, 3], b, 1)).toBe(true)
    expect(a).toEqual(['B', 'C', 'c1'])
    expect(b).toEqual(['X', 'A', 'a1', 'a2', 'Y'])
  })
  it('moves into an empty list', () => {
    const a = ['A', 'B']
    const b: string[] = []
    moveBlock(a, [1, 2], b, 0)
    expect([a, b]).toEqual([['A'], ['B']])
  })
  it('rejects out-of-range moves', () => {
    const a = ['A']
    expect(moveBlock(a, [0, 1], [], 2)).toBe(false)
    expect(moveBlock(a, [0, 2], [], 0)).toBe(false)
  })
})

describe('nearestIndex', () => {
  it('picks the closest position', () => {
    expect(nearestIndex(12, [0, 10, 30])).toBe(1)
    expect(nearestIndex(-5, [0, 10, 30])).toBe(0)
    expect(nearestIndex(100, [0, 10, 30])).toBe(2)
  })
})
