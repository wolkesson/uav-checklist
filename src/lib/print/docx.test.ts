import { describe, expect, it } from 'vitest'
import { buildDocx } from './docx'
import { parseFile } from '../io'
import sample from '../../../samples/quadcopter-basic.json'

describe('Word export', () => {
  it('builds a .docx (zip) for every paper size and column count', async () => {
    const [c] = parseFile(JSON.stringify(sample))
    for (const paper of ['A5', 'A4', 'Letter'] as const) {
      for (const columns of [1, 2] as const) {
        const blob = await buildDocx({ ...c, print: { paper, columns } })
        const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer())
        expect(String.fromCharCode(...head)).toBe('PK')
        expect(blob.size).toBeGreaterThan(3000)
      }
    }
  })
})
