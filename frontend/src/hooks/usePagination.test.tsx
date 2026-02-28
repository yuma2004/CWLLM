import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { usePagination } from './usePagination'
import { usePaginationSync } from './usePaginationSync'
import type { PaginationState } from '../types'

describe('usePaginationフック', () => {
  it('指定したページサイズで初期化しクエリ文字列を構築する', () => {
    const { result } = renderHook(() => usePagination(50))

    expect(result.current.pagination).toEqual({
      page: 1,
      pageSize: 50,
      total: 0,
    })
    expect(result.current.paginationQuery).toBe('page=1&pageSize=50')
  })

  it('ページ更新・ページサイズ変更時のリセット・全体リセットができる', () => {
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

describe('usePaginationSyncフック', () => {
  it('レスポンスのページ情報を既存状態へマージする', () => {
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

  it('レスポンスが空またはページ情報欠落時は状態を変更しない', () => {
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
