<script lang="ts">
  import { ArrowLeft, CircleAlert, ImageUp, ListIndentIncrease, OctagonX, Play, Plus, Printer, Trash2 } from '@lucide/svelte'
  import { newItem, newSection, SECTION_STYLES, type Checklist } from '../model'
  import { touch } from '../store.svelte'
  import { imageFileToPng } from '../image'
  import { plainText } from '../markup'
  import ConfirmDialog from './ConfirmDialog.svelte'
  import IconButton from './IconButton.svelte'
  import DragHandle from './DragHandle.svelte'
  import { itemUnits, moveItem, moveUnit, singleUnits, unitOf, type Unit } from '../reorder'
  import type { ChecklistSection } from '../model'

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

  function move<T>(arr: T[], from: number, to: number) {
    if (moveItem(arr, from, to)) touch(c)
  }

  /**
   * Units for an item's drag handle: a top-level item moves with its bullets and lands
   * only between whole groups; a bullet moves on its own.
   */
  function unitsFor(sec: ChecklistSection, i: number): Unit[] {
    return sec.items[i].level === 1 ? singleUnits(sec.items.length) : itemUnits(sec.items.map((it) => it.level ?? 0))
  }

  function moveItemUnit(sec: ChecklistSection, units: Unit[], from: number, to: number) {
    if (moveUnit(sec.items, units, from, to)) touch(c)
  }

  function newRevision() {
    c.revision++
    c.revisionDate = new Date().toISOString().slice(0, 10)
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
  <IconButton icon={ArrowLeft} label="Back to checklists" onclick={onDone} />
  <IconButton icon={Play} label="Run checklist" variant="primary" onclick={onRun} />
  <IconButton icon={Printer} label="Print or export PDF / Word" onclick={onPrint} />
  <button class="text-btn" onclick={newRevision}>New revision</button>
  <span class="muted small">Now v{c.revision}</span>
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
    <label class="button icon-text">
      <ImageUp size={20} aria-hidden="true" />{c.logo ? 'Change logo…' : 'Choose logo…'}
      <input type="file" accept="image/*" hidden onchange={onLogo} />
    </label>
    {#if c.logo}<IconButton icon={Trash2} label="Remove logo" variant="danger" onclick={() => { c.logo = undefined; touch(c) }} />{/if}
    <span class="muted small">Saved inside this checklist and included when you export it.</span>
  </div>
  {#if logoError}<p class="error" role="alert">{logoError}</p>{/if}
  <p class="muted small">Formatting in any text: <code>*italic*</code>, <code>**bold**</code>, <code>^superscript^</code>.</p>
</div>

{#each c.sections as s, si (s.id)}
  <section class="section" data-sortable-item aria-label={`Section ${plainText(s.title)}`} oninput={() => touch(c)} onchange={() => touch(c)}>
    <div class="section-head">
      <DragHandle index={si} count={c.sections.length} label="section" onmove={(f, t) => move(c.sections, f, t)} />
      <input class="section-title" bind:value={s.title} aria-label="Section title" />
      <select bind:value={s.style} aria-label="Box style when printed">
        {#each SECTION_STYLES as st (st.value)}<option value={st.value}>{st.label}</option>{/each}
      </select>
      <IconButton icon={Trash2} label="Delete section" variant="danger" tipAlign="end" onclick={() => deleteSection(si)} />
    </div>

    {#each s.items as item, ii (item.id)}
      {@const units = unitsFor(s, ii)}
      {@const u = unitOf(units, ii)}
      <div class="item" data-sortable-item class:bullet={item.level === 1}>
        <div class="handle">
          <DragHandle index={u} count={units.length} units={units}
            label={units[u][1] - units[u][0] > 1 ? 'item with its bullets' : 'item'}
            onmove={(f, t) => moveItemUnit(s, units, f, t)} />
        </div>
        <div class="indent">
          <IconButton icon={ListIndentIncrease} label="Bullet under the item above" pressed={item.level === 1}
            onclick={() => { item.level = item.level === 1 ? 0 : 1; touch(c) }} />
        </div>
        <input class="text" bind:value={item.text} placeholder="Item to check" aria-label="Item to check" />
        <input class="expected" bind:value={item.expected} placeholder="Expected" aria-label="Expected response" />
        <div class="row-actions">
          <IconButton icon={CircleAlert} label="Critical item (never skip)" tipAlign="end" pressed={!!item.critical}
            onclick={() => { item.critical = !item.critical; touch(c) }} />
          <IconButton icon={OctagonX} label="Abort row (highlighted when printed)" tipAlign="end" pressed={item.highlight === 'abort'}
            onclick={() => { item.highlight = item.highlight === 'abort' ? undefined : 'abort'; touch(c) }} />
          <IconButton icon={Trash2} label="Delete item" variant="danger" tipAlign="end" onclick={() => { s.items.splice(ii, 1); touch(c) }} />
        </div>
      </div>
    {/each}
    <button class="icon-text" onclick={() => { s.items.push(newItem()); touch(c) }}><Plus size={20} aria-hidden="true" />Add item</button>
  </section>
{/each}
<button class="icon-text" onclick={() => { c.sections.push(newSection()); touch(c) }}><Plus size={20} aria-hidden="true" />Add section</button>

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
  .icon-text { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; }
  .text-btn { min-height: 40px; }
  input, select { min-height: 40px; }
  select { font: inherit; color: inherit; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 6px; }
  code { font-size: .85em; }

  .section { display: grid; gap: 8px; }
  .section-head { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto 40px; gap: 6px; align-items: center; }
  .section-title { font-weight: 600; }
  .row-actions { display: flex; gap: 4px; }

  /* Item row: one line on wide screens, two lines on phones. */
  .item {
    display: grid; gap: 6px; align-items: center;
    grid-template-columns: 40px 40px minmax(0, 1fr) minmax(110px, 180px) auto;
    grid-template-areas: 'handle indent text expected actions';
    background: var(--card); border-radius: 6px;
  }
  .handle { grid-area: handle; }
  .indent { grid-area: indent; }
  .item .text { grid-area: text; }
  .item .expected { grid-area: expected; }
  .item .row-actions { grid-area: actions; }
  .item.bullet .text { margin-left: 20px; width: calc(100% - 20px); }
  .item + .item { padding-top: 6px; border-top: 1px dashed var(--border); }

  @media (max-width: 700px) {
    .item {
      grid-template-columns: 40px 40px minmax(0, 1fr) auto;
      grid-template-areas: 'handle indent text text' '. . expected actions';
    }
    .section-head { grid-template-columns: 40px minmax(0, 1fr) 40px; }
    .section-head select { grid-column: 2; }
  }
  @media (max-width: 440px) {
    .item { grid-template-areas: 'handle indent text text' '. . expected expected' '. . actions actions'; }
    .item .row-actions { justify-content: flex-end; }
  }
</style>
