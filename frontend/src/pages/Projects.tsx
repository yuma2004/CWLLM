import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CompanySearchSelect } from '../components/SearchSelect'
import ErrorAlert from '../components/ui/ErrorAlert'
import EmptyState from '../components/ui/EmptyState'
import ActiveFilters from '../components/ui/ActiveFilters'
import FilterBadge from '../components/ui/FilterBadge'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import FormTextarea from '../components/ui/FormTextarea'
import Card from '../components/ui/Card'
import Pagination from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import { usePermissions } from '../hooks/usePermissions'
import { useFetch, useMutation } from '../hooks/useApi'
import { createSearchShortcut, useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { useListPage } from '../hooks/useListPage'
import { PROJECT_STATUS_OPTIONS, statusLabel } from '../constants/labels'
import type { Project, ProjectsFilters, User } from '../types'
import { formatCurrency } from '../utils/format'
import { apiRoutes } from '../lib/apiRoutes'

type ProjectCreatePayload = {
  companyId: string
  name: string
  status?: string
  unitPrice?: number
  conditions?: string
  periodStart?: string
  periodEnd?: string
  ownerId?: string
}

const defaultFilters: ProjectsFilters = {
  q: '',
  status: '',
  companyId: '',
  ownerId: '',
}

type ProjectFormState = {
  companyId: string
  name: string
  status: string
  unitPrice: string
  conditions: string
  periodStart: string
  periodEnd: string
  ownerId: string
}

type ProjectsFiltersProps = {
  filters: ProjectsFilters
  onFiltersChange: (next: ProjectsFilters) => void
  onSubmit: (event: React.FormEvent) => void
  hasActiveFilters: boolean
  onClearFilter: (key: keyof ProjectsFilters) => void
  onClearAll: () => void
  userOptions: User[]
  getCompanyName: (companyId: string) => string
  getOwnerName: (ownerId: string) => string
  searchInputRef: React.RefObject<HTMLInputElement>
}

function ProjectsFilters({
  filters,
  onFiltersChange,
  onSubmit,
  hasActiveFilters,
  onClearFilter,
  onClearAll,
  userOptions,
  getCompanyName,
  getOwnerName,
  searchInputRef,
}: ProjectsFiltersProps) {
  return (
    <Card className="p-5">
      <form onSubmit={onSubmit}>
        <div className="grid gap-3 md:grid-cols-5">
          <div className="relative md:col-span-2">
            <svg
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <FormInput
              ref={searchInputRef}
              className="pl-10 pr-3"
              placeholder="案件名で検索 (/ で移動)"
              value={filters.q}
              onChange={(event) => {
                onFiltersChange({ ...filters, q: event.target.value })
              }}
            />
          </div>
          <FormSelect
            value={filters.status}
            onChange={(event) => {
              onFiltersChange({ ...filters, status: event.target.value })
            }}
          >
            <option value="">ステータス</option>
            {PROJECT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {statusLabel('project', status)}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            value={filters.ownerId}
            onChange={(event) => {
              onFiltersChange({ ...filters, ownerId: event.target.value })
            }}
          >
            <option value="">担当者</option>
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </FormSelect>
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            検索
          </button>
        </div>

        {/* Active Filters */}
        <ActiveFilters isActive={hasActiveFilters}>
          <span className="text-xs text-slate-500">絞り込み:</span>
          {filters.q && (
            <FilterBadge label={`案件名: ${filters.q}`} onRemove={() => onClearFilter('q')} />
          )}
          {filters.status && (
            <FilterBadge
              label={`ステータス: ${statusLabel('project', filters.status)}`}
              onRemove={() => onClearFilter('status')}
            />
          )}
          {filters.companyId && (
            <FilterBadge
              label={`企業: ${getCompanyName(filters.companyId)}`}
              onRemove={() => onClearFilter('companyId')}
            />
          )}
          {filters.ownerId && (
            <FilterBadge
              label={`担当者: ${getOwnerName(filters.ownerId)}`}
              onRemove={() => onClearFilter('ownerId')}
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

type ProjectsCreateFormProps = {
  isOpen: boolean
  form: ProjectFormState
  onFormChange: (next: ProjectFormState) => void
  onSubmit: (event: React.FormEvent) => void
  onClose: () => void
  isCreating: boolean
  userOptions: User[]
}

function ProjectsCreateForm({
  isOpen,
  form,
  onFormChange,
  onSubmit,
  onClose,
  isCreating,
  userOptions,
}: ProjectsCreateFormProps) {
  if (!isOpen) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-balance text-lg font-semibold text-slate-900">案件を追加</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
          aria-label="案件作成フォームを閉じる"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        {/* 基本情報 */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 block text-xs font-medium text-slate-600">
              企業 <span className="text-rose-500">*</span>
            </div>
            <CompanySearchSelect
              value={form.companyId}
              onChange={(companyId) => onFormChange({ ...form, companyId })}
              placeholder="企業名で検索"
            />
          </div>
          <div>
            <div className="mb-1 block text-xs font-medium text-slate-600">
              案件名 <span className="text-rose-500">*</span>
            </div>
            <FormInput
              placeholder="案件名を入力"
              value={form.name}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
            />
          </div>
        </div>
        {/* 詳細情報 */}
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="mb-1 block text-xs font-medium text-slate-600">ステータス</div>
            <FormSelect
              value={form.status}
              onChange={(event) => onFormChange({ ...form, status: event.target.value })}
            >
              {PROJECT_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {statusLabel('project', status)}
                </option>
              ))}
            </FormSelect>
          </div>
          <div>
            <div className="mb-1 block text-xs font-medium text-slate-600">単価</div>
            <FormInput
              type="number"
              placeholder="例: 50000"
              value={form.unitPrice}
              onChange={(event) => onFormChange({ ...form, unitPrice: event.target.value })}
            />
          </div>
          <div>
            <div className="mb-1 block text-xs font-medium text-slate-600">担当者</div>
            <FormSelect
              value={form.ownerId}
              onChange={(event) => onFormChange({ ...form, ownerId: event.target.value })}
            >
              <option value="">担当者</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </FormSelect>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 block text-xs font-medium text-slate-600">開始日</div>
            <FormInput
              type="date"
              value={form.periodStart}
              onChange={(event) => onFormChange({ ...form, periodStart: event.target.value })}
            />
          </div>
          <div>
            <div className="mb-1 block text-xs font-medium text-slate-600">終了日</div>
            <FormInput
              type="date"
              value={form.periodEnd}
              onChange={(event) => onFormChange({ ...form, periodEnd: event.target.value })}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 block text-xs font-medium text-slate-600">条件・備考</div>
          <FormTextarea
            placeholder="条件や備考を入力"
            value={form.conditions}
            onChange={(event) => onFormChange({ ...form, conditions: event.target.value })}
            className="min-h-[80px]"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-6 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            disabled={isCreating}
          >
            {isCreating ? '作成中...' : '作成'}
          </button>
        </div>
      </form>
    </div>
  )
}

type ProjectsTableProps = {
  projects: Project[]
  isLoading: boolean
  canWrite: boolean
  onOpenCreateForm: () => void
}

function ProjectsTable({ projects, isLoading, canWrite, onOpenCreateForm }: ProjectsTableProps) {
  if (isLoading) {
    return <SkeletonTable rows={5} columns={5} />
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50/80 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3">案件名</th>
            <th className="px-5 py-3">企業</th>
            <th className="px-5 py-3">ステータス</th>
            <th className="px-5 py-3">単価</th>
            <th className="px-5 py-3">担当者</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {projects.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-5 py-12 text-center">
                <EmptyState
                  message="案件が見つかりません"
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  }
                  action={
                    canWrite ? (
                      <button
                        onClick={onOpenCreateForm}
                        className="text-sm text-sky-600 hover:text-sky-700"
                      >
                        案件を追加
                      </button>
                    ) : null
                  }
                />
              </td>
            </tr>
          ) : (
            projects.map((project) => (
              <tr key={project.id} className="group hover:bg-slate-50/80">
                <td className="px-5 py-4">
                  <Link
                    to={`/projects/${project.id}`}
                    className="font-semibold text-slate-900 group-hover:text-sky-600"
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
                <td className="px-5 py-4 text-slate-600 tabular-nums">
                  {project.unitPrice ? formatCurrency(project.unitPrice) : '-'}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {project.owner?.email ?? '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function Projects() {
  const { canWrite } = usePermissions()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const [form, setForm] = useState<ProjectFormState>({
    companyId: '',
    name: '',
    status: 'active',
    unitPrice: '',
    conditions: '',
    periodStart: '',
    periodEnd: '',
    ownerId: '',
  })

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
    data: projectsData,
    error,
    setError,
    isLoading: isLoadingProjects,
    refetch: refetchProjects,
  } = useListPage<ProjectsFilters, Record<string, string>, Project>({
    urlSync: { pathname: '/projects', defaultFilters },
    buildUrl: apiRoutes.projects.list,
    debounce: {
      key: 'q',
      delayMs: 300,
      transform: (value) => (typeof value === 'string' ? value.trim() : value),
    },
    fetchOptions: {
      errorMessage: '案件一覧の取得に失敗しました',
    },
  })

  const { data: usersData } = useFetch<{ users: User[] }>(apiRoutes.users.list(), {
    cacheTimeMs: 30_000,
  })
  const userOptions = usersData?.users ?? []

  const projects = projectsData?.items ?? []

  const { mutate: createProject, isLoading: isCreating } = useMutation<
    { project: Project },
    ProjectCreatePayload
  >(apiRoutes.projects.base(), 'POST')

  const shortcuts = useMemo(
    () => [
      createSearchShortcut(searchInputRef),
      {
        key: 'n',
        handler: () => setShowCreateForm(true),
        preventDefault: true,
        ctrlKey: false,
        metaKey: false,
        enabled: canWrite,
      },
    ],
    [canWrite, searchInputRef]
  )

  useKeyboardShortcut(shortcuts)

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (!form.companyId.trim() || !form.name.trim()) {
      setError('企業と案件名は必須です')
      return
    }
    try {
      const payload: ProjectCreatePayload = {
        companyId: form.companyId.trim(),
        name: form.name.trim(),
      }
      if (form.status) payload.status = form.status
      if (form.unitPrice) payload.unitPrice = Number(form.unitPrice)
      if (form.conditions.trim()) payload.conditions = form.conditions.trim()
      if (form.periodStart) payload.periodStart = form.periodStart
      if (form.periodEnd) payload.periodEnd = form.periodEnd
      if (form.ownerId) payload.ownerId = form.ownerId

      await createProject(payload, { errorMessage: '案件の作成に失敗しました' })
      setForm({
        companyId: '',
        name: '',
        status: 'active',
        unitPrice: '',
        conditions: '',
        periodStart: '',
        periodEnd: '',
        ownerId: '',
      })
      setShowCreateForm(false)
      void refetchProjects(undefined, { ignoreCache: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }

  const handleClearFilter = (key: keyof ProjectsFilters) => {
    clearFilter(key)
  }

  const handleClearAllFilters = () => {
    clearAllFilters()
  }

  const getCompanyName = (companyId: string) => {
    const project = projects.find((p) => p.companyId === companyId)
    return project?.company?.name ?? companyId
  }

  const getOwnerName = (ownerId: string) => {
    const user = userOptions.find((u) => u.id === ownerId)
    return user?.email ?? ownerId
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-pretty text-sm uppercase text-slate-400">Project</p>
          <h2 className="text-balance text-3xl font-bold text-slate-900">案件管理</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 tabular-nums">
            登録数: <span className="font-semibold text-slate-700 tabular-nums">{pagination.total}</span>
          </span>
          {canWrite && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              案件を追加
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <ProjectsFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSubmit={handleSearchSubmit}
        hasActiveFilters={hasActiveFilters}
        onClearFilter={handleClearFilter}
        onClearAll={handleClearAllFilters}
        userOptions={userOptions}
        getCompanyName={getCompanyName}
        getOwnerName={getOwnerName}
        searchInputRef={searchInputRef}
      />

      {/* Create Form (Collapsible) */}
      <ProjectsCreateForm
        isOpen={canWrite && showCreateForm}
        form={form}
        onFormChange={setForm}
        onSubmit={handleCreate}
        onClose={() => setShowCreateForm(false)}
        isCreating={isCreating}
        userOptions={userOptions}
      />

      {/* Readonly Notice */}
      {!canWrite && (
        <div className="text-pretty rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          閲覧専用ロールのため、案件の追加・編集はできません。
        </div>
      )}

      {/* Error */}
      <ErrorAlert message={error} onClose={() => setError('')} />

      {/* Table */}
      <ProjectsTable
        projects={projects}
        isLoading={isLoadingProjects}
        canWrite={canWrite}
        onOpenCreateForm={() => setShowCreateForm(true)}
      />

      {/* Pagination */}
      {pagination.total > 0 && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="text-pretty text-center text-xs text-slate-400">
        <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">/</kbd> 検索
        {canWrite && (
          <>
            {' '}
            <kbd className="ml-2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">n</kbd> 新規追加
          </>
        )}
      </div>
    </div>
  )
}

export default Projects
