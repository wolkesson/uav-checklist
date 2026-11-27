<script lang="ts">
  import { CircleCheck, TriangleAlert } from '@lucide/svelte'

  /**
   * Confirmation for destructive actions (see docs/ui-guidelines.md).
   * Cancel has the focus when it opens; Esc or Cancel close it without changes.
   */
  let {
    open = $bindable(false),
    title,
    message,
    confirmLabel,
    tone = 'danger',
    onconfirm,
  }: {
    open: boolean; title: string; message: string; confirmLabel: string
    /** danger: destructive (red, warning icon). primary: consequential but not destructive (e.g. Release). */
    tone?: 'danger' | 'primary'
    onconfirm: () => void
  } = $props()

  const uid = $props.id()
  let dialog: HTMLDialogElement | undefined = $state()
  let cancelButton: HTMLButtonElement | undefined = $state()

  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      cancelButton?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  })

  function confirm() {
    open = false
    onconfirm()
  }
</script>

<dialog bind:this={dialog} onclose={() => (open = false)} aria-labelledby="{uid}-title" aria-describedby="{uid}-message">
  <div class="head">
    {#if tone === 'danger'}
      <span class="warn"><TriangleAlert size={22} aria-hidden="true" /></span>
    {:else}
      <span class="ok"><CircleCheck size={22} aria-hidden="true" /></span>
    {/if}
    <h2 id="{uid}-title">{title}</h2>
  </div>
  <p id="{uid}-message">{message}</p>
  <div class="buttons">
    <button type="button" bind:this={cancelButton} onclick={() => (open = false)}>Cancel</button>
    <button type="button" class={tone === 'danger' ? 'danger-solid' : 'primary-solid'} onclick={confirm}>{confirmLabel}</button>
  </div>
</dialog>

<style>
  dialog {
    width: min(420px, calc(100vw - 32px)); border: 1px solid var(--border); border-radius: 10px;
    padding: 20px; background: var(--bg); color: var(--fg); box-shadow: 0 10px 40px rgba(0, 0, 0, .35);
  }
  dialog::backdrop { background: rgba(0, 0, 0, .45); }
  .head { display: flex; gap: 10px; align-items: center; }
  .warn { color: var(--danger); display: inline-grid; }
  .ok { color: var(--accent); display: inline-grid; }
  h2 { font-size: 1.15rem; margin: 0; overflow-wrap: anywhere; text-transform: none; letter-spacing: normal; }
  p { margin: 12px 0 20px; color: var(--muted); }
  .buttons { display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
  .buttons button { min-height: 40px; padding: 6px 16px; }
  .primary-solid { background: var(--accent); border-color: var(--accent); color: var(--accent-fg); font-weight: 600; }
  .danger-solid { background: var(--danger-solid); border-color: var(--danger-solid); color: #fff; font-weight: 600; }
  button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
</style>
