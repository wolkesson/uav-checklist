import { newChecklist, type Checklist } from './model'
import { LocalStorageRepository, type ChecklistRepository } from './storage'
import sample from '../../samples/quadcopter-basic.json'
import { parseFile } from './io'

const repo: ChecklistRepository = new LocalStorageRepository()

function initial(): Checklist[] {
  const saved = repo.load()
  return saved.length ? saved : parseFile(JSON.stringify(sample))
}

export const app = $state({ checklists: initial() })

$effect.root(() => {
  $effect(() => repo.save($state.snapshot(app.checklists)))
})

export function addChecklist(): Checklist {
  const c = newChecklist()
  app.checklists.push(c)
  return app.checklists[app.checklists.length - 1]
}

export function removeChecklist(id: string) {
  app.checklists = app.checklists.filter((c) => c.id !== id)
}

export function importChecklists(list: Checklist[]) {
  for (const c of list) {
    const i = app.checklists.findIndex((x) => x.id === c.id)
    if (i >= 0) app.checklists[i] = c
    else app.checklists.push(c)
  }
}

export function touch(c: Checklist) {
  c.updatedAt = new Date().toISOString()
}
