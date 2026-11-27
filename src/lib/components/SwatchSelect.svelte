<script module lang="ts">
  export interface SwatchOption<V extends string> {
    value: V
    label: string
    /** CSS colour of the square; omit for an outlined (neutral) square. */
    color?: string
  }

</script>

<script lang="ts" generics="T extends string">
  import { tick } from 'svelte'
  import { Check, ChevronDown } from '@lucide/svelte'

  /**
   * Dropdown button with a colour square and a name for each option
   * (docs/ui-guidelines.md, "Dropdowns"). Keyboard: Enter / Space / Arrow Down opens,
   * Arrow Up / Down moves, Enter / Space chooses, Escape or Tab closes.
   */
  let {
    value,
    options,
    label,
    disabled = false,
    onchange,
  }: {
    value: T
    options: SwatchOption<T>[]
    /** Accessible name, e.g. "Box style". */
    label: string
    disabled?: boolean
    onchange: (value: T) => void
  } = $props()

  const uid = $props.id()
  let open = $state(false)
  let active = $state(0)
  let button: HTMLButtonElement | undefined = $state()
  let list: HTMLUListElement | undefined = $state()
  let wrapper: HTMLDivElement | undefined = $state()

  const current = $derived(options.find((o) => o.value === value) ?? options[0])

  async function show() {
    open = true
    active = Math.max(0, options.findIndex((o) => o.value === value))
    await tick()
    list?.focus()
  }

  function close(focusButton = true) {
    open = false
    if (focusButton) button?.focus()
  }

  function choose(i: number) {
    const o = options[i]
    if (o && o.value !== value) onchange(o.value)
    close()
  }

  function onButtonKey(e: KeyboardEvent) {
    if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); show() }
  }

  function onListKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % options.length }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + options.length) % options.length }
    else if (e.key === 'Home') { e.preventDefault(); active = 0 }
    else if (e.key === 'End') { e.preventDefault(); active = options.length - 1 }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(active) }
    else if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'Tab') close(false)
  }
</script>

<svelte:window onpointerdown={(e) => { if (open && wrapper && !wrapper.contains(e.target as Node)) close(false) }} />

<div class="swatch-select" bind:this={wrapper}>
  <button
    type="button"
    class="trigger"
    bind:this={button}
    {disabled}
    aria-haspopup="listbox"
    aria-expanded={open}
    aria-controls={`${uid}-list`}
    aria-label={`${label}: ${current.label}`}
    onclick={() => (open ? close() : show())}
    onkeydown={onButtonKey}
  >
    <span class="swatch" class:outlined={!current.color} style:--swatch={current.color} aria-hidden="true"></span>
    <span class="name">{current.label}</span>
    <ChevronDown size={18} aria-hidden="true" />
  </button>

  {#if open}
    <ul
      class="options"
      id={`${uid}-list`}
      role="listbox"
      tabindex="-1"
      aria-label={label}
      aria-activedescendant={`${uid}-opt-${active}`}
      bind:this={list}
      onkeydown={onListKey}
    >
      {#each options as o, i (o.value)}
        <li
          id={`${uid}-opt-${i}`}
          role="option"
          aria-selected={o.value === value}
          class:active={i === active}
          onpointerenter={() => (active = i)}
          onclick={() => choose(i)}
          onkeydown={() => {}}
        >
          <span class="swatch" class:outlined={!o.color} style:--swatch={o.color} aria-hidden="true"></span>
          <span class="name">{o.label}</span>
          {#if o.value === value}<Check size={18} aria-hidden="true" />{/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .swatch-select { position: relative; }
  .trigger {
    display: inline-flex; align-items: center; gap: 8px; min-height: 40px; padding: 6px 10px;
    white-space: nowrap;
  }
  .trigger:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .swatch {
    width: 16px; height: 16px; border-radius: 3px; flex: none;
    background: var(--swatch); border: 1px solid var(--swatch);
  }
  .swatch.outlined { background: transparent; border: 2px solid var(--fg); }
  .options {
    position: absolute; top: calc(100% + 4px); left: 0; z-index: 25; min-width: 100%;
    list-style: none; margin: 0; padding: 4px;
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, .2);
  }
  .options:focus { outline: none; }
  .options:focus-visible .active { outline: 2px solid var(--accent); outline-offset: -2px; }
  li {
    display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 6px 10px;
    border-radius: 6px; cursor: pointer; white-space: nowrap;
  }
  li.active { background: var(--card); }
  li .name { flex: 1; }
</style>
