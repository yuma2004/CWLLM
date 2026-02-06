import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { usePagination } from './usePagination'
import { usePaginationSync } from './usePaginationSync'
import type { PaginationState } from '../types'

describe('usePagination', () => {
  it('initializes with provided page size and builds query string', () => {
    const { result } = renderHook(() => usePagination(50))

    expect(result.current.pagination).toEqual({
      page: 1,
      pageSize: 50,
      total: 0,
    })
    expect(result.current.paginationQuery).toBe('page=1&pageSize=50')
  })

  it('updates page, resets page on page size change, and resets all values', () => {
    const { result } = renderHook(() => usePagination(20))

    act(() => {
      result.current.setPage(3)
    })
    expect(result.current.pagination.page).toBe(3)
    expect(result.current.paginationQuery).toBe('page=3&pageSize=20')

    act(() => {
      result.current.setPageSize(100)
    })
    expect(result.current.pagination).toEqual({
      page: 1,
      pageSize: 100,
      total: 0,
    })
    expect(result.current.paginationQuery).toBe('page=1&pageSize=100')

    act(() => {
      result.current.setPagination((prev) => ({ ...prev, total: 999 }))
      result.current.resetPagination()
    })
    expect(result.current.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 0,
    })
  })
})

describe('usePaginationSync', () => {
  it('merges pagination response into existing pagination state', () => {
    const { result } = renderHook(() => {
      const [pagination, setPagination] = useState<PaginationState>({
        page: 2,
        pageSize: 20,
        total: 10,
      })
      const syncPagination = usePaginationSync(setPagination)
      return { pagination, syncPagination }
    })

    act(() => {
      result.current.syncPagination({
        pagination: { page: 4, pageSize: 50, total: 120 },
      })
    })

    expect(result.current.pagination).toEqual({
      page: 4,
      pageSize: 50,
      total: 120,
    })
  })

  it('does nothing when response is empty or pagination is missing', () => {
    const { result } = renderHook(() => {
      const [pagination, setPagination] = useState<PaginationState>({
        page: 1,
        pageSize: 20,
        total: 5,
      })
      const syncPagination = usePaginationSync(setPagination)
      return { pagination, syncPagination }
    })

    act(() => {
      result.current.syncPagination(undefined)
      result.current.syncPagination(null)
      result.current.syncPagination({})
    })

    expect(result.current.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 5,
    })
  })
})
