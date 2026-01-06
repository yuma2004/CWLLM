import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../lib/apiClient'
import { getCache, setCache } from '../lib/apiCache'

type HttpMethod = 'POST' | 'PATCH' | 'DELETE'

type FetchOptions<T> = {
  enabled?: boolean
  init?: RequestInit
  errorMessage?: string
  onStart?: () => void
  onSuccess?: (data: T) => void
  onError?: (message: string) => void
  cacheKey?: string
  cacheTimeMs?: number
  retry?: number
  retryDelayMs?: number
}

type MutationOptions<T> = {
  init?: RequestInit
  errorMessage?: string
  url?: string
  retry?: number
  retryDelayMs?: number
  onSuccess?: (data: T) => void
  onError?: (message: string) => void
}

export function useFetch<T>(url: string | null, options: FetchOptions<T> = {}) {
  const {
    enabled = true,
    init,
    errorMessage,
    onStart,
    onSuccess,
    onError,
    cacheKey,
    cacheTimeMs = 0,
    retry = 0,
    retryDelayMs = 500,
  } = options
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const callbacksRef = useRef({ onStart, onSuccess, onError })

  useEffect(() => {
    callbacksRef.current = { onStart, onSuccess, onError }
  }, [onStart, onSuccess, onError])

  const fetchData = useCallback(
    async (
      overrideInit?: RequestInit,
      options?: { ignoreCache?: boolean }
    ) => {
      if (!url) return null
      const resolvedCacheKey = cacheKey ?? url
      if (!options?.ignoreCache && cacheTimeMs > 0 && resolvedCacheKey) {
        const cached = getCache<T>(resolvedCacheKey)
        if (cached) {
          setData(cached)
          callbacksRef.current.onSuccess?.(cached)
          return cached
        }
      }
      setIsLoading(true)
      setError('')
      callbacksRef.current.onStart?.()
      try {
        const mergedInit = { ...init, ...overrideInit }
        let responseData: T | null = null
        for (let attempt = 0; attempt <= retry; attempt += 1) {
          try {
            responseData = await apiRequest<T>(url, {
              method: (mergedInit.method as string | undefined) ?? 'GET',
              body: mergedInit.body,
              headers: mergedInit.headers,
              signal: mergedInit.signal ?? undefined,
            })
            break
          } catch (err) {
            if (attempt >= retry) {
              throw err
            }
            await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs))
          }
        }
        if (responseData !== null) {
          setData(responseData)
          if (resolvedCacheKey && cacheTimeMs > 0) {
            setCache(resolvedCacheKey, responseData, cacheTimeMs)
          }
          callbacksRef.current.onSuccess?.(responseData)
        }
        return responseData
      } catch (err) {
        const message = err instanceof Error ? err.message : errorMessage || 'ネットワークエラー'
        setError(message)
        callbacksRef.current.onError?.(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [url, init, errorMessage, cacheKey, cacheTimeMs, retry, retryDelayMs]
  )

  useEffect(() => {
    if (enabled) {
      void fetchData()
    }
  }, [enabled, fetchData])

  return { data, setData, error, setError, isLoading, refetch: fetchData }
}

export function useMutation<T, D>(url: string, method: HttpMethod) {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const mutate = useCallback(
    async (payload?: D, options: MutationOptions<T> = {}) => {
      const targetUrl = options.url ?? url
      if (!targetUrl) return null

      setIsLoading(true)
      setError('')

      try {
        const retryCount = options.retry ?? 0
        const retryDelayMs = options.retryDelayMs ?? 500
        let responseData: T | null = null
        for (let attempt = 0; attempt <= retryCount; attempt += 1) {
          try {
            responseData = await apiRequest<T>(targetUrl, {
              method,
              body: payload ?? options.init?.body,
              headers: options.init?.headers,
              signal: options.init?.signal ?? undefined,
            })
            break
          } catch (err) {
            if (attempt >= retryCount) {
              throw err
            }
            await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs))
          }
        }
        if (responseData !== null) {
          options.onSuccess?.(responseData)
        }
        return responseData
      } catch (err) {
        const message =
          err instanceof Error ? err.message : options.errorMessage || 'ネットワークエラー'
        setError(message)
        options.onError?.(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [method, url]
  )

  return { mutate, error, setError, isLoading }
}
