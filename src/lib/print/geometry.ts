import { PAPER_SIZES, type PrintSettings } from '../model'

/** Page geometry in mm, shared by the HTML print layout and the Word export. */
export function geometry(p: PrintSettings) {
  const { width, height } = PAPER_SIZES[p.paper]
  const margin = { top: 6, side: 5, bottom: 6 }
  const header = 11 // logo / title / revision band
  const footer = 5
  const headerGap = 3
  const footerGap = 3
  const columnGap = 8
  const contentTop = margin.top + header + headerGap
  const contentBottom = margin.bottom + footer + footerGap
  const contentWidth = width - 2 * margin.side
  const columnWidth = (contentWidth - (p.columns - 1) * columnGap) / p.columns
  return {
    width, height, margin, header, footer, columnGap, contentTop, contentBottom, contentWidth, columnWidth,
    contentHeight: height - contentTop - contentBottom,
    sectionGap: 4,
  }
}

export const PX_PER_MM = 96 / 25.4

/** Largest printed logo in mm (header, left); the editor preview uses the same box. */
export const LOGO_MAX = { width: 40, height: 10 }
