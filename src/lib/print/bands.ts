import type { ChecklistItem } from '../model'

/**
 * Zebra band per item: bullets share the band of the item above them, so a
 * parent and its bullet list read as one shaded block (like the Word original).
 * Returns true for shaded rows. First top-level item is shaded.
 */
export function bands(items: ChecklistItem[]): boolean[] {
  let n = -1
  return items.map((it) => {
    if (it.type !== 'bullet') n++
    return n % 2 === 0
  })
}
