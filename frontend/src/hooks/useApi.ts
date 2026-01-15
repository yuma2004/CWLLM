import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../lib/apiClient'
import { getCache, setCache } from '../lib/apiCache'
import { createAbortController, isAbortError, requestWithRetry } from '../lib/apiRequest'

type HttpMethod = 'POST' | 'PATCH' | 'DELETE'

type FetchOptions<T> = {
  enabled?: boolean
  init?: RequestInit
  errorMessage?: string
  onStart?: () => void
  onSuccess?: (data: T) => void
  onError?: (message: string, error?: unknown) => void
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
  onError?: (message: string, error?: unknown) => void
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
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    callbacksRef.current = { onStart, onSuccess, onError }
  }, [onStart, onSuccess, onError])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const fetchData = useCallback(
    async (
      overrideInit?: RequestInit,
      options?: { ignoreCache?: boolean }
    ) => {
      if (!url) {
        abortControllerRef.current?.abort()
        return null
      }
      abortControllerRef.current?.abort()
      const mergedInit = { ...init, ...overrideInit }
      const { controller, cleanup } = createAbortController(mergedInit.signal)
      abortControllerRef.current = controller
      const resolvedCacheKey = cacheKey ?? url
      if (!options?.ignoreCache && cacheTimeMs > 0 && resolvedCacheKey) {
        const cached = getCache<T>(resolvedCacheKey)
        if (cached) {
          if (!controller.signal.aborted) {
            setData(cached)
          }
          callbacksRef.current.onSuccess?.(cached)
          return cached
        }
      }
      requestIdRef.current += 1
      const requestId = requestIdRef.current
      if (!controller.signal.aborted) {
        setIsLoading(true)
        setError('')
      }
      callbacksRef.current.onStart?.()
      try {
        const responseData = await requestWithRetry(
          () =>
            apiRequest<T>(url, {
              method: (mergedInit.method as string | undefined) ?? 'GET',
              body: mergedInit.body,
              headers: mergedInit.headers,
              signal: controller.signal,
            }),
          retry,
          retryDelayMs
        )
        if (responseData !== null) {
          if (!controller.signal.aborted && requestId === requestIdRef.current) {
            setData(responseData)
          }
          if (resolvedCacheKey && cacheTimeMs > 0) {
            setCache(resolvedCacheKey, responseData, cacheTimeMs)
          }
          callbacksRef.current.onSuccess?.(responseData)
        }
        return responseData
      } catch (err) {
        if (isAbortError(err)) {
          return null
        }
        const message = err instanceof Error ? err.message : errorMessage || 'ネットワークエラー'
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setError(message)
        }
        callbacksRef.current.onError?.(message, err)
        return null
      } finally {
        cleanup()
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setIsLoading(false)
        }
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
  const abortControllerRef = useRef<AbortController | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const mutate = useCallback(
    async (payload?: D, options: MutationOptions<T> = {}) => {
      const targetUrl = options.url ?? url
      if (!targetUrl) return null
      abortControllerRef.current?.abort()
      const { controller, cleanup } = createAbortController(options.init?.signal)
      abortControllerRef.current = controller

      requestIdRef.current += 1
      const requestId = requestIdRef.current
      if (!controller.signal.aborted) {
        setIsLoading(true)
        setError('')
      }

      try {
        const retryCount = options.retry ?? 0
        const retryDelayMs = options.retryDelayMs ?? 500
        const responseData = await requestWithRetry(
          () =>
            apiRequest<T>(targetUrl, {
              method,
              body: payload ?? options.init?.body,
              headers: options.init?.headers,
              signal: controller.signal,
            }),
          retryCount,
          retryDelayMs
        )
        if (responseData !== null) {
          options.onSuccess?.(responseData)
        }
        return responseData
      } catch (err) {
        if (isAbortError(err)) {
          return null
        }
        const message =
          err instanceof Error ? err.message : options.errorMessage || 'ネットワークエラー'
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setError(message)
        }
        options.onError?.(message, err)
        throw err
      } finally {
        cleanup()
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [method, url]
  )

  return { mutate, error, setError, isLoading }
}
