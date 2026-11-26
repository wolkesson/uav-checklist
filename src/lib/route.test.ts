import { describe, expect, it } from 'vitest'
import { formatHash, parseHash, type View } from './route'

describe('route', () => {
  it('round-trips views through the hash', () => {
    const views: View[] = [{ name: 'list' }, { name: 'edit', id: 'a b/c' }, { name: 'run', id: 'x' }, { name: 'print', id: 'y' }]
    for (const v of views) expect(parseHash(formatHash(v))).toEqual(v)
  })
  it('falls back to the list for unknown hashes', () => {
    for (const h of ['', '#', '#/', '#/edit/', '#/delete/x', 'garbage']) expect(parseHash(h)).toEqual({ name: 'list' })
  })
})
