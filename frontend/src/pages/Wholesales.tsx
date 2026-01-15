import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CompanySearchSelect, ProjectSearchSelect } from '../components/SearchSelect'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import EmptyState from '../components/ui/EmptyState'
import FilterBadge from '../components/ui/FilterBadge'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import FormTextarea from '../components/ui/FormTextarea'
import Modal from '../components/ui/Modal'
import Pagination from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import { useFetch, useMutation } from '../hooks/useApi'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { useListQuery } from '../hooks/useListQuery'
import { useUrlSync } from '../hooks/useUrlSync'
import { usePermissions } from '../hooks/usePermissions'
import type { ApiListResponse, Wholesale, WholesalesFilters } from '../types'
import { WHOLESALE_STATUS_OPTIONS, statusLabel } from '../constants'
import { formatDateInput } from '../utils/date'
import { formatCurrency } from '../utils/format'
import { apiRoutes } from '../lib/apiRoutes'

const defaultFilters: WholesalesFilters = {
  status: '',
  projectId: '',
  companyId: '',
  unitPriceMin: '',
  unitPriceMax: '',
}

type WholesalesFiltersProps = {
  filters: WholesalesFilters
  onFiltersChange: (next: WholesalesFilters) => void
  onSubmit: (event: React.FormEvent) => void
  hasActiveFilters: boolean
  onClearFilter: (key: keyof WholesalesFilters) => void
  onClearAll: () => void
  selectedCompanyName: string
  selectedProjectName: string
  searchInputRef: React.RefObject<HTMLSelectElement>
}

function WholesalesFilters({
  filters,
  onFiltersChange,
  onSubmit,
  hasActiveFilters,
  onClearFilter,
  onClearAll,
  selectedCompanyName,
  selectedProjectName,
  searchInputRef,
}: WholesalesFiltersProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-3 md:grid-cols-6">
        <FormSelect
          ref={searchInputRef}
          value={filters.status}
          onChange={(e) => {
            onFiltersChange({ ...filters, status: e.target.value })
          }}
        >
          <option value="">ステータス</option>
          {WHOLESALE_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {statusLabel('wholesale', status)}
            </option>
          ))}
        </FormSelect>
        <ProjectSearchSelect
          value={filters.projectId}
          onChange={(projectId) => {
            onFiltersChange({ ...filters, projectId })
          }}
          placeholder="案件名"
        />
        <CompanySearchSelect
          value={filters.companyId}
          onChange={(companyId) => {
            onFiltersChange({ ...filters, companyId })
          }}
          placeholder="企業名"
        />
        <FormInput
          type="number"
          value={filters.unitPriceMin}
          onChange={(e) => {
            onFiltersChange({ ...filters, unitPriceMin: e.target.value })
          }}
          placeholder="単価下限"
        />
        <FormInput
          type="number"
          value={filters.unitPriceMax}
          onChange={(e) => {
            onFiltersChange({ ...filters, unitPriceMax: e.target.value })
          }}
          placeholder="単価上限"
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
          <span className="text-xs text-slate-500">絞り込み:</span>
          {filters.status && (
            <FilterBadge
              label={`ステータス: ${statusLabel('wholesale', filters.status)}`}
              onRemove={() => onClearFilter('status')}
            />
          )}
          {filters.projectId && (
            <FilterBadge
              label={`案件: ${selectedProjectName}`}
              onRemove={() => onClearFilter('projectId')}
            />
          )}
          {filters.companyId && (
            <FilterBadge
              label={`企業: ${selectedCompanyName}`}
              onRemove={() => onClearFilter('companyId')}
            />
          )}
          {filters.unitPriceMin && (
            <FilterBadge
              label={`単価下限: ¥${Number(filters.unitPriceMin).toLocaleString()}`}
              onRemove={() => onClearFilter('unitPriceMin')}
            />
          )}
          {filters.unitPriceMax && (
            <FilterBadge
              label={`単価上限: ¥${Number(filters.unitPriceMax).toLocaleString()}`}
              onRemove={() => onClearFilter('unitPriceMax')}
            />
          )}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-semibold text-rose-600 hover:text-rose-700"
          >
            すべて解除
          </button>
        </div>
      )}
    </form>
  )
}

type WholesalesTableProps = {
  wholesales: Wholesale[]
  isLoading: boolean
  canWrite: boolean
  onEdit: (wholesale: Wholesale) => void
  onDelete: (wholesale: Wholesale) => void
}

function WholesalesTable({ wholesales, isLoading, canWrite, onEdit, onDelete }: WholesalesTableProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      {isLoading ? (
        <SkeletonTable rows={5} columns={7} />
      ) : wholesales.length === 0 ? (
        <EmptyState className="px-6 py-10" message="卸先が見つかりません" />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs text-slate-500">
                <th className="px-4 py-3">企業</th>
                <th className="px-4 py-3">案件</th>
                <th className="px-4 py-3">ステータス</th>
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
                    <StatusBadge status={wholesale.status} kind="wholesale" size="sm" />
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
                            onClick={() => onEdit(wholesale)}
                            className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                          >
                            編集
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(wholesale)}
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
  )
}

function Wholesales() {
  const { canWrite } = usePermissions()
  const [error, setError] = useState('')
  const searchInputRef = useRef<HTMLSelectElement>(null)

  const { filters, setFilters, hasActiveFilters, clearFilter, clearAllFilters, pagination, setPagination, setPage, setPageSize } =
    useUrlSync({ pathname: '/wholesales', defaultFilters })

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

  const queryString = useListQuery(filters, pagination)

  const {
    data: wholesalesData,
    isLoading: isLoadingWholesales,
    refetch: refetchWholesales,
  } = useFetch<ApiListResponse<Wholesale>>(apiRoutes.wholesales.list(queryString), {
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
  >(apiRoutes.wholesales.base(), 'PATCH')

  const { mutate: deleteWholesale, isLoading: isDeleting } = useMutation<void, void>(
    apiRoutes.wholesales.base(),
    'DELETE'
  )

  const { data: selectedCompanyData } = useFetch<{ company: { id: string; name: string } }>(
    filters.companyId ? apiRoutes.companies.detail(filters.companyId) : null,
    {
      enabled: Boolean(filters.companyId),
      cacheTimeMs: 30_000,
    }
  )

  const { data: selectedProjectData } = useFetch<{ project: { id: string; name: string } }>(
    filters.projectId ? apiRoutes.projects.detail(filters.projectId) : null,
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

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setPage(1)
  }

  const handleClearFilter = (key: keyof WholesalesFilters) => {
    clearFilter(key)
  }

  const handleClearAllFilters = () => {
    clearAllFilters()
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
          url: apiRoutes.wholesales.detail(editingWholesale.id),
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
        url: apiRoutes.wholesales.detail(deleteTarget.id),
        errorMessage: '卸の削除に失敗しました',
      })
      setDeleteTarget(null)
      void refetchWholesales(undefined, { ignoreCache: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '卸の削除に失敗しました')
    }
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

      <WholesalesFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSubmit={handleSearchSubmit}
        hasActiveFilters={hasActiveFilters}
        onClearFilter={handleClearFilter}
        onClearAll={handleClearAllFilters}
        selectedCompanyName={selectedCompanyName}
        selectedProjectName={selectedProjectName}
        searchInputRef={searchInputRef}
      />

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
            <div className="mb-1 block text-sm font-medium text-slate-700">卸先企業</div>
            <p className="text-sm text-slate-600">
              {editingWholesale?.company?.name || editingWholesale?.companyId}
            </p>
          </div>
          <div>
            <div className="mb-1 block text-sm font-medium text-slate-700">案件</div>
            <p className="text-sm text-slate-600">
              {editingWholesale?.project?.name || editingWholesale?.projectId}
            </p>
          </div>
          <div>
            <div className="mb-1 block text-sm font-medium text-slate-700">ステータス</div>
            <FormSelect
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              {WHOLESALE_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {statusLabel('wholesale', status)}
                </option>
              ))}
            </FormSelect>
          </div>
          <div>
            <div className="mb-1 block text-sm font-medium text-slate-700">単価</div>
            <FormInput
              type="number"
              value={editForm.unitPrice}
              onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
              placeholder="例: 10000"
            />
          </div>
          <div>
            <div className="mb-1 block text-sm font-medium text-slate-700">合意日</div>
            <FormInput
              type="date"
              value={editForm.agreedDate}
              onChange={(e) => setEditForm({ ...editForm, agreedDate: e.target.value })}
            />
          </div>
          <div>
            <div className="mb-1 block text-sm font-medium text-slate-700">条件・備考</div>
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

      <WholesalesTable
        wholesales={wholesales}
        isLoading={isLoadingWholesales}
        canWrite={canWrite}
        onEdit={handleEditOpen}
        onDelete={setDeleteTarget}
      />

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
