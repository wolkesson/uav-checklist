import { describe, expect, it } from 'vitest'
import { draftEdited, isDraft, release, revisionText, setRevision, startNewDraft } from './revision'
import { newChecklist, type Checklist } from './model'
import { parseFile, toFile } from './io'

const released = (): Checklist => ({ ...newChecklist('T'), revision: 4, revisionDate: '2026-01-10', status: 'released' })

describe('revision handling', () => {
  it('new checklists start as a draft', () => {
    expect(isDraft(newChecklist())).toBe(true)
  })
  it('a new draft bumps the revision and sets the date', () => {
    const c = released()
    startNewDraft(c, '2026-11-27')
    expect([c.revision, c.status, c.revisionDate]).toEqual([5, 'draft', '2026-11-27'])
  })
  it("a draft's date follows its edits; a released date does not change", () => {
    const d = released()
    startNewDraft(d, '2026-11-01')
    draftEdited(d, '2026-11-27')
    expect(d.revisionDate).toBe('2026-11-27')
    const r = released()
    draftEdited(r, '2026-11-27')
    expect(r.revisionDate).toBe('2026-01-10')
  })
  it('release locks and fixes the date', () => {
    const c = released()
    startNewDraft(c, '2026-11-01')
    release(c, '2026-11-27')
    expect([c.status, c.revisionDate, c.revision]).toEqual(['released', '2026-11-27', 5])
  })
  it('a date set by hand is pinned: edits and release keep it; a new draft unpins', () => {
    const c = released()
    startNewDraft(c, '2026-11-01')
    setRevision(c, 12, '2026-11-20')
    draftEdited(c, '2026-11-27')
    release(c, '2026-11-28')
    expect([c.revision, c.revisionDate]).toEqual([12, '2026-11-20'])
    startNewDraft(c, '2026-12-01')
    draftEdited(c, '2026-12-02')
    expect([c.revision, c.revisionDate, c.revisionDatePinned]).toEqual([13, '2026-12-02', undefined])
  })
  it('formats the header text', () => {
    expect(revisionText(released())).toBe('2026-01-10, v4')
  })
  it('migrates older files: existing checklists become released', () => {
    const file = { ...toFile([newChecklist('Old')]), schemaVersion: 3 }
    delete (file.checklists[0] as Partial<Checklist>).status
    expect(parseFile(JSON.stringify(file))[0].status).toBe('released')
  })
  it('migration gives a released checklist without a date its last-changed date', () => {
    const c = { ...newChecklist('Old'), updatedAt: '2026-03-04T10:00:00.000Z' } as Partial<Checklist>
    delete c.status
    delete c.revisionDate
    const file = { ...toFile([c as Checklist]), schemaVersion: 3 }
    expect(parseFile(JSON.stringify(file))[0].revisionDate).toBe('2026-03-04')
  })
})
