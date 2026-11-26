<script lang="ts">
  import { app, removeChecklist, importChecklists } from '../store.svelte'
  import { download, parseFile, safeFilename } from '../io'

  let { onNew, onEdit, onRun }: { onNew: () => void; onEdit: (id: string) => void; onRun: (id: string) => void } = $props()
  let error = $state('')

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
          <strong>{c.title}</strong>
          <div class="muted small">{c.aircraft || '—'} · rev {c.revision} · {c.sections.reduce((n, s) => n + s.items.length, 0)} items</div>
        </div>
        <div class="actions">
          <button class="primary" onclick={() => onRun(c.id)}>Run</button>
          <button onclick={() => onEdit(c.id)}>Edit</button>
          <button onclick={() => download([c], safeFilename(c.title))}>Export</button>
          <button class="danger" onclick={() => confirm(`Delete "${c.title}"?`) && removeChecklist(c.id)}>Delete</button>
        </div>
      </li>
    {/each}
  </ul>
{/if}
