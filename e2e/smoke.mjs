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
  // Reduced motion: rows move instantly instead of sliding, so positions are stable to measure.
  const ctx = await browser.newContext({ acceptDownloads: true, reducedMotion: 'reduce' })
  await ctx.route(`${BASE}**`, async (route) => {
    const r = await route.fetch()
    await route.fulfill({ response: r, headers: { ...r.headers(), 'content-security-policy': csp } })
  })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await page.goto(BASE)

  // Checklist list: Run and Edit buttons, the rest in a ⋯ menu; tapping the checklist runs it;
  // delete (from the menu) asks for confirmation.
  const card = page.locator('.card').first()
  for (const name of ['Run checklist', 'Edit checklist', 'Checklist actions']) {
    if (!(await card.getByRole('button', { name, exact: true }).count())) fail(`list button "${name}" missing`)
  }
  await card.getByRole('button', { name: 'Checklist actions' }).click()
  for (const name of ['Print or export PDF / Word', 'Export checklist file', 'Delete checklist']) {
    if (!(await page.getByRole('menuitem', { name }).count())) fail(`list menu item "${name}" missing`)
  }
  await page.keyboard.press('Escape')
  await card.locator('.card-main').click()
  await page.locator('.progress').waitFor({ timeout: 3000 }).catch(() => fail('tapping a checklist did not run it'))
  await page.getByRole('button', { name: 'Back to checklists' }).click()
  const openDelete = async () => {
    await page.locator('.card').first().getByRole('button', { name: 'Checklist actions' }).click()
    await page.getByRole('menuitem', { name: 'Delete checklist' }).click()
  }
  const before = await page.locator('.card').count()
  await openDelete()
  const dialog = page.getByRole('dialog')
  await dialog.waitFor({ timeout: 3000 }).catch(() => fail('delete did not open a confirmation dialog'))
  if (!(await dialog.getByRole('button', { name: 'Cancel' }).evaluate((b) => b === document.activeElement))) fail('Cancel is not focused in the delete dialog')
  await page.keyboard.press('Escape')
  if ((await page.locator('.card').count()) !== before) fail('Escape in the delete dialog removed the checklist')
  await openDelete()
  await dialog.getByRole('button', { name: 'Delete checklist' }).click()
  if ((await page.locator('.card').count()) !== before - 1) fail('confirming delete did not remove the checklist')

  await page.getByRole('button', { name: 'New checklist' }).click()
  await page.getByLabel('Title', { exact: true }).fill('Smoke test')
  if (!(await page.getByRole('button', { name: 'Logo Click to upload' }).count())) fail('logo upload area missing')
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG })
  await page.locator('.logo-pick img').waitFor({ timeout: 5000 }).catch(() => fail('logo upload did not show the logo'))
  if (!(await page.getByRole('button', { name: 'Logo Click to change' }).count())) fail('logo area does not offer to change the logo')
  // Remove logo sits inside the preview area and appears on hover.
  const remove = page.locator('.logo-drop').getByRole('button', { name: 'Remove logo' })
  if (!(await remove.count())) fail('Remove logo is not inside the logo area')
  await page.locator('.logo-drop').hover()
  await remove.click({ timeout: 3000 }).catch(() => fail('Remove logo not clickable on hover'))
  await page.getByRole('button', { name: 'Logo Click to upload' }).waitFor({ timeout: 3000 }).catch(() => fail('removing the logo did not empty the area'))
  await page.locator('input[type=file][accept="image/*"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG })
  await page.locator('.logo-pick img').waitFor({ timeout: 5000 }).catch(() => fail('re-uploading the logo failed'))

  // Editor: an item is exactly one type, chosen in a dropdown.
  const firstType = page.getByLabel('Item type').first()
  if ((await firstType.inputValue()) !== 'normal') fail('new item should be Normal')
  await firstType.selectOption('critical')
  if ((await firstType.inputValue()) !== 'critical') fail('item type did not change to Critical')
  await firstType.selectOption('normal')
  for (const name of ['Back to checklists', 'Run checklist', 'Add item', 'Add section', 'Delete item', 'Section actions']) {
    if (!(await page.getByRole('button', { name, exact: true }).count())) fail(`editor button "${name}" missing`)
  }

  // Reordering items: drag, keyboard and the tap menu (no arrows any more).
  const texts = page.locator('.item .text')
  await texts.first().fill('A')
  await page.getByRole('button', { name: 'Add item' }).click()
  await texts.nth(1).fill('B')
  await page.getByRole('button', { name: 'Add item' }).click()
  await texts.nth(2).fill('C')
  const order = async () => (await texts.evaluateAll((els) => els.map((e) => e.value))).join('')
  if (await page.getByRole('button', { name: /^Move item (up|down)$/ }).count()) fail('item arrow buttons should be gone')
  const handles = page.locator('.item .handle button')

  await handles.nth(0).focus()
  await page.keyboard.press('ArrowDown')
  if ((await order()) !== 'BAC') fail(`keyboard reorder: expected BAC, got ${await order()}`)

  const from = await handles.nth(2).boundingBox() // drag C to the top
  const to = await handles.nth(0).boundingBox()
  await page.mouse.move(from.x + 20, from.y + 20)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(from.x + 20, from.y + 20 + ((to.y - 15 - from.y) * i) / 10)
  await page.mouse.up()
  if ((await order()) !== 'CBA') fail(`drag reorder: expected CBA, got ${await order()}`)

  await handles.nth(0).click() // tap without dragging opens the move menu
  await page.getByRole('button', { name: 'Move down', exact: true }).click()
  if ((await order()) !== 'BCA') fail(`menu reorder: expected BCA, got ${await order()}`)

  // Bullets move with their parent: make C a bullet under B, then move B down past A.
  await page.getByLabel('Item type').nth(1).selectOption('bullet')
  await handles.nth(0).focus()
  await page.keyboard.press('ArrowDown')
  if ((await order()) !== 'ABC') fail(`group move: expected ABC (B kept its bullet C), got ${await order()}`)
  if ((await page.getByLabel('Item type').nth(2).inputValue()) !== 'bullet') fail('C is no longer a bullet after the group move')
  // Dragging A to the bottom lands after the whole B group, never between B and its bullet.
  const a = await handles.nth(0).boundingBox()
  const last = await handles.nth(2).boundingBox()
  await page.mouse.move(a.x + 20, a.y + 20)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(a.x + 20, a.y + 20 + ((last.y + 40 - a.y) * i) / 10)
  await page.mouse.up()
  if ((await order()) !== 'BCA') fail(`drag past a group: expected BCA, got ${await order()}`)

  // Moving items between sections: keyboard at the edge of a section, and dragging.
  await page.getByRole('button', { name: 'Add section' }).click()
  const sec = (n) => page.locator('.section').nth(n)

  // Box style dropdown (keyboard): choose Emergency; the section gets its colour class.
  const styleBtn = sec(1).getByRole('button', { name: /^Box style:/ })
  await styleBtn.focus()
  await page.keyboard.press('ArrowDown') // opens the list on the current option
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  if ((await styleBtn.getAttribute('aria-label')) !== 'Box style: Emergency') fail(`box style dropdown: got ${await styleBtn.getAttribute('aria-label')}`)
  if (!(await sec(1).evaluate((e) => e.classList.contains('style-emergency')))) fail('section did not take the emergency colour')
  // Box style dropdown (mouse): back to Normal.
  await styleBtn.click()
  await page.getByRole('listbox', { name: 'Box style' }).getByRole('option', { name: 'Normal' }).click()
  if ((await styleBtn.getAttribute('aria-label')) !== 'Box style: Normal') fail('box style dropdown did not change back to Normal')

  // Section menu: no drag handle or delete button on sections; Move up/down via the menu.
  if (await sec(0).locator('.section-head .handle').count()) fail('sections should not have a drag handle')
  const titleOf = async (n) => sec(n).getByLabel('Section title').inputValue()
  await sec(0).getByLabel('Section title').fill('First')
  await sec(1).getByLabel('Section title').fill('Second')
  await sec(0).getByRole('button', { name: 'Section actions' }).click()
  if (!(await page.getByRole('menuitem', { name: 'Move up' }).isDisabled())) fail('Move up should be disabled for the first section')
  await page.getByRole('menuitem', { name: 'Move down' }).click()
  if ((await titleOf(0)) !== 'Second' || (await titleOf(1)) !== 'First') fail('section menu Move down did not move the section')
  // Keyboard: the menu button keeps focus after the move; Arrow Down opens the menu.
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter') // first enabled item: Move up
  if ((await titleOf(0)) !== 'First') fail('section menu by keyboard did not move the section up')
  const textsOf = async (n) => (await sec(n).locator('.item .text').evaluateAll((els) => els.map((e) => e.value || '_'))).join('')
  const dragTo = async (handle, y) => {
    const h = await handle.boundingBox()
    await page.mouse.move(h.x + 20, h.y + 20)
    await page.mouse.down()
    for (let i = 1; i <= 12; i++) await page.mouse.move(h.x + 20, h.y + 20 + ((y - h.y - 20) * i) / 12)
    await page.mouse.up()
  }
  // A is the last item of section 1: Arrow Down moves it to the top of section 2.
  await sec(0).locator('.item .handle button').nth(2).focus()
  await page.keyboard.press('ArrowDown')
  if ((await textsOf(0)) !== 'BC' || (await textsOf(1)) !== 'A_') fail(`keyboard to next section: got ${await textsOf(0)} / ${await textsOf(1)}`)
  // Drag B with its bullet C to the end of section 2.
  const lastRow = await sec(1).locator('.item').last().boundingBox()
  await dragTo(sec(0).locator('.item .handle button').first(), lastRow.y + lastRow.height + 2)
  if ((await textsOf(0)) !== '' || (await textsOf(1)) !== 'A_BC') fail(`drag group to other section: got ${await textsOf(0)} / ${await textsOf(1)}`)
  if ((await sec(1).getByLabel('Item type').nth(3).inputValue()) !== 'bullet') fail('C lost its bullet type when moved between sections')
  // Drag A into the now empty section 1.
  const empty = await sec(0).locator('.items').boundingBox()
  await dragTo(sec(1).locator('.item .handle button').first(), empty.y + empty.height / 2)
  if ((await textsOf(0)) !== 'A' || (await textsOf(1)) !== '_BC') fail(`drag into empty section: got ${await textsOf(0)} / ${await textsOf(1)}`)

  // Revision: a new checklist is a draft; version/date can be corrected (and the date is then pinned);
  // Release asks first and locks everything; New draft unlocks with the next version.
  const revLine = page.getByRole('group', { name: 'Revision' })
  if (!(await revLine.textContent()).includes('Draft')) fail('a new checklist should be a draft')
  await revLine.getByRole('button', { name: 'Edit version and date' }).click()
  const revDialog = page.getByRole('dialog', { name: 'Edit version and date' })
  await revDialog.getByRole('spinbutton', { name: 'Version' }).fill('12')
  await revDialog.getByLabel('Date', { exact: true }).fill('2026-11-20')
  await revDialog.getByRole('button', { name: 'Save' }).click()
  await page.getByLabel('Title', { exact: true }).fill('Smoke test edited')
  if (!(await revLine.textContent()).includes('v12 · 2026-11-20')) fail(`edited version/date not kept: ${await revLine.textContent()}`)
  await revLine.getByRole('button', { name: 'Release' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Release v12' }).click()
  if (!(await revLine.textContent()).includes('Released')) fail('Release did not release the checklist')
  if (!(await page.getByLabel('Title', { exact: true }).isDisabled())) fail('a released checklist should be read-only')
  if (await page.getByRole('button', { name: 'Add item' }).count()) fail('a released checklist should hide Add item')
  await revLine.getByRole('button', { name: 'New draft' }).click()
  if (!(await revLine.textContent()).includes('v13')) fail(`New draft should start v13: ${await revLine.textContent()}`)
  if (await page.getByLabel('Title', { exact: true }).isDisabled()) fail('a new draft should be editable')

  await page.getByRole('button', { name: 'Print or export PDF / Word' }).click()
  await page.locator('.sheet').first().waitFor({ timeout: 5000 }).catch(() => fail('print preview rendered no pages'))
  if (!(await page.locator('.sheet .page-header img').count())) fail('logo missing from printed header')
  if (!(await page.locator('.sheet .page-header .draft').count())) fail('DRAFT missing from the printed header of a draft')

  if (!(await page.getByRole('button', { name: 'Print', exact: true }).count())) fail('Print button missing')
  // Export PDF downloads a real PDF directly (no print dialog).
  const [pdf] = await Promise.all([
    page.waitForEvent('download', { timeout: 15000 }),
    page.getByRole('button', { name: 'Export PDF' }).click(),
  ]).catch(() => [null])
  if (!pdf || !pdf.suggestedFilename().endsWith('.pdf')) fail('Export PDF did not download a .pdf')
  else {
    const head = (await import('node:fs')).readFileSync(await pdf.path()).subarray(0, 5).toString()
    if (head !== '%PDF-') fail(`Export PDF file is not a PDF (starts with ${JSON.stringify(head)})`)
  }
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 10000 }),
    page.getByRole('button', { name: 'Export Word' }).click(),
  ]).catch(() => [null])
  if (!download || !download.suggestedFilename().endsWith('.docx')) fail('Word export did not download a .docx')

  // Browser Back returns to the list from print (opened via the editor) and from edit.
  await page.goBack()
  await page.getByRole('button', { name: 'New checklist' }).waitFor({ timeout: 3000 }).catch(() => fail('Back from print did not return to the list'))
  await page.locator('.card').first().getByRole('button', { name: 'Edit checklist' }).click()
  await page.goBack()
  await page.getByRole('button', { name: 'New checklist' }).waitFor({ timeout: 3000 }).catch(() => fail('Back from edit did not return to the list'))
  if (!page.url().startsWith(BASE)) fail(`Back left the app: ${page.url()}`)

  if (errors.length) fail('browser errors:\n  ' + errors.join('\n  '))
  await browser.close()
  if (!process.exitCode) console.log('e2e smoke test passed (list icons and menu, tap to run, delete confirmation, editor icons, revision draft/release, item type, reorder by drag/keyboard/menu with bullet groups and across sections, logo upload, print preview, PDF and Word export, Back button, CSP applied)')
} finally {
  server.kill()
}
