import { describe, expect, it } from 'vitest'
import { parseFile, toFile } from './io'
import { newChecklist, SCHEMA_VERSION } from './model'
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
