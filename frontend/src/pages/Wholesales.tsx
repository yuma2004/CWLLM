import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import CompanySearchSelect from '../components/CompanySearchSelect'
import ProjectSearchSelect from '../components/ProjectSearchSelect'
import ErrorAlert from '../components/ui/ErrorAlert'
import FilterBadge from '../components/ui/FilterBadge'
import FormSelect from '../components/ui/FormSelect'
import Pagination from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import { useFetch } from '../hooks/useApi'
import { useFilters } from '../hooks/useFilters'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { usePagination } from '../hooks/usePagination'
import { ApiListResponse, Wholesale, WholesalesFilters } from '../types'
import { WHOLESALE_STATUS_LABELS, WHOLESALE_STATUS_OPTIONS } from '../constants'

const defaultFilters: WholesalesFilters = {
  status: '',
  projectId: '',
  companyId: '',
}

function Wholesales() {
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const searchInputRef = useRef<HTMLSelectElement>(null)
  const initialParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const initialPageSize = Math.max(Number(initialParams.get('pageSize')) || 20, 1)
  const initialPage = Math.max(Number(initialParams.get('page')) || 1, 1)

  const { filters, setFilters, hasActiveFilters, clearFilter, clearAllFilters } =
    useFilters(defaultFilters)
  const { pagination, setPagination, setPage, setPageSize, paginationQuery } =
    usePagination(initialPageSize)

  const queryString = useMemo(() => {
    const params = new URLSearchParams(paginationQuery)
    if (filters.status) params.set('status', filters.status)
    if (filters.projectId) params.set('projectId', filters.projectId)
    if (filters.companyId) params.set('companyId', filters.companyId)
    return params.toString()
  }, [filters, paginationQuery])

  const {
    data: wholesalesData,
    isLoading: isLoadingWholesales,
  } = useFetch<ApiListResponse<Wholesale>>(`/api/wholesales?${queryString}`, {
    errorMessage: '卸一覧の取得に失敗しました',
    onStart: () => setError(''),
    onSuccess: (data) => {
      setPagination((prev) => ({ ...prev, ...data.pagination }))
    },
    onError: setError,
  })

  const wholesales = wholesalesData?.items ?? []

  const { data: selectedCompanyData } = useFetch<{ company: { id: string; name: string } }>(
    filters.companyId ? `/api/companies/${filters.companyId}` : null,
    {
      enabled: Boolean(filters.companyId),
      cacheTimeMs: 30_000,
    }
  )

  const { data: selectedProjectData } = useFetch<{ project: { id: string; name: string } }>(
    filters.projectId ? `/api/projects/${filters.projectId}` : null,
    {
      enabled: Boolean(filters.projectId),
      cacheTimeMs: 30_000,
    }
  )

  const selectedCompanyName = selectedCompanyData?.company?.name || filters.companyId
  const selectedProjectName = selectedProjectData?.project?.name || filters.projectId

  const shortcuts = useMemo(
    () => [
      {
        key: '/',
        handler: () => searchInputRef.current?.focus(),
        preventDefault: true,
        ctrlKey: false,
        metaKey: false,
      },
    ],
    []
  )

  useKeyboardShortcut(shortcuts)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const nextFilters = {
      ...defaultFilters,
      status: params.get('status') ?? '',
      projectId: params.get('projectId') ?? '',
      companyId: params.get('companyId') ?? '',
    }
    setFilters(nextFilters)
    const nextPage = Math.max(Number(params.get('page')) || initialPage, 1)
    const nextPageSize = Math.max(Number(params.get('pageSize')) || initialPageSize, 1)
    setPagination((prev) => ({
      ...prev,
      page: nextPage,
      pageSize: nextPageSize,
    }))
  }, [initialPage, initialPageSize, location.search, setFilters, setPagination])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.projectId) params.set('projectId', filters.projectId)
    if (filters.companyId) params.set('companyId', filters.companyId)
    params.set('page', String(pagination.page))
    params.set('pageSize', String(pagination.pageSize))
    const nextSearch = params.toString()
    const currentSearch = location.search.replace(/^\?/, '')
    if (nextSearch !== currentSearch) {
      navigate({ pathname: '/wholesales', search: nextSearch }, { replace: true })
    }
  }, [
    filters.companyId,
    filters.projectId,
    filters.status,
    location.search,
    navigate,
    pagination.page,
    pagination.pageSize,
  ])

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setPage(1)
  }

  const handleClearFilter = (key: keyof WholesalesFilters) => {
    clearFilter(key)
    setPage(1)
  }

  const handleClearAllFilters = () => {
    clearAllFilters()
    setPage(1)
  }

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-'
    return `¥${value.toLocaleString()}`
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Wholesales</p>
          <h2 className="text-3xl font-bold text-slate-900">卸管理</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            登録数: <span className="font-semibold text-slate-700">{pagination.total}</span>
          </span>
        </div>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-3 md:grid-cols-6">
          <FormSelect
            ref={searchInputRef}
            value={filters.status}
            onChange={(e) => {
              setFilters({ ...filters, status: e.target.value })
              setPage(1)
            }}
          >
            <option value="">全てのステータス</option>
            {WHOLESALE_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {WHOLESALE_STATUS_LABELS[status] || status}
              </option>
            ))}
          </FormSelect>
          <ProjectSearchSelect
            value={filters.projectId}
            onChange={(projectId) => {
              setFilters({ ...filters, projectId })
              setPage(1)
            }}
            placeholder="案件を検索"
          />
          <CompanySearchSelect
            value={filters.companyId}
            onChange={(companyId) => {
              setFilters({ ...filters, companyId })
              setPage(1)
            }}
            placeholder="企業を検索"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            検索
          </button>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">絞り込み中:</span>
            {filters.status && (
              <FilterBadge
                label={`ステータス: ${WHOLESALE_STATUS_LABELS[filters.status] || filters.status}`}
                onRemove={() => handleClearFilter('status')}
              />
            )}
            {filters.projectId && (
              <FilterBadge
                label={`Project: ${selectedProjectName}`}
                onRemove={() => handleClearFilter('projectId')}
              />
            )}
            {filters.companyId && (
              <FilterBadge
                label={`Company: ${selectedCompanyName}`}
                onRemove={() => handleClearFilter('companyId')}
              />
            )}
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
            >
              すべてクリア
            </button>
          </div>
        )}
      </form>

      {error && <ErrorAlert message={error} />}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoadingWholesales ? (
          <SkeletonTable rows={5} columns={6} />
        ) : wholesales.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            卸データはありません。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs text-slate-500">
                  <th className="px-4 py-3">卸先企業</th>
                  <th className="px-4 py-3">案件</th>
                  <th className="px-4 py-3">状態</th>
                  <th className="px-4 py-3 text-right">単価</th>
                  <th className="px-4 py-3 text-right">マージン</th>
                  <th className="px-4 py-3 text-right">詳細</th>
                </tr>
              </thead>
              <tbody>
                {wholesales.map((wholesale) => (
                  <tr key={wholesale.id} className="border-t border-slate-100 text-sm">
                    <td className="px-4 py-3">
                      <Link
                        to={`/companies/${wholesale.companyId}`}
                        className="font-semibold text-slate-700 hover:text-slate-900"
                      >
                        {wholesale.company?.name || wholesale.companyId}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/projects/${wholesale.projectId}`}
                        className="text-slate-600 hover:text-slate-900"
                      >
                        {wholesale.project?.name || wholesale.projectId}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={WHOLESALE_STATUS_LABELS[wholesale.status] || wholesale.status}
                        size="sm"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatCurrency(wholesale.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {wholesale.margin != null ? `${wholesale.margin}%` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/wholesales/${wholesale.id}`}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        詳細へ
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
    </div>
  )
}

export default Wholesales
