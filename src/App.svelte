<script lang="ts">
  import { app, addChecklist } from './lib/store.svelte'
  import ChecklistList from './lib/components/ChecklistList.svelte'
  import ChecklistEditor from './lib/components/ChecklistEditor.svelte'
  import ChecklistRunner from './lib/components/ChecklistRunner.svelte'
  import PrintView from './lib/print/PrintView.svelte'
  import { formatHash, parseHash, type View } from './lib/route'

  // Opening a checklist view from the list pushes one history entry; moving between
  // edit/run/print replaces it. So browser Back always returns to the list.
  const url = (v: View) => location.pathname + location.search + formatHash(v)
  const start = parseHash(location.hash)
  // A view opened directly (bookmark/reload without our state) gets a list entry under it.
  if (start.name !== 'list' && !history.state?.fromList) {
    history.replaceState(null, '', url({ name: 'list' }))
    history.pushState({ fromList: true }, '', url(start))
  }
  let view = $state<View>(start)
  window.addEventListener('popstate', () => (view = parseHash(location.hash)))

  const current = $derived.by(() => {
    const v = view
    return v.name === 'list' ? undefined : app.checklists.find((c) => c.id === v.id)
  })
  function go(v: View) {
    if (v.name === 'list') {
      if (view.name !== 'list' && history.state?.fromList) history.back()
      else history.replaceState(null, '', url(v))
    } else if (view.name === 'list') history.pushState({ fromList: true }, '', url(v))
    else history.replaceState({ fromList: true }, '', url(v))
    view = v
  }
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
