<script lang="ts">
  import type { Checklist } from '../model'
  import Markup from './Markup.svelte'
  import IconButton from './IconButton.svelte'
  import { ArrowLeft, RotateCcw } from '@lucide/svelte'

  let { checklist: c, onDone }: { checklist: Checklist; onDone: () => void } = $props()

  // Run state is deliberately not persisted yet: a run starts clean every time.
  let done = $state<Record<string, boolean>>({})
  const all = $derived(c.sections.flatMap((s) => s.items))
  const count = $derived(all.filter((i) => done[i.id]).length)
  const criticalOpen = $derived(all.filter((i) => i.type === 'critical' && !done[i.id]).length)
</script>

<div class="toolbar">
  <IconButton icon={ArrowLeft} label="Back to checklists" onclick={onDone} />
  <IconButton icon={RotateCcw} label="Reset: untick all items" onclick={() => (done = {})} />
  <span class="progress">{count} / {all.length}{criticalOpen ? ` · ${criticalOpen} critical open` : ''}</span>
</div>

<h1><Markup text={c.title} /></h1>
{#if c.aircraft}<p class="muted">{c.aircraft} · rev {c.revision}</p>{/if}

{#each c.sections as s (s.id)}
  <h2 class="sec-{s.style ?? 'normal'}"><Markup text={s.title} /></h2>
  <ul class="run">
    {#each s.items as item (item.id)}
      <li class:done={done[item.id]} class:critical={item.type === 'critical'} class:bullet={item.type === 'bullet'} class:abort={item.type === 'abort'}>
        <label>
          <input type="checkbox" bind:checked={done[item.id]} />
          <span class="text"><Markup text={item.text} /></span>
          <span class="dots"></span>
          <span class="expected"><Markup text={item.expected ?? ''} /></span>
        </label>
      </li>
    {/each}
  </ul>
{/each}

{#if all.length && count === all.length}<p class="complete" role="status">Checklist complete.</p>{/if}

<style>
  .bullet label { padding-left: 28px; }
  .abort:not(.done) .expected, .abort:not(.done) .text { color: #e04403; font-weight: 700; }
  h2.sec-info { color: #0090c8; }
  h2.sec-emergency { color: #e00000; }
</style>
