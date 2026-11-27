import { describe, expect, it } from 'vitest'
import { versionLabel } from './buildInfo'

describe('versionLabel', () => {
  it('shows only the version on production and release builds', () => {
    expect(versionLabel('0.8.0', 'main', 'abc1234')).toBe('v0.8.0')
    expect(versionLabel('0.8.0', '', '')).toBe('v0.8.0')
    expect(versionLabel('0.8.0', 'v0.8.0', 'abc1234')).toBe('v0.8.0')
  })
  it('adds branch and commit on preview builds', () => {
    expect(versionLabel('0.8.0', 'feat/xyz', 'abc1234')).toBe('v0.8.0 · feat/xyz · abc1234')
  })
})
