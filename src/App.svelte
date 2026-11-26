<script lang="ts">
  import { app, addChecklist } from './lib/store.svelte'
  import ChecklistList from './lib/components/ChecklistList.svelte'
  import ChecklistEditor from './lib/components/ChecklistEditor.svelte'
  import ChecklistRunner from './lib/components/ChecklistRunner.svelte'

  type View = { name: 'list' } | { name: 'edit' | 'run'; id: string }
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
    <ChecklistEditor checklist={current} onDone={() => go({ name: 'list' })} onRun={() => go({ name: 'run', id: current.id })} />
  {:else if view.name === 'run' && current}
    <ChecklistRunner checklist={current} onDone={() => go({ name: 'list' })} />
  {:else}
    <ChecklistList
      onNew={() => go({ name: 'edit', id: addChecklist().id })}
      onEdit={(id) => go({ name: 'edit', id })}
      onRun={(id) => go({ name: 'run', id })}
    />
  {/if}
</main>
