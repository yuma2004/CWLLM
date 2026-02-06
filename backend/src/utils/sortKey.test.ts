import { describe, expect, it } from 'vitest'
import { generateSortKey } from './sortKey'

describe('generateSortKey', () => {
  it('creates a key with expected shape', () => {
    const key = generateSortKey()
    expect(key).toMatch(/^\d{13}[0-9a-z]{4}[0-9a-f]{8}$/)
    expect(key).toHaveLength(25)
  })

  it('is lexicographically increasing across sequential calls', () => {
    const first = generateSortKey()
    const second = generateSortKey()
    const third = generateSortKey()

    expect(first < second).toBe(true)
    expect(second < third).toBe(true)
  })
})
