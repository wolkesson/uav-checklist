/**
 * Revision handling: a checklist is either a draft (editable) or released (locked).
 *  - New draft: next revision number, status draft, date today.
 *  - While a draft is edited, its date follows the edits (today).
 *  - Release: status released, date fixed to the release day.
 * Version and date can also be corrected by hand on a draft (editor ⋯ menu); a date set by
 * hand is pinned: it no longer follows edits and is kept on release.
 */
import type { Checklist } from './model'

export const today = () => new Date().toISOString().slice(0, 10)

export const isDraft = (c: Checklist) => c.status !== 'released'

export function startNewDraft(c: Checklist, date = today()) {
  c.revision = (c.revision || 0) + 1
  c.status = 'draft'
  c.revisionDate = date
  c.revisionDatePinned = undefined
}

export function release(c: Checklist, date = today()) {
  c.status = 'released'
  if (!c.revisionDatePinned) c.revisionDate = date
}

/** Called on every edit: a draft's date follows its latest change. */
export function draftEdited(c: Checklist, date = today()) {
  if (isDraft(c) && !c.revisionDatePinned) c.revisionDate = date
}

/** Corrects version and date by hand (drafts only); the date is then pinned. */
export function setRevision(c: Checklist, revision: number, date: string) {
  c.revision = revision
  c.revisionDate = date
  c.revisionDatePinned = true
}

/** Text for the printed header, e.g. "2026-11-27, v5". */
export const revisionText = (c: Checklist) => [c.revisionDate, `v${c.revision}`].filter(Boolean).join(', ')
