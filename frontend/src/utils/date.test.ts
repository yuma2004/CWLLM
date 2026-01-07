import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest'

import { formatDateInput, isToday, isYesterday } from './date'

describe('formatDateInput', () => {
  it('returns the same date-only string', () => {
    expect(formatDateInput('2025-01-02')).toBe('2025-01-02')
  })

  it('returns the date part for ISO datetime strings', () => {
    expect(formatDateInput('2025-01-02T00:00:00.000Z')).toBe('2025-01-02')
  })
})

describe('isToday/isYesterday', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 0, 3, 9, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('handles date-only strings consistently', () => {
    expect(isToday('2025-01-03')).toBe(true)
    expect(isYesterday('2025-01-02')).toBe(true)
  })

  it('handles ISO datetime strings consistently', () => {
    expect(isToday('2025-01-03T00:00:00.000Z')).toBe(true)
    expect(isYesterday('2025-01-02T23:59:59.000Z')).toBe(true)
  })
})
