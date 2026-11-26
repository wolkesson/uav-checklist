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

  // Checklist list: icon buttons have accessible names; delete asks for confirmation.
  const card = page.locator('.card').first()
  for (const name of ['Run checklist', 'Edit checklist', 'Print or export PDF / Word', 'Export checklist file', 'Delete checklist']) {
    if (!(await card.getByRole('button', { name, exact: true }).count())) fail(`list button "${name}" missing`)
  }
  const before = await page.locator('.card').count()
  await card.getByRole('button', { name: 'Delete checklist' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ timeout: 3000 }).catch(() => fail('delete did not open a confirmation dialog'))
  if (!(await dialog.getByRole('button', { name: 'Cancel' }).evaluate((b) => b === document.activeElement))) fail('Cancel is not focused in the delete dialog')
  await page.keyboard.press('Escape')
  if ((await page.locator('.card').count()) !== before) fail('Escape in the delete dialog removed the checklist')
  await card.getByRole('button', { name: 'Delete checklist' }).click()
  await dialog.getByRole('button', { name: 'Delete checklist' }).click()
  if ((await page.locator('.card').count()) !== before - 1) fail('confirming delete did not remove the checklist')

  await page.getByRole('button', { name: 'New checklist' }).click()
  await page.getByLabel('Title', { exact: true }).fill('Smoke test')
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG })
  await page.locator('.logo-row img').waitFor({ timeout: 5000 }).catch(() => fail('logo upload did not show the logo'))

  // Editor: icon toggles report their state; critical toggles on and off.
  const critical = page.getByRole('button', { name: 'Critical item (never skip)' }).first()
  if ((await critical.getAttribute('aria-pressed')) !== 'false') fail('critical toggle should start off')
  await critical.click()
  if ((await critical.getAttribute('aria-pressed')) !== 'true') fail('critical toggle did not turn on')
  for (const name of ['Back to checklists', 'Run checklist', 'Add item', 'Add section', 'Delete item', 'Delete section']) {
    if (!(await page.getByRole('button', { name, exact: true }).count())) fail(`editor button "${name}" missing`)
  }

  await page.getByRole('button', { name: 'Print or export PDF / Word' }).click()
  await page.locator('.sheet').first().waitFor({ timeout: 5000 }).catch(() => fail('print preview rendered no pages'))
  if (!(await page.locator('.sheet .page-header img').count())) fail('logo missing from printed header')

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.getByRole('button', { name: 'Export Word' }).click(),
  ]).catch(() => [null])
  if (!download || !download.suggestedFilename().endsWith('.docx')) fail('Word export did not download a .docx')

  if (errors.length) fail('browser errors:\n  ' + errors.join('\n  '))
  await browser.close()
  if (!process.exitCode) console.log('e2e smoke test passed (list icons, delete confirmation, editor icons, logo upload, print preview, Word export, CSP applied)')
} finally {
  server.kill()
}
