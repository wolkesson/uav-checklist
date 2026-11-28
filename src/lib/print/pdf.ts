/**
 * Direct PDF export (no print dialog). Loaded on demand so pdf-lib is not in the main bundle.
 * Follows the HTML print layout: same geometry (geometry.ts), pagination engine (layout.ts),
 * box styles, striping (bands.ts), bullets, caution and abort rows. Text uses the standard PDF
 * Helvetica fonts (same widths as Arial), so nothing needs embedding and text stays selectable.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from 'pdf-lib'
import { DEFAULT_PRINT, type Checklist, type ChecklistItem, type ChecklistSection, type SectionStyle } from '../model'
import { parseMarkup, type Run } from '../markup'
import { bands } from './bands'
import { geometry } from './geometry'
import { layout, type MeasuredSection } from './layout'
import { safeFilename } from '../io'
import { isDraft, revisionText } from '../revision'

const PT = 72 / 25.4 // points per mm
const color = (hex: string): RGB => rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255)
const BLACK = color('000000')
const WHITE = color('FFFFFF')
const SHADE = color('F2F2F2')
const ABORT = color('E04403')
const CAUTION = color('FFFF00')
const DRAFT_RED = color('C00000')
const STYLE: Record<SectionStyle, { border: RGB; width: number; titleFill?: RGB }> = {
  normal: { border: BLACK, width: 0.5 },
  info: { border: color('00B0F0'), width: 2.25, titleFill: color('00B0F0') },
  green: { border: color('92D050'), width: 2.25 },
  emergency: { border: color('FF0000'), width: 2.25, titleFill: color('FF0000') },
  notes: { border: WHITE, width: 0 },
}

// Sizes match SectionBox.svelte (pt, or mm where named).
const SIZE = 10
const TITLE_SIZE = 10.5
const LINE = 1.15 // line height factor (Word's "single" for Arial)
const PAD_MM = 2 // left/right padding in a row
const GAP_MM = 1 // gap between text and value
const BULLET_INDENT_MM = 6
const TITLE_PAD_MM = { top: 0.3, bottom: 0.2 }
// Arial / Helvetica vertical metrics, to place the baseline like the browser does.
const ASCENT = 0.905
const DESCENT = 0.212

interface Fonts { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont }
interface Piece { text: string; font: PDFFont; size: number; rise: number; width: number }
type Line = Piece[]

function fontFor(f: Fonts, bold: boolean, italic: boolean) {
  return bold ? (italic ? f.boldItalic : f.bold) : italic ? f.italic : f.regular
}

/** The standard fonts only cover Latin-1-ish text (WinAnsi); anything else becomes "?". */
const supported = new Map<string, boolean>()
function sanitize(text: string, font: PDFFont): string {
  let out = ''
  for (const ch of text.replace(/\t/g, ' ')) {
    let ok = supported.get(ch)
    if (ok === undefined) {
      try { font.encodeText(ch); ok = true } catch { ok = false }
      supported.set(ch, ok)
    }
    out += ok ? ch : '?'
  }
  return out
}

/** Splits formatted text into words and wraps it to `maxWidth` points. */
function wrap(runs: Run[], fonts: Fonts, size: number, maxWidth: number, opts: { bold?: boolean; upper?: boolean } = {}): Line[] {
  const lines: Line[] = [[]]
  let x = 0
  for (const r of runs) {
    const font = fontFor(fonts, !!(opts.bold || r.bold), !!r.italic)
    const s = r.sup ? size * 0.65 : size
    const rise = r.sup ? size * 0.35 : 0
    const text = sanitize(opts.upper ? r.text.toUpperCase() : r.text, font)
    for (const word of text.split(/(\s+)/)) {
      if (!word) continue
      const space = /^\s+$/.test(word)
      const w = font.widthOfTextAtSize(space ? ' ' : word, s)
      if (!space && x + w > maxWidth && x > 0) {
        // Start a new line; drop the space that ended the previous one.
        const prev = lines[lines.length - 1]
        while (prev.length && /^\s+$/.test(prev[prev.length - 1].text)) { x -= prev.pop()!.width }
        lines.push([])
        x = 0
      }
      if (space && x === 0) continue
      lines[lines.length - 1].push({ text: space ? ' ' : word, font, size: s, rise, width: w })
      x += w
    }
  }
  return lines
}

const lineWidth = (l: Line) => l.reduce((a, p) => a + p.width, 0)

interface RowLayout { text: Line[]; value: Line[]; height: number; item: ChecklistItem }

function layoutRow(item: ChecklistItem, style: SectionStyle, fonts: Fonts, innerWidth: number): RowLayout {
  const lh = SIZE * LINE
  const bullet = item.type === 'bullet'
  const indent = bullet ? BULLET_INDENT_MM * PT : 0
  let value: Line[] = []
  let valueWidth = 0
  if (item.expected) {
    // The value keeps its natural width up to 75 %; the description wraps first (as in the HTML).
    value = wrap(parseMarkup(item.expected), fonts, SIZE, innerWidth * 0.75, { bold: style === 'emergency' })
    valueWidth = Math.max(...value.map(lineWidth))
  }
  const textWidth = innerWidth - indent - (item.expected ? valueWidth + GAP_MM * PT : 0)
  const text = wrap(parseMarkup(item.text), fonts, SIZE, Math.max(textWidth, SIZE * 2))
  return { text, value, height: Math.max(text.length, value.length, 1) * lh, item }
}

interface SectionLayout { title: Line[]; titleHeight: number; rows: RowLayout[]; border: number }

function layoutSection(s: ChecklistSection, fonts: Fonts, boxWidth: number): SectionLayout {
  const st = STYLE[s.style ?? 'normal']
  const inner = boxWidth - 2 * st.width - 2 * PAD_MM * PT
  const title = wrap(parseMarkup(s.title), fonts, TITLE_SIZE, inner, { bold: true, upper: true })
  const titleHeight = title.length * TITLE_SIZE * LINE + (TITLE_PAD_MM.top + TITLE_PAD_MM.bottom) * PT
  return { title, titleHeight, rows: s.items.map((it) => layoutRow(it, s.style ?? 'normal', fonts, inner)), border: st.width }
}

/** Draws lines of text starting at (x, top) in PDF coordinates (y grows upwards). */
function drawLines(page: PDFPage, lines: Line[], x: number, top: number, size: number, colour: RGB, align: 'left' | 'right' = 'left', right = 0) {
  const lh = size * LINE
  lines.forEach((line, i) => {
    const baseline = top - i * lh - ((lh - (ASCENT + DESCENT) * size) / 2 + ASCENT * size)
    let cx = align === 'right' ? right - lineWidth(line) : x
    for (const p of line) {
      if (p.text !== ' ') page.drawText(p.text, { x: cx, y: baseline + p.rise, size: p.size, font: p.font, color: colour })
      cx += p.width
    }
  })
}

function drawBox(page: PDFPage, s: ChecklistSection, sl: SectionLayout, from: number, to: number, showTitle: boolean,
  fonts: Fonts, x: number, top: number, width: number): number {
  const st = STYLE[s.style ?? 'normal']
  const bw = st.width
  const shade = bands(s.items, s.style)
  const innerX = x + bw
  const innerW = width - 2 * bw
  let y = top - bw
  if (showTitle) {
    if (st.titleFill) page.drawRectangle({ x: innerX, y: y - sl.titleHeight, width: innerW, height: sl.titleHeight, color: st.titleFill })
    drawLines(page, sl.title, innerX + PAD_MM * PT, y - TITLE_PAD_MM.top * PT, TITLE_SIZE, st.titleFill ? WHITE : BLACK)
    y -= sl.titleHeight
  }
  for (let i = from; i < to; i++) {
    const r = sl.rows[i]
    const abort = r.item.type === 'abort'
    const fill = abort ? ABORT : r.item.type === 'caution' ? CAUTION : shade[i] ? SHADE : undefined
    if (fill) page.drawRectangle({ x: innerX, y: y - r.height, width: innerW, height: r.height, color: fill })
    const fg = abort ? WHITE : BLACK
    const left = innerX + PAD_MM * PT
    const right = innerX + innerW - PAD_MM * PT
    if (r.item.type === 'bullet') {
      drawLines(page, [[{ text: '•', font: fonts.regular, size: SIZE, rise: 0, width: 0 }]], left + 1.5 * PT, y, SIZE, fg)
      drawLines(page, r.text, left + BULLET_INDENT_MM * PT, y, SIZE, fg)
    } else {
      drawLines(page, r.text, left, y, SIZE, fg)
    }
    if (r.value.length) drawLines(page, r.value, 0, y, SIZE, fg, 'right', right)
    y -= r.height
  }
  const height = top - (y - bw)
  if (bw) page.drawRectangle({ x: x + bw / 2, y: top - height + bw / 2, width: width - bw, height: height - bw, borderColor: st.border, borderWidth: bw })
  return height
}

async function embedLogo(doc: PDFDocument, dataUrl: string): Promise<PDFImage | null> {
  const [meta, b64] = dataUrl.split(',')
  const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))
  if (meta.includes('png')) return doc.embedPng(bytes)
  if (meta.includes('jpeg') || meta.includes('jpg')) return doc.embedJpg(bytes)
  return null // logos are stored as PNG; other formats are skipped
}

export async function buildPdf(c: Checklist): Promise<Uint8Array> {
  const settings = c.print ?? DEFAULT_PRINT
  const g = geometry(settings)
  const doc = await PDFDocument.create()
  doc.setTitle(c.title.replace(/[*^]/g, ''))
  doc.setCreator('UAV Checklist')
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  }
  const colW = g.columnWidth * PT
  const sections = c.sections.map((s) => layoutSection(s, fonts, colW))
  const measured: MeasuredSection[] = sections.map((sl, i) => ({
    title: sl.titleHeight,
    items: sl.rows.map((r) => r.height),
    levels: c.sections[i].items.map((it) => (it.type === 'bullet' ? 1 : 0)),
    border: 2 * sl.border,
    keepTogether: c.sections[i].style === 'emergency',
  }))
  const pages = layout(measured, { columnHeight: g.contentHeight * PT, columns: settings.columns, gap: g.sectionGap * PT })
  const logo = c.logo ? await embedLogo(doc, c.logo) : null
  const W = g.width * PT
  const H = g.height * PT
  const rev = sanitize(revisionText(c), fonts.regular)
  const draftMark = isDraft(c) ? 'DRAFT ' : ''

  pages.forEach((columns, pi) => {
    const page = doc.addPage([W, H])
    // Header: logo left, title centre, date + revision right.
    const hTop = H - g.margin.top * PT
    const hMid = hTop - (g.header * PT) / 2
    const left = g.margin.side * PT
    const right = W - g.margin.side * PT
    if (logo) {
      const scale = Math.min((10 * PT) / logo.height, (40 * PT) / logo.width)
      page.drawImage(logo, { x: left, y: hMid - (logo.height * scale) / 2, width: logo.width * scale, height: logo.height * scale })
    }
    const title = wrap(parseMarkup(c.title), fonts, 12, (right - left) / 2, { bold: true })
    drawLines(page, title.slice(0, 1), 0, hMid + 6.9, 12, BLACK, 'right', (W + lineWidth(title[0] ?? [])) / 2)
    const revWidth = fonts.regular.widthOfTextAtSize(rev, 10.5)
    drawLines(page, [[{ text: rev, font: fonts.regular, size: 10.5, rise: 0, width: revWidth }]], 0, hMid + 6, 10.5, BLACK, 'right', right)
    if (draftMark) {
      const w = fonts.bold.widthOfTextAtSize(draftMark, 10.5)
      drawLines(page, [[{ text: draftMark, font: fonts.bold, size: 10.5, rise: 0, width: w }]], 0, hMid + 6, 10.5, DRAFT_RED, 'right', right - revWidth)
    }

    // Columns.
    const contentTop = H - g.contentTop * PT
    let deepest = contentTop
    columns.forEach((segments, ci) => {
      const x = left + ci * (colW + g.columnGap * PT)
      let y = contentTop
      segments.forEach((seg, si) => {
        if (si > 0) y -= g.sectionGap * PT
        y -= drawBox(page, c.sections[seg.section], sections[seg.section], seg.from, seg.to, seg.showTitle, fonts, x, y, colW)
      })
      deepest = Math.min(deepest, y)
    })
    for (let ci = 1; ci < columns.length; ci++) {
      const sx = left + ci * (colW + g.columnGap * PT) - (g.columnGap * PT) / 2
      page.drawLine({ start: { x: sx, y: contentTop }, end: { x: sx, y: deepest }, thickness: 0.75, color: BLACK })
    }

    // Footer: effectivity left, page number right.
    const fy = g.margin.bottom * PT + 1
    const eff = wrap(parseMarkup(c.effectivity ?? ''), fonts, 9, (right - left) * 0.8)
    drawLines(page, eff.slice(0, 1), left, fy + 9 * LINE, 9, BLACK)
    const num = `Page ${pi + 1}`
    page.drawText(num, { x: right - fonts.regular.widthOfTextAtSize(num, 9), y: fy + 2, size: 9, font: fonts.regular, color: BLACK })
  })
  return doc.save()
}

export async function exportPdf(c: Checklist): Promise<void> {
  const bytes = await buildPdf(c)
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: safeFilename(c.title).replace(/\.json$/, '.pdf') })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
