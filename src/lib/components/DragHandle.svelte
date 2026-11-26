<script lang="ts">
  import { tick } from 'svelte'
  import { ArrowDown, ArrowUp, GripVertical } from '@lucide/svelte'
  import { shiftFor, targetIndex } from '../reorder'

  /**
   * Drag handle for reordering rows (docs/ui-guidelines.md, "Reordering").
   * The row must have the attribute `data-sortable-item`; its sibling rows with the same
   * attribute form the list. Three ways to move a row:
   *  - drag the handle (mouse, pen or touch);
   *  - keyboard: focus the handle and press Arrow Up / Arrow Down;
   *  - tap or click without dragging: a menu with Move up / Move down (WCAG 2.2, 2.5.7).
   */
  let {
    index,
    count,
    label,
    onmove,
  }: {
    index: number
    count: number
    /** What is moved, e.g. "item" or "section"; used in the tooltip and announcements. */
    label: string
    onmove: (from: number, to: number) => void
  } = $props()

  let button: HTMLButtonElement | undefined = $state()
  let wrapper: HTMLDivElement | undefined = $state()
  const uid = $props.id()
  let menuOpen = $state(false)
  let menuEl: HTMLDivElement | undefined = $state()
  let announcement = $state('')

  const DRAG_THRESHOLD = 5
  const EDGE = 60 // px from the window edge where the page scrolls while dragging

  interface Drag {
    pointerId: number
    startY: number // document coordinates
    rows: HTMLElement[]
    tops: number[]
    heights: number[]
    from: number
    to: number
    step: number
    active: boolean
    lastClientY: number
    scrollTimer?: ReturnType<typeof setInterval>
  }
  let drag: Drag | null = null

  function rowsOf(el: HTMLElement): HTMLElement[] {
    const row = el.closest<HTMLElement>('[data-sortable-item]')
    if (!row?.parentElement) return []
    return [...row.parentElement.children].filter((e): e is HTMLElement => e.hasAttribute('data-sortable-item'))
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || !button) return
    const rows = rowsOf(button)
    if (rows.length < 2) return
    button.setPointerCapture(e.pointerId)
    const rects = rows.map((r) => r.getBoundingClientRect())
    const tops = rects.map((r) => r.top + scrollY)
    const heights = rects.map((r) => r.height)
    // Distance between neighbouring rows, including the gap between them.
    const from = index
    const neighbour = from + 1 < rows.length ? from + 1 : from - 1
    const step = Math.abs(tops[neighbour] - tops[from]) || heights[from]
    drag = { pointerId: e.pointerId, startY: e.clientY + scrollY, rows, tops, heights, from, to: from, step, active: false, lastClientY: e.clientY }
  }

  function update() {
    if (!drag) return
    const dy = drag.lastClientY + scrollY - drag.startY
    const { rows, tops, heights, from, step } = drag
    rows[from].style.transform = `translateY(${dy}px)`
    const mids = tops.map((t, i) => t + heights[i] / 2)
    drag.to = targetIndex(mids[from] + dy, mids, from)
    rows.forEach((r, i) => {
      if (i === from) return
      const s = shiftFor(i, from, drag!.to, step)
      r.style.transform = s ? `translateY(${s}px)` : ''
    })
  }

  function onPointerMove(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return
    drag.lastClientY = e.clientY
    const dy = e.clientY + scrollY - drag.startY
    if (!drag.active) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return
      drag.active = true
      menuOpen = false
      drag.rows[drag.from].classList.add('dragging')
      drag.rows.forEach((r, i) => { if (i !== drag!.from) r.style.transition = 'transform .15s ease' })
      // Keep scrolling while the pointer rests near the top or bottom edge.
      drag.scrollTimer = setInterval(() => {
        if (!drag) return
        const y = drag.lastClientY
        const speed = y < EDGE ? -12 : y > innerHeight - EDGE ? 12 : 0
        if (speed) { scrollBy(0, speed); update() }
      }, 16)
    }
    update()
  }

  function reset() {
    if (!drag) return
    clearInterval(drag.scrollTimer)
    for (const r of drag.rows) {
      r.style.transform = ''
      r.style.transition = ''
      r.classList.remove('dragging')
    }
  }

  function onPointerUp(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return
    const { active, from, to } = drag
    reset()
    drag = null
    if (active) {
      if (to !== from) moveTo(to)
    } else {
      menuOpen = !menuOpen // a tap or click without dragging
    }
  }

  function onPointerCancel() {
    reset()
    drag = null
  }

  async function moveTo(to: number) {
    if (to < 0 || to >= count || to === index) return
    onmove(index, to)
    announcement = `${capitalised} moved to position ${to + 1} of ${count}.`
    await tick()
    button?.focus()
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowUp') { e.preventDefault(); moveTo(index - 1) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); moveTo(index + 1) }
    else if (e.key === 'Escape') menuOpen = false
  }

  // Enter/Space on the keyboard produce a click with detail 0; pointer taps are handled in onPointerUp.
  async function onClick(e: MouseEvent) {
    if (e.detail !== 0) return
    menuOpen = !menuOpen
    if (menuOpen) {
      await tick()
      menuEl?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    }
  }

  function onWindowPointerDown(e: PointerEvent) {
    if (menuOpen && wrapper && !wrapper.contains(e.target as Node)) menuOpen = false
  }

  async function menuMove(d: number) {
    menuOpen = false
    await moveTo(index + d)
  }

  const capitalised = $derived(label.charAt(0).toUpperCase() + label.slice(1))
</script>

<svelte:window
  onpointerdown={onWindowPointerDown}
  onkeydown={(e) => { if (menuOpen && e.key === 'Escape' && wrapper?.contains(document.activeElement)) { menuOpen = false; button?.focus() } }}
/>

<div class="wrap" bind:this={wrapper}>
  <button
    type="button"
    class="handle has-tip tip-start"
    bind:this={button}
    aria-label={`Move ${label}: drag, use arrow keys, or press for options. Position ${index + 1} of ${count}`}
    aria-expanded={menuOpen}
    aria-controls={`${uid}-moves`}
    data-tip={`Drag to move ${label}`}
    onpointerdown={onPointerDown}
    onpointermove={onPointerMove}
    onpointerup={onPointerUp}
    onpointercancel={onPointerCancel}
    onkeydown={onKeyDown}
    onclick={onClick}
  >
    <GripVertical size={20} aria-hidden="true" />
  </button>

  {#if menuOpen}
    <div class="menu" id={`${uid}-moves`} role="group" aria-label={`Move ${label}`} bind:this={menuEl}>
      <button type="button" disabled={index === 0} onclick={() => menuMove(-1)}>
        <ArrowUp size={18} aria-hidden="true" />Move up
      </button>
      <button type="button" disabled={index === count - 1} onclick={() => menuMove(1)}>
        <ArrowDown size={18} aria-hidden="true" />Move down
      </button>
    </div>
  {/if}
  <span class="visually-hidden" aria-live="polite">{announcement}</span>
</div>

<style>
  .wrap { position: relative; }
  .handle {
    width: 40px; height: 40px; min-height: 40px; padding: 0;
    display: inline-grid; place-items: center;
    cursor: grab; touch-action: none; user-select: none; -webkit-touch-callout: none;
    color: var(--muted);
    /* A grip, not a button: no frame or fill. The 40 px touch area stays (invisible). */
    border: none; background: none; border-radius: 6px;
  }
  .handle:hover { color: var(--fg); }
  .handle:active { cursor: grabbing; }
  .handle:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .menu {
    position: absolute; top: calc(100% + 4px); left: 0; z-index: 25;
    display: grid; min-width: 150px; padding: 4px;
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, .2);
  }
  .menu button {
    display: flex; align-items: center; gap: 8px; min-height: 40px;
    border: none; background: none; text-align: left; padding: 6px 10px; border-radius: 6px;
  }
  .menu button:hover:not(:disabled), .menu button:focus-visible { background: var(--card); }
  .menu button:disabled { opacity: .45; }
</style>
