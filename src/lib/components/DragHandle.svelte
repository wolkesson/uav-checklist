<script module lang="ts">
  /** One shared live region for move announcements (the handle itself may be re-created). */
  let live: HTMLElement | null = null
  function announce(message: string) {
    if (!live) {
      live = document.createElement('div')
      live.className = 'visually-hidden'
      live.setAttribute('aria-live', 'polite')
      document.body.append(live)
    }
    live.textContent = ''
    requestAnimationFrame(() => { if (live) live.textContent = message })
  }

  export interface MoveFrom { list: string; start: number; end: number }
  export interface MoveTo { list: string; at: number }
</script>

<script lang="ts">
  import { tick } from 'svelte'
  import { ArrowDown, ArrowUp, GripVertical } from '@lucide/svelte'
  import { itemUnits, singleUnits, unitOf, type Unit } from '../reorder'

  /**
   * Drag handle for reordering (docs/ui-guidelines.md, "Reordering").
   *
   * Markup it works with:
   *  - lists:  elements with `data-sortable-list`, `data-group`, `data-list-id`, `data-list-label`;
   *            lists with the same group accept each other's rows (e.g. items across sections);
   *  - rows:   direct children with `data-sortable-item`; bullet rows also have `data-bullet`;
   *            `data-flip-key` (row and section ids) lets rows slide smoothly when the layout changes.
   *
   * Three ways to move (WCAG 2.2, 2.5.7):
   *  - drag (mouse, pen, touch): the row lifts and follows the pointer, and the other rows make
   *    room where it will land, in any list of the group (other sections grow as needed);
   *  - keyboard: Arrow Up / Arrow Down on the focused handle; past the start or end of a list
   *    the row moves into the previous / next list;
   *  - tap or click without dragging: a menu with Move up / Move down.
   */
  let {
    id,
    group,
    label,
    groupBullets = false,
    onmove,
  }: {
    /** Id of the row's data; used to keep keyboard focus after a move. */
    id: string
    /** Lists with this group name exchange rows. */
    group: string
    /** What is moved, e.g. "item" or "section"; used in the tooltip and announcements. */
    label: string
    /** Move this row together with the bullet rows below it, landing only between groups. */
    groupBullets?: boolean
    /** `at` is an index in the target list as it is before the move. */
    onmove: (from: MoveFrom, to: MoveTo) => void
  } = $props()

  let button: HTMLButtonElement | undefined = $state()
  let wrapper: HTMLDivElement | undefined = $state()
  const uid = $props.id()
  let menuOpen = $state(false)
  let menuEl: HTMLDivElement | undefined = $state()
  let canUp = $state(true)
  let canDown = $state(true)

  const DRAG_THRESHOLD = 5
  const EDGE = 60 // px from the window edge where the page scrolls while dragging
  const capitalised = $derived(label.charAt(0).toUpperCase() + label.slice(1))

  // ---- reading the lists from the page -------------------------------------------------------

  const listsInGroup = () =>
    [...document.querySelectorAll<HTMLElement>(`[data-sortable-list][data-group="${group}"]`)]
  const rowsIn = (list: HTMLElement) =>
    [...list.children].filter((e): e is HTMLElement => e.hasAttribute('data-sortable-item'))
  const unitsIn = (rows: HTMLElement[]): Unit[] =>
    groupBullets ? itemUnits(rows.map((r) => (r.hasAttribute('data-bullet') ? 1 : 0))) : singleUnits(rows.length)

  /** Where this row is: its list, the rows that move with it, and that list's units. */
  function locate() {
    const row = button?.closest<HTMLElement>('[data-sortable-item]')
    const list = row?.closest<HTMLElement>('[data-sortable-list]')
    if (!row || !list) return null
    const rows = rowsIn(list)
    const units = unitsIn(rows)
    const i = rows.indexOf(row)
    const unit = groupBullets ? unitOf(units, i) : i
    const [start, end] = groupBullets ? units[unit] : [i, i + 1]
    return { list, rows, units, unit, start, end }
  }

  const listId = (l: HTMLElement) => l.dataset.listId ?? ''
  const listLabel = (l: HTMLElement) => l.dataset.listLabel ?? ''

  // ---- smooth movement (FLIP: measure, change layout, animate from old to new position) ----------

  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  /** Rows and sections that animate when the layout changes; floating (dragged) rows excluded. */
  const flipEls = () =>
    [...document.querySelectorAll<HTMLElement>('[data-flip-key]')].filter((e) => !e.classList.contains('dragging'))

  /** Step 1: remember where everything is on screen now, then clear running animations. */
  function flipStart(): Map<string, number> {
    const first = new Map<string, number>()
    for (const el of flipEls()) first.set(el.dataset.flipKey!, el.getBoundingClientRect().top)
    for (const el of flipEls()) { el.style.transition = 'none'; el.style.transform = '' }
    return first
  }

  /** Step 2 (after the layout changed): slide every element from its old to its new position. */
  function flipEnd(first: Map<string, number>, measured?: () => void) {
    const els = flipEls()
    const last = new Map(els.map((el) => [el, el.getBoundingClientRect().top]))
    measured?.() // layout is settled and untransformed here
    if (reducedMotion()) return
    const delta = (el: HTMLElement) => {
      const f = first.get(el.dataset.flipKey!)
      return f === undefined ? 0 : f - last.get(el)!
    }
    for (const el of els) {
      // A row inside a section that also moves only needs its own share of the movement.
      const parent = el.parentElement?.closest<HTMLElement>('[data-flip-key]')
      const d = delta(el) - (parent && last.has(parent) ? delta(parent) : 0)
      el.style.transform = d ? `translateY(${d}px)` : ''
    }
    void document.body.offsetHeight
    for (const el of els) { el.style.transition = 'transform .16s ease'; el.style.transform = '' }
  }

  // ---- moving ----------------------------------------------------------------------------------

  async function apply(to: { list: HTMLElement; at: number }, direction: string) {
    const here = locate()
    if (!here) return
    const crossing = to.list !== here.list
    const first = flipStart()
    onmove({ list: listId(here.list), start: here.start, end: here.end }, { list: listId(to.list), at: to.at })
    await tick()
    flipEnd(first)
    announce(crossing ? `${capitalised} moved to ${listLabel(to.list)}.` : `${capitalised} moved ${direction}.`)
    document.querySelector<HTMLButtonElement>(`[data-handle-id="${CSS.escape(id)}"]`)?.focus()
  }

  /** Target for one step up (-1) or down (+1), or null at the very start / end. */
  function stepTarget(d: -1 | 1): { list: HTMLElement; at: number } | null {
    const here = locate()
    if (!here) return null
    const { list, units, unit } = here
    if (d < 0 && unit > 0) return { list, at: units[unit - 1][0] }
    if (d > 0 && unit < units.length - 1) return { list, at: units[unit + 1][1] }
    const lists = listsInGroup()
    const other = lists[lists.indexOf(list) + d]
    if (!other) return null
    return { list: other, at: d < 0 ? rowsIn(other).length : 0 }
  }

  async function step(d: -1 | 1) {
    const target = stepTarget(d)
    if (target) await apply(target, d < 0 ? 'up' : 'down')
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowUp') { e.preventDefault(); step(-1) }
    else if (e.key === 'ArrowDown') { e.preventDefault(); step(1) }
    else if (e.key === 'Escape') menuOpen = false
  }

  // ---- dragging --------------------------------------------------------------------------------
  // The dragged rows are lifted out of the page (position: fixed) and follow the pointer. A real
  // gap of the same height opens where they would land, so rows slide apart and, in another
  // section, that section grows and the sections below move down. On drop the rows glide in.

  /** A drop position: before row `at` of `list`, counting only the rows that are not dragged. */
  interface Slot { list: HTMLElement; at: number }
  interface Box { top: number; bottom: number }
  interface ListSnap { el: HTMLElement; box: Box; rows: HTMLElement[]; boxes: Box[] }
  interface Drag {
    pointerId: number
    startClientY: number
    lastClientY: number
    active: boolean
    moving: HTMLElement[]
    offsets: number[] // each dragged row's top relative to the pointer
    blockHeight: number
    home: HTMLElement
    start: number
    end: number
    slot: Slot | null
    gap: { el: HTMLElement; prop: 'marginTop' | 'paddingBottom' } | null
    snaps: ListSnap[]
    scrollTimer?: ReturnType<typeof setInterval>
  }
  let drag: Drag | null = null

  const docBox = (el: Element): Box => {
    const r = el.getBoundingClientRect()
    return { top: r.top + scrollY, bottom: r.bottom + scrollY }
  }
  const staying = (list: HTMLElement) => rowsIn(list).filter((r) => !drag!.moving.includes(r))

  /** Opens the gap at `slot` (and closes the previous one). Call between flipStart and flipEnd. */
  function setGap(slot: Slot) {
    if (!drag) return
    if (drag.gap) drag.gap.el.style[drag.gap.prop] = ''
    const rows = staying(slot.list)
    const rowGap = parseFloat(getComputedStyle(slot.list).rowGap) || 0
    const el = slot.at < rows.length ? rows[slot.at] : slot.list
    const prop = el === slot.list ? 'paddingBottom' : 'marginTop'
    el.style[prop] = `${drag.blockHeight + rowGap}px`
    drag.gap = { el, prop }
  }

  /** Layout positions of all lists and their rows (measured with no animation running). */
  function snapshot() {
    if (!drag) return
    drag.snaps = listsInGroup().map((el) => {
      const rows = staying(el)
      return { el, box: docBox(el), rows, boxes: rows.map(docBox) }
    })
  }

  /** Where the dragged block would land for its current centre (document y). */
  function slotFor(y: number): Slot {
    const d = drag!
    const dist = (b: Box) => (y < b.top ? b.top - y : y > b.bottom ? y - b.bottom : 0)
    // Stay in the current list while near it, so the gap doesn't flicker between sections.
    const current = d.snaps.find((s) => s.el === d.slot?.list)
    const snap = current && dist(current.box) < 16 ? current : d.snaps.reduce((a, b) => (dist(b.box) < dist(a.box) ? b : a))
    const units = unitsIn(snap.rows)
    // The block goes after every unit whose centre is above the block's centre.
    const k = units.filter(([s, e]) => (snap.boxes[s].top + snap.boxes[e - 1].bottom) / 2 < y).length
    return { list: snap.el, at: k < units.length ? units[k][0] : snap.rows.length }
  }

  function update() {
    if (!drag?.active) return
    drag.moving.forEach((r, i) => { r.style.top = `${drag!.lastClientY + drag!.offsets[i]}px` })
    const centre = drag.lastClientY + drag.offsets[0] + drag.blockHeight / 2 + scrollY
    const slot = slotFor(centre)
    if (slot.list === drag.slot?.list && slot.at === drag.slot.at) return
    drag.slot = slot
    const first = flipStart()
    setGap(slot)
    flipEnd(first, snapshot)
  }

  function lift() {
    const d = drag!
    const rects = d.moving.map((r) => r.getBoundingClientRect())
    // Relative to where the pointer went down: the rows have not moved yet.
    d.offsets = rects.map((r) => r.top - d.startClientY)
    d.blockHeight = rects[rects.length - 1].bottom - rects[0].top
    const first = flipStart()
    d.moving.forEach((r, i) => {
      r.classList.add('dragging')
      Object.assign(r.style, {
        position: 'fixed', left: `${rects[i].left}px`, top: `${rects[i].top}px`, width: `${rects[i].width}px`,
        margin: '0', transform: '', transition: 'none',
      })
    })
    // Open the gap where the rows were, so nothing moves until the pointer does.
    d.slot = { list: d.home, at: d.start }
    setGap(d.slot)
    flipEnd(first, snapshot)
  }

  /** Puts the dragged rows back into the page and removes the gap. */
  function settle() {
    const d = drag!
    clearInterval(d.scrollTimer)
    document.body.classList.remove('is-dragging')
    if (d.gap) d.gap.el.style[d.gap.prop] = ''
    for (const r of d.moving) {
      r.classList.remove('dragging')
      Object.assign(r.style, { position: '', left: '', top: '', width: '', margin: '', transition: '' })
    }
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || !button) return
    const here = locate()
    if (!here) return
    button.setPointerCapture(e.pointerId)
    drag = {
      pointerId: e.pointerId, startClientY: e.clientY, lastClientY: e.clientY, active: false,
      moving: here.rows.slice(here.start, here.end), offsets: [], blockHeight: 0,
      home: here.list, start: here.start, end: here.end, slot: null, gap: null, snaps: [],
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return
    drag.lastClientY = e.clientY
    if (!drag.active) {
      if (Math.abs(e.clientY - drag.startClientY) < DRAG_THRESHOLD) return
      drag.active = true
      menuOpen = false
      document.body.classList.add('is-dragging')
      lift()
      drag.scrollTimer = setInterval(() => {
        if (!drag) return
        const cy = drag.lastClientY
        const speed = cy < EDGE ? -12 : cy > innerHeight - EDGE ? 12 : 0
        if (speed) { scrollBy(0, speed); update() }
      }, 16)
    }
    update()
  }

  async function onPointerUp(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return
    const d = drag
    if (!d.active) { drag = null; openMenu(false); return } // a tap or click without dragging
    const slot = d.slot!
    // Convert the slot (rows not being dragged) to an index in the list as it is now.
    const at = slot.list === d.home && slot.at >= d.start ? slot.at + (d.end - d.start) : slot.at
    const crossing = slot.list !== d.home
    const first = new Map<string, number>()
    for (const el of document.querySelectorAll<HTMLElement>('[data-flip-key]')) first.set(el.dataset.flipKey!, el.getBoundingClientRect().top)
    for (const el of flipEls()) { el.style.transition = 'none'; el.style.transform = '' }
    settle()
    drag = null
    onmove({ list: listId(d.home), start: d.start, end: d.end }, { list: listId(slot.list), at })
    await tick()
    flipEnd(first)
    if (at < d.start || at > d.end || crossing) {
      announce(crossing ? `${capitalised} moved to ${listLabel(slot.list)}.` : `${capitalised} moved.`)
    }
  }

  function onPointerCancel() {
    if (!drag) return
    const first = drag.active ? flipStart() : null
    if (drag.active) settle()
    drag = null
    if (first) flipEnd(first)
  }

  // ---- menu (tap / click / Enter) -------------------------------------------------------------

  async function openMenu(focusFirst: boolean) {
    if (menuOpen) { menuOpen = false; return }
    canUp = stepTarget(-1) !== null
    canDown = stepTarget(1) !== null
    menuOpen = true
    if (focusFirst) {
      await tick()
      menuEl?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    }
  }

  // Enter/Space produce a click with detail 0; pointer taps are handled in onPointerUp.
  function onClick(e: MouseEvent) {
    if (e.detail === 0) openMenu(true)
  }

  async function menuStep(d: -1 | 1) {
    menuOpen = false
    await step(d)
  }

  function onWindowPointerDown(e: PointerEvent) {
    if (menuOpen && wrapper && !wrapper.contains(e.target as Node)) menuOpen = false
  }
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
    data-handle-id={id}
    aria-label={`Move ${label}: drag, use arrow keys, or press for options`}
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
      <button type="button" disabled={!canUp} onclick={() => menuStep(-1)}>
        <ArrowUp size={18} aria-hidden="true" />Move up
      </button>
      <button type="button" disabled={!canDown} onclick={() => menuStep(1)}>
        <ArrowDown size={18} aria-hidden="true" />Move down
      </button>
    </div>
  {/if}
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
