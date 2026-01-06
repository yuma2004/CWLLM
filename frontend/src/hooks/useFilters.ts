import { useCallback, useMemo, useRef, useState } from 'react'

export function useFilters<T extends Record<string, any>>(defaultFilters: T) {
  const defaultFiltersRef = useRef(defaultFilters)
  const [filters, setFilters] = useState<T>(defaultFilters)

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some((value) => {
      if (value == null) return false
      if (typeof value === 'string') return value.trim().length > 0
      if (Array.isArray(value)) return value.length > 0
      return Boolean(value)
    })
  }, [filters])

  const clearFilter = useCallback((key: keyof T) => {
    setFilters((prev) => ({ ...prev, [key]: defaultFiltersRef.current[key] }))
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters({ ...defaultFiltersRef.current })
  }, [])

  return {
    filters,
    setFilters,
    hasActiveFilters,
    clearFilter,
    clearAllFilters,
  }
}
