/**
 * Checklist data model. This is the contract for storage and for import/export
 * files, so changes must bump SCHEMA_VERSION and add a migration in migrate().
 */
export const SCHEMA_VERSION = 1
export const FILE_KIND = 'uav-checklist'

export type ItemKind = 'check' | 'note' | 'value'

export interface ChecklistItem {
  id: string
  kind: ItemKind
  /** What to check, e.g. "Propellers secure". */
  text: string
  /** Expected answer, e.g. "CHECKED" or "> 80 %". */
  expected?: string
  /** Marks items that must never be skipped. */
  critical?: boolean
}

export interface ChecklistSection {
  id: string
  /** Phase name, e.g. "Pre-flight", "Before takeoff", "Post-flight". */
  title: string
  items: ChecklistItem[]
}

export interface Checklist {
  id: string
  title: string
  /** Aircraft / platform the list applies to. */
  aircraft?: string
  description?: string
  revision: number
  updatedAt: string
  sections: ChecklistSection[]
}

/** Envelope used for exported files. */
export interface ChecklistFile {
  kind: typeof FILE_KIND
  schemaVersion: number
  exportedAt: string
  checklists: Checklist[]
}

export const newId = (): string =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)

export const newItem = (text = ''): ChecklistItem => ({ id: newId(), kind: 'check', text, expected: '' })

export const newSection = (title = 'New section'): ChecklistSection => ({ id: newId(), title, items: [newItem()] })

export const newChecklist = (title = 'New checklist'): Checklist => ({
  id: newId(),
  title,
  aircraft: '',
  description: '',
  revision: 1,
  updatedAt: new Date().toISOString(),
  sections: [newSection('Pre-flight')],
})

/** Throws a readable error if `value` is not a valid checklist. */
export function assertChecklist(value: unknown): asserts value is Checklist {
  const c = value as Checklist
  if (!c || typeof c !== 'object') throw new Error('Checklist is not an object')
  if (typeof c.id !== 'string' || typeof c.title !== 'string') throw new Error('Checklist needs id and title')
  if (!Array.isArray(c.sections)) throw new Error(`Checklist "${c.title}" has no sections`)
  for (const s of c.sections) {
    if (typeof s.title !== 'string' || !Array.isArray(s.items)) throw new Error(`Bad section in "${c.title}"`)
    for (const i of s.items) {
      if (typeof i.id !== 'string' || typeof i.text !== 'string') throw new Error(`Bad item in "${c.title}"`)
    }
  }
}

/** Upgrades data from older schema versions. Add a step per version bump. */
export function migrate(data: { schemaVersion: number; checklists: unknown[] }): Checklist[] {
  if (data.schemaVersion > SCHEMA_VERSION) {
    throw new Error(`File is from a newer app version (schema ${data.schemaVersion}). Update the app.`)
  }
  // v1 is the first version; future: if (data.schemaVersion < 2) { ... }
  data.checklists.forEach(assertChecklist)
  return data.checklists as Checklist[]
}
