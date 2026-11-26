<script lang="ts">
  import { ArrowLeft, ImageUp, Play, Plus, Printer, Trash2 } from '@lucide/svelte'
  import { ITEM_TYPES, itemType, newItem, newSection, SECTION_STYLES, type Checklist, type ChecklistItem, type ItemType } from '../model'
  import { touch } from '../store.svelte'
  import { imageFileToPng } from '../image'
  import { plainText } from '../markup'
  import ConfirmDialog from './ConfirmDialog.svelte'
  import IconButton from './IconButton.svelte'
  import DragHandle, { type MoveFrom, type MoveTo } from './DragHandle.svelte'
  import { moveBlock } from '../reorder'

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

  function moveSection(from: MoveFrom, to: MoveTo) {
    if (moveBlock(c.sections, [from.start, from.end], c.sections, to.at)) touch(c)
  }

  /** Moves items (an item with its bullets, or one bullet) within or between sections. */
  function moveItems(from: MoveFrom, to: MoveTo) {
    const src = c.sections.find((x) => x.id === from.list)
    const dst = c.sections.find((x) => x.id === to.list)
    if (src && dst && moveBlock(src.items, [from.start, from.end], dst.items, to.at)) touch(c)
  }

  function setType(item: ChecklistItem, t: ItemType) {
    item.type = t === 'normal' ? undefined : t
    touch(c)
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
  <p class="muted small">Item type: <strong>Bullet</strong> is indented under the item above and moves with it;
    <strong>Critical</strong> must never be skipped; <strong>Abort</strong> is a highlighted row when printed.</p>
</div>

<div class="sections" data-sortable-list data-group="sections" data-list-id="sections" data-list-label="the checklist">
{#each c.sections as s, si (s.id)}
  <section class="section" data-sortable-item data-flip-key={s.id} aria-label={`Section ${plainText(s.title)}`} oninput={() => touch(c)} onchange={() => touch(c)}>
    <div class="section-head">
      <DragHandle id={s.id} group="sections" label="section" onmove={moveSection} />
      <input class="section-title" bind:value={s.title} aria-label="Section title" />
      <select bind:value={s.style} aria-label="Box style when printed">
        {#each SECTION_STYLES as st (st.value)}<option value={st.value}>{st.label}</option>{/each}
      </select>
      <IconButton icon={Trash2} label="Delete section" variant="danger" tipAlign="end" onclick={() => deleteSection(si)} />
    </div>

    <div class="items" data-sortable-list data-group="items" data-list-id={s.id} data-list-label={`section ${plainText(s.title)}`}>
    {#each s.items as item, ii (item.id)}
      <div class="item type-{itemType(item)}" data-sortable-item data-bullet={item.type === 'bullet' || undefined}
        data-flip-key={item.id}>
        <div class="handle">
          <DragHandle id={item.id} group="items" groupBullets={item.type !== 'bullet'}
            label={item.type !== 'bullet' && s.items[ii + 1]?.type === 'bullet' ? 'item with its bullets' : 'item'}
            onmove={moveItems} />
        </div>
        <input class="text" bind:value={item.text} placeholder="Item to check" aria-label="Item to check" />
        <input class="expected" bind:value={item.expected} placeholder="Expected" aria-label="Expected response" />
        <select class="type" aria-label="Item type" value={itemType(item)}
          onchange={(e) => setType(item, e.currentTarget.value as ItemType)}>
          {#each ITEM_TYPES as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
        </select>
        <div class="row-actions">
          <IconButton icon={Trash2} label="Delete item" variant="danger" tipAlign="end" onclick={() => { s.items.splice(ii, 1); touch(c) }} />
        </div>
      </div>
    {/each}
    </div>
    <button class="icon-text" onclick={() => { s.items.push(newItem()); touch(c) }}><Plus size={20} aria-hidden="true" />Add item</button>
  </section>
{/each}
</div>
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

  .sections { display: grid; gap: 12px; margin-bottom: 12px; }
  .section { display: grid; gap: 8px; margin: 0; }
  /* An empty section still has room to drop items into. */
  .items { display: grid; gap: 6px; min-height: 12px; }
  .section-head { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto 40px; gap: 6px; align-items: center; }
  .section-title { font-weight: 600; }
  .row-actions { display: flex; gap: 4px; }

  /* Item row: one line on wide screens, two lines on phones. */
  .item {
    display: grid; gap: 6px; align-items: center;
    grid-template-columns: 40px minmax(0, 1fr) minmax(110px, 180px) 112px 40px;
    grid-template-areas: 'handle text expected type actions';
    background: var(--card); border-radius: 6px;
  }
  .handle { grid-area: handle; }
  .item .type { grid-area: type; }
  .item .text { grid-area: text; }
  .item .expected { grid-area: expected; }
  .item .row-actions { grid-area: actions; }
  .item.type-bullet .text { margin-left: 24px; width: calc(100% - 24px); }
  /* The type is also visible at a glance: coloured border on the dropdown. */
  .item.type-critical .type { border-color: var(--crit); color: var(--crit); font-weight: 600; }
  .item.type-abort .type { border-color: var(--abort); color: var(--abort); font-weight: 600; }
  .item.type-bullet .type { border-color: var(--accent); color: var(--accent); }
  .item + .item { padding-top: 6px; border-top: 1px dashed var(--border); }

  @media (max-width: 700px) {
    .item {
      grid-template-columns: 40px minmax(0, 1fr) 112px 40px;
      grid-template-areas: 'handle text text text' '. expected type actions';
    }
    .section-head { grid-template-columns: 40px minmax(0, 1fr) 40px; }
    .section-head select { grid-column: 2; }
  }
  @media (max-width: 440px) {
    .item {
      grid-template-columns: 40px minmax(0, 1fr) 40px;
      grid-template-areas: 'handle text text' '. expected expected' '. type actions';
    }
  }
</style>
