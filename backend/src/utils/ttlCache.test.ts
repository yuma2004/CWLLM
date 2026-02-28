import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteCache, deleteCacheByPrefix, getCache, setCache } from './ttlCache'

const prefix = `ttl-cache-test-${Date.now()}`

describe('ttlCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-06T00:00:00.000Z'))
  })

  afterEach(() => {
    deleteCacheByPrefix(prefix)
    vi.useRealTimers()
  })

  it('stores and retrieves values before expiration', () => {
    const key = `${prefix}:alive`
    setCache(key, { ok: true }, 1_000)
    expect(getCache<{ ok: boolean }>(key)).toEqual({ ok: true })
  })

  it('returns null after expiration and removes entry', () => {
    const key = `${prefix}:expiring`
    setCache(key, 'value', 1_000)
    expect(getCache<string>(key)).toBe('value')

    vi.advanceTimersByTime(1_001)
    expect(getCache<string>(key)).toBeNull()
    expect(getCache<string>(key)).toBeNull()
  })

  it('deletes one entry by key', () => {
    const key = `${prefix}:single`
    setCache(key, 123, 10_000)
    deleteCache(key)
    expect(getCache<number>(key)).toBeNull()
  })

  it('deletes entries by prefix', () => {
    const a = `${prefix}:a`
    const b = `${prefix}:b`
    const other = `${prefix}-other:c`

    setCache(a, 'A', 10_000)
    setCache(b, 'B', 10_000)
    setCache(other, 'C', 10_000)

    deleteCacheByPrefix(`${prefix}:`)

    expect(getCache<string>(a)).toBeNull()
    expect(getCache<string>(b)).toBeNull()
    expect(getCache<string>(other)).toBe('C')
  })

  it('runs periodic prune every 100 sets', () => {
    const expired = `${prefix}:expired`
    setCache(expired, 'stale', 500)
    vi.advanceTimersByTime(501)

    for (let i = 0; i < 100; i += 1) {
      setCache(`${prefix}:bulk:${i}`, i, 10_000)
    }

    expect(getCache<string>(expired)).toBeNull()
  })

  it('ignores empty prefix delete requests', () => {
    const key = `${prefix}:keep`
    setCache(key, 'alive', 10_000)
    deleteCacheByPrefix('')
    expect(getCache<string>(key)).toBe('alive')
  })
})
