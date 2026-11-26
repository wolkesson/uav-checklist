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
  import { itemUnits, nearestIndex, singleUnits, unitOf, type Unit } from '../reorder'

  /**
   * Drag handle for reordering (docs/ui-guidelines.md, "Reordering").
   *
   * Markup it works with:
   *  - lists:  elements with `data-sortable-list`, `data-group`, `data-list-id`, `data-list-label`;
   *            lists with the same group accept each other's rows (e.g. items across sections);
   *  - rows:   direct children with `data-sortable-item`; bullet rows also have `data-bullet`;
   *            `data-drag-label` is the text shown next to the pointer while dragging.
   *
   * Three ways to move (WCAG 2.2, 2.5.7):
   *  - drag (mouse, pen, touch): a line shows where the row will land, in any list of the group;
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

  // ---- moving ----------------------------------------------------------------------------------

  async function apply(to: { list: HTMLElement; at: number }, direction: string) {
    const here = locate()
    if (!here) return
    const crossing = to.list !== here.list
    onmove({ list: listId(here.list), start: here.start, end: here.end }, { list: listId(to.list), at: to.at })
    announce(crossing ? `${capitalised} moved to ${listLabel(to.list)}.` : `${capitalised} moved ${direction}.`)
    await tick()
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

  interface Target { list: HTMLElement; at: number; y: number }
  interface ListInfo { el: HTMLElement; top: number; bottom: number; left: number; width: number; boundaries: { at: number; y: number }[] }
  interface Drag {
    pointerId: number
    startY: number
    lastClientX: number
    lastClientY: number
    active: boolean
    moving: HTMLElement[]
    home: HTMLElement
    start: number
    end: number
    lists: ListInfo[]
    target: Target | null
    indicator?: HTMLElement
    ghost?: HTMLElement
    scrollTimer?: ReturnType<typeof setInterval>
  }
  let drag: Drag | null = null

  /** Document y of the possible drop positions (between units) in a list. */
  function measure(list: HTMLElement): ListInfo {
    const r = list.getBoundingClientRect()
    const top = r.top + scrollY
    const rows = rowsIn(list)
    const boxes = rows.map((row) => { const b = row.getBoundingClientRect(); return { top: b.top + scrollY, bottom: b.bottom + scrollY } })
    const boundaries = unitsIn(rows).map(([s]) => ({
      at: s,
      y: s === 0 ? boxes[0].top - 3 : (boxes[s - 1].bottom + boxes[s].top) / 2,
    }))
    boundaries.push({ at: rows.length, y: rows.length ? boxes[rows.length - 1].bottom + 3 : top + r.height / 2 })
    return { el: list, top, bottom: top + r.height, left: r.left + scrollX, width: r.width, boundaries }
  }

  function onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || !button) return
    const here = locate()
    if (!here) return
    button.setPointerCapture(e.pointerId)
    drag = {
      pointerId: e.pointerId, startY: e.clientY + scrollY, lastClientX: e.clientX, lastClientY: e.clientY, active: false,
      moving: here.rows.slice(here.start, here.end), home: here.list, start: here.start, end: here.end,
      lists: [], target: null,
    }
  }

  function update() {
    if (!drag || !drag.lists.length) return
    const y = drag.lastClientY + scrollY
    // A small label follows the pointer; the rows themselves stay in place (dimmed).
    drag.ghost!.style.transform = `translate(${drag.lastClientX + 16}px, ${drag.lastClientY - 18}px)`
    // The list under the pointer, otherwise the nearest one.
    const dist = (l: ListInfo) => (y < l.top ? l.top - y : y > l.bottom ? y - l.bottom : 0)
    const list = drag.lists.reduce((a, b) => (dist(b) < dist(a) ? b : a))
    const b = list.boundaries[nearestIndex(y, list.boundaries.map((x) => x.y))]
    const noop = list.el === drag.home && b.at >= drag.start && b.at <= drag.end
    drag.target = noop ? null : { list: list.el, at: b.at, y: b.y }
    const ind = drag.indicator!
    ind.hidden = noop
    ind.style.top = `${b.y - 1.5}px`
    ind.style.left = `${list.left}px`
    ind.style.width = `${list.width}px`
  }

  function onPointerMove(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return
    drag.lastClientX = e.clientX
    drag.lastClientY = e.clientY
    if (!drag.active) {
      if (Math.abs(e.clientY + scrollY - drag.startY) < DRAG_THRESHOLD) return
      drag.active = true
      menuOpen = false
      drag.lists = listsInGroup().map(measure)
      for (const r of drag.moving) r.classList.add('drag-source')
      drag.indicator = Object.assign(document.createElement('div'), { className: 'drop-indicator' })
      const extra = drag.moving.length - 1
      const name = drag.moving[0].dataset.dragLabel || capitalised
      drag.ghost = Object.assign(document.createElement('div'), {
        className: 'drag-ghost',
        textContent: extra ? `${name}  + ${extra} bullet${extra > 1 ? 's' : ''}` : name,
      })
      drag.ghost.setAttribute('aria-hidden', 'true')
      document.body.append(drag.indicator, drag.ghost)
      document.body.classList.add('is-dragging')
      drag.scrollTimer = setInterval(() => {
        if (!drag) return
        const cy = drag.lastClientY
        const speed = cy < EDGE ? -12 : cy > innerHeight - EDGE ? 12 : 0
        if (speed) { scrollBy(0, speed); update() }
      }, 16)
    }
    update()
  }

  function endDrag() {
    if (!drag) return
    clearInterval(drag.scrollTimer)
    drag.indicator?.remove()
    drag.ghost?.remove()
    document.body.classList.remove('is-dragging')
    for (const r of drag.moving) r.classList.remove('drag-source')
  }

  function onPointerUp(e: PointerEvent) {
    if (!drag || e.pointerId !== drag.pointerId) return
    const { active, target, home, start } = drag
    endDrag()
    drag = null
    if (!active) { openMenu(false); return } // a tap or click without dragging
    if (target) apply(target, target.list === home && target.at < start ? 'up' : 'down')
  }

  function onPointerCancel() {
    endDrag()
    drag = null
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
