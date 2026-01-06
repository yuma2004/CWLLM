import { useCallback, useMemo, useState } from 'react'
import { PaginationState } from '../types'

export function usePagination(initialPageSize = 20) {
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: initialPageSize,
    total: 0,
  })

  const paginationQuery = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', String(pagination.page))
    params.set('pageSize', String(pagination.pageSize))
    return params.toString()
  }, [pagination.page, pagination.pageSize])

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }, [])

  const setPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }))
  }, [])

  const resetPagination = useCallback(() => {
    setPagination({ page: 1, pageSize: initialPageSize, total: 0 })
  }, [initialPageSize])

  return {
    pagination,
    setPagination,
    setPage,
    setPageSize,
    resetPagination,
    paginationQuery,
  }
}
