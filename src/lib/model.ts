/**
 * Checklist data model. This is the contract for storage and for import/export
 * files, so changes must bump SCHEMA_VERSION and add a migration in migrate().
 */
export const SCHEMA_VERSION = 3
export const FILE_KIND = 'uav-checklist'

export type ItemKind = 'check' | 'note' | 'value'

export interface ChecklistItem {
  id: string
  kind: ItemKind
  /** What to check, e.g. "Propellers secure". */
  text: string
  /** Expected answer, e.g. "CHECKED" or "> 80 %". */
  expected?: string
  /**
   * What kind of row this is; an item is exactly one of these. Absent = normal.
   * - bullet: indented under the item above (moves with it)
   * - critical: must never be skipped
   * - abort: highlighted row, e.g. "ON ABORT ... LAND"
   */
  type?: 'bullet' | 'critical' | 'abort'
}

export type ItemType = NonNullable<ChecklistItem['type']> | 'normal'
export const ITEM_TYPES: { value: ItemType; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'bullet', label: 'Bullet' },
  { value: 'critical', label: 'Critical' },
  { value: 'abort', label: 'Abort' },
]
export const itemType = (i: ChecklistItem): ItemType => i.type ?? 'normal'
export const isBullet = (i: ChecklistItem) => i.type === 'bullet'

/** Box style used when printing: black, blue (info / first flight) or red (emergency). */
export type SectionStyle = 'normal' | 'info' | 'emergency'
export const SECTION_STYLES: { value: SectionStyle; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'info', label: 'Info (blue)' },
  { value: 'emergency', label: 'Emergency (red)' },
]

export type PaperSize = 'A5' | 'A4' | 'Letter'
export const PAPER_SIZES: Record<PaperSize, { width: number; height: number }> = {
  A5: { width: 148, height: 210 },
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
}

export interface PrintSettings {
  paper: PaperSize
  columns: 1 | 2
}
export const DEFAULT_PRINT: PrintSettings = { paper: 'A5', columns: 2 }

export interface ChecklistSection {
  id: string
  /** Phase name, e.g. "Pre-flight", "Before takeoff", "Post-flight". */
  title: string
  style?: SectionStyle
  items: ChecklistItem[]
}

export interface Checklist {
  id: string
  title: string
  /** Aircraft / platform the list applies to. */
  aircraft?: string
  description?: string
  revision: number
  /** Date shown next to the revision in the printed header, YYYY-MM-DD. */
  revisionDate?: string
  /** Footer text on every printed page, e.g. aircraft and app versions it applies to. */
  effectivity?: string
  /** Company logo for the printed header, as a PNG data URL. Travels with exported files. */
  logo?: string
  print?: PrintSettings
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
  revisionDate: new Date().toISOString().slice(0, 10),
  effectivity: '',
  print: { ...DEFAULT_PRINT },
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
  // v1 -> v2 only added optional fields (style, level, critical, highlight, revisionDate,
  // effectivity, logo, print), so v1 data is already valid v2 data.
  if (data.schemaVersion < 3) data.checklists.forEach(itemFlagsToType)
  data.checklists.forEach(assertChecklist)
  return data.checklists as Checklist[]
}

/**
 * v2 -> v3: the separate flags `level`, `critical` and `highlight` become one `type`.
 * An item can only be one kind; if old data had several, abort wins, then critical, then bullet.
 */
function itemFlagsToType(checklist: unknown) {
  for (const section of (checklist as { sections?: { items?: Record<string, unknown>[] }[] }).sections ?? []) {
    for (const item of section.items ?? []) {
      const type = item.highlight === 'abort' ? 'abort' : item.critical ? 'critical' : item.level === 1 ? 'bullet' : undefined
      delete item.highlight
      delete item.critical
      delete item.level
      if (type) item.type = type
    }
  }
}
