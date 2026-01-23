import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CompanySearchSelect, ProjectSearchSelect } from '../components/SearchSelect'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import EmptyState from '../components/ui/EmptyState'
import ActiveFilters from '../components/ui/ActiveFilters'
import FilterBadge from '../components/ui/FilterBadge'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import FormTextarea from '../components/ui/FormTextarea'
import DateInput from '../components/ui/DateInput'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Modal from '../components/ui/Modal'
import Pagination from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import Toast from '../components/ui/Toast'
import { useFetch, useMutation } from '../hooks/useApi'
import { createSearchShortcut, useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { useListPage } from '../hooks/useListPage'
import { usePermissions } from '../hooks/usePermissions'
import { useToast } from '../hooks/useToast'
import type { Wholesale, WholesalesFilters } from '../types'
import { WHOLESALE_STATUS_OPTIONS, statusLabel } from '../constants/labels'
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
    <Card className="p-5">
      <form onSubmit={onSubmit} className="space-y-4">
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
            className="tabular-nums"
            value={filters.unitPriceMin}
            onChange={(e) => {
              onFiltersChange({ ...filters, unitPriceMin: e.target.value })
            }}
            placeholder="単価下限"
          />
          <FormInput
            type="number"
            className="tabular-nums"
            value={filters.unitPriceMax}
            onChange={(e) => {
              onFiltersChange({ ...filters, unitPriceMax: e.target.value })
            }}
            placeholder="単価上限"
          />
          <Button type="submit" className="h-11 w-full md:w-auto">
            検索
          </Button>
        </div>

        <ActiveFilters isActive={hasActiveFilters} className="border-t border-slate-100 pt-3">
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
              className="tabular-nums"
            />
          )}
          {filters.unitPriceMax && (
            <FilterBadge
              label={`単価上限: ¥${Number(filters.unitPriceMax).toLocaleString()}`}
              onRemove={() => onClearFilter('unitPriceMax')}
              className="tabular-nums"
            />
          )}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-rose-600 hover:text-rose-700"
          >
            すべて解除
          </button>
        </ActiveFilters>
      </form>
    </Card>
  )
}

type WholesalesTableProps = {
  wholesales: Wholesale[]
  isLoading: boolean
  canWrite: boolean
  onEdit: (wholesale: Wholesale) => void
  onDelete: (wholesale: Wholesale) => void
  emptyStateDescription?: string
  emptyStateAction?: React.ReactNode
}

function WholesalesTable({
  wholesales,
  isLoading,
  canWrite,
  onEdit,
  onDelete,
  emptyStateDescription,
  emptyStateAction,
}: WholesalesTableProps) {
  if (isLoading) {
    return <SkeletonTable rows={5} columns={6} />
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm text-slate-600">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase whitespace-nowrap text-slate-500">
          <tr>
            <th className="px-5 py-3">企業</th>
            <th className="px-5 py-3">案件</th>
            <th className="px-5 py-3">ステータス</th>
            <th className="px-5 py-3 text-right">単価</th>
            <th className="px-5 py-3 text-right">マージン</th>
            <th className="px-5 py-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {wholesales.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-12 text-center">
                <EmptyState
                  className="text-pretty"
                  message="卸先が見つかりません"
                  description={emptyStateDescription}
                  icon={
                    <svg
                      className="size-12 text-slate-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M3 7h11v10H3V7zm11 0h4l3 5v5h-7V7z"
                      />
                    </svg>
                  }
                  action={emptyStateAction}
                />
              </td>
            </tr>
          ) : (
            wholesales.map((wholesale) => (
              <tr key={wholesale.id} className="group hover:bg-slate-50/80">
                <td className="px-5 py-4 min-w-0">
                  <Link
                    to={`/companies/${wholesale.companyId}`}
                    className="block truncate font-semibold text-slate-900 hover:text-sky-600"
                  >
                    {wholesale.company?.name || wholesale.companyId}
                  </Link>
                </td>
                <td className="px-5 py-4 min-w-0">
                  <Link
                    to={`/projects/${wholesale.projectId}`}
                    className="block truncate text-slate-600 hover:text-sky-600"
                  >
                    {wholesale.project?.name || wholesale.projectId}
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={wholesale.status} kind="wholesale" size="sm" />
                </td>
                <td className="px-5 py-4 text-right tabular-nums text-slate-600">
                  {formatCurrency(wholesale.unitPrice)}
                </td>
                <td className="px-5 py-4 text-right tabular-nums text-slate-600">
                  {wholesale.margin != null ? `${wholesale.margin}%` : '-'}
                </td>
                <td className="px-5 py-4 text-right">
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
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function Wholesales() {
  const { canWrite } = usePermissions()
  const [error, setError] = useState('')
  const searchInputRef = useRef<HTMLSelectElement>(null)
  const { toast, showToast, clearToast } = useToast()
  const navigate = useNavigate()

  const {
    filters,
    setFilters,
    hasActiveFilters,
    clearFilter,
    clearAllFilters,
    pagination,
    setPage,
    setPageSize,
    handleSearchSubmit,
    data: wholesalesData,
    isLoading: isLoadingWholesales,
    refetch: refetchWholesales,
  } = useListPage<WholesalesFilters, Record<string, string>, Wholesale>({
    urlSync: { pathname: '/wholesales', defaultFilters },
    buildUrl: apiRoutes.wholesales.list,
    fetchOptions: {
      errorMessage: '卸一覧の取得に失敗しました',
      onStart: () => setError(''),
      onError: setError,
    },
  })

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

  const shortcuts = useMemo(() => [createSearchShortcut(searchInputRef)], [searchInputRef])

  useKeyboardShortcut(shortcuts)

  const handleClearFilter = (key: keyof WholesalesFilters) => {
    clearFilter(key)
  }

  const handleClearAllFilters = () => {
    clearAllFilters()
  }

  const handleNavigateProjects = () => {
    navigate('/projects')
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
      showToast('卸を更新しました', 'success')
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
      showToast('卸を削除しました', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : '卸の削除に失敗しました')
    }
  }

  const emptyStateDescription = hasActiveFilters
    ? '絞り込み条件をリセットして一覧を確認してください。'
    : canWrite
    ? '案件詳細から卸先を登録できます。'
    : '案件一覧から卸先の登録状況を確認できます。'

  const emptyStateAction = hasActiveFilters ? (
    <Button type="button" variant="secondary" size="sm" onClick={handleClearAllFilters}>
      絞り込みを解除
    </Button>
  ) : (
    <Button type="button" size="sm" onClick={handleNavigateProjects}>
      案件管理へ
    </Button>
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="text-pretty">
          <p className="text-sm uppercase text-slate-400">卸</p>
          <h2 className="text-balance text-3xl font-bold text-slate-900">卸管理</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 tabular-nums">
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
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-pretty text-slate-500">
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
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditingWholesale(null)}
              disabled={isUpdating}
            >
              キャンセル
            </Button>
            <Button
              type="button"
              onClick={handleEditSave}
              isLoading={isUpdating}
              loadingLabel="保存中..."
            >
              保存
            </Button>
          </>
        }
      >
        <div className="space-y-4 text-pretty">
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
              className="tabular-nums"
              value={editForm.unitPrice}
              onChange={(e) => setEditForm({ ...editForm, unitPrice: e.target.value })}
              placeholder="例: 10000"
            />
          </div>
          <div>
            <div className="mb-1 block text-sm font-medium text-slate-700">合意日</div>
            <DateInput
              className="tabular-nums"
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
        emptyStateDescription={emptyStateDescription}
        emptyStateAction={emptyStateAction}
      />

      <Pagination
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={pagination.total}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
      />
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant === 'error' ? 'error' : toast.variant === 'success' ? 'success' : 'info'}
          onClose={clearToast}
          className="fixed bottom-6 right-6 z-50 safe-area-bottom"
        />
      )}
    </div>
  )
}

export default Wholesales
