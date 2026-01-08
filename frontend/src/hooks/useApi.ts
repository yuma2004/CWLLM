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

const isAbortError = (err: unknown) =>
  err instanceof Error && 'name' in err && err.name === 'AbortError'

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
      const controller = new AbortController()
      abortControllerRef.current = controller
      const mergedInit = { ...init, ...overrideInit }
      const externalSignal = mergedInit.signal
      let externalAbortHandler: (() => void) | undefined
      if (externalSignal) {
        if (externalSignal.aborted) {
          controller.abort()
        } else {
          externalAbortHandler = () => controller.abort()
          externalSignal.addEventListener('abort', externalAbortHandler, { once: true })
        }
      }
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
        let responseData: T | null = null
        for (let attempt = 0; attempt <= retry; attempt += 1) {
          try {
            responseData = await apiRequest<T>(url, {
              method: (mergedInit.method as string | undefined) ?? 'GET',
              body: mergedInit.body,
              headers: mergedInit.headers,
              signal: controller.signal,
            })
            break
          } catch (err) {
            if (isAbortError(err)) {
              throw err
            }
            if (attempt >= retry) {
              throw err
            }
            await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs))
          }
        }
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
        if (externalSignal && externalAbortHandler) {
          externalSignal.removeEventListener('abort', externalAbortHandler)
        }
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
      const controller = new AbortController()
      abortControllerRef.current = controller
      const externalSignal = options.init?.signal
      let externalAbortHandler: (() => void) | undefined
      if (externalSignal) {
        if (externalSignal.aborted) {
          controller.abort()
        } else {
          externalAbortHandler = () => controller.abort()
          externalSignal.addEventListener('abort', externalAbortHandler, { once: true })
        }
      }

      requestIdRef.current += 1
      const requestId = requestIdRef.current
      if (!controller.signal.aborted) {
        setIsLoading(true)
        setError('')
      }

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
              signal: controller.signal,
            })
            break
          } catch (err) {
            if (isAbortError(err)) {
              throw err
            }
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
        if (externalSignal && externalAbortHandler) {
          externalSignal.removeEventListener('abort', externalAbortHandler)
        }
        if (!controller.signal.aborted && requestId === requestIdRef.current) {
          setIsLoading(false)
        }
      }
    },
    [method, url]
  )

  return { mutate, error, setError, isLoading }
}
