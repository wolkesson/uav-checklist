<script lang="ts">
  import type { ChecklistSection } from '../model'
  import Markup from '../components/Markup.svelte'
  import { bands } from './bands'

  let { section: s, from = 0, to = s.items.length, showTitle = true }:
    { section: ChecklistSection; from?: number; to?: number; showTitle?: boolean } = $props()

  const shade = $derived(bands(s.items, s.style))
</script>

<div class="box {s.style ?? 'normal'}">
  {#if showTitle}<div class="cl-row cl-title"><span><Markup text={s.title} /></span></div>{/if}
  {#each s.items.slice(from, to) as item, j (item.id)}
    <div class="cl-row" class:shaded={shade[from + j]} class:bullet={item.type === 'bullet'} class:abort={item.type === 'abort'} class:caution={item.type === 'caution'}>
      <span class="text"><Markup text={item.text} /></span>
      {#if item.expected}<span class="value"><Markup text={item.expected} /></span>{/if}
    </div>
  {/each}
</div>

<style>
  .box { border: 0.5pt solid #000; background: #fff; color: #000; font-family: Arial, Helvetica, 'Liberation Sans', sans-serif; font-size: 10pt; line-height: 1.15; } /* Word's 'single' spacing for Arial */
  .box.info { border: 2.25pt solid #00b0f0; }
  .box.green { border: 2.25pt solid #92d050; }
  .box.emergency { border: 2.25pt solid #ff0000; }
  .box.notes { border: none; background: none; }
  .cl-row { display: flex; flex-wrap: nowrap; gap: 1mm; margin: 0; padding: 0 2mm; break-inside: avoid; }
  .cl-title { font-family: 'Arial Black', 'Arial', sans-serif; font-weight: 900; text-transform: uppercase; font-size: 10.5pt; padding-top: 0.3mm; padding-bottom: 0.2mm; }
  .info .cl-title { background: #00b0f0; color: #fff; }
  .emergency .cl-title { background: #ff0000; color: #fff; }
  .shaded { background: #f2f2f2; }
  .text { flex: 1 1 auto; min-width: 0; }
  /* Value keeps its natural width (up to 75 %); the description wraps first. */
  .value { flex: 0 0 auto; text-align: right; max-width: 75%; }
  .emergency .value { font-weight: 700; }
  .bullet .text { position: relative; padding-left: 6mm; }
  .bullet .text::before { content: '•'; position: absolute; left: 1.5mm; }
  .abort { background: #e04403; color: #fff; }
  .caution { background: #ffff00; color: #000; }
  :global(.box sup) { font-size: 0.65em; line-height: 0; }
</style>
