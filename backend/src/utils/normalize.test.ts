import { describe, expect, it } from 'vitest'
import { normalizeCompanyName } from './normalize'

describe('normalizeCompanyName', () => {
  it('normalizes full-width latin characters into lowercase ascii', () => {
    expect(normalizeCompanyName('ＡＢＣ１２３')).toBe('abc123')
  })

  it('removes supported separators and spaces', () => {
    expect(normalizeCompanyName(' Foo_Bar- Baz.(Qux)/ ')).toBe('foobarbazqux')
  })

  it('keeps meaningful non-latin characters', () => {
    expect(normalizeCompanyName('株式会社ＡＢＣ')).toBe('株式会社abc')
  })
})
