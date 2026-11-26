import { describe, expect, it } from 'vitest'
import { parseMarkup, plainText } from './markup'

describe('parseMarkup', () => {
  it('returns plain text as one run', () => {
    expect(parseMarkup('Airspace')).toEqual([{ text: 'Airspace' }])
  })
  it('parses italic, bold and superscript', () => {
    expect(parseMarkup('*M3C:* Select **now** 1^st^')).toEqual([
      { text: 'M3C:', italic: true },
      { text: ' Select ' },
      { text: 'now', bold: true },
      { text: ' 1' },
      { text: 'st', sup: true },
    ])
  })
  it('leaves unmatched marks alone', () => {
    expect(plainText('5 * 3 ^ 2')).toBe('5 * 3 ^ 2')
  })
})
