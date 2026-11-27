<script module lang="ts">
  import type { Component } from 'svelte'
  export interface MenuItem {
    label: string
    icon?: Component<{ size?: number | string; 'aria-hidden'?: boolean | 'true' }>
    danger?: boolean
    disabled?: boolean
    onselect: () => void
  }
</script>

<script lang="ts">
  import { tick } from 'svelte'
  import { Ellipsis } from '@lucide/svelte'

  /**
   * "⋯" button that opens a menu of actions for one object (docs/ui-guidelines.md, "Menus").
   * Keyboard: Enter / Space / Arrow Down opens and focuses the first item; Arrow Up / Down
   * move; Enter runs the item; Escape closes. Destructive items have a solid red background.
   */

  let {
    label,
    items,
    id = undefined,
  }: {
    /** Accessible name and tooltip, e.g. "Section actions". */
    label: string
    items: MenuItem[]
    /** Optional id so focus can be returned to this button after the object moves. */
    id?: string
  } = $props()

  const uid = $props.id()
  let open = $state(false)
  let button: HTMLButtonElement | undefined = $state()
  let menu: HTMLDivElement | undefined = $state()
  let wrapper: HTMLDivElement | undefined = $state()

  const enabled = () => [...(menu?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not(:disabled)') ?? [])]

  async function show(focusLast = false) {
    open = true
    await tick()
    const all = enabled()
    ;(focusLast ? all[all.length - 1] : all[0])?.focus()
  }

  function close(focusButton = true) {
    open = false
    if (focusButton) button?.focus()
  }

  function run(item: MenuItem) {
    close()
    item.onselect()
  }

  function onButtonKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); show() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); show(true) }
  }

  function onMenuKey(e: KeyboardEvent) {
    const all = enabled()
    const i = all.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); all[(i + 1) % all.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); all[(i - 1 + all.length) % all.length]?.focus() }
    else if (e.key === 'Home') { e.preventDefault(); all[0]?.focus() }
    else if (e.key === 'End') { e.preventDefault(); all[all.length - 1]?.focus() }
    else if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'Tab') close(false)
  }
</script>

<svelte:window onpointerdown={(e) => { if (open && wrapper && !wrapper.contains(e.target as Node)) close(false) }} />

<div class="menu-button" bind:this={wrapper}>
  <button
    type="button"
    class="trigger has-tip tip-end"
    bind:this={button}
    data-menu-id={id}
    aria-label={label}
    data-tip={label}
    aria-haspopup="menu"
    aria-expanded={open}
    aria-controls={`${uid}-menu`}
    onclick={() => (open ? close() : show())}
    onkeydown={onButtonKey}
  >
    <Ellipsis size={20} aria-hidden="true" />
  </button>

  {#if open}
    <div class="menu" id={`${uid}-menu`} role="menu" aria-label={label} tabindex="-1" bind:this={menu} onkeydown={onMenuKey}>
      {#each items as item (item.label)}
        <button type="button" role="menuitem" class:danger={item.danger} disabled={item.disabled} onclick={() => run(item)}>
          {#if item.icon}<item.icon size={18} aria-hidden="true" />{/if}{item.label}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .menu-button { position: relative; }
  .trigger { width: 40px; height: 40px; min-height: 40px; padding: 0; display: inline-grid; place-items: center; }
  .trigger:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .menu {
    position: absolute; top: calc(100% + 4px); right: 0; z-index: 25; min-width: 190px;
    display: grid; gap: 2px; padding: 4px;
    background: var(--bg); border: 1px solid var(--border); border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, .2);
  }
  .menu:focus { outline: none; }
  .menu button {
    display: flex; align-items: center; gap: 8px; min-height: 40px; padding: 6px 10px;
    border: none; border-radius: 6px; background: none; text-align: left; white-space: nowrap;
  }
  .menu button:hover:not(:disabled), .menu button:focus-visible { background: var(--card); }
  .menu button:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
  .menu button:disabled { opacity: .45; }
  /* Destructive: solid red, readable on low-contrast screens (guideline). */
  .menu button.danger { background: var(--danger-solid); color: #fff; font-weight: 600; }
  .menu button.danger:hover, .menu button.danger:focus-visible { background: var(--danger-solid); filter: brightness(1.1); }
</style>
