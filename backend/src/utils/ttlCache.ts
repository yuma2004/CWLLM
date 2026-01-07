type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

export const getCache = <T>(key: string): T | null => {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.value as T
}

export const setCache = <T>(key: string, value: T, ttlMs: number) => {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export const deleteCache = (key: string) => {
  cache.delete(key)
}
