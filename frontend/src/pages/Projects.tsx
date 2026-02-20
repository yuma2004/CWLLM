import { Link } from 'react-router-dom'
import { CompanySearchSelect } from '../components/SearchSelect'
import ErrorAlert from '../components/ui/ErrorAlert'
import EmptyState from '../components/ui/EmptyState'
import ActiveFilters from '../components/ui/ActiveFilters'
import FilterBadge from '../components/ui/FilterBadge'
import Button from '../components/ui/Button'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import FormTextarea from '../components/ui/FormTextarea'
import DateInput from '../components/ui/DateInput'
import Card from '../components/ui/Card'
import Pagination from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import Toast from '../components/ui/Toast'
import { PROJECT_STATUS_OPTIONS, statusLabel } from '../constants/labels'
import type { Project, ProjectsFilters, User } from '../types'
import { formatCurrency } from '../utils/format'
import type { ProjectCreateFormState } from '../features/projects/form'
import { useProjectsPage } from '../features/projects/useProjectsPage'
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
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
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
              className="h-11 bg-slate-50/70 pl-10 pr-4"
              placeholder="譯井ｻｶ蜷阪〒讀懃ｴ｢ (/ 縺ｧ遘ｻ蜍・"
              value={filters.q}
              onChange={(event) => {
                onFiltersChange({ ...filters, q: event.target.value })
              }}
            />
          </div>
          <div className="md:col-span-2">
            <CompanySearchSelect
              value={filters.companyId}
              onChange={(companyId) => {
                onFiltersChange({ ...filters, companyId })
              }}
              placeholder="莨∵･ｭ縺ｧ邨槭ｊ霎ｼ縺ｿ"
            />
          </div>
          <FormSelect
            className="h-11"
            value={filters.status}
            onChange={(event) => {
              onFiltersChange({ ...filters, status: event.target.value })
            }}
          >
            <option value="">繧ｹ繝・・繧ｿ繧ｹ</option>
            {PROJECT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {statusLabel('project', status)}
              </option>
            ))}
          </FormSelect>
          <FormSelect
            className="h-11"
            value={filters.ownerId}
            onChange={(event) => {
              onFiltersChange({ ...filters, ownerId: event.target.value })
            }}
          >
            <option value="">諡・ｽ楢・/option>
            {userOptions.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name || user.email}
              </option>
            ))}
          </FormSelect>
          <Button type="submit" className="h-11 w-full md:w-auto">
            讀懃ｴ｢
          </Button>
        </div>

        <ActiveFilters isActive={hasActiveFilters} className="border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-500">邨槭ｊ霎ｼ縺ｿ:</span>
          {filters.q && (
            <FilterBadge label={`譯井ｻｶ蜷・ ${filters.q}`} onRemove={() => onClearFilter('q')} />
          )}
          {filters.status && (
            <FilterBadge
              label={`繧ｹ繝・・繧ｿ繧ｹ: ${statusLabel('project', filters.status)}`}
              onRemove={() => onClearFilter('status')}
            />
          )}
          {filters.companyId && (
            <FilterBadge
              label={`莨∵･ｭ: ${getCompanyName(filters.companyId)}`}
              onRemove={() => onClearFilter('companyId')}
            />
          )}
          {filters.ownerId && (
            <FilterBadge
              label={`諡・ｽ楢・ ${getOwnerName(filters.ownerId)}`}
              onRemove={() => onClearFilter('ownerId')}
            />
          )}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-rose-600 hover:text-rose-700"
          >
            縺吶∋縺ｦ隗｣髯､
          </button>
        </ActiveFilters>
      </form>
    </Card>
  )
}

type ProjectsCreateFormProps = {
  isOpen: boolean
  form: ProjectCreateFormState
  onFormChange: (next: ProjectCreateFormState) => void
  onSubmit: (event: React.FormEvent) => void
  onClose: () => void
  isCreating: boolean
  userOptions: User[]
  nameInputRef: React.RefObject<HTMLInputElement>
}

function ProjectsCreateForm({
  isOpen,
  form,
  onFormChange,
  onSubmit,
  onClose,
  isCreating,
  userOptions,
  nameInputRef,
}: ProjectsCreateFormProps) {
  if (!isOpen) return null

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-balance text-lg font-semibold text-slate-900">譯井ｻｶ繧剃ｽ懈・</h3>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30"
          aria-label="譯井ｻｶ菴懈・繝輔か繝ｼ繝繧帝哩縺倥ｋ"
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 block text-xs font-medium text-slate-600">
              莨∵･ｭ <span className="text-rose-500">*</span>
            </div>
            <CompanySearchSelect
              value={form.companyId}
              onChange={(companyId) => onFormChange({ ...form, companyId })}
              placeholder="莨∵･ｭ蜷阪〒讀懃ｴ｢"
            />
          </div>
          <div>
            <div className="mb-1 block text-xs font-medium text-slate-600">
              譯井ｻｶ蜷・<span className="text-rose-500">*</span>
            </div>
            <FormInput
              ref={nameInputRef}
              placeholder="譯井ｻｶ蜷阪ｒ蜈･蜉・
              value={form.name}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <div className="mb-1 block text-xs font-medium text-slate-600">繧ｹ繝・・繧ｿ繧ｹ</div>
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
            <div className="mb-1 block text-xs font-medium text-slate-600">蜊倅ｾ｡</div>
            <FormInput
              type="number"
              placeholder="萓・ 50000"
              value={form.unitPrice}
              onChange={(event) => onFormChange({ ...form, unitPrice: event.target.value })}
            />
          </div>
          <div>
            <div className="mb-1 block text-xs font-medium text-slate-600">諡・ｽ楢・/div>
            <FormSelect
              value={form.ownerId}
              onChange={(event) => onFormChange({ ...form, ownerId: event.target.value })}
            >
              <option value="">諡・ｽ楢・悴險ｭ螳・/option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </FormSelect>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="mb-1 block text-xs font-medium text-slate-600">髢句ｧ区律</div>
            <DateInput
              value={form.periodStart}
              onChange={(event) => onFormChange({ ...form, periodStart: event.target.value })}
            />
          </div>
          <div>
            <div className="mb-1 block text-xs font-medium text-slate-600">邨ゆｺ・律</div>
            <DateInput
              value={form.periodEnd}
              onChange={(event) => onFormChange({ ...form, periodEnd: event.target.value })}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 block text-xs font-medium text-slate-600">譚｡莉ｶ繝ｻ繝｡繝｢</div>
          <FormTextarea
            placeholder="譚｡莉ｶ繧・｣懆ｶｳ繧貞・蜉・
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
            繧ｭ繝｣繝ｳ繧ｻ繝ｫ
          </button>
          <button
            type="submit"
            className="rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            disabled={isCreating}
          >
            {isCreating ? '菴懈・荳ｭ...' : '菴懈・'}
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
  userOptions: User[]
  isUpdatingOwner: boolean
  onOwnerChange: (projectId: string, ownerId: string) => void
  onOpenCreateForm: () => void
}

function ProjectsTable({
  projects,
  isLoading,
  canWrite,
  userOptions,
  isUpdatingOwner,
  onOwnerChange,
  onOpenCreateForm,
}: ProjectsTableProps) {
  if (isLoading) {
    return <SkeletonTable rows={5} columns={5} />
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm text-slate-600">
        <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-semibold uppercase whitespace-nowrap text-slate-500">
          <tr>
            <th className="px-5 py-3">譯井ｻｶ蜷・/th>
            <th className="px-5 py-3">莨∵･ｭ</th>
            <th className="px-5 py-3">繧ｹ繝・・繧ｿ繧ｹ</th>
            <th className="px-5 py-3">蜊倅ｾ｡</th>
            <th className="px-5 py-3">諡・ｽ楢・/th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {projects.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-5 py-12 text-center">
                <EmptyState
                  message="譯井ｻｶ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ"
                  description={
                    canWrite
                      ? '譛蛻昴・譯井ｻｶ繧剃ｽ懈・縺励※蜈ｱ譛峨＠縺ｾ縺励ｇ縺・・
                      : '讀懃ｴ｢譚｡莉ｶ繧定ｦ狗峩縺励※縺上□縺輔＞縲・
                  }
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
                      <Button onClick={onOpenCreateForm} className="mt-3 inline-flex items-center gap-2">
                        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v16m8-8H4"
                          />
                        </svg>
                        譯井ｻｶ繧剃ｽ懈・
                      </Button>
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
                  {canWrite ? (
                    <FormSelect
                      value={project.ownerId ?? ''}
                      onChange={(event) => onOwnerChange(project.id, event.target.value)}
                      className="w-full rounded-lg text-sm leading-6"
                      disabled={isUpdatingOwner}
                    >
                      <option value="">諡・ｽ楢・悴險ｭ螳・/option>
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
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

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
    hasActiveFilters,
    clearFilter,
    clearAllFilters,
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
    getCompanyName,
    getOwnerName,
  } = useProjectsPage()

  const handleClearFilter = (key: keyof ProjectsFilters) => {
    clearFilter(key)
  }

  const handleClearAllFilters = () => {
    clearAllFilters()
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-pretty text-sm uppercase text-slate-400">譯井ｻｶ</p>
          <h2 className="text-balance text-3xl font-bold text-slate-900">譯井ｻｶ荳隕ｧ</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500 tabular-nums">
            蜷郁ｨ・ <span className="font-semibold text-slate-700 tabular-nums">{pagination.total}</span>
          </span>
          {canWrite && (
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex items-center gap-2"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              譯井ｻｶ繧剃ｽ懈・
            </Button>
          )}
        </div>
      </div>

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

      <ProjectsCreateForm
        isOpen={canWrite && showCreateForm}
        form={form}
        onFormChange={setForm}
        onSubmit={handleCreate}
        onClose={() => setShowCreateForm(false)}
        isCreating={isCreating}
        userOptions={userOptions}
        nameInputRef={createNameRef}
      />

      {!canWrite && (
        <div className="text-pretty rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          讓ｩ髯舌′縺ｪ縺・◆繧√∵｡井ｻｶ縺ｮ菴懈・繝ｻ邱ｨ髮・・縺ｧ縺阪∪縺帙ｓ縲・
        </div>
      )}

      <ErrorAlert message={error} onClose={() => setError('')} />

      <ProjectsTable
        projects={projects}
        isLoading={isLoadingProjects}
        canWrite={canWrite}
        userOptions={userOptions}
        isUpdatingOwner={isUpdatingOwner}
        onOwnerChange={handleOwnerChange}
        onOpenCreateForm={() => setShowCreateForm(true)}
      />

      {pagination.total > 0 && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <div className="text-pretty text-center text-xs text-slate-400">
        <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">/</kbd> 讀懃ｴ｢
        {canWrite && (
          <>
            {' '}
            <kbd className="ml-2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">n</kbd> 譁ｰ隕丈ｽ懈・
          </>
        )}
      </div>
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

