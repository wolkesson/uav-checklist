<script lang="ts">
  import { appVersionLabel } from '../buildInfo'
  const label = appVersionLabel()
</script>

<!-- Faded version label, bottom right. Not printed. -->
<div class="version-tag no-print" title="App version">{label}</div>

<style>
  .version-tag {
    position: fixed; z-index: 5;
    right: max(8px, env(safe-area-inset-right, 0px));
    bottom: max(6px, env(safe-area-inset-bottom, 0px));
    font-size: .72rem; color: var(--muted); opacity: .6;
    pointer-events: none; user-select: none; font-variant-numeric: tabular-nums;
  }
  @media print { .version-tag { display: none; } }
</style>
