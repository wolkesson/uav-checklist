<script lang="ts">
  import { tick } from 'svelte'
  import { DEFAULT_PRINT, PAPER_SIZES, type Checklist, type PaperSize } from '../model'
  import { touch } from '../store.svelte'
  import { layout, type MeasuredSection, type Page } from './layout'
  import { geometry, PX_PER_MM } from './geometry'
  import SectionBox from './SectionBox.svelte'
  import PageHeader from './PageHeader.svelte'
  import Markup from '../components/Markup.svelte'

  let { checklist: c, onDone }: { checklist: Checklist; onDone: () => void } = $props()

  const settings = $derived(c.print ?? DEFAULT_PRINT)
  const g = $derived(geometry(settings))

  let measureEl: HTMLDivElement | undefined = $state()
  let pages = $state<Page[]>([])
  let exporting = $state(false)
  let previewWidth = $state(0)
  // Shrink the on-screen preview to fit narrow screens; printing always uses real size.
  const zoom = $derived(previewWidth ? Math.min(1, (previewWidth - 4) / (g.width * PX_PER_MM)) : 1)
  let error = $state('')

  // Re-measure and re-flow whenever the checklist content or print settings change.
  $effect(() => {
    JSON.stringify($state.snapshot(c))
    const geo = g
    const columns = settings.columns
    let cancelled = false
    ;(async () => {
      await tick()
      await document.fonts?.ready
      if (cancelled || !measureEl) return
      const measured: MeasuredSection[] = [...measureEl.querySelectorAll<HTMLElement>('.box')].map((box, si) => {
        const rows = [...box.querySelectorAll<HTMLElement>('.cl-row')]
        const style = getComputedStyle(box)
        return {
          title: rows[0].getBoundingClientRect().height,
          items: rows.slice(1).map((r) => r.getBoundingClientRect().height),
          levels: c.sections[si].items.map((i) => i.level ?? 0),
          border: parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth),
          keepTogether: c.sections[si].style === 'emergency',
        }
      })
      pages = layout(measured, {
        columnHeight: geo.contentHeight * PX_PER_MM - 1,
        columns,
        gap: geo.sectionGap * PX_PER_MM,
      })
    })()
    return () => (cancelled = true)
  })

  function setPaper(p: PaperSize) {
    c.print = { ...settings, paper: p }
    touch(c)
  }
  function setColumns(n: 1 | 2) {
    c.print = { ...settings, columns: n }
    touch(c)
  }

  async function exportWord() {
    exporting = true
    error = ''
    try {
      const { exportDocx } = await import('./docx')
      await exportDocx($state.snapshot(c) as Checklist)
    } catch (e) {
      console.error(e)
      error = 'Word export failed: ' + (e as Error).message
    } finally {
      exporting = false
    }
  }

  const pageCss = $derived(`<style>@page { size: ${g.width}mm ${g.height}mm; margin: 0; }</style>`)
</script>

<svelte:head>{@html pageCss}</svelte:head>

<div class="toolbar no-print">
  <button onclick={onDone}>← Back</button>
  <label>Paper
    <select value={settings.paper} onchange={(e) => setPaper(e.currentTarget.value as PaperSize)}>
      {#each Object.keys(PAPER_SIZES) as p (p)}<option value={p}>{p}</option>{/each}
    </select>
  </label>
  <label>Columns
    <select value={settings.columns} onchange={(e) => setColumns(Number(e.currentTarget.value) as 1 | 2)}>
      <option value={1}>1</option><option value={2}>2</option>
    </select>
  </label>
  <button class="primary" onclick={() => window.print()}>Print / Save as PDF</button>
  <button onclick={exportWord} disabled={exporting}>{exporting ? 'Exporting…' : 'Export Word'}</button>
</div>
<p class="hint no-print muted small">
  For PDF, choose <strong>Save as PDF</strong> as the printer. Keep margins on <em>Default</em> and scale at 100 %.
  {pages.length} page{pages.length === 1 ? '' : 's'}, {settings.paper}.
</p>
{#if error}<p class="error no-print" role="alert">{error}</p>{/if}

<!-- Off-screen copy used only to measure row heights at the real column width. -->
<div class="measure" bind:this={measureEl} style:width="{g.columnWidth}mm" aria-hidden="true">
  {#each c.sections as s (s.id)}<SectionBox section={s} />{/each}
</div>

<div class="sheets" bind:clientWidth={previewWidth} style:--zoom={zoom}>
  {#each pages as page, pi (pi)}
    <div class="sheet" style:width="{g.width}mm" style:height="{g.height}mm">
      <div class="header" style:top="{g.margin.top}mm" style:left="{g.margin.side}mm" style:right="{g.margin.side}mm" style:height="{g.header}mm">
        <PageHeader checklist={c} />
      </div>
      <div class="content" style:top="{g.contentTop}mm" style:left="{g.margin.side}mm" style:width="{g.contentWidth}mm"
        style:height="{g.contentHeight}mm" style:column-gap="{g.columnGap}mm" style:grid-template-columns="repeat({settings.columns}, 1fr)">
        {#each page as column, ci (ci)}
          <div class="column" class:separator={ci > 0} style:gap="{g.sectionGap}mm" style:--half-gap="{g.columnGap / 2}mm">
            {#each column as seg (seg.section + ':' + seg.from)}
              <SectionBox section={c.sections[seg.section]} from={seg.from} to={seg.to} showTitle={seg.showTitle} />
            {/each}
          </div>
        {/each}
      </div>
      <div class="footer" style:bottom="{g.margin.bottom}mm" style:left="{g.margin.side}mm" style:right="{g.margin.side}mm" style:height="{g.footer}mm">
        <span><Markup text={c.effectivity ?? ''} /></span>
        <span>Page {pi + 1}</span>
      </div>
    </div>
  {/each}
</div>

<style>
  .toolbar label { display: flex; gap: 6px; align-items: center; }
  select { font: inherit; color: inherit; background: var(--bg); border: 1px solid var(--border); border-radius: 6px; padding: 6px; min-height: 36px; }
  .measure { position: absolute; left: -10000px; top: 0; visibility: hidden; }
  .sheets { overflow-x: auto; padding: 8px 0; }
  @media screen { .sheet { zoom: var(--zoom, 1); } }
  .sheet { position: relative; background: #fff; color: #000; box-shadow: 0 1px 6px rgba(0, 0, 0, .35); margin: 0 auto 16px; overflow: hidden; }
  .header, .content, .footer { position: absolute; }
  .content { display: grid; align-items: start; }
  .column { display: flex; flex-direction: column; position: relative; min-height: 0; }
  .column.separator::before { content: ''; position: absolute; left: calc(-1 * var(--half-gap)); top: 0; height: 100%; border-left: 0.75pt solid #000; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #000; }

  @media print {
    :global(body), :global(main) { margin: 0 !important; padding: 0 !important; max-width: none !important; background: #fff !important; }
    :global(header), .no-print, .measure { display: none !important; }
    .sheets { padding: 0; overflow: visible; }
    .sheet { box-shadow: none; margin: 0; break-after: page; }
    .sheet:last-child { break-after: auto; }
  }
</style>
