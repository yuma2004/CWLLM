import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useDebouncedValue } from './useDebouncedValue'

describe('useDebouncedValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns latest value after delay', () => {
    const { result, rerender } = renderHook(
      ({ value, delayMs }) => useDebouncedValue(value, delayMs),
      { initialProps: { value: 'alpha', delayMs: 200 } }
    )

    expect(result.current).toBe('alpha')

    rerender({ value: 'beta', delayMs: 200 })
    expect(result.current).toBe('alpha')

    act(() => {
      vi.advanceTimersByTime(199)
    })
    expect(result.current).toBe('alpha')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('beta')
  })

  it('cancels older timer when value changes quickly', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 100),
      { initialProps: { value: 'first' } }
    )

    rerender({ value: 'second' })

    act(() => {
      vi.advanceTimersByTime(50)
    })

    rerender({ value: 'third' })

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe('first')

    act(() => {
      vi.advanceTimersByTime(50)
    })
    expect(result.current).toBe('third')
  })
})
