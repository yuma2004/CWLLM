import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import FormInput from '../components/ui/FormInput'
import DateInput from '../components/ui/DateInput'
import FormTextarea from '../components/ui/FormTextarea'
import FormSelect from '../components/ui/FormSelect'
import SlidePanel from '../components/ui/SlidePanel'
import Pagination from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import { CompanySearchSelect } from '../components/SearchSelect'
import { TaskFilters } from '../components/tasks/TaskFilters'
import { TaskTable } from '../components/tasks/TaskTable'
import { TaskKanban } from '../components/tasks/TaskKanban'
import { TaskBulkActions } from '../components/tasks/TaskBulkActions'
import Toast from '../components/ui/Toast'
import { cn } from '../lib/cn'
import type { TasksFilters } from '../types'
import { TASK_STRINGS } from '../strings/tasks'
import { targetTypeLabel } from '../constants/labels'
import type { TaskCreateTargetType } from '../features/tasks/createForm'
import { useTasksPage } from '../features/tasks/useTasksPage'
const CREATE_TARGET_OPTIONS = [
  { value: 'company', label: targetTypeLabel('company') },
  { value: 'general', label: targetTypeLabel('general') },
] as const

function Tasks() {
  const {
    canWrite,
    isAdmin,
    taskScope,
    searchInputRef,
    createTitleRef,
    createCompanyRef,
    filters,
    setFilters,
    hasActiveFilters,
    pagination,
    setExtraParams,
    viewMode,
    selectedIds,
    bulkStatus,
    setBulkStatus,
    bulkDueDate,
    setBulkDueDate,
    clearBulkDueDate,
    setClearBulkDueDate,
    deleteTarget,
    setDeleteTarget,
    createForm,
    setCreateForm,
    isCreateOpen,
    setIsCreateOpen,
    createFieldErrors,
    setCreateFieldErrors,
    createError,
    setCreateError,
    toast,
    clearToast,
    tasks,
    userOptions,
    hasBulkActions,
    isLoadingTasks,
    error,
    setError,
    isBulkUpdating,
    isDeleting,
    isCreating,
    allSelected,
    handleSearchSubmit,
    handleStatusChange,
    handleDueDateChange,
    handleAssigneeChange,
    handleCreateTask,
    handleBulkUpdate,
    handleDelete,
    toggleSelectAll,
    toggleSelected,
    handlePageChange,
    handlePageSizeChange,
    handleClearFilter,
    handleClearAllFilters,
    handleScrollToCreate,
    handleScopeChange,
  } = useTasksPage()
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase text-notion-text-tertiary">{TASK_STRINGS.labels.section}</p>
          <h2 className="text-3xl font-semibold text-notion-text text-balance">
            {TASK_STRINGS.labels.pageTitle}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-notion-text-secondary">
            {TASK_STRINGS.labels.totalCount}:{' '}
            <span className="font-semibold text-notion-text tabular-nums">{pagination.total}</span>
          </span>
          {isAdmin && (
            <span className="rounded-full border border-notion-border bg-notion-bg px-2 py-1 text-xs font-semibold text-notion-text-secondary">
              {TASK_STRINGS.labels.scopeLabel}:{' '}
              {taskScope === 'all'
                ? TASK_STRINGS.labels.scopeAll
                : taskScope === 'user'
                  ? TASK_STRINGS.labels.scopeUser
                  : TASK_STRINGS.labels.scopeMine}
            </span>
          )}
          {canWrite && (
            <Button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center gap-2">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {TASK_STRINGS.actions.new}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-notion-border bg-notion-bg p-1 text-xs font-semibold text-notion-text-secondary shadow-sm">
          <button
            type="button"
            onClick={() => setExtraParams((prev) => ({ ...prev, view: 'list' }))}
            aria-pressed={viewMode === 'list'}
            className={cn(
              'rounded-full px-3 py-1',
              viewMode === 'list' ? 'bg-notion-accent text-white' : 'hover:bg-notion-bg-hover'
            )}
          >
            {TASK_STRINGS.labels.viewList}
          </button>
          <button
            type="button"
            onClick={() => setExtraParams((prev) => ({ ...prev, view: 'kanban' }))}
            aria-pressed={viewMode === 'kanban'}
            className={cn(
              'rounded-full px-3 py-1',
              viewMode === 'kanban' ? 'bg-notion-accent text-white' : 'hover:bg-notion-bg-hover'
            )}
          >
            {TASK_STRINGS.labels.viewKanban}
          </button>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-full border border-notion-border bg-notion-bg p-1 text-xs font-semibold text-notion-text-secondary shadow-sm">
              <button
                type="button"
                onClick={() => handleScopeChange('mine')}
                aria-pressed={taskScope === 'mine'}
                className={cn(
                  'rounded-full px-3 py-1',
                  taskScope === 'mine' ? 'bg-notion-accent text-white' : 'hover:bg-notion-bg-hover'
                )}
              >
                {TASK_STRINGS.labels.scopeMine}
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange('all')}
                aria-pressed={taskScope === 'all'}
                className={cn(
                  'rounded-full px-3 py-1',
                  taskScope === 'all' ? 'bg-notion-accent text-white' : 'hover:bg-notion-bg-hover'
                )}
              >
                {TASK_STRINGS.labels.scopeAll}
              </button>
              <button
                type="button"
                onClick={() => handleScopeChange('user')}
                aria-pressed={taskScope === 'user'}
                className={cn(
                  'rounded-full px-3 py-1',
                  taskScope === 'user' ? 'bg-notion-accent text-white' : 'hover:bg-notion-bg-hover'
                )}
              >
                {TASK_STRINGS.labels.scopeUser}
              </button>
            </div>
            {taskScope === 'user' && (
              <FormSelect
                name="assigneeId"
                aria-label={TASK_STRINGS.labels.assigneeFilterLabel}
                autoComplete="off"
                value={filters.assigneeId}
                onChange={(e) => setFilters((prev) => ({ ...prev, assigneeId: e.target.value }))}
                className="text-xs"
              >
                <option value="">{TASK_STRINGS.labels.assigneeOption}</option>
                {userOptions.map((userOption) => (
                  <option key={userOption.id} value={userOption.id}>
                    {userOption.name || userOption.email}
                  </option>
                ))}
              </FormSelect>
            )}
          </div>
        )}
      </div>

      {/* Search & Filter */}

      <TaskFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSubmit={handleSearchSubmit}
        hasActiveFilters={hasActiveFilters}
        onClearFilter={handleClearFilter}
        onClearAll={handleClearAllFilters}
        searchInputRef={searchInputRef}
        assigneeOptions={userOptions}
        showAssigneeFilter={isAdmin && taskScope === 'all'}
      />

      {hasBulkActions && (
        <TaskBulkActions
          selectedIds={selectedIds}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          bulkStatus={bulkStatus}
          onBulkStatusChange={setBulkStatus}
          bulkDueDate={bulkDueDate}
          onBulkDueDateChange={setBulkDueDate}
          clearBulkDueDate={clearBulkDueDate}
          onClearBulkDueDateChange={setClearBulkDueDate}
          onBulkUpdate={handleBulkUpdate}
          isBulkUpdating={isBulkUpdating}
        />
      )}

      {/* Readonly Notice */}
      {!canWrite && (
        <div className="rounded-2xl border border-dashed border-notion-border p-4 text-sm text-notion-text-secondary">
          {TASK_STRINGS.notices.readonly}
        </div>
      )}

      {/* Delete Confirmation */}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        title={TASK_STRINGS.confirm.deleteTitle}
        description={
          deleteTarget
            ? TASK_STRINGS.confirm.deleteDescription(deleteTarget.title)
            : undefined
        }
        confirmLabel={TASK_STRINGS.confirm.deleteConfirmLabel}
        cancelLabel={TASK_STRINGS.confirm.cancelLabel}
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Error */}

      <ErrorAlert message={error} onClose={() => setError('')} />

      <div className={cn('space-y-4', hasBulkActions && 'pb-24')}>
        {/* Table */}
        {isLoadingTasks ? (
          <SkeletonTable rows={5} columns={5} />
        ) : viewMode === 'list' ? (
          <TaskTable
            tasks={tasks}
            selectedIds={selectedIds}
            allSelected={allSelected}
            onToggleSelectAll={toggleSelectAll}
            onToggleSelected={toggleSelected}
            onStatusChange={handleStatusChange}
            onDueDateChange={handleDueDateChange}
            onAssigneeChange={handleAssigneeChange}
            onDelete={setDeleteTarget}
            canWrite={canWrite}
            isBulkUpdating={isBulkUpdating}
            userOptions={userOptions}
            emptyStateDescription={
              canWrite
                ? isAdmin && taskScope === 'all'
                  ? TASK_STRINGS.empty.adminAll
                  : TASK_STRINGS.empty.normal
                : TASK_STRINGS.empty.readonly
            }
            emptyStateAction={

              canWrite ? (
                <button
                  type="button"
                  onClick={handleScrollToCreate}
                  className="text-sm font-semibold text-notion-accent hover:text-notion-accent/80"
                >
                  {TASK_STRINGS.actions.create}
                </button>
              ) : null
            }
          />
        ) : (
          <TaskKanban
            tasks={tasks}
            canWrite={canWrite}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelected}
            onStatusChange={handleStatusChange}
            onAssigneeChange={handleAssigneeChange}
            disabled={isBulkUpdating}
            userOptions={userOptions}
          />
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <Pagination
            page={pagination.page}
            pageSize={pagination.pageSize}
            total={pagination.total}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}

        {/* Keyboard Shortcuts Hint */}
        <div className="text-center text-xs text-notion-text-tertiary">
          <kbd className="rounded border border-notion-border bg-notion-bg-secondary px-1.5 py-0.5 font-mono">/</kbd> {TASK_STRINGS.hints.filterFocus}
        </div>
      </div>

      <SlidePanel
        isOpen={canWrite && isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title={TASK_STRINGS.panel.createTitle}
        description={TASK_STRINGS.panel.createDescription}
        size="md"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="grid gap-4">
            <FormInput
              label={TASK_STRINGS.labels.createTitle}
              value={createForm.title}
              onChange={(event) => {
                const nextValue = event.target.value
                setCreateForm((prev) => ({ ...prev, title: nextValue }))
                if (createFieldErrors.title) {
                  setCreateFieldErrors((prev) => ({ ...prev, title: undefined }))
                }
              }}
              name="title"
              autoComplete="off"
              placeholder={TASK_STRINGS.labels.createTitlePlaceholder}
              disabled={isCreating}
              error={createFieldErrors.title}
              ref={createTitleRef}
            />
            <FormSelect
              label={TASK_STRINGS.labels.createTargetType}
              value={createForm.targetType}
              onChange={(event) => {
                const nextType: TaskCreateTargetType =
                  event.target.value === 'general' ? 'general' : 'company'
                setCreateForm((prev) => ({
                  ...prev,
                  targetType: nextType,
                  companyId: nextType === 'company' ? prev.companyId : '',
                }))
                if (createFieldErrors.companyId) {
                  setCreateFieldErrors((prev) => ({ ...prev, companyId: undefined }))
                }
              }}
              name="targetType"
              autoComplete="off"
              disabled={isCreating}
            >
              {CREATE_TARGET_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </FormSelect>
            {createForm.targetType === 'company' && (
              <CompanySearchSelect
                label={TASK_STRINGS.labels.createCompany}
                value={createForm.companyId}
                onChange={(companyId) => {
                  setCreateForm((prev) => ({ ...prev, companyId }))
                  if (createFieldErrors.companyId) {
                    setCreateFieldErrors((prev) => ({ ...prev, companyId: undefined }))
                  }
                }}
                name="companyId"
                autoComplete="off"
                placeholder={TASK_STRINGS.labels.createCompanyPlaceholder}
                disabled={isCreating}
                error={createFieldErrors.companyId}
                inputRef={createCompanyRef}
              />
            )}
            <FormSelect
              label={TASK_STRINGS.labels.createAssignee}
              value={createForm.assigneeId}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, assigneeId: event.target.value }))
              }
              name="assigneeId"
              autoComplete="off"
              disabled={isCreating}
            >
              <option value="">{TASK_STRINGS.labels.unassigned}</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </FormSelect>
            <FormTextarea
              label={TASK_STRINGS.labels.createDescription}
              rows={3}
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, description: event.target.value }))
              }
              name="description"
              autoComplete="off"
              placeholder={TASK_STRINGS.labels.createDescriptionPlaceholder}
              disabled={isCreating}
            />
            <DateInput
              label={TASK_STRINGS.labels.createDueDate}
              value={createForm.dueDate}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, dueDate: event.target.value }))
              }
              name="dueDate"
              autoComplete="off"
              placeholder={TASK_STRINGS.labels.createDueDatePlaceholder}
              disabled={isCreating}
            />
          </div>

          {createError && <ErrorAlert message={createError} onClose={() => setCreateError('')} />}

          <div className="flex justify-end">
            <Button type="submit" isLoading={isCreating} loadingLabel={TASK_STRINGS.actions.creating}>
              {TASK_STRINGS.actions.create}
            </Button>
          </div>
        </form>
      </SlidePanel>

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant === 'error' ? 'error' : toast.variant === 'success' ? 'success' : 'info'}
          onClose={clearToast}
          className={cn(
            'fixed right-6 z-50 safe-area-bottom',
            hasBulkActions ? 'bottom-24' : 'bottom-6'
          )}
        />
      )}
    </div>
  )
}

export default Tasks







