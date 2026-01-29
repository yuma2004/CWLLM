type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()
let setCount = 0

const pruneExpired = () => {
  const now = Date.now()
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key)
    }
  }
}

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
  setCount += 1
  if (setCount % 100 === 0) {
    pruneExpired()
  }
}

export const deleteCache = (key: string) => {
  cache.delete(key)
}

export const deleteCacheByPrefix = (prefix: string) => {
  if (!prefix) return
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key)
    }
  }
}
