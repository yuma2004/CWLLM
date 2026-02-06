import { describe, expect, it } from 'vitest'
import { CACHE_KEYS, CACHE_TTLS_MS } from './cacheKeys'

describe('CACHE_KEYS', () => {
  it('exposes stable keys for options caches', () => {
    expect(CACHE_KEYS.companyOptions).toBe('companies:options')
    expect(CACHE_KEYS.userOptions).toBe('users:options')
  })

  it('builds message label key by limit', () => {
    expect(CACHE_KEYS.messageLabels(10)).toBe('messages:labels:10')
    expect(CACHE_KEYS.messageLabels(50)).toBe('messages:labels:50')
  })
})

describe('CACHE_TTLS_MS', () => {
  it('exposes configured TTL values', () => {
    expect(CACHE_TTLS_MS.companyOptions).toBe(60_000)
    expect(CACHE_TTLS_MS.messageLabels).toBe(30_000)
    expect(CACHE_TTLS_MS.userOptions).toBe(30_000)
  })
})
