import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

/**
 * Build info shown faded in the corner of the app. Cloudflare's build system sets
 * WORKERS_CI_BRANCH / WORKERS_CI_COMMIT_SHA; elsewhere we ask git, and fall back to nothing.
 */
function git(cmd: string): string {
  try { return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' }
}
const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version as string
const branch = process.env.WORKERS_CI_BRANCH || git('branch --show-current')
const commit = (process.env.WORKERS_CI_COMMIT_SHA || git('rev-parse HEAD')).slice(0, 7)

// base: './' keeps every asset path relative, so the same build works on
// Cloudflare Pages, in a sub-folder, or from a local server in an airgapped network.
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_BRANCH__: JSON.stringify(branch),
    __APP_COMMIT__: JSON.stringify(commit),
  },
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
