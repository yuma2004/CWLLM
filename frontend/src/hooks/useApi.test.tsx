import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, afterEach } from 'vitest'
import { useFetch } from './useApi'

const apiRequestMock = vi.fn()

vi.mock('../lib/apiClient', () => ({
  apiRequest: (...args: unknown[]) => apiRequestMock(...args),
}))

afterEach(() => {
  apiRequestMock.mockReset()
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
})
