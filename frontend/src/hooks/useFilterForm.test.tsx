import { act, renderHook } from '@testing-library/react'
import type { ChangeEvent, FormEvent } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useFilterForm } from './useFilterForm'

vi.mock('./useUrlSync', async () => {
  const { useMemo, useState } = await import('react')

  type Filters = Record<string, string>
  type FilterUpdater<F extends Filters> = F | ((prev: F) => F)

  const applyFilterUpdate = <F extends Filters>(current: F, next: FilterUpdater<F>): F => {
    if (typeof next === 'function') {
      return next(current)
    }
    return next
  }

  return {
    useUrlSync: <F extends Filters>({
      defaultFilters,
      defaultPageSize = 20,
      resetPageOnFilterChange = true,
    }: {
      defaultFilters: F
      defaultPageSize?: number
      resetPageOnFilterChange?: boolean
    }) => {
      const [filters, setFiltersState] = useState<F>(defaultFilters)
      const [pagination, setPagination] = useState({
        page: 1,
        pageSize: defaultPageSize,
        total: 0,
      })

      const setFilters = (
        next: FilterUpdater<F>,
        options: { resetPage?: boolean } = {}
      ) => {
        setFiltersState((prev) => applyFilterUpdate(prev, next))
        const shouldReset = options.resetPage ?? resetPageOnFilterChange
        if (shouldReset) {
          setPagination((prev) => ({ ...prev, page: 1 }))
        }
      }

      const hasActiveFilters = useMemo(
        () => Object.values(filters).some((value) => value.trim().length > 0),
        [filters]
      )

      const clearFilter = (key: keyof F) => {
        setFiltersState((prev) => ({ ...prev, [key]: defaultFilters[key] }))
        setPagination((prev) => ({ ...prev, page: 1 }))
      }

      const clearAllFilters = () => {
        setFiltersState(defaultFilters)
        setPagination((prev) => ({ ...prev, page: 1 }))
      }

      const setPage = (page: number) => {
        setPagination((prev) => ({ ...prev, page }))
      }

      const setPageSize = (pageSize: number) => {
        setPagination((prev) => ({ ...prev, pageSize, page: 1 }))
      }

      const queryString = useMemo(() => {
        const params = new URLSearchParams()
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== '') {
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
    },
  }
})

type Filters = {
  q: string
  status: string
}

const defaultFilters: Filters = {
  q: '',
  status: '',
}

describe('useFilterFormフック', () => {
  it('フィルター更新・クリア・送信時の状態更新を行う', () => {
    const { result } = renderHook(() =>
      useFilterForm<Filters>({
        pathname: '/companies',
        defaultFilters,
      })
    )

    expect(result.current.pagination.page).toBe(1)
    expect(result.current.pagination.pageSize).toBe(20)
    expect(result.current.hasActiveFilters).toBe(false)

    act(() => {
      result.current.setPage(3)
      result.current.updateFilter('q', 'Acme')
    })
    expect(result.current.filters.q).toBe('Acme')
    expect(result.current.pagination.page).toBe(1)
    expect(result.current.isFilterActive('q')).toBe(true)
    expect(result.current.activeFilters).toEqual([{ key: 'q', value: 'Acme' }])
    expect(result.current.queryString).toContain('q=Acme')

    act(() => {
      result.current.updateFilters({ status: 'active' })
    })
    expect(result.current.filters.status).toBe('active')
    expect(result.current.activeFilters).toEqual([
      { key: 'q', value: 'Acme' },
      { key: 'status', value: 'active' },
    ])

    const statusChange = result.current.createChangeHandler('status')
    act(() => {
      statusChange({
        target: { value: 'paused' },
      } as ChangeEvent<HTMLSelectElement>)
    })
    expect(result.current.filters.status).toBe('paused')

    act(() => {
      result.current.clearFilter('q')
    })
    expect(result.current.filters.q).toBe('')
    expect(result.current.isFilterActive('q')).toBe(false)

    act(() => {
      result.current.setPage(5)
      result.current.handleSubmit({ preventDefault: vi.fn() } as FormEvent)
    })
    expect(result.current.pagination.page).toBe(1)

    act(() => {
      result.current.clearAllFilters()
    })
    expect(result.current.filters).toEqual(defaultFilters)
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('ページリセット無効時はフィルター変更後も現在ページを維持する', () => {
    const { result } = renderHook(() =>
      useFilterForm<Filters>({
        pathname: '/companies',
        defaultFilters,
        resetPageOnFilterChange: false,
      })
    )

    act(() => {
      result.current.setPage(4)
      result.current.updateFilter('q', '継続')
    })
    expect(result.current.pagination.page).toBe(4)

    act(() => {
      result.current.updateFilters({ status: 'active' })
    })
    expect(result.current.pagination.page).toBe(4)
  })
})
