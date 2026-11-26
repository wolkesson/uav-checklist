import { FILE_KIND, SCHEMA_VERSION, migrate, type Checklist, type ChecklistFile } from './model'

export function toFile(checklists: Checklist[]): ChecklistFile {
  return { kind: FILE_KIND, schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), checklists }
}

export function parseFile(text: string): Checklist[] {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('File is not valid JSON')
  }
  const f = data as Partial<ChecklistFile>
  if (f?.kind !== FILE_KIND || typeof f.schemaVersion !== 'number' || !Array.isArray(f.checklists)) {
    throw new Error('Not a UAV checklist file')
  }
  return migrate({ schemaVersion: f.schemaVersion, checklists: f.checklists })
}

/** Triggers a download in the browser. No network involved. */
export function download(checklists: Checklist[], filename: string): void {
  const blob = new Blob([JSON.stringify(toFile(checklists), null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

export const safeFilename = (s: string) => (s.trim() || 'checklist').replace(/[^\w.-]+/g, '_') + '.json'
