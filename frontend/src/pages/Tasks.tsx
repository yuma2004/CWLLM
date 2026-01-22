import { useEffect, useMemo, useRef, useState } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import SuccessAlert from '../components/ui/SuccessAlert'
import Button from '../components/ui/Button'
import FormInput from '../components/ui/FormInput'
import FormTextarea from '../components/ui/FormTextarea'
import Card from '../components/ui/Card'
import Pagination from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import { CompanySearchSelect } from '../components/SearchSelect'
import { TaskFilters } from '../components/tasks/TaskFilters'
import { TaskTable } from '../components/tasks/TaskTable'
import { TaskKanban } from '../components/tasks/TaskKanban'
import { TaskBulkActions } from '../components/tasks/TaskBulkActions'
import { useMutation } from '../hooks/useApi'
import { createSearchShortcut, useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { useListPage } from '../hooks/useListPage'
import { toErrorMessage } from '../utils/errorState'
import { cn } from '../lib/cn'
import type { Task, TasksFilters } from '../types'
import { apiRoutes } from '../lib/apiRoutes'

const defaultFilters: TasksFilters = {
  status: '',
  targetType: '',
  dueFrom: '',
  dueTo: '',
}

function Tasks() {
  const { canWrite } = usePermissions()
  const searchInputRef = useRef<HTMLSelectElement>(null)

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
    buildUrl: apiRoutes.tasks.myList,
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
  })
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState('')

  const { mutate: createTask, isLoading: isCreating } = useMutation<
    Task,
    {
      targetType: string
      targetId: string
      title: string
      description?: string
      dueDate?: string
    }
  >(apiRoutes.tasks.base(), 'POST')

  const { mutate: updateTaskStatus } = useMutation<Task, { status: string }>(
    apiRoutes.tasks.base(),
    'PATCH'
  )

  const { mutate: updateTask } = useMutation<
    Task,
    { status?: string; dueDate?: string | null }
  >(apiRoutes.tasks.base(), 'PATCH')

  const { mutate: bulkUpdateTasks, isLoading: isBulkUpdating } = useMutation<
    { updated: number },
    { taskIds: string[]; status?: string; dueDate?: string | null }
  >(apiRoutes.tasks.bulk(), 'PATCH')

  const { mutate: deleteTask, isLoading: isDeleting } = useMutation<void, void>(
    apiRoutes.tasks.base(),
    'DELETE'
  )



  const tasks = useMemo(() => tasksData?.items ?? [], [tasksData])

  useEffect(() => {
    setSelectedIds([])
  }, [tasksData?.items])

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
        { url: apiRoutes.tasks.detail(taskId), errorMessage: 'Failed to update task status' }
      )
      void refetchTasks()
    } catch (err) {
      restoreOptimisticTasks(previousItems)
      setError(err instanceof Error ? err.message : 'Failed to update task')
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
        { url: apiRoutes.tasks.detail(taskId), errorMessage: 'Failed to update due date' }
      )
      void refetchTasks()
    } catch (err) {
      restoreOptimisticTasks(previousItems)
      setError(err instanceof Error ? err.message : 'Failed to update task')
    }
  }

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreateError('')
    setCreateSuccess('')

    if (!createForm.title.trim()) {
      setCreateError('タスクタイトルを入力してください')
      return
    }
    if (!createForm.companyId) {
      setCreateError('紐づける企業を選択してください')
      return
    }

    try {
      await createTask(
        {
          targetType: 'company',
          targetId: createForm.companyId,
          title: createForm.title.trim(),
          description: createForm.description.trim() || undefined,
          dueDate: createForm.dueDate || undefined,
        },
        { errorMessage: 'タスクの作成に失敗しました' }
      )
      setCreateSuccess('タスクを作成しました')
      setCreateForm((prev) => ({ ...prev, title: '', description: '', dueDate: '' }))
      void refetchTasks()
    } catch (err) {
      setCreateError(toErrorMessage(err, 'タスクの作成に失敗しました'))
    }
  }

  const handleBulkUpdate = async () => {
    if (!canWrite) return
    if (selectedIds.length === 0) {
      setError('Select tasks to update')
      return
    }
    if (!bulkStatus && !bulkDueDate && !clearBulkDueDate) {
      setError('Choose fields to update')
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

  const canSubmitCreate = Boolean(createForm.title.trim() && createForm.companyId)


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

  return (
    <div className="space-y-4 ">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase  text-slate-400">Tasks</p>
          <h2 className="text-3xl font-bold text-slate-900">マイタスク</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            合計件数: <span className="font-semibold text-slate-700">{pagination.total}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-600 shadow-sm">
          <button
            type="button"
            onClick={() => setExtraParams((prev) => ({ ...prev, view: 'list' }))}
            className={cn(
              'rounded-full px-3 py-1',
              viewMode === 'list' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
            )}
          >
            リスト
          </button>
          <button
            type="button"
            onClick={() => setExtraParams((prev) => ({ ...prev, view: 'kanban' }))}
            className={cn(
              'rounded-full px-3 py-1',
              viewMode === 'kanban' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'
            )}
          >
            カンバン
          </button>
        </div>
      </div>

      {canWrite && (
        <Card
          title="タスク作成"
          description="タスク管理から企業に紐づけて追加できます。"
        >
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <FormInput
                label="タスクタイトル"
                value={createForm.title}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="対応内容を入力"
                disabled={isCreating}
                containerClassName="md:col-span-2"
              />
              <CompanySearchSelect
                label="紐づける企業"
                value={createForm.companyId}
                onChange={(companyId) =>
                  setCreateForm((prev) => ({ ...prev, companyId }))
                }
                placeholder="企業名で検索"
                disabled={isCreating}
              />
              <FormTextarea
                label="詳細"
                rows={3}
                value={createForm.description}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="背景や補足メモ"
                disabled={isCreating}
                containerClassName="md:col-span-2"
              />
              <FormInput
                label="期限"
                type="date"
                value={createForm.dueDate}
                onChange={(event) =>
                  setCreateForm((prev) => ({ ...prev, dueDate: event.target.value }))
                }
                disabled={isCreating}
              />
            </div>

            {createError && (
              <ErrorAlert message={createError} onClose={() => setCreateError('')} />
            )}
            {createSuccess && (
              <SuccessAlert
                message={createSuccess}
                onClose={() => setCreateSuccess('')}
              />
            )}

            <div className="flex justify-end">
              <Button
                type="submit"
                isLoading={isCreating}
                loadingLabel="作成中..."
                disabled={!canSubmitCreate}
              >
                タスクを作成
              </Button>
            </div>
          </form>
        </Card>
      )}

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

      {canWrite && tasks.length > 0 && (
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
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          閲覧専用ロールのため、タスクのステータス変更はできません。
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
        <SkeletonTable rows={5} columns={6} />
      ) : viewMode === 'list' ? (
        <TaskTable
          tasks={tasks}
          selectedIds={selectedIds}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          onToggleSelected={toggleSelected}
          onStatusChange={handleStatusChange}
          onDueDateChange={handleDueDateChange}
          onDelete={setDeleteTarget}
          canWrite={canWrite}
          isBulkUpdating={isBulkUpdating}
        />
      ) : (
        <TaskKanban
          tasks={tasks}
          canWrite={canWrite}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelected}
          onStatusChange={handleStatusChange}
          disabled={isBulkUpdating}
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
      <div className="text-center text-xs text-slate-400">
        <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">/</kbd> フィルターにフォーカス
      </div>
    </div>
  )
}

export default Tasks
