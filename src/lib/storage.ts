import { SCHEMA_VERSION, migrate, type Checklist } from './model'

/**
 * All persistence goes through this interface so the backing store can change
 * (IndexedDB, filesystem in a desktop wrapper, sync server) without touching the UI.
 */
export interface ChecklistRepository {
  load(): Checklist[]
  save(checklists: Checklist[]): void
}

const KEY = 'uav-checklist:v1'

export class LocalStorageRepository implements ChecklistRepository {
  load(): Checklist[] {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return []
      const data = JSON.parse(raw)
      return migrate({ schemaVersion: data.schemaVersion ?? 1, checklists: data.checklists ?? [] })
    } catch (e) {
      console.error('Could not load saved checklists', e)
      return []
    }
  }

  save(checklists: Checklist[]): void {
    localStorage.setItem(KEY, JSON.stringify({ schemaVersion: SCHEMA_VERSION, checklists }))
  }
}
