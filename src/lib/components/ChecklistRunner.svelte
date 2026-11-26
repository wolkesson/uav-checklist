<script lang="ts">
  import type { Checklist } from '../model'

  let { checklist: c, onDone }: { checklist: Checklist; onDone: () => void } = $props()

  // Run state is deliberately not persisted yet: a run starts clean every time.
  let done = $state<Record<string, boolean>>({})
  const all = $derived(c.sections.flatMap((s) => s.items))
  const count = $derived(all.filter((i) => done[i.id]).length)
  const criticalOpen = $derived(all.filter((i) => i.critical && !done[i.id]).length)
</script>

<div class="toolbar">
  <button onclick={onDone}>← Back</button>
  <button onclick={() => (done = {})}>Reset</button>
  <span class="progress">{count} / {all.length}{criticalOpen ? ` · ${criticalOpen} critical open` : ''}</span>
</div>

<h1>{c.title}</h1>
{#if c.aircraft}<p class="muted">{c.aircraft} · rev {c.revision}</p>{/if}

{#each c.sections as s (s.id)}
  <h2>{s.title}</h2>
  <ul class="run">
    {#each s.items as item (item.id)}
      <li class:done={done[item.id]} class:critical={item.critical}>
        <label>
          <input type="checkbox" bind:checked={done[item.id]} />
          <span class="text">{item.text}</span>
          <span class="dots"></span>
          <span class="expected">{item.expected}</span>
        </label>
      </li>
    {/each}
  </ul>
{/each}

{#if all.length && count === all.length}<p class="complete" role="status">Checklist complete.</p>{/if}
