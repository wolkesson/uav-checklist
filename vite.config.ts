import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

// base: './' keeps every asset path relative, so the same build works on
// Cloudflare Pages, in a sub-folder, or from a local server in an airgapped network.
export default defineConfig({
  base: './',
  server: { host: process.env.CODESPACES || process.env.REMOTE_CONTAINERS ? true : 'localhost' },
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'UAV Checklist',
        short_name: 'UAV Checklist',
        description: 'Write and run checklists for UAV flights. Works offline.',
        theme_color: '#1f2937',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,json}'] },
    }),
  ],
  test: { include: ['src/**/*.test.ts'] },
})
