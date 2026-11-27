import { describe, expect, it } from 'vitest'
import { fetchPreviews, previewUrl } from './previews'

const response = (status: number, body: unknown) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch

describe('previews', () => {
  it('derives the preview address from the branch name', () => {
    expect(previewUrl('feat/list-icons')).toBe('https://feat-list-icons-uav-checklist.henrik-wolkesson.workers.dev')
    expect(previewUrl('Fix/Logo_Upload')).toBe('https://fix-logo-upload-uav-checklist.henrik-wolkesson.workers.dev')
  })
  it('lists open pull requests with their previews', async () => {
    const r = await fetchPreviews(response(200, [{ number: 22, title: 'Version', html_url: 'https://github.com/x/pull/22', head: { ref: 'feat/version-tag' } }]))
    expect(r).toEqual({ ok: true, previews: [{ number: 22, title: 'Version', branch: 'feat/version-tag',
      url: 'https://feat-version-tag-uav-checklist.henrik-wolkesson.workers.dev', prUrl: 'https://github.com/x/pull/22' }] })
  })
  it('explains rate limits, errors and no connection', async () => {
    expect(await fetchPreviews(response(403, {}))).toMatchObject({ ok: false, message: expect.stringContaining('limits') })
    expect(await fetchPreviews(response(500, {}))).toMatchObject({ ok: false, message: expect.stringContaining('500') })
    const offline = (async () => { throw new TypeError('Failed to fetch') }) as unknown as typeof fetch
    expect(await fetchPreviews(offline)).toMatchObject({ ok: false, message: expect.stringContaining("Can't reach GitHub") })
  })
})
