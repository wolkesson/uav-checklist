import type { ChecklistItem, SectionStyle } from '../model'

/**
 * Zebra band per item: bullets share the band of the item above them, so a
 * parent and its bullet list read as one shaded block (like the Word original).
 * Returns true for shaded rows. First top-level item is shaded. Notes sections are not striped.
 */
export function bands(items: ChecklistItem[], style?: SectionStyle): boolean[] {
  if (style === 'notes') return items.map(() => false) // reference text: no box, no stripes
  let n = -1
  return items.map((it) => {
    if (it.type !== 'bullet') n++
    return n % 2 === 0
  })
}
