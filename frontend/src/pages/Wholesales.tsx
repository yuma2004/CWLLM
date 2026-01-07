import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import CompanySearchSelect from '../components/CompanySearchSelect'
import ProjectSearchSelect from '../components/ProjectSearchSelect'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import FilterBadge from '../components/ui/FilterBadge'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import FormTextarea from '../components/ui/FormTextarea'
import Modal from '../components/ui/Modal'
import Pagination from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import { useFetch, useMutation } from '../hooks/useApi'
import { useFilters } from '../hooks/useFilters'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { usePagination } from '../hooks/usePagination'
import { usePermissions } from '../hooks/usePermissions'
import { ApiListResponse, Wholesale, WholesalesFilters } from '../types'
import { WHOLESALE_STATUS_LABELS, WHOLESALE_STATUS_OPTIONS } from '../constants'
import { formatDateInput } from '../utils/date'

const defaultFilters: WholesalesFilters = {
  status: '',
  projectId: '',
  companyId: '',
  unitPriceMin: '',
  unitPriceMax: '',
}

function Wholesales() {
  const { canWrite } = usePermissions()
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

  // 編集モーダル用state
  const [editingWholesale, setEditingWholesale] = useState<Wholesale | null>(null)
  const [editForm, setEditForm] = useState({
    status: 'active',
    unitPrice: '',
    conditions: '',
    agreedDate: '',
  })

  // 削除確認用state
  const [deleteTarget, setDeleteTarget] = useState<Wholesale | null>(null)

  const queryString = useMemo(() => {
    const params = new URLSearchParams(paginationQuery)
    if (filters.status) params.set('status', filters.status)
    if (filters.projectId) params.set('projectId', filters.projectId)
    if (filters.companyId) params.set('companyId', filters.companyId)
    if (filters.unitPriceMin) params.set('unitPriceMin', filters.unitPriceMin)
    if (filters.unitPriceMax) params.set('unitPriceMax', filters.unitPriceMax)
    return params.toString()
  }, [filters, paginationQuery])

  const {
    data: wholesalesData,
    isLoading: isLoadingWholesales,
    refetch: refetchWholesales,
  } = useFetch<ApiListResponse<Wholesale>>(`/api/wholesales?${queryString}`, {
    errorMessage: '卸一覧の取得に失敗しました',
    onStart: () => setError(''),
    onSuccess: (data) => {
      setPagination((prev) => ({ ...prev, ...data.pagination }))
    },
    onError: setError,
  })

  const wholesales = wholesalesData?.items ?? []

  const { mutate: updateWholesale, isLoading: isUpdating } = useMutation<
    { wholesale: Wholesale },
    { status?: string; unitPrice?: number | null; conditions?: string | null; agreedDate?: string | null }
  >('/api/wholesales', 'PATCH')

  const { mutate: deleteWholesale, isLoading: isDeleting } = useMutation<void, void>(
    '/api/wholesales',
    'DELETE'
  )

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
      unitPriceMin: params.get('unitPriceMin') ?? '',
      unitPriceMax: params.get('unitPriceMax') ?? '',
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
    if (filters.unitPriceMin) params.set('unitPriceMin', filters.unitPriceMin)
    if (filters.unitPriceMax) params.set('unitPriceMax', filters.unitPriceMax)
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
    filters.unitPriceMin,
    filters.unitPriceMax,
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

  const handleEditOpen = (wholesale: Wholesale) => {
    setEditingWholesale(wholesale)
    setEditForm({
      status: wholesale.status,
      unitPrice: wholesale.unitPrice?.toString() || '',
      conditions: wholesale.conditions || '',
      agreedDate: wholesale.agreedDate
        ? formatDateInput(wholesale.agreedDate)
        : '',
    })
  }

  const handleEditSave = async () => {
    if (!editingWholesale || !canWrite) return
    setError('')
    try {
      await updateWholesale(
        {
          status: editForm.status,
          unitPrice: editForm.unitPrice ? Number(editForm.unitPrice) : null,
          conditions: editForm.conditions || null,
          agreedDate: editForm.agreedDate || null,
        },
        {
          url: `/api/wholesales/${editingWholesale.id}`,
          errorMessage: '卸の更新に失敗しました',
        }
      )
      setEditingWholesale(null)
      void refetchWholesales(undefined, { ignoreCache: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '卸の更新に失敗しました')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !canWrite) return
    setError('')
    try {
      await deleteWholesale(undefined, {
        url: `/api/wholesales/${deleteTarget.id}`,
        errorMessage: '卸の削除に失敗しました',
      })
      setDeleteTarget(null)
      void refetchWholesales(undefined, { ignoreCache: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '卸の削除に失敗しました')
    }
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
          <FormInput
            type="number"
            value={filters.unitPriceMin}
            onChange={(e) => {
              setFilters({ ...filters, unitPriceMin: e.target.value })
              setPage(1)
            }}
            placeholder="単価（最小）"
          />
          <FormInput
            type="number"
            value={filters.unitPriceMax}
            onChange={(e) => {
              setFilters({ ...filters, unitPriceMax: e.target.value })
              setPage(1)
            }}
            placeholder="単価（最大）"
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
                label={`案件: ${selectedProjectName}`}
                onRemove={() => handleClearFilter('projectId')}
              />
            )}
            {filters.companyId && (
              <FilterBadge
                label={`企業: ${selectedCompanyName}`}
                onRemove={() => handleClearFilter('companyId')}
              />
            )}
            {filters.unitPriceMin && (
              <FilterBadge
                label={`単価（最小）: ¥${Number(filters.unitPriceMin).toLocaleString()}`}
                onRemove={() => handleClearFilter('unitPriceMin')}
              />
            )}
            {filters.unitPriceMax && (
              <FilterBadge
                label={`単価（最大）: ¥${Number(filters.unitPriceMax).toLocaleString()}`}
                onRemove={() => handleClearFilter('unitPriceMax')}
              />
            )}
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700"
            >
              すべてクリア
            </button>
          </div>
        )}
      </form>

      {/* Readonly Notice */}
      {!canWrite && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          閲覧専用ロールのため、卸の編集・削除はできません。
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingWholesale}
        onClose={() => setEditingWholesale(null)}
        title="卸を編集"
        footer={
          <>
            <button
              type="button"
              onClick={() => setEditingWholesale(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              disabled={isUpdating}
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleEditSave}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:bg-sky-300"
              disabled={isUpdating}
            >
              {isUpdating ? '保存中...' : '保存'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">卸先企業</label>
            <p className="text-sm text-slate-600">
              {editingWholesale?.company?.name || editingWholesale?.companyId}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">案件</label>
            <p className="text-sm text-slate-600">
              {editingWholesale?.project?.name || editingWholesale?.projectId}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">ステータス</label>
            <FormSelect
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              {WHOLESALE_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {WHOLESALE_STATUS_LABELS[status] || status}
                </option>
              ))}
            </FormSelect>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">単価</label>
            <FormInput
              type="number"
              value={editForm.unitPrice}
              onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
              placeholder="例: 10000"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">合意日</label>
            <FormInput
              type="date"
              value={editForm.agreedDate}
              onChange={(e) => setEditForm({ ...editForm, agreedDate: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">条件・備考</label>
            <FormTextarea
              value={editForm.conditions}
              onChange={(e) => setEditForm({ ...editForm, conditions: e.target.value })}
              placeholder="条件や備考を入力"
              className="min-h-[80px]"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="卸の削除"
        description={`「${deleteTarget?.company?.name || deleteTarget?.companyId}」への卸を削除しますか？この操作は取り消せません。`}
        confirmLabel="削除"
        cancelLabel="キャンセル"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {error && <ErrorAlert message={error} onClose={() => setError('')} />}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoadingWholesales ? (
          <SkeletonTable rows={5} columns={7} />
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
                  <th className="px-4 py-3 text-right">操作</th>
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
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/wholesales/${wholesale.id}`}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                        >
                          詳細
                        </Link>
                        {canWrite && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditOpen(wholesale)}
                              className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                            >
                              編集
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(wholesale)}
                              className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                            >
                              削除
                            </button>
                          </>
                        )}
                      </div>
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
