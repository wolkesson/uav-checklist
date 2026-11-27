<script lang="ts">
  import { Play, SquarePen, Printer, Share, Trash2 } from '@lucide/svelte'
  import { app, removeChecklist, importChecklists } from '../store.svelte'
  import { download, parseFile, safeFilename } from '../io'
  import type { Checklist } from '../model'
  import { plainText } from '../markup'
  import Markup from './Markup.svelte'
  import IconButton from './IconButton.svelte'
  import ConfirmDialog from './ConfirmDialog.svelte'

  let { onNew, onEdit, onRun, onPrint }:
    { onNew: () => void; onEdit: (id: string) => void; onRun: (id: string) => void; onPrint: (id: string) => void } = $props()
  let error = $state('')
  let toDelete = $state<Checklist | null>(null)
  let confirmOpen = $state(false)

  async function onImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    error = ''
    try {
      for (const f of input.files ?? []) importChecklists(parseFile(await f.text()))
    } catch (err) {
      error = (err as Error).message
    }
    input.value = ''
  }

  function askDelete(c: Checklist) {
    toDelete = c
    confirmOpen = true
  }
</script>

<div class="toolbar">
  <button class="primary" onclick={onNew}>New checklist</button>
  <label class="button">Import…<input type="file" accept=".json,application/json" multiple hidden onchange={onImport} /></label>
  <button onclick={() => download(app.checklists, 'uav-checklists-backup.json')} disabled={!app.checklists.length}>Export all</button>
</div>
{#if error}<p class="error" role="alert">{error}</p>{/if}

{#if app.checklists.length === 0}
  <p class="muted">No checklists yet. Create one or import a file.</p>
{:else}
  <ul class="cards">
    {#each app.checklists as c (c.id)}
      <li class="card">
        <div>
          <strong><Markup text={c.title} /></strong>
          <div class="muted small">{c.aircraft || '—'} · v{c.revision}{#if c.status !== 'released'} · <span class="draft-tag">Draft</span>{/if} · {c.sections.reduce((n, s) => n + s.items.length, 0)} items</div>
        </div>
        <div class="actions">
          <IconButton icon={Play} label="Run checklist" variant="primary" onclick={() => onRun(c.id)} />
          <IconButton icon={SquarePen} label="Edit checklist" onclick={() => onEdit(c.id)} />
          <IconButton icon={Printer} label="Print or export PDF / Word" onclick={() => onPrint(c.id)} />
          <IconButton icon={Share} label="Export checklist file" onclick={() => download([c], safeFilename(c.title))} />
          <IconButton icon={Trash2} label="Delete checklist" variant="danger" tipAlign="end" onclick={() => askDelete(c)} />
        </div>
      </li>
    {/each}
  </ul>
{/if}

<ConfirmDialog
  bind:open={confirmOpen}
  title={`Delete “${toDelete ? plainText(toDelete.title) : ''}”?`}
  message="The checklist is removed from this device and cannot be restored. Export it first if you may need it again."
  confirmLabel="Delete checklist"
  onconfirm={() => toDelete && removeChecklist(toDelete.id)}
/>

<style>
  .draft-tag { color: var(--draft-fg); font-weight: 700; }
</style>
