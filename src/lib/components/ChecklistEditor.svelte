<script lang="ts">
  import { tick } from 'svelte'
  import { ArrowDown, ArrowLeft, ArrowUp, CircleCheck, FilePlus, ImageUp, Lock, LockOpen, Pen, Play, Plus, Printer, Trash2 } from '@lucide/svelte'
  import { ITEM_TYPES, itemType, newItem, newSection, SECTION_STYLES, type Checklist, type ChecklistItem, type ItemType, type SectionStyle } from '../model'
  import { touch } from '../store.svelte'
  import { imageFileToPng } from '../image'
  import { plainText } from '../markup'
  import { LOGO_MAX } from '../print/geometry'
  import ConfirmDialog from './ConfirmDialog.svelte'
  import IconButton from './IconButton.svelte'
  import DragHandle, { type MoveFrom, type MoveTo } from './DragHandle.svelte'
  import SwatchSelect from './SwatchSelect.svelte'
  import MenuButton from './MenuButton.svelte'
  import { moveBlock } from '../reorder'
  import EditRevisionDialog from './EditRevisionDialog.svelte'
  import { isDraft, release, setRevision, startNewDraft } from '../revision'

  let { checklist: c, onDone, onRun, onPrint }:
    { checklist: Checklist; onDone: () => void; onRun: () => void; onPrint: () => void } = $props()
  let logoError = $state('')
  let logoInput = $state<HTMLInputElement>()
  // The preview box is the printed logo box (LOGO_MAX) scaled up, so the logo keeps its printed proportions.
  const LOGO_PREVIEW_SCALE = 5 // px per mm
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

  // Box style options with the colour the box gets when printed (and in the editor).
  const STYLE_COLOR: Record<SectionStyle, string | undefined> = {
    normal: undefined, info: 'var(--box-info)', emergency: 'var(--box-emergency)',
  }
  const styleOptions = SECTION_STYLES.map((st) => ({ ...st, color: STYLE_COLOR[st.value] }))

  /** Moves a section one step up (-1) or down (+1) and keeps focus on its menu button. */
  async function moveSectionBy(si: number, d: -1 | 1) {
    const to = si + d
    if (to < 0 || to >= c.sections.length) return
    const id = c.sections[si].id
    if (moveBlock(c.sections, [si, si + 1], c.sections, d < 0 ? to : to + 1)) touch(c)
    await tick()
    document.querySelector<HTMLButtonElement>(`[data-menu-id="${CSS.escape(id)}"]`)?.focus()
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


  // Released checklists are locked: every field is read-only and edit controls are hidden.
  const locked = $derived(!isDraft(c))
  let releaseOpen = $state(false)
  let editRevisionOpen = $state(false)

  function newDraft() {
    startNewDraft(c)
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
</div>

<div class="fields" oninput={() => touch(c)}>
  <div class="meta-head">
    <div class="logo-col">
      <span class="logo-label" id="logo-label">Logo</span>
      <div class="logo-drop" class:has-logo={!!c.logo}
        style:width="{LOGO_MAX.width * LOGO_PREVIEW_SCALE}px" style:height="{LOGO_MAX.height * LOGO_PREVIEW_SCALE}px">
        <button type="button" class="logo-pick" disabled={locked} aria-labelledby="logo-label logo-action" onclick={() => logoInput?.click()}>
          {#if c.logo}
            <img src={c.logo} alt="" />
            <span class="logo-hint overlay" id="logo-action"><ImageUp size={20} aria-hidden="true" />Click to change</span>
          {:else}
            <span class="logo-hint" id="logo-action">{#if locked}No logo{:else}<ImageUp size={20} aria-hidden="true" />Click to upload{/if}</span>
          {/if}
        </button>
        {#if c.logo && !locked}
          <span class="logo-remove">
            <IconButton icon={Trash2} label="Remove logo" variant="danger" tipAlign="end" onclick={() => { c.logo = undefined; touch(c) }} />
          </span>
        {/if}
      </div>
      <input bind:this={logoInput} type="file" accept="image/*" hidden onchange={onLogo} />
    </div>
    <div class="meta-head-fields">
      <label>Title <input bind:value={c.title} disabled={locked} /></label>
      <div class="rev-field">
        <span class="rev-label" id="rev-label">Revision</span>
        <div class="rev-line" class:released={locked} role="group" aria-labelledby="rev-label">
          <span class="badge">
            {#if locked}<Lock size={14} aria-hidden="true" />Released{:else}<LockOpen size={14} aria-hidden="true" />Draft{/if}
          </span>
          <span class="rev-text">v{c.revision} · {c.revisionDate ?? '—'}</span>
          {#if locked}
            <button type="button" class="rev-btn" onclick={newDraft}><FilePlus size={18} aria-hidden="true" />New draft</button>
          {:else}
            <!-- Pen next to the version and date it edits, before Release. -->
            <IconButton icon={Pen} label="Edit version and date" tipAlign="end" onclick={() => (editRevisionOpen = true)} />
            <button type="button" class="rev-btn release" onclick={() => (releaseOpen = true)}><CircleCheck size={18} aria-hidden="true" />Release</button>
          {/if}
        </div>
      </div>
    </div>
  </div>
  <label>Aircraft <input bind:value={c.aircraft} disabled={locked} placeholder="e.g. model / serial" /></label>
  <label>Effectivity (printed footer) <input bind:value={c.effectivity} disabled={locked} placeholder="e.g. Effectivity: DJI Mavic 3 App 1.13.9" /></label>
  <label>Description <textarea bind:value={c.description} disabled={locked} rows="2"></textarea></label>
  {#if logoError}<p class="error" role="alert">{logoError}</p>{/if}
  <p class="muted small">Formatting in any text: <code>*italic*</code>, <code>**bold**</code>, <code>^superscript^</code>.</p>
  <p class="muted small">Item type: <strong>Bullet</strong> is indented under the item above and moves with it;
    <strong>Critical</strong> must never be skipped; <strong>Abort</strong> is a highlighted row when printed.</p>
</div>

<div class="sections" class:locked>
{#each c.sections as s, si (s.id)}
  <section class="section style-{s.style ?? 'normal'}" data-flip-key={s.id} aria-label={`Section ${plainText(s.title)}`} oninput={() => touch(c)} onchange={() => touch(c)}>
    <div class="section-head">
      <input class="section-title" bind:value={s.title} disabled={locked} aria-label="Section title" />
      <SwatchSelect label="Box style" value={s.style ?? 'normal'} options={styleOptions} disabled={locked}
        onchange={(v) => { s.style = v; touch(c) }} />
      {#if !locked}<MenuButton label="Section actions" id={s.id} items={[
        { label: 'Move up', icon: ArrowUp, disabled: si === 0, onselect: () => moveSectionBy(si, -1) },
        { label: 'Move down', icon: ArrowDown, disabled: si === c.sections.length - 1, onselect: () => moveSectionBy(si, 1) },
        { label: 'Delete section', icon: Trash2, danger: true, onselect: () => deleteSection(si) },
      ]} />{/if}
    </div>

    <div class="items" data-sortable-list data-group="items" data-list-id={s.id} data-list-label={`section ${plainText(s.title)}`}>
    {#each s.items as item, ii (item.id)}
      <div class="item type-{itemType(item)}" data-sortable-item data-bullet={item.type === 'bullet' || undefined}
        data-flip-key={item.id}>
        <div class="handle">
          {#if !locked}<DragHandle id={item.id} group="items" groupBullets={item.type !== 'bullet'}
            label={item.type !== 'bullet' && s.items[ii + 1]?.type === 'bullet' ? 'item with its bullets' : 'item'}
            onmove={moveItems} />{/if}
        </div>
        <input class="text" bind:value={item.text} disabled={locked} placeholder="Item to check" aria-label="Item to check" />
        <input class="expected" bind:value={item.expected} disabled={locked} placeholder="Expected" aria-label="Expected response" />
        <select class="type" aria-label="Item type" value={itemType(item)} disabled={locked}
          onchange={(e) => setType(item, e.currentTarget.value as ItemType)}>
          {#each ITEM_TYPES as t (t.value)}<option value={t.value}>{t.label}</option>{/each}
        </select>
        <div class="row-actions">
          {#if !locked}<IconButton icon={Trash2} label="Delete item" variant="danger" tipAlign="end" onclick={() => { s.items.splice(ii, 1); touch(c) }} />{/if}
        </div>
      </div>
    {/each}
    </div>
    {#if !locked}<button class="icon-text" onclick={() => { s.items.push(newItem()); touch(c) }}><Plus size={20} aria-hidden="true" />Add item</button>{/if}
  </section>
{/each}
</div>
{#if !locked}<button class="icon-text" onclick={() => { c.sections.push(newSection()); touch(c) }}><Plus size={20} aria-hidden="true" />Add section</button>{/if}

<ConfirmDialog
  bind:open={releaseOpen}
  tone="primary"
  title={`Release v${c.revision}?`}
  message={`A released checklist can't be edited. To change it later, create a new draft (v${c.revision + 1}).`}
  confirmLabel={`Release v${c.revision}`}
  onconfirm={() => { release(c); touch(c) }}
/>

<EditRevisionDialog bind:open={editRevisionOpen} revision={c.revision} date={c.revisionDate ?? ''}
  onsave={(r, d) => { setRevision(c, r, d); touch(c) }} />

<ConfirmDialog
  bind:open={confirmOpen}
  title={`Delete section “${sectionToDelete !== null ? plainText(c.sections[sectionToDelete]?.title ?? '') : ''}”?`}
  message={`This section and its ${sectionToDelete !== null ? c.sections[sectionToDelete]?.items.length : 0} items are removed from the checklist.`}
  confirmLabel="Delete section"
  onconfirm={() => { if (sectionToDelete !== null) { c.sections.splice(sectionToDelete, 1); sectionToDelete = null; touch(c) } }}
/>

<style>
  /* Revision: one line, the height of an input. Amber = draft, green = released. */
  .rev-field { display: grid; gap: 4px; font-size: .9rem; min-width: 0; }
  .rev-line {
    display: flex; align-items: center; gap: 6px; min-height: 40px; padding: 0 0 0 10px; min-width: 0;
    border: 1px solid var(--draft-border); border-radius: 6px; background: var(--draft-bg); font-size: 1rem;
  }
  .rev-line.released { border-color: var(--released-border); background: var(--released-bg); }
  .badge {
    display: inline-flex; align-items: center; gap: 4px; font-size: .8rem; font-weight: 700;
    color: var(--draft-fg); white-space: nowrap;
  }
  .released .badge { color: var(--released-fg); }
  .rev-text { flex: 1; min-width: 0; font-size: .95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* Narrow phones: drop the icon in Release / New draft so the date fits. */
  @media (max-width: 420px) { .rev-btn :global(svg) { display: none; } }
  .rev-btn { display: inline-flex; align-items: center; gap: 6px; min-height: 38px; padding: 6px 10px; white-space: nowrap; flex: none; }
  .badge { flex: none; }
  .rev-btn.release { background: var(--released-solid); border-color: var(--released-solid); color: #fff; font-weight: 600; }
  .rev-line :global(.icon-btn) { min-height: 38px; height: 38px; width: 38px; flex: none; }
  /* Locked (released): read-only fields look read-only. */
  input:disabled, textarea:disabled, select:disabled { background: var(--card); color: var(--fg); opacity: .75; cursor: default; }
  /* Logo upload area first (top left), title and revision beside it. */
  .meta-head { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 12px; align-items: start; }
  /* minmax(0, 1fr): long content (e.g. the revision line) shrinks instead of widening the page. */
  .meta-head-fields { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; min-width: 0; }
  .logo-col { display: grid; gap: 4px; justify-items: start; font-size: .9rem; }
  /* Box = printed logo box; border sits outside it so the image scale matches print. */
  .logo-drop {
    position: relative; box-sizing: content-box;
    border: 2px dashed var(--border); border-radius: 6px; background: var(--card);
  }
  .logo-drop.has-logo { border-style: solid; background: #fff; }
  .logo-drop:hover, .logo-drop:focus-within { border-color: var(--accent); }
  .logo-drop:has(.logo-pick:disabled) { border-color: var(--border); }
  .logo-pick:disabled { cursor: default; }
  .logo-pick {
    position: absolute; inset: 0; width: 100%; height: 100%; min-height: 0; padding: 0; border: 0; border-radius: 4px;
    background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center;
  }
  .has-logo .logo-pick { justify-content: flex-start; } /* left-aligned, as in the printed header */
  .logo-pick:focus-visible { outline: 3px solid var(--accent); outline-offset: 4px; }
  .logo-pick img { max-width: 100%; max-height: 100%; display: block; }
  .logo-hint { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); }
  .logo-hint.overlay {
    position: absolute; inset: 0; padding-left: 10px; justify-content: flex-start; background: rgb(17 24 39 / .75); color: #fff;
    opacity: 0; transition: opacity .15s;
  }
  .logo-remove { position: absolute; top: 50%; right: 5px; transform: translateY(-50%); opacity: 0; transition: opacity .15s; }
  .logo-drop:hover .overlay, .logo-drop:focus-within .overlay,
  .logo-drop:hover .logo-remove, .logo-drop:focus-within .logo-remove { opacity: 1; }
  /* No hover on touch screens: keep the remove button visible. */
  @media (hover: none) { .logo-remove { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .logo-hint.overlay, .logo-remove { transition: none; } }
  @media (max-width: 520px) { .meta-head { grid-template-columns: minmax(0, 1fr); } }
  .icon-text { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; }
  .text-btn { min-height: 40px; }
  input, select { min-height: 40px; }
  select { font: inherit; color: inherit; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 6px; }
  code { font-size: .85em; }

  .sections { display: grid; gap: 12px; margin-bottom: 12px; }
  .section { display: grid; gap: 8px; margin: 0; }
  /* The section takes the colour of its printed box: coloured border and header strip. */
  .section.style-info { border: 2px solid var(--box-info); }
  .section.style-emergency { border: 2px solid var(--box-emergency); }
  .section.style-info .section-head, .section.style-emergency .section-head {
    margin: -11px -11px 0; padding: 10px 10px 8px; border-radius: 6px 6px 0 0;
  }
  .section.style-info .section-head { background: var(--box-info-tint); }
  .section.style-emergency .section-head { background: var(--box-emergency-tint); }
  /* An empty section still has room to drop items into. */
  .items { display: grid; gap: 6px; min-height: 12px; }
  .section-head { display: grid; grid-template-columns: minmax(0, 1fr) auto 40px; gap: 6px; align-items: center; }
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
  }
  @media (max-width: 520px) {
    /* Title on its own line; style and menu below it, right-aligned. */
    .section-head { grid-template-columns: minmax(0, 1fr) auto 40px; }
    .section-title { grid-column: 1 / -1; }
    .section-head :global(.swatch-select) { grid-column: 2; }
  }
  @media (max-width: 440px) {
    .item {
      grid-template-columns: 40px minmax(0, 1fr) 40px;
      grid-template-areas: 'handle text text' '. expected expected' '. type actions';
    }
  }
</style>
