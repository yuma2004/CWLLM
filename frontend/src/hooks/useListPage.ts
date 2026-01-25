import { useCallback } from 'react'
import { useFetch } from './useApi'
import { useDebouncedValue } from './useDebouncedValue'
import { useListQuery } from './useListQuery'
import { usePaginationSync } from './usePaginationSync'
import { useUrlSync, type UrlSyncConfig } from './useUrlSync'
import type { ApiListResponse } from '../types'
import type { QueryValue } from '../utils/queryString'

type QueryOverrides<F> = Partial<F> | ((filters: F) => Partial<F>)

type UseListPageOptions<
  F extends Record<string, string>,
  P extends Record<string, string>,
  T,
> = {
  urlSync: UrlSyncConfig<F, P>
  buildUrl: (queryString: string) => string | null
  queryOverrides?: QueryOverrides<F>
  debounce?: {
    key: keyof F
    delayMs?: number
    transform?: (value: QueryValue) => QueryValue
  }
  fetchOptions?: {
    enabled?: boolean
    init?: RequestInit
    errorMessage?: string
    onStart?: () => void
    onSuccess?: (data: ApiListResponse<T>) => void
    onError?: (message: string, error?: unknown) => void
    cacheKey?: string
    cacheTimeMs?: number
    authMode?: 'bearer'
    authToken?: string | null
  }
}

export function useListPage<
  F extends Record<string, string>,
  P extends Record<string, string> = Record<string, string>,
  T = unknown,
>({ urlSync, buildUrl, queryOverrides, debounce, fetchOptions }: UseListPageOptions<F, P, T>) {
  const {
    filters,
    setFilters,
    hasActiveFilters,
    clearFilter,
    clearAllFilters,
    extraParams,
    setExtraParams,
    pagination,
    setPagination,
    setPage,
    setPageSize,
  } = useUrlSync<F, P>(urlSync)

  const debounceKey = debounce?.key
  const debounceDelayMs = debounce?.delayMs
  const debounceTransform = debounce?.transform
  const debouncedValue = useDebouncedValue(
    debounceKey ? filters[debounceKey] : undefined,
    debounceDelayMs
  )
  const debouncedOverrides = useCallback(() => {
    if (!debounceKey) return undefined
    const nextValue = debounceTransform
      ? debounceTransform(debouncedValue as QueryValue)
      : (debouncedValue as QueryValue)
    return { [debounceKey]: nextValue } as Partial<F>
  }, [debounceKey, debounceTransform, debouncedValue])

  const mergedOverrides = useCallback(
    (currentFilters: F) => {
      const baseOverrides =
        typeof queryOverrides === 'function' ? queryOverrides(currentFilters) : queryOverrides
      return { ...(baseOverrides ?? {}), ...(debouncedOverrides() ?? {}) } as Partial<F>
    },
    [debouncedOverrides, queryOverrides]
  )

  const queryString = useListQuery(filters, pagination, mergedOverrides)
  const syncPagination = usePaginationSync(setPagination)
  const handleSearchSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()
      setPage(1)
    },
    [setPage]
  )

  const onFetchSuccess = fetchOptions?.onSuccess
  const handleSuccess = useCallback(
    (data: ApiListResponse<T>) => {
      syncPagination(data)
      onFetchSuccess?.(data)
    },
    [onFetchSuccess, syncPagination]
  )

  const { data, setData, error, setError, isLoading, refetch } = useFetch<
    ApiListResponse<T>
  >(buildUrl(queryString), {
    ...fetchOptions,
    onSuccess: handleSuccess,
  })

  return {
    filters,
    setFilters,
    hasActiveFilters,
    clearFilter,
    clearAllFilters,
    extraParams,
    setExtraParams,
    pagination,
    setPagination,
    setPage,
    setPageSize,
    queryString,
    handleSearchSubmit,
    data,
    setData,
    error,
    setError,
    isLoading,
    refetch,
  }
}
