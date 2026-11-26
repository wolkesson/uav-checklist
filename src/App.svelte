<script lang="ts">
  import { app, addChecklist } from './lib/store.svelte'
  import ChecklistList from './lib/components/ChecklistList.svelte'
  import ChecklistEditor from './lib/components/ChecklistEditor.svelte'
  import ChecklistRunner from './lib/components/ChecklistRunner.svelte'
  import PrintView from './lib/print/PrintView.svelte'

  type View = { name: 'list' } | { name: 'edit' | 'run' | 'print'; id: string }
  let view = $state<View>({ name: 'list' })

  const current = $derived.by(() => {
    const v = view
    return v.name === 'list' ? undefined : app.checklists.find((c) => c.id === v.id)
  })
  const go = (v: View) => (view = v)
</script>

<header>
  <button class="link brand" onclick={() => go({ name: 'list' })}>UAV Checklist</button>
</header>

<main>
  {#if view.name === 'edit' && current}
    <ChecklistEditor checklist={current} onDone={() => go({ name: 'list' })} onRun={() => go({ name: 'run', id: current.id })} onPrint={() => go({ name: 'print', id: current.id })} />
  {:else if view.name === 'print' && current}
    <PrintView checklist={current} onDone={() => go({ name: 'list' })} />
  {:else if view.name === 'run' && current}
    <ChecklistRunner checklist={current} onDone={() => go({ name: 'list' })} />
  {:else}
    <ChecklistList
      onNew={() => go({ name: 'edit', id: addChecklist().id })}
      onEdit={(id) => go({ name: 'edit', id })}
      onRun={(id) => go({ name: 'run', id })}
      onPrint={(id) => go({ name: 'print', id })}
    />
  {/if}
</main>
