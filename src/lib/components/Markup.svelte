<script lang="ts">
  import { parseMarkup } from '../markup'
  let { text }: { text: string } = $props()
</script>

{#each parseMarkup(text ?? '') as r, i (i)}{#if r.sup}<sup>{r.text}</sup>{:else if r.bold}<strong>{r.text}</strong>{:else if r.italic}<em>{r.text}</em>{:else}{r.text}{/if}{/each}
