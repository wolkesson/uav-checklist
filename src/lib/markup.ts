/**
 * Minimal inline formatting for checklist text, shared by screen, print and Word output:
 *   **bold**   *italic*   ^superscript^
 */
export interface Run {
  text: string
  bold?: boolean
  italic?: boolean
  sup?: boolean
}

const TOKEN = /\*\*(.+?)\*\*|\*(.+?)\*|\^(.+?)\^/g

export function parseMarkup(input: string): Run[] {
  const runs: Run[] = []
  let last = 0
  for (const m of input.matchAll(TOKEN)) {
    if (m.index > last) runs.push({ text: input.slice(last, m.index) })
    if (m[1] !== undefined) runs.push({ text: m[1], bold: true })
    else if (m[2] !== undefined) runs.push({ text: m[2], italic: true })
    else runs.push({ text: m[3], sup: true })
    last = m.index + m[0].length
  }
  if (last < input.length) runs.push({ text: input.slice(last) })
  return runs
}

/** Text without formatting marks, e.g. for search or accessibility. */
export const plainText = (input: string) => parseMarkup(input).map((r) => r.text).join('')
