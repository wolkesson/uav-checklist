<script lang="ts">
  /** Dialog to correct a draft's version number and date by hand (editor ⋯ menu). */
  let {
    open = $bindable(false),
    revision,
    date,
    onsave,
  }: { open: boolean; revision: number; date: string; onsave: (revision: number, date: string) => void } = $props()

  const uid = $props.id()
  let dialog: HTMLDialogElement | undefined = $state()
  let rev = $state(1)
  let day = $state('')
  let error = $state('')
  let firstInput: HTMLInputElement | undefined = $state()

  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) {
      rev = revision
      day = date
      error = ''
      dialog.showModal()
      firstInput?.focus()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  })

  function save(e: SubmitEvent) {
    e.preventDefault()
    if (!Number.isInteger(rev) || rev < 1) { error = 'Version must be a whole number of 1 or more.'; return }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) { error = 'Choose a date.'; return }
    onsave(rev, day)
    open = false
  }
</script>

<dialog bind:this={dialog} onclose={() => (open = false)} aria-labelledby="{uid}-title">
  <form onsubmit={save}>
    <h2 id="{uid}-title">Edit version and date</h2>
    <p class="hint">For corrections, for example to match a version on paper.</p>
    <div class="two">
      <label>Version <input bind:this={firstInput} type="number" min="1" step="1" bind:value={rev} id="{uid}-rev" /></label>
      <label>Date <input type="date" bind:value={day} id="{uid}-date" /></label>
    </div>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <div class="buttons">
      <button type="button" onclick={() => (open = false)}>Cancel</button>
      <button type="submit" class="primary">Save</button>
    </div>
  </form>
</dialog>

<style>
  dialog {
    width: min(420px, calc(100vw - 32px)); border: 1px solid var(--border); border-radius: 10px;
    padding: 20px; background: var(--bg); color: var(--fg); box-shadow: 0 10px 40px rgba(0, 0, 0, .35);
  }
  dialog::backdrop { background: rgba(0, 0, 0, .45); }
  h2 { font-size: 1.15rem; margin: 0; text-transform: none; letter-spacing: normal; }
  .hint { margin: 6px 0 12px; color: var(--muted); }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  label { display: grid; gap: 4px; font-size: .9rem; }
  input { min-height: 40px; }
  .error { color: var(--danger); margin: 8px 0 0; }
  .buttons { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
  .buttons button { min-height: 40px; padding: 6px 16px; }
</style>
