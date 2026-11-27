import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { buildPdf } from './pdf'
import { parseFile } from '../io'
import { newId, type Checklist } from '../model'
import sample from '../../../samples/quadcopter-basic.json'

// 2x1 px PNG, generated, so no real logo is ever needed in the repo.
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR4nGP4z8DwnwEIGAEAHPAD/dK8i6IAAAAASUVORK5CYII='

const item = (text: string, extra: object = {}) => ({ id: newId(), kind: 'check' as const, text, expected: 'CHECK', ...extra })

describe('PDF export', () => {
  it('builds a PDF for every paper size and column count', async () => {
    const [c] = parseFile(JSON.stringify(sample))
    for (const paper of ['A5', 'A4', 'Letter'] as const) {
      for (const columns of [1, 2] as const) {
        const bytes = await buildPdf({ ...c, print: { paper, columns } })
        expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
        expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0)
      }
    }
  })

  it('handles every item type, box style, formatting, logo and unsupported characters', async () => {
    const c: Checklist = {
      id: 'x', title: '**Test** 1^st^ — ≥ ✓', revision: 3, revisionDate: '2026-11-27', updatedAt: '',
      effectivity: 'Effectivity: Rädda, Larma, Släck', logo: PNG, print: { paper: 'A5', columns: 2 },
      sections: [
        { id: 's1', title: 'Normal', items: [item('Parent'), item('Bullet one', { type: 'bullet' }), item('*Italic* critical', { type: 'critical' })] },
        { id: 's2', title: '1^st^ flight', style: 'info', items: [item('A long description that has to wrap over several lines in a narrow column', { expected: 'A LONG EXPECTED VALUE TOO' })] },
        { id: 's3', title: 'Crash', style: 'emergency', items: [item('On abort', { type: 'abort', expected: 'LAND' })] },
      ],
    }
    const bytes = await buildPdf(c)
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
    expect(doc.getTitle()).toBe('Test 1st — ≥ ✓')
  })

  it('paginates a long checklist onto several pages', async () => {
    const items = Array.from({ length: 150 }, (_, i) => item(`Item ${i}`))
    const c: Checklist = { id: 'y', title: 'Long', revision: 1, updatedAt: '', sections: [{ id: 's', title: 'All', items }] }
    expect((await PDFDocument.load(await buildPdf(c))).getPageCount()).toBeGreaterThan(1)
  })
})
