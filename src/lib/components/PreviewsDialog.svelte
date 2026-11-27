<script lang="ts">
  import { ExternalLink, X } from '@lucide/svelte'
  import { fetchPreviews, PRODUCTION_URL, type PreviewResult } from '../previews'

  /** Lists production and the open pull requests' Cloudflare previews (see previews.ts). */
  let { open = $bindable(false) }: { open: boolean } = $props()

  const uid = $props.id()
  let dialog: HTMLDialogElement | undefined = $state()
  let result = $state<PreviewResult | null>(null)
  const current = __APP_BRANCH__

  $effect(() => {
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      result = null
      fetchPreviews().then((r) => (result = r))
    } else if (!open && dialog.open) {
      dialog.close()
    }
  })
</script>

<dialog bind:this={dialog} onclose={() => (open = false)} aria-labelledby="{uid}-title">
  <div class="head">
    <h2 id="{uid}-title">Available versions</h2>
    <button type="button" class="close" aria-label="Close" onclick={() => (open = false)}><X size={20} aria-hidden="true" /></button>
  </div>
  <ul>
    <li>
      <a href={PRODUCTION_URL} target="_blank" rel="noopener">Production <ExternalLink size={14} aria-hidden="true" /></a>
      <span class="muted small">main{#if !current || current === 'main'}{' · '}<strong>You are here</strong>{/if}</span>
    </li>
    {#if result === null}
      <li class="muted" role="status">Checking GitHub for previews…</li>
    {:else if !result.ok}
      <li class="error" role="alert">{result.message}</li>
    {:else if result.previews.length === 0}
      <li class="muted">No open pull requests, so no previews right now.</li>
    {:else}
      {#each result.previews as p (p.number)}
        <li>
          <a href={p.url} target="_blank" rel="noopener">#{p.number} {p.title} <ExternalLink size={14} aria-hidden="true" /></a>
          <span class="muted small">{p.branch}{#if p.branch === current}{' · '}<strong>You are here</strong>{/if}{' · '}<a
            href={p.prUrl} target="_blank" rel="noopener">pull request</a></span>
        </li>
      {/each}
    {/if}
  </ul>
</dialog>

<style>
  dialog {
    width: min(520px, calc(100vw - 32px)); max-height: min(80vh, 640px); overflow: auto;
    border: 1px solid var(--border); border-radius: 10px; padding: 16px 20px 20px;
    background: var(--bg); color: var(--fg); box-shadow: 0 10px 40px rgba(0, 0, 0, .35);
  }
  dialog::backdrop { background: rgba(0, 0, 0, .45); }
  .head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  h2 { font-size: 1.15rem; margin: 0; text-transform: none; letter-spacing: normal; }
  .close { width: 40px; height: 40px; padding: 0; display: grid; place-items: center; }
  ul { list-style: none; padding: 0; margin: 12px 0 0; display: grid; gap: 10px; }
  li { display: grid; gap: 2px; }
  li > a { font-weight: 600; color: var(--accent); overflow-wrap: anywhere; display: inline-flex; gap: 6px; align-items: center; }
  .small { overflow-wrap: anywhere; }
  .small a { color: inherit; }
</style>
