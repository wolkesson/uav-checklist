<script lang="ts">
  import { appVersionLabel } from '../buildInfo'
  import PreviewsDialog from './PreviewsDialog.svelte'

  const label = appVersionLabel()
  // Hidden: 10 taps (or Enter presses) in quick succession open the list of available previews.
  const TAPS = 10
  const MAX_GAP_MS = 1500
  let taps = 0
  let last = 0
  let previewsOpen = $state(false)

  function tap() {
    const now = Date.now()
    taps = now - last > MAX_GAP_MS ? 1 : taps + 1
    last = now
    if (taps >= TAPS) {
      taps = 0
      previewsOpen = true
    }
  }
</script>

<!-- Faded version label, bottom right. Not printed. -->
<button type="button" class="version-tag no-print" aria-label={`App version ${label}`} onclick={tap}>{label}</button>
<PreviewsDialog bind:open={previewsOpen} />

<style>
  .version-tag {
    position: fixed; z-index: 5;
    right: max(8px, env(safe-area-inset-right, 0px));
    bottom: max(6px, env(safe-area-inset-bottom, 0px));
    font: inherit; font-size: .72rem; color: var(--muted); opacity: .6;
    background: none; border: none; padding: 2px 4px; min-height: 0; border-radius: 4px;
    cursor: default; user-select: none; touch-action: manipulation; font-variant-numeric: tabular-nums;
  }
  .version-tag:focus-visible { outline: 2px solid var(--accent); opacity: 1; }
  @media print { .version-tag { display: none; } }
</style>
