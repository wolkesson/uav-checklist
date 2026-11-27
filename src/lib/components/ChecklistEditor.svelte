<script lang="ts">
  import {
    ArrowLeft, ArrowDown, ArrowUp, CircleAlert, ImageUp, ListIndentIncrease, OctagonX, Play, Plus, Printer, Trash2,
  } from '@lucide/svelte'
  import { newItem, newSection, SECTION_STYLES, type Checklist } from '../model'
  import { touch } from '../store.svelte'
  import { imageFileToPng } from '../image'
  import { plainText } from '../markup'
  import { LOGO_MAX } from '../print/geometry'
  import ConfirmDialog from './ConfirmDialog.svelte'
  import IconButton from './IconButton.svelte'

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

  function move<T>(arr: T[], i: number, d: number) {
    const j = i + d
    if (j < 0 || j >= arr.length) return
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
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
  <div class="meta-head">
    <div class="logo-col">
      <span class="logo-label" id="logo-label">Logo</span>
      <div class="logo-drop" class:has-logo={!!c.logo}
        style:width="{LOGO_MAX.width * LOGO_PREVIEW_SCALE}px" style:height="{LOGO_MAX.height * LOGO_PREVIEW_SCALE}px">
        <button type="button" class="logo-pick" aria-labelledby="logo-label logo-action" onclick={() => logoInput?.click()}>
          {#if c.logo}
            <img src={c.logo} alt="" />
            <span class="logo-hint overlay" id="logo-action"><ImageUp size={20} aria-hidden="true" />Click to change</span>
          {:else}
            <span class="logo-hint" id="logo-action"><ImageUp size={20} aria-hidden="true" />Click to upload</span>
          {/if}
        </button>
        {#if c.logo}
          <span class="logo-remove">
            <IconButton icon={Trash2} label="Remove logo" variant="danger" tipAlign="end" onclick={() => { c.logo = undefined; touch(c) }} />
          </span>
        {/if}
      </div>
      <input bind:this={logoInput} type="file" accept="image/*" hidden onchange={onLogo} />
    </div>
    <div class="meta-head-fields">
      <label>Title <input bind:value={c.title} /></label>
      <div class="two">
        <label>Revision <input type="number" min="1" bind:value={c.revision} /></label>
        <label>Revision date <input type="date" bind:value={c.revisionDate} /></label>
      </div>
    </div>
  </div>
  <label>Aircraft <input bind:value={c.aircraft} placeholder="e.g. model / serial" /></label>
  <label>Effectivity (printed footer) <input bind:value={c.effectivity} placeholder="e.g. Effectivity: DJI Mavic 3 App 1.13.9" /></label>
  <label>Description <textarea bind:value={c.description} rows="2"></textarea></label>
  {#if logoError}<p class="error" role="alert">{logoError}</p>{/if}
  <p class="muted small">Formatting in any text: <code>*italic*</code>, <code>**bold**</code>, <code>^superscript^</code>.</p>
</div>

{#each c.sections as s, si (s.id)}
  <section class="section" aria-label={`Section ${plainText(s.title)}`} oninput={() => touch(c)} onchange={() => touch(c)}>
    <div class="section-head">
      <input class="section-title" bind:value={s.title} aria-label="Section title" />
      <select bind:value={s.style} aria-label="Box style when printed">
        {#each SECTION_STYLES as st (st.value)}<option value={st.value}>{st.label}</option>{/each}
      </select>
      <div class="row-actions">
        <IconButton icon={ArrowUp} label="Move section up" onclick={() => move(c.sections, si, -1)} />
        <IconButton icon={ArrowDown} label="Move section down" onclick={() => move(c.sections, si, 1)} />
        <IconButton icon={Trash2} label="Delete section" variant="danger" tipAlign="end" onclick={() => deleteSection(si)} />
      </div>
    </div>

    {#each s.items as item, ii (item.id)}
      <div class="item" class:bullet={item.level === 1}>
        <div class="indent">
          <IconButton icon={ListIndentIncrease} label="Bullet under the item above" pressed={item.level === 1}
            onclick={() => { item.level = item.level === 1 ? 0 : 1; touch(c) }} />
        </div>
        <input class="text" bind:value={item.text} placeholder="Item to check" aria-label="Item to check" />
        <input class="expected" bind:value={item.expected} placeholder="Expected" aria-label="Expected response" />
        <div class="row-actions">
          <IconButton icon={CircleAlert} label="Critical item (never skip)" pressed={!!item.critical}
            onclick={() => { item.critical = !item.critical; touch(c) }} />
          <IconButton icon={OctagonX} label="Abort row (highlighted when printed)" pressed={item.highlight === 'abort'}
            onclick={() => { item.highlight = item.highlight === 'abort' ? undefined : 'abort'; touch(c) }} />
          <IconButton icon={ArrowUp} label="Move item up" onclick={() => move(s.items, ii, -1)} />
          <IconButton icon={ArrowDown} label="Move item down" onclick={() => move(s.items, ii, 1)} />
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
  /* Logo upload area first (top left), title and revision beside it. */
  .meta-head { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 12px; align-items: start; }
  .meta-head-fields { display: grid; gap: 8px; }
  .logo-col { display: grid; gap: 4px; justify-items: start; font-size: .9rem; }
  /* Box = printed logo box; border sits outside it so the image scale matches print. */
  .logo-drop {
    position: relative; box-sizing: content-box;
    border: 2px dashed var(--border); border-radius: 6px; background: var(--card);
  }
  .logo-drop.has-logo { border-style: solid; background: #fff; }
  .logo-drop:hover, .logo-drop:focus-within { border-color: var(--accent); }
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

  .section { display: grid; gap: 8px; }
  .section-head { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 6px; align-items: center; }
  .section-title { font-weight: 600; }
  .row-actions { display: flex; gap: 4px; }

  /* Item row: one line on wide screens, two lines on phones. */
  .item {
    display: grid; gap: 6px; align-items: center;
    grid-template-columns: 40px minmax(0, 1fr) minmax(110px, 180px) auto;
    grid-template-areas: 'indent text expected actions';
  }
  .indent { grid-area: indent; }
  .item .text { grid-area: text; }
  .item .expected { grid-area: expected; }
  .item .row-actions { grid-area: actions; }
  .item.bullet .text { margin-left: 20px; width: calc(100% - 20px); }
  .item + .item { padding-top: 6px; border-top: 1px dashed var(--border); }

  @media (max-width: 700px) {
    .item {
      grid-template-columns: 40px minmax(0, 1fr) auto;
      grid-template-areas: 'indent text text' '. expected actions';
    }
    .section-head { grid-template-columns: minmax(0, 1fr) auto; }
    .section-head .row-actions { grid-column: 1 / -1; justify-content: flex-end; }
  }
  @media (max-width: 440px) {
    .item { grid-template-areas: 'indent text text' '. expected expected' '. actions actions'; }
    .item .row-actions { justify-content: flex-end; }
  }
</style>
