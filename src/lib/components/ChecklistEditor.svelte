<script lang="ts">
  import { newItem, newSection, type Checklist } from '../model'
  import { touch } from '../store.svelte'

  let { checklist: c, onDone, onRun }: { checklist: Checklist; onDone: () => void; onRun: () => void } = $props()

  function move<T>(arr: T[], i: number, d: number) {
    const j = i + d
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
</script>

<div class="toolbar">
  <button onclick={onDone}>← Back</button>
  <button class="primary" onclick={onRun}>Run</button>
  <button onclick={() => { c.revision++; touch(c) }}>Bump revision (rev {c.revision})</button>
</div>

<div class="fields" oninput={() => touch(c)}>
  <label>Title <input bind:value={c.title} /></label>
  <label>Aircraft <input bind:value={c.aircraft} placeholder="e.g. model / serial" /></label>
  <label>Description <textarea bind:value={c.description} rows="2"></textarea></label>
</div>

{#each c.sections as s, si (s.id)}
  <section class="section" oninput={() => touch(c)}>
    <div class="row">
      <input class="section-title" bind:value={s.title} aria-label="Section title" />
      <button title="Move up" onclick={() => move(c.sections, si, -1)}>↑</button>
      <button title="Move down" onclick={() => move(c.sections, si, 1)}>↓</button>
      <button class="danger" title="Delete section" onclick={() => c.sections.splice(si, 1)}>✕</button>
    </div>
    {#each s.items as item, ii (item.id)}
      <div class="row item">
        <input class="grow" bind:value={item.text} placeholder="Item to check" aria-label="Item" />
        <input class="expected" bind:value={item.expected} placeholder="Expected" aria-label="Expected" />
        <label class="small" title="Critical item"><input type="checkbox" bind:checked={item.critical} /> critical</label>
        <button title="Move up" onclick={() => move(s.items, ii, -1)}>↑</button>
        <button title="Move down" onclick={() => move(s.items, ii, 1)}>↓</button>
        <button class="danger" title="Delete item" onclick={() => s.items.splice(ii, 1)}>✕</button>
      </div>
    {/each}
    <button onclick={() => s.items.push(newItem())}>+ Item</button>
  </section>
{/each}
<button onclick={() => c.sections.push(newSection())}>+ Section</button>
