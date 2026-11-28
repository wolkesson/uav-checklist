import { describe, expect, it } from 'vitest'
import { parseFile, toFile } from './io'
import { isStep, newChecklist, SCHEMA_VERSION, type ChecklistItem, type SectionStyle } from './model'
import sample from '../../samples/quadcopter-basic.json'

describe('import/export', () => {
  it('round-trips a checklist', () => {
    const c = newChecklist('Test')
    expect(parseFile(JSON.stringify(toFile([c])))).toEqual([c])
  })
  it('accepts the bundled sample', () => {
    expect(parseFile(JSON.stringify(sample)).length).toBeGreaterThan(0)
  })
  it('rejects non-checklist JSON', () => {
    expect(() => parseFile('{"foo":1}')).toThrow('Not a UAV checklist file')
  })
  it('rejects files from a newer schema', () => {
    const f = { ...toFile([]), schemaVersion: SCHEMA_VERSION + 1 }
    expect(() => parseFile(JSON.stringify(f))).toThrow(/newer app version/)
  })
})

describe('schema migration', () => {
  it('loads schema v1 files (before print fields existed)', () => {
    const v1 = { kind: 'uav-checklist', schemaVersion: 1, exportedAt: '', checklists: [
      { id: 'a', title: 'Old', revision: 1, updatedAt: '', sections: [{ id: 's', title: 'S', items: [{ id: 'i', kind: 'check', text: 'X' }] }] },
    ] }
    expect(parseFile(JSON.stringify(v1))[0].title).toBe('Old')
  })
})

describe('schema v2 -> v3 (item type)', () => {
  const v2 = (items: object[]) => JSON.stringify({ kind: 'uav-checklist', schemaVersion: 2, exportedAt: '', checklists: [
    { id: 'a', title: 'T', revision: 1, updatedAt: '', sections: [{ id: 's', title: 'S', items }] },
  ] })
  it('turns level/critical/highlight into one type', () => {
    const [c] = parseFile(v2([
      { id: '1', kind: 'check', text: 'normal' },
      { id: '2', kind: 'check', text: 'bullet', level: 1 },
      { id: '3', kind: 'check', text: 'critical', critical: true },
      { id: '4', kind: 'check', text: 'abort', highlight: 'abort' },
    ]))
    expect(c.sections[0].items.map((i) => i.type)).toEqual([undefined, 'bullet', 'critical', 'abort'])
    expect(c.sections[0].items[1]).not.toHaveProperty('level')
  })
  it('keeps one type when old data had several: abort, then critical, then bullet', () => {
    const [c] = parseFile(v2([
      { id: '1', kind: 'check', text: 'x', level: 1, critical: true, highlight: 'abort' },
      { id: '2', kind: 'check', text: 'y', level: 1, critical: true },
    ]))
    expect(c.sections[0].items.map((i) => i.type)).toEqual(['abort', 'critical'])
  })
})

describe('schema v4 -> v5 (green and notes sections, caution rows)', () => {
  it('loads v4 files unchanged', () => {
    const v4 = { kind: 'uav-checklist', schemaVersion: 4, exportedAt: '', checklists: [
      { id: 'a', title: 'T', revision: 2, revisionDate: '2025-01-01', status: 'released', updatedAt: '', sections: [
        { id: 's', title: 'S', style: 'info', items: [{ id: '1', kind: 'check', text: 'x', type: 'abort' }] },
      ] },
    ] }
    const [c] = parseFile(JSON.stringify(v4))
    expect(c.sections[0].style).toBe('info')
    expect(c.sections[0].items[0].type).toBe('abort')
    expect(c.status).toBe('released')
  })
})

describe('isStep', () => {
  it('gives tick boxes to steps only: not caution or abort rows, nothing in notes sections', () => {
    const s = (style?: SectionStyle) => ({ id: 's', title: 'S', style, items: [] })
    const i = (type?: ChecklistItem['type']) => ({ id: 'i', kind: 'check' as const, text: 'x', type })
    expect([undefined, 'bullet', 'critical', 'caution', 'abort'].map((t) => isStep(s('green'), i(t as ChecklistItem['type']))))
      .toEqual([true, true, true, false, false])
    expect(isStep(s('notes'), i())).toBe(false)
  })
})
