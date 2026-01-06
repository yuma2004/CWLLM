import { useCallback, useEffect, useRef, useState } from 'react'
import { apiRequest } from '../lib/apiClient'

type HttpMethod = 'POST' | 'PATCH' | 'DELETE'

type FetchOptions<T> = {
  enabled?: boolean
  init?: RequestInit
  errorMessage?: string
  onStart?: () => void
  onSuccess?: (data: T) => void
  onError?: (message: string) => void
}

type MutationOptions = {
  init?: RequestInit
  errorMessage?: string
  url?: string
}

export function useFetch<T>(url: string | null, options: FetchOptions<T> = {}) {
  const { enabled = true, init, errorMessage, onStart, onSuccess, onError } = options
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const callbacksRef = useRef({ onStart, onSuccess, onError })

  useEffect(() => {
    callbacksRef.current = { onStart, onSuccess, onError }
  }, [onStart, onSuccess, onError])

  const fetchData = useCallback(
    async (overrideInit?: RequestInit) => {
      if (!url) return null
      setIsLoading(true)
      setError('')
      callbacksRef.current.onStart?.()
      try {
        const mergedInit = { ...init, ...overrideInit }
        const responseData = await apiRequest<T>(url, {
          method: (mergedInit.method as string | undefined) ?? 'GET',
          body: mergedInit.body,
          headers: mergedInit.headers,
          signal: mergedInit.signal,
        })
        if (responseData !== null) {
          setData(responseData)
          callbacksRef.current.onSuccess?.(responseData)
        }
        return responseData
      } catch (err) {
        const message = err instanceof Error ? err.message : errorMessage || 'Network error'
        setError(message)
        callbacksRef.current.onError?.(message)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [url, init, errorMessage]
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
    async (payload?: D, options: MutationOptions = {}) => {
      const targetUrl = options.url ?? url
      if (!targetUrl) return null

      setIsLoading(true)
      setError('')

      try {
        return await apiRequest<T>(targetUrl, {
          method,
          body: payload ?? options.init?.body,
          headers: options.init?.headers,
          signal: options.init?.signal,
        })
      } catch (err) {
        const message =
          err instanceof Error ? err.message : options.errorMessage || 'Network error'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [method, url]
  )

  return { mutate, error, setError, isLoading }
}
