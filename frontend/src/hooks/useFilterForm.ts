import { useCallback, useMemo, useRef } from 'react'
import { useUrlSync } from './useUrlSync'

type FilterFormConfig<F extends Record<string, string>> = {
  /**
   * ページのパス名（URL同期用）
   */
  pathname: string
  /**
   * フィルターのデフォルト値
   */
  defaultFilters: F
  /**
   * ページサイズのデフォルト値
   */
  defaultPageSize?: number
  /**
   * フィルター変更時にページをリセットするか
   */
  resetPageOnFilterChange?: boolean
}

/**
 * フィルターフォーム専用Hook
 * useUrlSyncと連携し、フィルターの状態管理とURL同期を行う
 *
 * @example
 * const defaultFilters = { q: '', status: '', category: '' }
 *
 * const {
 *   filters,
 *   updateFilter,
 *   updateFilters,
 *   hasActiveFilters,
 *   clearFilter,
 *   clearAllFilters,
 *   handleSubmit,
 *   pagination,
 *   setPage,
 *   setPageSize,
 * } = useFilterForm({
 *   pathname: '/companies',
 *   defaultFilters,
 * })
 */
export function useFilterForm<F extends Record<string, string>>(config: FilterFormConfig<F>) {
  const { pathname, defaultFilters, defaultPageSize = 20, resetPageOnFilterChange = true } = config
  const defaultFiltersRef = useRef(defaultFilters)

  const {
    filters,
    setFilters,
    hasActiveFilters,
    clearFilter: urlClearFilter,
    clearAllFilters: urlClearAllFilters,
    pagination,
    setPagination,
    setPage,
    setPageSize,
    queryString,
  } = useUrlSync({
    pathname,
    defaultFilters,
    defaultPageSize,
    resetPageOnFilterChange,
  })

  /**
   * 単一フィルターを更新
   */
  const updateFilter = useCallback(
    <K extends keyof F>(key: K, value: F[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
    },
    [setFilters]
  )

  /**
   * 複数フィルターを一度に更新
   */
  const updateFilters = useCallback(
    (partial: Partial<F>) => {
      setFilters((prev) => ({ ...prev, ...partial }))
    },
    [setFilters]
  )

  /**
   * フィルターをクリア（デフォルト値に戻す）
   */
  const clearFilter = useCallback(
    (key: keyof F) => {
      urlClearFilter(key)
    },
    [urlClearFilter]
  )

  /**
   * すべてのフィルターをクリア
   */
  const clearAllFilters = useCallback(() => {
    urlClearAllFilters()
  }, [urlClearAllFilters])

  /**
   * フォーム送信ハンドラー
   * ページを1にリセットする
   */
  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()
      setPage(1)
    },
    [setPage]
  )

  /**
   * inputのonChangeハンドラーを生成
   */
  const createChangeHandler = useCallback(
    <K extends keyof F>(key: K) =>
      (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        updateFilter(key, event.target.value as F[K])
      },
    [updateFilter]
  )

  /**
   * アクティブなフィルターのリストを取得
   */
  const activeFilters = useMemo(() => {
    const result: Array<{ key: keyof F; value: string }> = []
    const defaults = defaultFiltersRef.current

    for (const key of Object.keys(filters) as Array<keyof F>) {
      const value = filters[key]
      const defaultValue = defaults[key]
      if (value && value !== defaultValue) {
        result.push({ key, value })
      }
    }

    return result
  }, [filters])

  /**
   * フィルターが特定の値かどうかをチェック
   */
  const isFilterActive = useCallback(
    <K extends keyof F>(key: K): boolean => {
      const value = filters[key]
      const defaultValue = defaultFiltersRef.current[key]
      return Boolean(value && value !== defaultValue)
    },
    [filters]
  )

  return {
    // フィルター状態
    filters,
    setFilters,
    updateFilter,
    updateFilters,
    hasActiveFilters,
    activeFilters,
    isFilterActive,
    clearFilter,
    clearAllFilters,

    // フォーム操作
    handleSubmit,
    createChangeHandler,

    // ページネーション
    pagination,
    setPagination,
    setPage,
    setPageSize,

    // クエリ文字列
    queryString,
  }
}
