#!/usr/bin/env node
// Browser smoke test of the production build, run with the production
// Content-Security-Policy from public/_headers applied (the local preview server
// does not send it, Cloudflare does). Usage: npm run e2e  (builds first)
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

const PORT = 4179
const BASE = `http://127.0.0.1:${PORT}/`
const csp = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8')
  .match(/Content-Security-Policy:\s*(.+)/)[1].trim()
// 2x1 px PNG: a generated test logo, so no real logo is ever needed in the repo.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8DwnwEIGAEAHPAD/dK8i6IAAAAASUVORK5CYII=', 'base64')

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], {
  stdio: 'ignore', shell: process.platform === 'win32',
})
const fail = (msg) => { console.error('FAIL:', msg); process.exitCode = 1 }

try {
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(BASE)).ok) break } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250))
  }
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {})
  const ctx = await browser.newContext({ acceptDownloads: true })
  await ctx.route(`${BASE}**`, async (route) => {
    const r = await route.fetch()
    await route.fulfill({ response: r, headers: { ...r.headers(), 'content-security-policy': csp } })
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto(BASE)
  await page.getByRole('button', { name: 'New checklist' }).click()
  await page.getByLabel('Title', { exact: true }).fill('Smoke test')
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG })
  await page.locator('.logo-row img').waitFor({ timeout: 5000 }).catch(() => fail('logo upload did not show the logo'))

  await page.getByRole('button', { name: 'Print / Export' }).click()
  await page.locator('.sheet').first().waitFor({ timeout: 5000 }).catch(() => fail('print preview rendered no pages'))
  if (!(await page.locator('.sheet .page-header img').count())) fail('logo missing from printed header')

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.getByRole('button', { name: 'Export Word' }).click(),
  ]).catch(() => [null])
  if (!download || !download.suggestedFilename().endsWith('.docx')) fail('Word export did not download a .docx')

  if (errors.length) fail('browser errors:\n  ' + errors.join('\n  '))
  await browser.close()
  if (!process.exitCode) console.log('e2e smoke test passed (logo upload, print preview, Word export, CSP applied)')
} finally {
  server.kill()
}
