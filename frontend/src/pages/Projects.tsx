import { Link } from 'react-router-dom'
import { CompanySearchSelect } from '../components/SearchSelect'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import DateInput from '../components/ui/DateInput'
import EmptyState from '../components/ui/EmptyState'
import ErrorAlert from '../components/ui/ErrorAlert'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import FormTextarea from '../components/ui/FormTextarea'
import LoadingState from '../components/ui/LoadingState'
import Pagination from '../components/ui/Pagination'
import StatusBadge from '../components/ui/StatusBadge'
import Toast from '../components/ui/Toast'
import { PROJECT_STATUS_OPTIONS, statusLabel } from '../constants/labels'
import { useProjectsPage } from '../features/projects/useProjectsPage'
import { formatCurrency } from '../utils/format'

function Projects() {
  const {
    canWrite,
    searchInputRef,
    createNameRef,
    showCreateForm,
    setShowCreateForm,
    toast,
    clearToast,
    form,
    setForm,
    filters,
    setFilters,
    pagination,
    setPage,
    setPageSize,
    handleSearchSubmit,
    projects,
    error,
    setError,
    isLoadingProjects,
    userOptions,
    isCreating,
    isUpdatingOwner,
    handleCreate,
    handleOwnerChange,
  } = useProjectsPage()

  const clearFilters = () => {
    setFilters({ q: '', status: '', companyId: '', ownerId: '' })
    setPage(1)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase text-slate-400">案件</p>
          <h2 className="text-3xl font-bold text-slate-900">案件一覧</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            合計 <span className="font-semibold text-slate-700">{pagination.total}</span> 件
          </span>
          {canWrite && (
            <Button
              type="button"
              onClick={() => setShowCreateForm((prev) => !prev)}
              className="inline-flex items-center gap-2"
            >
              {showCreateForm ? '作成フォームを閉じる' : '案件を作成'}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <form onSubmit={handleSearchSubmit} className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <FormInput
              ref={searchInputRef}
              label="検索"
              placeholder="案件名で検索"
              value={filters.q}
              onChange={(event) => {
                setFilters({ ...filters, q: event.target.value })
              }}
            />
          </div>
          <div className="md:col-span-2">
            <CompanySearchSelect
              label="企業"
              value={filters.companyId}
              onChange={(companyId) => {
                setFilters({ ...filters, companyId })
              }}
              placeholder="企業で絞り込み"
            />
          </div>
          <FormSelect
            label="ステータス"
            value={filters.status}
            onChange={(event) => {
              setFilters({ ...filters, status: event.target.value })
            }}
          >
            <option value="">すべて</option>
            {PROJECT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {statusLabel('project', status)}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            label="担当者"
            value={filters.ownerId}
            onChange={(event) => {
              setFilters({ ...filters, ownerId: event.target.value })
            }}
          >
            <option value="">担当者未設定</option>
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </FormSelect>
          <div className="flex items-end gap-2">
            <Button type="submit" className="w-full">
              検索
            </Button>
            <Button type="button" variant="secondary" onClick={clearFilters} className="w-full">
              解除
            </Button>
          </div>
        </form>
      </Card>

      {canWrite && showCreateForm && (
        <Card>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <CompanySearchSelect
                label="企業"
                value={form.companyId}
                onChange={(companyId) => setForm({ ...form, companyId })}
                placeholder="企業名で検索"
              />
              <FormInput
                ref={createNameRef}
                label="案件名"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="案件名を入力"
              />
              <FormSelect
                label="ステータス"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                {PROJECT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {statusLabel('project', status)}
                  </option>
                ))}
              </FormSelect>
              <FormInput
                label="単価"
                type="number"
                value={form.unitPrice}
                onChange={(event) => setForm({ ...form, unitPrice: event.target.value })}
                placeholder="例: 50000"
              />
              <FormSelect
                label="担当者"
                value={form.ownerId}
                onChange={(event) => setForm({ ...form, ownerId: event.target.value })}
              >
                <option value="">担当者未設定</option>
                {userOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email}
                  </option>
                ))}
              </FormSelect>
              <div className="grid grid-cols-2 gap-2">
                <DateInput
                  label="開始日"
                  value={form.periodStart}
                  onChange={(event) => setForm({ ...form, periodStart: event.target.value })}
                />
                <DateInput
                  label="終了日"
                  value={form.periodEnd}
                  onChange={(event) => setForm({ ...form, periodEnd: event.target.value })}
                />
              </div>
            </div>
            <FormTextarea
              label="条件・メモ"
              value={form.conditions}
              onChange={(event) => setForm({ ...form, conditions: event.target.value })}
              placeholder="条件や補足情報を入力"
              className="min-h-[88px]"
            />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                キャンセル
              </Button>
              <Button type="submit" isLoading={isCreating} loadingLabel="作成中...">
                作成
              </Button>
            </div>
          </form>
        </Card>
      )}

      {!canWrite && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          権限がないため、案件の作成や担当者変更はできません。
        </div>
      )}

      <ErrorAlert message={error} onClose={() => setError('')} />

      {isLoadingProjects ? (
        <LoadingState />
      ) : projects.length === 0 ? (
        <EmptyState
          message="案件が見つかりません"
          description="検索条件を見直してください。"
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm text-slate-600">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">案件名</th>
                <th className="px-5 py-3">企業</th>
                <th className="px-5 py-3">ステータス</th>
                <th className="px-5 py-3">単価</th>
                <th className="px-5 py-3">担当者</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <Link
                      to={`/projects/${project.id}`}
                      className="font-semibold text-slate-900 hover:text-sky-600"
                    >
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    {project.company ? (
                      <Link
                        to={`/companies/${project.companyId}`}
                        className="text-slate-600 hover:text-sky-600"
                      >
                        {project.company.name}
                      </Link>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={project.status ?? 'active'} kind="project" size="sm" />
                  </td>
                  <td className="px-5 py-4 tabular-nums">
                    {project.unitPrice ? formatCurrency(project.unitPrice) : '-'}
                  </td>
                  <td className="px-5 py-4">
                    {canWrite ? (
                      <FormSelect
                        value={project.ownerId ?? ''}
                        onChange={(event) => {
                          void handleOwnerChange(project.id, event.target.value)
                        }}
                        className="w-full"
                        disabled={isUpdatingOwner}
                      >
                        <option value="">担当者未設定</option>
                        {userOptions.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.name || user.email}
                          </option>
                        ))}
                      </FormSelect>
                    ) : (
                      userOptions.find((user) => user.id === project.ownerId)?.name ||
                      userOptions.find((user) => user.id === project.ownerId)?.email ||
                      project.ownerId ||
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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

export default Projects
