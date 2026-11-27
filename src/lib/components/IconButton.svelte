<script lang="ts">
  import type { Component } from 'svelte'

  /**
   * Icon-only button with a tooltip. The label is used as the accessible name and as
   * the tooltip, shown on hover (mouse), keyboard focus and long-press (touch).
   * See docs/ui-guidelines.md.
   */
  let {
    icon: Icon,
    label,
    variant = 'default',
    tipAlign = 'center',
    pressed = undefined,
    onclick,
  }: {
    icon: Component<{ size?: number | string; 'aria-hidden'?: boolean | 'true' }>
    label: string
    variant?: 'default' | 'primary' | 'danger'
    tipAlign?: 'center' | 'end'
    /** Set for on/off toggles: true = on. Announced to screen readers via aria-pressed. */
    pressed?: boolean
    onclick?: () => void
  } = $props()

  let tipOnTouch = $state(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let longPressed = false

  function pointerDown(e: PointerEvent) {
    if (e.pointerType !== 'touch') return
    longPressed = false
    timer = setTimeout(() => {
      longPressed = true
      tipOnTouch = true
      setTimeout(() => (tipOnTouch = false), 1500)
    }, 500)
  }
  const pointerEnd = () => clearTimeout(timer)

  function click(e: MouseEvent) {
    // A long-press only shows the tooltip; it must not also trigger the action.
    if (longPressed) {
      e.preventDefault()
      longPressed = false
      return
    }
    onclick?.()
  }
</script>

<button
  type="button"
  class="icon-btn has-tip {variant} tip-{tipAlign}"
  class:tip-touch={tipOnTouch}
  class:pressed
  aria-pressed={pressed}
  aria-label={label}
  data-tip={label}
  onclick={click}
  onpointerdown={pointerDown}
  onpointerup={pointerEnd}
  onpointerleave={pointerEnd}
  onpointercancel={pointerEnd}
  oncontextmenu={(e) => longPressed && e.preventDefault()}
>
  <Icon size={20} aria-hidden="true" />
</button>

<style>
  .icon-btn {
    position: relative; width: 40px; height: 40px; min-height: 40px; padding: 0;
    display: inline-grid; place-items: center;
    -webkit-touch-callout: none; user-select: none;
  }
  .icon-btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-fg); }
  /* Solid red, not just a red icon: readable on low-contrast and sunlit screens. */
  .icon-btn.danger { background: var(--danger-solid); border-color: var(--danger-solid); color: #fff; }
  /* Toggle that is on: accent outline and tint, plus the icon in the accent colour. */
  .icon-btn.pressed { border-color: var(--accent); background: var(--pressed-bg); color: var(--accent); box-shadow: inset 0 0 0 1px var(--accent); }
  .icon-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  /* Tooltip styles are shared in app.css (.has-tip). */
</style>
