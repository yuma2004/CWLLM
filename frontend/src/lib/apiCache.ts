type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const cacheStore = new Map<string, CacheEntry<unknown>>()

export const getCache = <T>(key: string): T | null => {
  const entry = cacheStore.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key)
    return null
  }
  return entry.value as T
}

export const setCache = <T>(key: string, value: T, ttlMs: number) => {
  if (ttlMs <= 0) return
  cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export const clearCache = (key?: string) => {
  if (key) {
    cacheStore.delete(key)
    return
  }
  cacheStore.clear()
}
