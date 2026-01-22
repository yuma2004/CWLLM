import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { useFetch, useMutation } from './useApi'
import { clearCache, setCache } from '../lib/apiCache'

const apiRequestMock = vi.fn()

vi.mock('../lib/apiClient', () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}))

afterEach(() => {
  apiRequestMock.mockReset()
  clearCache()
  vi.useRealTimers()
})

describe('useFetch', () => {
  it('aborts the previous request on consecutive refetch without setting error', async () => {
    vi.useFakeTimers()
    const pendingRequests: Array<{ signal?: AbortSignal }> = []

    apiRequestMock.mockImplementation((_url: string, options: { signal?: AbortSignal }) => {
      pendingRequests.push({ signal: options?.signal })
      return new Promise((resolve, reject) => {
        const signal = options?.signal
        if (signal) {
          if (signal.aborted) {
            const abortError = new Error('Aborted')
            abortError.name = 'AbortError'
            reject(abortError)
            return
          }
          signal.addEventListener(
            'abort',
            () => {
              const abortError = new Error('Aborted')
              abortError.name = 'AbortError'
              reject(abortError)
            },
            { once: true }
          )
        }
        window.setTimeout(() => resolve({ ok: true }), 1000)
      })
    })

    const { result } = renderHook(() =>
      useFetch<{ ok: boolean }>('/api/test', { enabled: false })
    )

    await act(async () => {
      void result.current.refetch()
      void result.current.refetch()
      await vi.runAllTimersAsync()
    })

    expect(pendingRequests).toHaveLength(2)
    expect(pendingRequests[0].signal?.aborted).toBe(true)
    expect(result.current.error).toBe('')
    expect(result.current.data).toEqual({ ok: true })
    expect(result.current.isLoading).toBe(false)
  })

  it('returns cached data without leaving loading true', async () => {
    const cached = { ok: true }
    setCache('cache-key', cached, 10_000)
    apiRequestMock.mockResolvedValue({ ok: false })

    const { result } = renderHook(() =>
      useFetch<{ ok: boolean }>('/api/test', { cacheKey: 'cache-key', cacheTimeMs: 10_000 })
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(apiRequestMock).not.toHaveBeenCalled()
    expect(result.current.data).toEqual(cached)
    expect(result.current.error).toBe('')
    expect(result.current.isLoading).toBe(false)
  })
})

describe('useMutation', () => {
  it('clears loading state when aborted', async () => {
    const controller = new AbortController()

    apiRequestMock.mockImplementation((_url: string, options: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        const signal = options?.signal
        if (signal?.aborted) {
          const abortError = new Error('Aborted')
          abortError.name = 'AbortError'
          reject(abortError)
          return
        }
        signal?.addEventListener(
          'abort',
          () => {
            const abortError = new Error('Aborted')
            abortError.name = 'AbortError'
            reject(abortError)
          },
          { once: true }
        )
      })
    })

    const { result } = renderHook(() =>
      useMutation<{ ok: boolean }, { name: string }>('/api/test', 'POST')
    )

    await act(async () => {
      const promise = result.current.mutate(
        { name: 'test' },
        { init: { signal: controller.signal } }
      )
      controller.abort()
      await promise
    })

    expect(result.current.error).toBe('')
    expect(result.current.isLoading).toBe(false)
  })
})
