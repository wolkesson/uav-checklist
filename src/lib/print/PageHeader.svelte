<script lang="ts">
  import type { Checklist } from '../model'
  import Markup from '../components/Markup.svelte'
  import { LOGO_MAX } from './geometry'
  let { checklist: c }: { checklist: Checklist } = $props()
</script>

<div class="page-header">
  <div class="logo">{#if c.logo}<img src={c.logo} alt="Logo" style:max-width="{LOGO_MAX.width}mm" style:max-height="{LOGO_MAX.height}mm" />{/if}</div>
  <div class="title"><Markup text={c.title} /></div>
  <div class="rev">{[c.revisionDate, `v${c.revision}`].filter(Boolean).join(', ')}</div>
</div>

<style>
  .page-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; height: 100%; gap: 3mm; font-family: Arial, Helvetica, sans-serif; color: #000; }
  .logo img { display: block; }
  .title { font-family: 'Arial Black', Arial, sans-serif; font-weight: 900; font-size: 12pt; text-align: center; }
  .rev { text-align: right; font-size: 10.5pt; }
</style>
