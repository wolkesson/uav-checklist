<script lang="ts">
  import { isStep, type Checklist } from '../model'
  import Markup from './Markup.svelte'
  import IconButton from './IconButton.svelte'
  import { ArrowLeft, RotateCcw } from '@lucide/svelte'

  let { checklist: c, onDone }: { checklist: Checklist; onDone: () => void } = $props()

  // Run state is deliberately not persisted yet: a run starts clean every time.
  let done = $state<Record<string, boolean>>({})
  // Only steps get tick boxes; caution/abort rows and notes sections are read, not done.
  const all = $derived(c.sections.flatMap((s) => s.items.filter((i) => isStep(s, i))))
  const count = $derived(all.filter((i) => done[i.id]).length)
  const criticalOpen = $derived(all.filter((i) => i.type === 'critical' && !done[i.id]).length)
</script>

<div class="toolbar">
  <IconButton icon={ArrowLeft} label="Back to checklists" onclick={onDone} />
  <IconButton icon={RotateCcw} label="Reset: untick all items" onclick={() => (done = {})} />
  <span class="progress">{count} / {all.length}{criticalOpen ? ` · ${criticalOpen} critical open` : ''}</span>
</div>

<h1><Markup text={c.title} /></h1>
<p class="muted">{c.aircraft ? `${c.aircraft} · ` : ''}v{c.revision}{#if c.status !== 'released'} · <span class="draft-tag">DRAFT</span>{/if}</p>

{#each c.sections as s (s.id)}
  <h2 class="sec-{s.style ?? 'normal'}"><Markup text={s.title} /></h2>
  <ul class="run" class:notes={s.style === 'notes'}>
    {#each s.items as item (item.id)}
      <li class:done={done[item.id]} class:critical={item.type === 'critical'} class:bullet={item.type === 'bullet'}
        class:abort={item.type === 'abort'} class:caution={item.type === 'caution'}>
        {#if isStep(s, item)}
          <label>
            <input type="checkbox" bind:checked={done[item.id]} />
            <span class="text"><Markup text={item.text} /></span>
            <span class="dots"></span>
            <span class="expected"><Markup text={item.expected ?? ''} /></span>
          </label>
        {:else}
          <div class="info-row">
            <span class="text"><Markup text={item.text} /></span>
            <span class="dots"></span>
            <span class="expected"><Markup text={item.expected ?? ''} /></span>
          </div>
        {/if}
      </li>
    {/each}
  </ul>
{/each}

{#if all.length && count === all.length}<p class="complete" role="status">Checklist complete.</p>{/if}

<style>
  .draft-tag { color: var(--draft-fg); font-weight: 700; }
  .bullet label, .bullet .info-row { padding-left: 28px; }
  /* Rows without a tick box line up with the text of rows that have one. */
  .info-row { display: flex; align-items: center; gap: 10px; padding: 10px 4px 10px 32px; border-bottom: 1px solid var(--border); min-height: 44px; }
  .notes .info-row { padding-left: 4px; border-bottom: none; min-height: 0; padding-block: 4px; }
  .notes .expected { font-weight: 400; text-transform: none; }
  .abort .expected, .abort .text { color: var(--abort); font-weight: 700; }
  .caution .info-row { background: #ffff00; color: #000; border-radius: 4px; }
  .caution .info-row .dots { border-color: #00000055; }
  h2.sec-info { color: #0090c8; }
  h2.sec-green { color: var(--box-green); }
  h2.sec-emergency { color: #e00000; }
</style>
