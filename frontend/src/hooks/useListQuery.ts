import { useMemo } from 'react'
import { PaginationState } from '../types'
import { buildQueryString, QueryValue } from '../utils/queryString'

type QueryOverrides<F> = Partial<F> | ((filters: F) => Partial<F>)

export const useListQuery = <F extends Record<string, QueryValue>>(
  filters: F,
  pagination: PaginationState,
  overrides?: QueryOverrides<F>
) =>
  useMemo(() => {
    const resolvedOverrides = typeof overrides === 'function' ? overrides(filters) : overrides
    return buildQueryString({
      ...filters,
      ...(resolvedOverrides ?? {}),
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
  }, [filters, pagination.page, pagination.pageSize, overrides])
