<script lang="ts">
  import { newItem, newSection, SECTION_STYLES, type Checklist } from '../model'
  import { touch } from '../store.svelte'
  import { imageFileToPng } from '../image'
  import { plainText } from '../markup'
  import ConfirmDialog from './ConfirmDialog.svelte'

  let { checklist: c, onDone, onRun, onPrint }:
    { checklist: Checklist; onDone: () => void; onRun: () => void; onPrint: () => void } = $props()
  let logoError = $state('')
  let sectionToDelete = $state<number | null>(null)
  let confirmOpen = $state(false)

  // Deleting a section that still has items loses data, so it needs confirmation (docs/ui-guidelines.md).
  function deleteSection(si: number) {
    if (c.sections[si].items.some((i) => i.text.trim())) {
      sectionToDelete = si
      confirmOpen = true
    } else {
      c.sections.splice(si, 1)
      touch(c)
    }
  }

  function move<T>(arr: T[], i: number, d: number) {
    const j = i + d
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
    touch(c)
  }

  async function onLogo(e: Event) {
    const input = e.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    logoError = ''
    if (!file) return
    try {
      c.logo = await imageFileToPng(file)
      touch(c)
    } catch {
      logoError = 'Could not read that image. Use PNG, JPG, GIF or SVG.'
    }
    input.value = ''
  }
</script>

<div class="toolbar">
  <button onclick={onDone}>← Back</button>
  <button class="primary" onclick={onRun}>Run</button>
  <button onclick={onPrint}>Print / Export</button>
  <button onclick={() => { c.revision++; c.revisionDate = new Date().toISOString().slice(0, 10); touch(c) }}>New revision (now v{c.revision})</button>
</div>

<div class="fields" oninput={() => touch(c)}>
  <label>Title <input bind:value={c.title} /></label>
  <div class="two">
    <label>Revision <input type="number" min="1" bind:value={c.revision} /></label>
    <label>Revision date <input type="date" bind:value={c.revisionDate} /></label>
  </div>
  <label>Aircraft <input bind:value={c.aircraft} placeholder="e.g. model / serial" /></label>
  <label>Effectivity (printed footer) <input bind:value={c.effectivity} placeholder="e.g. Effectivity: DJI Mavic 3 App 1.13.9" /></label>
  <label>Description <textarea bind:value={c.description} rows="2"></textarea></label>
  <div class="logo-row">
    <span>Logo (printed header)</span>
    {#if c.logo}<img src={c.logo} alt="Current logo" />{/if}
    <label class="button">{c.logo ? 'Change…' : 'Choose image…'}<input type="file" accept="image/*" hidden onchange={onLogo} /></label>
    {#if c.logo}<button class="danger" onclick={() => { c.logo = undefined; touch(c) }}>Remove</button>{/if}
    <span class="muted small">Saved inside this checklist and included when you export it.</span>
  </div>
  {#if logoError}<p class="error">{logoError}</p>{/if}
  <p class="muted small">Formatting in any text: <code>*italic*</code>, <code>**bold**</code>, <code>^superscript^</code>.</p>
</div>

{#each c.sections as s, si (s.id)}
  <section class="section" oninput={() => touch(c)} onchange={() => touch(c)}>
    <div class="row">
      <input class="section-title" bind:value={s.title} aria-label="Section title" />
      <select bind:value={s.style} aria-label="Section style">
        {#each SECTION_STYLES as st (st.value)}<option value={st.value}>{st.label}</option>{/each}
      </select>
      <button title="Move section up" onclick={() => move(c.sections, si, -1)}>↑</button>
      <button title="Move section down" onclick={() => move(c.sections, si, 1)}>↓</button>
      <button class="danger" title="Delete section" aria-label="Delete section" onclick={() => deleteSection(si)}>✕</button>
    </div>
    {#each s.items as item, ii (item.id)}
      <div class="row item" class:indented={item.level === 1}>
        <button class="small-btn" title={item.level === 1 ? 'Make normal item' : 'Make bullet under item above'}
          onclick={() => { item.level = item.level === 1 ? 0 : 1; touch(c) }}>{item.level === 1 ? '←' : '→'}</button>
        <input class="grow" bind:value={item.text} placeholder="Item to check" aria-label="Item" />
        <input class="expected" bind:value={item.expected} placeholder="Expected" aria-label="Expected" />
        <label class="small" title="Critical item"><input type="checkbox" bind:checked={item.critical} /> critical</label>
        <label class="small" title="Highlight as abort row">
          <input type="checkbox" checked={item.highlight === 'abort'}
            onchange={(e) => { item.highlight = e.currentTarget.checked ? 'abort' : undefined; touch(c) }} /> abort
        </label>
        <button title="Move up" onclick={() => move(s.items, ii, -1)}>↑</button>
        <button title="Move down" onclick={() => move(s.items, ii, 1)}>↓</button>
        <button class="danger" title="Delete item" onclick={() => { s.items.splice(ii, 1); touch(c) }}>✕</button>
      </div>
    {/each}
    <button onclick={() => { s.items.push(newItem()); touch(c) }}>+ Item</button>
  </section>
{/each}
<button onclick={() => { c.sections.push(newSection()); touch(c) }}>+ Section</button>

<ConfirmDialog
  bind:open={confirmOpen}
  title={`Delete section “${sectionToDelete !== null ? plainText(c.sections[sectionToDelete]?.title ?? '') : ''}”?`}
  message={`This section and its ${sectionToDelete !== null ? c.sections[sectionToDelete]?.items.length : 0} items are removed from the checklist.`}
  confirmLabel="Delete section"
  onconfirm={() => { if (sectionToDelete !== null) { c.sections.splice(sectionToDelete, 1); sectionToDelete = null; touch(c) } }}
/>

<style>
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .logo-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; font-size: .9rem; }
  .logo-row img { max-height: 40px; max-width: 160px; background: #fff; padding: 2px; border: 1px solid var(--border); border-radius: 4px; }
  .indented { padding-left: 28px; }
  .small-btn { padding: 4px 8px; }
  select { font: inherit; color: inherit; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 6px; min-height: 36px; }
  code { font-size: .85em; }
</style>
