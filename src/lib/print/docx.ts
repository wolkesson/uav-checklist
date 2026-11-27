/**
 * Word (.docx) export. Loaded on demand so the docx library is not part of the
 * main bundle. Mirrors the HTML print layout: same page size, columns, box styles.
 */
import {
  AlignmentType, BorderStyle, Document, Footer, Header, ImageRun, Packer, PageNumber, Paragraph,
  LineRuleType, ShadingType, Table, TableCell, TableLayoutType, TableRow, TabStopType, TextRun, VerticalAlign, WidthType,
  convertMillimetersToTwip as mm,
} from 'docx'
import { DEFAULT_PRINT, type Checklist, type ChecklistSection, type SectionStyle } from '../model'
import { parseMarkup } from '../markup'
import { bands } from './bands'
import { geometry, LOGO_MAX, PX_PER_MM } from './geometry'
import { safeFilename } from '../io'

const FONT = 'Arial'
const TITLE_FONT = 'Arial Black'
const STYLE: Record<SectionStyle, { border: string; size: number; titleFill?: string }> = {
  normal: { border: '000000', size: 4 },
  info: { border: '00B0F0', size: 18, titleFill: '00B0F0' },
  emergency: { border: 'FF0000', size: 18, titleFill: 'FF0000' },
}
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }

interface RunOpts { font?: string; size?: number; bold?: boolean; color?: string }

function runs(text: string, o: RunOpts = {}): TextRun[] {
  return parseMarkup(text).map(
    (r) => new TextRun({
      text: r.text, font: o.font ?? FONT, size: o.size ?? 20, color: o.color,
      bold: o.bold || r.bold, italics: r.italic, superScript: r.sup,
    }),
  )
}

// Word's 'single' line spacing; AUTO lets a line grow to fit a picture.
const tight = { before: 0, after: 0, line: 240, lineRule: LineRuleType.AUTO }

function sectionTable(s: ChecklistSection, widthMm: number): Table {
  const st = STYLE[s.style ?? 'normal']
  const width = mm(widthMm)
  const border = { style: BorderStyle.SINGLE, size: st.size, color: st.border }
  const cellMargins = { left: mm(2), right: mm(2), top: 0, bottom: 0 }
  const shade = bands(s.items)
  const white = st.titleFill ? 'FFFFFF' : undefined

  const title = new TableRow({
    cantSplit: true,
    children: [new TableCell({
      margins: cellMargins,
      shading: st.titleFill ? { type: ShadingType.CLEAR, color: 'auto', fill: st.titleFill } : undefined,
      children: [new Paragraph({
        keepNext: true, spacing: tight,
        children: runs(s.title.toUpperCase(), { font: TITLE_FONT, size: 21, color: white }),
      })],
    })],
  })

  // One cell per row, value on a right-aligned tab stop (like the original Word checklist):
  // the value keeps its natural width and the text wraps first.
  const right = width - 2 * mm(2)
  // Same rule as the HTML layout: short boxes and emergency boxes are kept in one piece.
  const keepWhole = s.style === 'emergency' || s.items.length <= 8
  const last = s.items.length - 1
  const rows = s.items.map((it, i) => {
    const abort = it.type === 'abort'
    const fill = abort ? 'E04403' : shade[i] ? 'F2F2F2' : undefined
    const color = abort ? 'FFFFFF' : undefined
    const bullet = it.type === 'bullet'
    const tabStops = [
      ...(bullet ? [{ type: TabStopType.LEFT, position: mm(6) }] : []),
      { type: TabStopType.RIGHT, position: right },
    ]
    const children = [
      ...(bullet ? [new TextRun({ text: '•\t', font: FONT, size: 20, color })] : []),
      ...runs(it.text, { color }),
      ...(it.expected
        ? [new TextRun({ text: '\t', font: FONT, size: 20 }), ...runs(it.expected, { color, bold: s.style === 'emergency' })]
        : []),
    ]
    return new TableRow({
      cantSplit: true,
      children: [new TableCell({
        margins: cellMargins,
        shading: fill ? { type: ShadingType.CLEAR, color: 'auto', fill } : undefined,
        children: [new Paragraph({
          spacing: tight, keepNext: i === 0 || (keepWhole && i < last), tabStops,
          indent: bullet ? { left: mm(6), hanging: mm(4.5) } : undefined,
          children,
        })],
      })],
    })
  })

  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: width, type: WidthType.DXA },
    columnWidths: [width],
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: NONE, insideVertical: NONE },
    rows: [title, ...rows],
  })
}

function dataUrlToBytes(url: string): { data: Uint8Array; type: 'png' | 'jpg' | 'gif' } {
  const [meta, b64] = url.split(',')
  const type = meta.includes('jpeg') || meta.includes('jpg') ? 'jpg' : meta.includes('gif') ? 'gif' : 'png'
  const bin = atob(b64)
  const data = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) data[i] = bin.charCodeAt(i)
  return { data, type }
}

async function imageSize(url: string): Promise<{ w: number; h: number }> {
  const img = new Image()
  img.src = url
  await img.decode()
  return { w: img.naturalWidth, h: img.naturalHeight }
}

async function header(c: Checklist, contentWidthMm: number): Promise<Header> {
  const total = mm(contentWidthMm)
  const side = Math.round(total / 4)
  const middle = total - 2 * side
  let logo: Paragraph['options']['children'] = []
  if (c.logo) {
    const { data, type } = dataUrlToBytes(c.logo)
    const { w, h } = await imageSize(c.logo)
    const maxH = LOGO_MAX.height * PX_PER_MM
    const maxW = LOGO_MAX.width * PX_PER_MM
    const scale = Math.min(maxH / h, maxW / w)
    logo = [new ImageRun({ type, data, transformation: { width: Math.round(w * scale), height: Math.round(h * scale) } })]
  }
  const cell = (size: number, children: Paragraph[]) => new TableCell({
    width: { size, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, children,
    borders: { top: NONE, bottom: NONE, left: NONE, right: NONE },
  })
  return new Header({
    children: [new Table({
      layout: TableLayoutType.FIXED,
      width: { size: mm(contentWidthMm), type: WidthType.DXA },
      columnWidths: [side, middle, side],
      borders: { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE },
      rows: [new TableRow({ children: [
        cell(side, [new Paragraph({ spacing: tight, children: logo })]),
        cell(middle, [new Paragraph({ spacing: tight, alignment: AlignmentType.CENTER, children: runs(c.title, { font: TITLE_FONT, size: 24 }) })]),
        cell(side, [new Paragraph({ spacing: tight, alignment: AlignmentType.RIGHT,
          children: runs([c.revisionDate, `v${c.revision}`].filter(Boolean).join(', '), { size: 21 }) })]),
      ] })],
    })],
  })
}

function footer(c: Checklist, contentWidthMm: number): Footer {
  return new Footer({
    children: [new Paragraph({
      spacing: tight,
      tabStops: [{ type: TabStopType.RIGHT, position: mm(contentWidthMm) }],
      children: [
        ...runs(c.effectivity ?? '', { size: 18 }),
        new TextRun({ font: FONT, size: 18, children: ['\tPage ', PageNumber.CURRENT] }),
      ],
    })],
  })
}

export async function buildDocx(c: Checklist): Promise<Blob> {
  const settings = c.print ?? DEFAULT_PRINT
  const g = geometry(settings)
  const body: (Paragraph | Table)[] = []
  c.sections.forEach((s, i) => {
    if (i > 0) body.push(new Paragraph({ spacing: { before: 0, after: 0, line: Math.round(g.sectionGap * 56.7) , lineRule: LineRuleType.EXACT }, children: [] }))
    body.push(sectionTable(s, g.columnWidth))
  })
  const doc = new Document({
    creator: 'UAV Checklist',
    title: c.title,
    styles: { default: { document: { run: { font: FONT, size: 20 }, paragraph: { spacing: tight } } } },
    sections: [{
      properties: {
        page: {
          size: { width: mm(g.width), height: mm(g.height) },
          margin: {
            top: mm(g.contentTop), bottom: mm(g.contentBottom), left: mm(g.margin.side), right: mm(g.margin.side),
            header: mm(g.margin.top), footer: mm(g.margin.bottom), gutter: 0,
          },
        },
        column: { count: settings.columns, space: mm(g.columnGap), separate: settings.columns > 1, equalWidth: true },
      },
      headers: { default: await header(c, g.contentWidth) },
      footers: { default: footer(c, g.contentWidth) },
      children: body,
    }],
  })
  return Packer.toBlob(doc)
}

export async function exportDocx(c: Checklist): Promise<void> {
  const blob = await buildDocx(c)
  const url = URL.createObjectURL(blob)
  const a = Object.assign(document.createElement('a'), { href: url, download: safeFilename(c.title).replace(/\.json$/, '.docx') })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
