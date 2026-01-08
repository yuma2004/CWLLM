import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PaginationState } from '../types'

type UrlSyncConfig<F extends Record<string, string>> = {
  pathname: string
  defaultFilters: F
  defaultPageSize?: number
}

export function useUrlSync<F extends Record<string, string>>(config: UrlSyncConfig<F>) {
  const { pathname, defaultFilters, defaultPageSize = 20 } = config
  const location = useLocation()
  const navigate = useNavigate()
  const defaultFiltersRef = useRef(defaultFilters)
  const isInitializedRef = useRef(false)

  const [filters, setFiltersState] = useState<F>(defaultFilters)
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    pageSize: defaultPageSize,
    total: 0,
  })

  // URL -> State (on mount and URL changes)
  useEffect(() => {
    const params = new URLSearchParams(location.search)

    const nextFilters = { ...defaultFiltersRef.current }
    Object.keys(defaultFiltersRef.current).forEach((key) => {
      const value = params.get(key)
      if (value !== null) {
        nextFilters[key as keyof F] = value as F[keyof F]
      }
    })
    setFiltersState(nextFilters)

    const nextPage = Math.max(Number(params.get('page')) || 1, 1)
    const nextPageSize = Math.max(Number(params.get('pageSize')) || defaultPageSize, 1)
    setPagination((prev) => ({
      ...prev,
      page: nextPage,
      pageSize: nextPageSize,
    }))

    isInitializedRef.current = true
  }, [location.search, defaultPageSize])

  // State -> URL (on filter/pagination changes)
  useEffect(() => {
    if (!isInitializedRef.current) return

    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      }
    })
    params.set('page', String(pagination.page))
    params.set('pageSize', String(pagination.pageSize))

    const nextSearch = params.toString()
    const currentSearch = location.search.replace(/^\?/, '')

    if (nextSearch !== currentSearch) {
      navigate({ pathname, search: nextSearch }, { replace: true })
    }
  }, [filters, pagination.page, pagination.pageSize, pathname, navigate, location.search])

  const setFilters = useCallback((next: F | ((prev: F) => F)) => {
    setFiltersState(next)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }, [])

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, page }))
  }, [])

  const setPageSize = useCallback((pageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize, page: 1 }))
  }, [])

  const hasActiveFilters = useMemo(() => {
    return Object.entries(filters).some(([, value]) => {
      if (value == null) return false
      if (typeof value === 'string') return value.trim().length > 0
      return Boolean(value)
    })
  }, [filters])

  const clearFilter = useCallback((key: keyof F) => {
    setFiltersState((prev) => ({ ...prev, [key]: defaultFiltersRef.current[key] }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }, [])

  const clearAllFilters = useCallback(() => {
    setFiltersState({ ...defaultFiltersRef.current })
    setPagination((prev) => ({ ...prev, page: 1 }))
  }, [])

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      }
    })
    params.set('page', String(pagination.page))
    params.set('pageSize', String(pagination.pageSize))
    return params.toString()
  }, [filters, pagination.page, pagination.pageSize])

  return {
    filters,
    setFilters,
    hasActiveFilters,
    clearFilter,
    clearAllFilters,
    pagination,
    setPagination,
    setPage,
    setPageSize,
    queryString,
  }
}
