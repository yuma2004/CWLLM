import { useEffect, useMemo, useRef, useState } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import Button from '../components/ui/Button'
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
import { useFetch, useMutation } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import Toast from '../components/ui/Toast'
import { createSearchShortcut, useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { useListPage } from '../hooks/useListPage'
import { toErrorMessage } from '../utils/errorState'
import { cn } from '../lib/cn'
import type { Task, TasksFilters, User } from '../types'
import { apiRoutes } from '../lib/apiRoutes'

const defaultFilters: TasksFilters = {
  q: '',
  status: '',
  targetType: '',
  dueFrom: '',
  dueTo: '',
}

function Tasks() {
  const { canWrite, isAdmin } = usePermissions()
  const [taskScope, setTaskScope] = useState<'mine' | 'all'>('mine')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const createTitleRef = useRef<HTMLInputElement>(null)
  const createCompanyRef = useRef<HTMLInputElement>(null)

  const buildTaskUrl = useMemo(
    () => (queryString: string) =>
      isAdmin && taskScope === 'all'
        ? apiRoutes.tasks.list(queryString)
        : apiRoutes.tasks.myList(queryString),
    [isAdmin, taskScope]
  )

  const {
    filters,
    setFilters,
    hasActiveFilters,
    clearFilter,
    clearAllFilters,
    pagination,
    setPage,
    setPageSize,
    extraParams,
    setExtraParams,
    handleSearchSubmit,
    data: tasksData,
    setData: setTasksData,
    error,
    setError,
    isLoading: isLoadingTasks,
    refetch: refetchTasks,
  } = useListPage<TasksFilters, { view: string }, Task>({
    urlSync: {
      pathname: '/tasks',
      defaultFilters,
      defaultParams: { view: 'list' },
      resetPageOnFilterChange: false,
    },
    buildUrl: buildTaskUrl,
    debounce: { key: 'q', delayMs: 300 },
    fetchOptions: {
      errorMessage: 'タスクの読み込みに失敗しました',
    },
  })
  const viewMode = extraParams.view === 'kanban' ? 'kanban' : 'list'
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkDueDate, setBulkDueDate] = useState('')
  const [clearBulkDueDate, setClearBulkDueDate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    companyId: '',
    assigneeId: '',
  })
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createFieldErrors, setCreateFieldErrors] = useState<{
    title?: string
    companyId?: string
  }>({})
  const [createError, setCreateError] = useState('')
  const { toast, showToast, clearToast } = useToast()

  const { mutate: createTask, isLoading: isCreating } = useMutation<
    Task,
    {
      targetType: string
      targetId: string
      title: string
      description?: string
      dueDate?: string
      assigneeId?: string
    }
  >(apiRoutes.tasks.base(), 'POST')

  const { mutate: updateTaskStatus } = useMutation<Task, { status: string }>(
    apiRoutes.tasks.base(),
    'PATCH'
  )

  const { mutate: updateTask } = useMutation<
    Task,
    { status?: string; dueDate?: string | null; assigneeId?: string | null }
  >(apiRoutes.tasks.base(), 'PATCH')

  const { mutate: bulkUpdateTasks, isLoading: isBulkUpdating } = useMutation<
    { updated: number },
    { taskIds: string[]; status?: string; dueDate?: string | null }
  >(apiRoutes.tasks.bulk(), 'PATCH')

  const { mutate: deleteTask, isLoading: isDeleting } = useMutation<void, void>(
    apiRoutes.tasks.base(),
    'DELETE'
  )

  const { data: usersData } = useFetch<{ users: User[] }>(apiRoutes.users.options(), {
    cacheTimeMs: 30_000,
  })
  const userOptions = usersData?.users ?? []



  const tasks = useMemo(() => tasksData?.items ?? [], [tasksData])
  const isCreateDirty = canWrite
    ? Boolean(
        createForm.title.trim() ||
          createForm.description.trim() ||
          createForm.dueDate ||
          createForm.companyId ||
          createForm.assigneeId
      )
    : false

  useEffect(() => {
    setSelectedIds([])
  }, [tasksData?.items])

  useEffect(() => {
    if (!isAdmin && taskScope !== 'mine') {
      setTaskScope('mine')
    }
  }, [isAdmin, taskScope])

  useEffect(() => {
    if (!isCreateDirty) return undefined
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isCreateDirty])

  const shortcuts = useMemo(() => [createSearchShortcut(searchInputRef)], [searchInputRef])

  useKeyboardShortcut(shortcuts)

  const applyOptimisticTaskUpdate = (taskId: string, updateTask: (task: Task) => Task) => {
    const previousItems = tasksData?.items ?? []
    if (previousItems.length > 0) {
      setTasksData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map((task) => (task.id === taskId ? updateTask(task) : task)),
        }
      })
    }
    return previousItems
  }

  const restoreOptimisticTasks = (previousItems: Task[]) => {
    if (previousItems.length > 0) {
      setTasksData((prev) => (prev ? { ...prev, items: previousItems } : prev))
    }
  }

  const handleStatusChange = async (taskId: string, nextStatus: string) => {
    if (!canWrite) return
    setError('')
    const previousItems = applyOptimisticTaskUpdate(taskId, (task) => ({
      ...task,
      status: nextStatus,
    }))
    try {
      await updateTaskStatus(
        { status: nextStatus },
        { url: apiRoutes.tasks.detail(taskId), errorMessage: 'ステータスの更新に失敗しました' }
      )
      void refetchTasks()
      showToast('ステータスを更新しました', 'success')
    } catch (err) {
      restoreOptimisticTasks(previousItems)
      setError(err instanceof Error ? err.message : 'タスクの更新に失敗しました')
    }
  }


  const handleDueDateChange = async (taskId: string, value: string) => {
    if (!canWrite) return
    setError('')
    const dueDate = value ? value : null
    const previousItems = applyOptimisticTaskUpdate(taskId, (task) => ({
      ...task,
      dueDate,
    }))
    try {
      await updateTask(
        { dueDate },
        { url: apiRoutes.tasks.detail(taskId), errorMessage: '期限の更新に失敗しました' }
      )
      void refetchTasks()
      showToast('期限を更新しました', 'success')
    } catch (err) {
      restoreOptimisticTasks(previousItems)
      setError(err instanceof Error ? err.message : 'タスクの更新に失敗しました')
    }
  }

  const handleAssigneeChange = async (taskId: string, value: string) => {
    if (!canWrite) return
    setError('')
    const assigneeId = value || null
    const nextAssignee = assigneeId
      ? userOptions.find((user) => user.id === assigneeId)
      : undefined
    const previousItems = applyOptimisticTaskUpdate(taskId, (task) => ({
      ...task,
      assigneeId,
      assignee: nextAssignee ? { id: nextAssignee.id, email: nextAssignee.email, name: nextAssignee.name } : null,
    }))
    try {
      await updateTask(
        { assigneeId },
        { url: apiRoutes.tasks.detail(taskId), errorMessage: '担当者の更新に失敗しました' }
      )
      void refetchTasks()
      showToast('担当者を更新しました', 'success')
    } catch (err) {
      restoreOptimisticTasks(previousItems)
      setError(err instanceof Error ? err.message : '担当者の更新に失敗しました')
    }
  }

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreateError('')
    const nextErrors: { title?: string; companyId?: string } = {}
    if (!createForm.title.trim()) {
      nextErrors.title = 'タスクタイトルを入力してください'
    }
    if (!createForm.companyId) {
      nextErrors.companyId = '紐づける企業を選択してください'
    }
    if (Object.keys(nextErrors).length > 0) {
      setCreateFieldErrors(nextErrors)
      if (nextErrors.title) {
        createTitleRef.current?.focus()
      } else if (nextErrors.companyId) {
        createCompanyRef.current?.focus()
      }
      return
    }
    setCreateFieldErrors({})

    try {
      await createTask(
        {
          targetType: 'company',
          targetId: createForm.companyId,
          title: createForm.title.trim(),
          description: createForm.description.trim() || undefined,
          dueDate: createForm.dueDate || undefined,
          assigneeId: createForm.assigneeId || undefined,
        },
        { errorMessage: 'タスクの作成に失敗しました' }
      )
      showToast('タスクを作成しました', 'success')
      setCreateForm((prev) => ({ ...prev, title: '', description: '', dueDate: '' }))
      setCreateFieldErrors({})
      void refetchTasks()
    } catch (err) {
      setCreateError(toErrorMessage(err, 'タスクの作成に失敗しました'))
    }
  }

  const handleBulkUpdate = async () => {
    if (!canWrite) return
    if (selectedIds.length === 0) {
      setError('更新するタスクを選択してください')
      return
    }
    if (!bulkStatus && !bulkDueDate && !clearBulkDueDate) {
      setError('更新内容（ステータス/期限）を選択してください')
      return
    }
    setError('')
    try {
      const payload: {
        taskIds: string[]
        status?: string
        dueDate?: string | null
      } = { taskIds: selectedIds }
      if (bulkStatus) payload.status = bulkStatus
      if (bulkDueDate) payload.dueDate = bulkDueDate
      if (clearBulkDueDate) payload.dueDate = null
      await bulkUpdateTasks(payload, { errorMessage: '一括更新に失敗しました' })
      setSelectedIds([])
      setBulkStatus('')
      setBulkDueDate('')
      setClearBulkDueDate(false)
      void refetchTasks()
      showToast('一括更新しました', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : '一括更新に失敗しました')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !canWrite) return
    setError('')
    try {
      await deleteTask(undefined, {
        url: apiRoutes.tasks.detail(deleteTarget.id),
        errorMessage: 'タスクの削除に失敗しました',
      })
      setDeleteTarget(null)
      void refetchTasks()
      showToast('タスクを削除しました', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タスクの削除に失敗しました')
    }
  }

  const allSelected = tasks.length > 0 && selectedIds.length === tasks.length

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(tasks.map((task) => task.id))
    }
  }

  const toggleSelected = (taskId: string) => {
    setSelectedIds((prev) =>
      prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]
    )
  }

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
  }

  const handleClearFilter = (key: keyof TasksFilters) => {
    clearFilter(key)
  }

  const handleClearAllFilters = () => {
    clearAllFilters()
  }

  const handleScrollToCreate = () => {
    setIsCreateOpen(true)
  }

  const handleScopeChange = (nextScope: 'mine' | 'all') => {
    if (!isAdmin) return
    setTaskScope(nextScope)
    setPage(1)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase text-notion-text-tertiary">タスク</p>
          <h2 className="text-3xl font-semibold text-notion-text text-balance">タスク管理</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-notion-text-secondary">
            合計件数:{' '}
            <span className="font-semibold text-notion-text tabular-nums">{pagination.total}</span>
          </span>
          {isAdmin && (
            <span className="rounded-full border border-notion-border bg-notion-bg px-2 py-1 text-xs font-semibold text-notion-text-secondary">
              表示範囲: {taskScope === 'all' ? '全員' : '自分'}
            </span>
          )}
          {canWrite && (
            <Button onClick={() => setIsCreateOpen(true)} className="inline-flex items-center gap-2">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新規作成
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
            リスト
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
            カンバン
          </button>
        </div>
        {isAdmin && (
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
              自分
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
              全員
            </button>
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
      />

      {canWrite && selectedIds.length > 0 && (
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
          権限がないため、タスクのステータス変更はできません。
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="タスクの削除"
        description={`「${deleteTarget?.title}」を削除しますか？この操作は元に戻せません。`}
        confirmLabel="削除"
        cancelLabel="キャンセル"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Error */}
      <ErrorAlert message={error} onClose={() => setError('')} />

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
                ? '全員分のタスクがまだありません。'
                : 'まずはタスクを追加して、対応状況を見える化しましょう。'
              : '検索条件をリセットして確認してください。'
          }
          emptyStateAction={
            canWrite ? (
              <button
                type="button"
                onClick={handleScrollToCreate}
                className="text-sm font-semibold text-notion-accent hover:text-notion-accent/80"
              >
                タスクを作成
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

      <SlidePanel
        isOpen={canWrite && isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="タスク作成"
        description="企業に紐づけてタスクを追加できます。"
        size="md"
      >
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="grid gap-4">
            <FormInput
              label="タスクタイトル"
              value={createForm.title}
              onChange={(event) => {
                const nextValue = event.target.value
                setCreateForm((prev) => ({ ...prev, title: nextValue }))
                if (createFieldErrors.title) {
                  setCreateFieldErrors((prev) => ({ ...prev, title: undefined }))
                }}}
              name="title"
              autoComplete="off"
              placeholder="対応内容を入力…"
              disabled={isCreating}
              error={createFieldErrors.title}
              ref={createTitleRef}
            />
            <CompanySearchSelect
              label="紐づける企業"
              value={createForm.companyId}
              onChange={(companyId) => {
                setCreateForm((prev) => ({ ...prev, companyId }))
                if (createFieldErrors.companyId) {
                  setCreateFieldErrors((prev) => ({ ...prev, companyId: undefined }))
                }
              }}
              name="companyId"
              autoComplete="off"
              placeholder="企業名で検索…"
              disabled={isCreating}
              error={createFieldErrors.companyId}
              inputRef={createCompanyRef}
            />
            <FormSelect
              label="担当者"
              value={createForm.assigneeId}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, assigneeId: event.target.value }))
              }
              name="assigneeId"
              autoComplete="off"
              disabled={isCreating}
            >
              <option value="">未割当</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </FormSelect>
            <FormTextarea
              label="詳細"
              rows={3}
              value={createForm.description}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, description: event.target.value }))
              }
              name="description"
              autoComplete="off"
              placeholder="背景や補足メモ…"
              disabled={isCreating}
            />
            <DateInput
              label="期限"
              value={createForm.dueDate}
              onChange={(event) =>
                setCreateForm((prev) => ({ ...prev, dueDate: event.target.value }))
              }
              name="dueDate"
              autoComplete="off"
              placeholder="期限…"
              disabled={isCreating}
            />
          </div>

          {createError && <ErrorAlert message={createError} onClose={() => setCreateError('')} />}

          <div className="flex justify-end">
            <Button type="submit" isLoading={isCreating} loadingLabel="作成中…">
              タスクを作成
            </Button>
          </div>
        </form>
      </SlidePanel>

      {/* Keyboard Shortcuts Hint */}
      <div className="text-center text-xs text-notion-text-tertiary">
        <kbd className="rounded border border-notion-border bg-notion-bg-secondary px-1.5 py-0.5 font-mono">/</kbd> フィルターにフォーカス
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

export default Tasks










