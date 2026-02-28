import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest'

import { formatDateInput, isToday, isYesterday } from './date'

describe('formatDateInput関数', () => {
  it('日付文字列が渡された場合は同じ値を返す', () => {
    expect(formatDateInput('2025-01-02')).toBe('2025-01-02')
  })

  it('ISO日時文字列が渡された場合は日付部分のみを返す', () => {
    expect(formatDateInput('2025-01-02T00:00:00.000Z')).toBe('2025-01-02')
  })
})

describe('isTodayとisYesterday関数', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2025, 0, 3, 9, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('日付文字列を今日・昨日判定できる', () => {
    expect(isToday('2025-01-03')).toBe(true)
    expect(isYesterday('2025-01-02')).toBe(true)
  })

  it('ISO日時文字列を今日・昨日判定できる', () => {
    expect(isToday('2025-01-03T00:00:00.000Z')).toBe(true)
    expect(isYesterday('2025-01-02T23:59:59.000Z')).toBe(true)
  })
})
