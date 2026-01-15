import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import EmptyState from '../components/ui/EmptyState'
import ActiveFilters from '../components/ui/ActiveFilters'
import FilterBadge from '../components/ui/FilterBadge'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import Card from '../components/ui/Card'
import StatusBadge from '../components/ui/StatusBadge'
import Pagination from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import KanbanBoard from '../components/KanbanBoard'
import { useFetch, useMutation } from '../hooks/useApi'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { useListQuery } from '../hooks/useListQuery'
import { useUrlSync } from '../hooks/useUrlSync'
import { formatDate, formatDateInput } from '../utils/date'
import { getTargetPath } from '../utils/routes'
import type { ApiListResponse, Task, TasksFilters } from '../types'
import { apiRoutes } from '../lib/apiRoutes'
import {
  TASK_STATUS_OPTIONS,
  TARGET_TYPE_OPTIONS,
  statusLabel,
  targetTypeLabel,
} from '../constants'

const defaultFilters: TasksFilters = {
  status: '',
  targetType: '',
  dueFrom: '',
  dueTo: '',
  assigneeId: '',
}

type TaskUserOption = { id: string; email: string; role?: string }

type TasksFiltersProps = {
  filters: TasksFilters
  onFiltersChange: (next: TasksFilters) => void
  onSubmit: (event: React.FormEvent) => void
  hasActiveFilters: boolean
  onClearFilter: (key: keyof TasksFilters) => void
  onClearAll: () => void
  scope: 'me' | 'all'
  userOptions: TaskUserOption[]
  searchInputRef: React.RefObject<HTMLSelectElement>
}

function TasksFilters({
  filters,
  onFiltersChange,
  onSubmit,
  hasActiveFilters,
  onClearFilter,
  onClearAll,
  scope,
  userOptions,
  searchInputRef,
}: TasksFiltersProps) {
  return (
    <Card className="p-5">
      <form onSubmit={onSubmit}>
      <div className="grid gap-3 md:grid-cols-7">
        <FormSelect
          ref={searchInputRef}
          value={filters.status}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
        >
          <option value="">ステータス</option>
          {TASK_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {statusLabel('task', status)}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          value={filters.targetType}
          onChange={(e) => onFiltersChange({ ...filters, targetType: e.target.value })}
        >
          <option value="">対象</option>
          {TARGET_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {targetTypeLabel(type)}
            </option>
          ))}
        </FormSelect>
        <FormInput
          type="date"
          value={filters.dueFrom}
          onChange={(e) => onFiltersChange({ ...filters, dueFrom: e.target.value })}
          placeholder="期日(開始)"
        />
        <FormInput
          type="date"
          value={filters.dueTo}
          onChange={(e) => onFiltersChange({ ...filters, dueTo: e.target.value })}
          placeholder="期日(終了)"
        />
        {scope === 'all' && (
          <FormSelect
            value={filters.assigneeId}
            onChange={(e) => onFiltersChange({ ...filters, assigneeId: e.target.value })}
          >
            <option value="">担当者</option>
            {userOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.email}
              </option>
            ))}
          </FormSelect>
        )}
        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          検索
        </button>
      </div>

      {/* Active Filters */}
      <ActiveFilters isActive={hasActiveFilters}>
          <span className="text-xs text-slate-500">絞り込み:</span>
          {filters.status && (
            <FilterBadge
              label={`ステータス: ${statusLabel('task', filters.status)}`}
              onRemove={() => onClearFilter('status')}
            />
          )}
          {filters.targetType && (
            <FilterBadge
              label={`対象: ${targetTypeLabel(filters.targetType)}`}
              onRemove={() => onClearFilter('targetType')}
            />
          )}
          {filters.dueFrom && (
            <FilterBadge
              label={`期日(開始): ${filters.dueFrom}`}
              onRemove={() => onClearFilter('dueFrom')}
            />
          )}
          {filters.dueTo && (
            <FilterBadge
              label={`期日(終了): ${filters.dueTo}`}
              onRemove={() => onClearFilter('dueTo')}
            />
          )}
          {filters.assigneeId && (
            <FilterBadge
              label={`担当者: ${userOptions.find((option) => option.id === filters.assigneeId)?.email || filters.assigneeId}`}
              onRemove={() => onClearFilter('assigneeId')}
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

type TasksBulkActionsProps = {
  selectedIds: string[]
  allSelected: boolean
  onToggleSelectAll: () => void
  bulkStatus: string
  onBulkStatusChange: (value: string) => void
  bulkAssigneeId: string
  onBulkAssigneeChange: (value: string) => void
  bulkDueDate: string
  onBulkDueDateChange: (value: string) => void
  clearBulkDueDate: boolean
  onClearBulkDueDateChange: (value: boolean) => void
  onBulkUpdate: () => void
  isBulkUpdating: boolean
  userOptions: TaskUserOption[]
}

function TasksBulkActions({
  selectedIds,
  allSelected,
  onToggleSelectAll,
  bulkStatus,
  onBulkStatusChange,
  bulkAssigneeId,
  onBulkAssigneeChange,
  bulkDueDate,
  onBulkDueDateChange,
  clearBulkDueDate,
  onClearBulkDueDateChange,
  onBulkUpdate,
  isBulkUpdating,
  userOptions,
}: TasksBulkActionsProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleSelectAll}
            className="rounded border-slate-300"
            disabled={isBulkUpdating}
          />
          全選択
        </label>
        <span>{selectedIds.length}件選択中</span>
        <FormSelect value={bulkStatus} onChange={(e) => onBulkStatusChange(e.target.value)}>
          <option value="">ステータス</option>
          {TASK_STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {statusLabel('task', status)}
            </option>
          ))}
        </FormSelect>
        <FormInput
          type="date"
          value={bulkDueDate}
          onChange={(e) => onBulkDueDateChange(e.target.value)}
          placeholder="期日"
          disabled={clearBulkDueDate}
        />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={clearBulkDueDate}
            onChange={(e) => onClearBulkDueDateChange(e.target.checked)}
            className="rounded border-slate-300"
          />
          期日をクリア
        </label>
        <FormSelect value={bulkAssigneeId} onChange={(e) => onBulkAssigneeChange(e.target.value)}>
          <option value="">担当者</option>
          <option value="__unassigned__">未割当</option>
          {userOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.email}
            </option>
          ))}
        </FormSelect>
        <button
          type="button"
          onClick={onBulkUpdate}
          disabled={isBulkUpdating || selectedIds.length === 0}
          className="rounded-full bg-slate-900 px-4 py-1 text-xs font-semibold text-white disabled:bg-slate-300"
        >
          一括更新
        </button>
      </div>
    </div>
  )
}

type TasksTableProps = {
  tasks: Task[]
  selectedIds: string[]
  allSelected: boolean
  onToggleSelectAll: () => void
  onToggleSelected: (taskId: string) => void
  onStatusChange: (taskId: string, status: string) => void
  onAssigneeChange: (taskId: string, assigneeId: string) => void
  onDueDateChange: (taskId: string, dueDate: string) => void
  onDelete: (task: Task) => void
  canWrite: boolean
  isBulkUpdating: boolean
  userOptions: TaskUserOption[]
}

function TasksTable({
  tasks,
  selectedIds,
  allSelected,
  onToggleSelectAll,
  onToggleSelected,
  onStatusChange,
  onAssigneeChange,
  onDueDateChange,
  onDelete,
  canWrite,
  isBulkUpdating,
  userOptions,
}: TasksTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleSelectAll}
                className="rounded border-slate-300"
                disabled={isBulkUpdating}
              />
            </th>
            <th className="px-4 py-3">タイトル</th>
            <th className="px-4 py-3">ステータス</th>
            <th className="px-4 py-3">対象</th>
            <th className="px-4 py-3">期日</th>
            <th className="px-4 py-3">担当者</th>
            <th className="px-4 py-3">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {tasks.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-5 py-12 text-center">
                <EmptyState
                  message="タスクが見つかりません"
                  icon={
                    <svg
                      className="h-12 w-12 text-slate-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                      />
                    </svg>
                  }
                />
              </td>
            </tr>
          ) : (
            tasks.map((task) => (
              <tr key={task.id} className="group transition-colors hover:bg-slate-50/80">
                <td className="px-4 py-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(task.id)}
                    onChange={() => onToggleSelected(task.id)}
                    className="rounded border-slate-300"
                    disabled={isBulkUpdating}
                  />
                </td>
                <td className="px-4 py-4">
                  <div>
                    <Link
                      to={`/tasks/${task.id}`}
                      className="font-semibold text-slate-900 hover:text-sky-600"
                    >
                      {task.title}
                    </Link>
                    {task.description && (
                      <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                        {task.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-4">
                  {canWrite ? (
                    <FormSelect
                      className="w-auto rounded-full px-3 py-1 text-xs"
                      value={task.status}
                      onChange={(e) => onStatusChange(task.id, e.target.value)}
                    >
                      {TASK_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel('task', status)}
                        </option>
                      ))}
                    </FormSelect>
                  ) : (
                    <StatusBadge status={task.status} kind="task" size="sm" />
                  )}
                </td>
                <td className="px-4 py-4">
                  <Link
                    to={getTargetPath(task.targetType, task.targetId)}
                    className="inline-flex flex-col items-start gap-1 text-slate-600 hover:text-sky-600"
                  >
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                      {targetTypeLabel(task.targetType)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {task.target?.name || task.targetId}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-4 text-slate-600">
                  {canWrite ? (
                    <FormInput
                      type="date"
                      className="w-auto rounded border border-slate-200 px-2 py-1 text-xs"
                      value={task.dueDate ? formatDateInput(task.dueDate) : ''}
                      onChange={(e) => onDueDateChange(task.id, e.target.value)}
                    />
                  ) : (
                    formatDate(task.dueDate)
                  )}
                </td>
                <td className="px-4 py-4">
                  {canWrite ? (
                    <FormSelect
                      className="w-auto rounded-full px-3 py-1 text-xs"
                      value={task.assigneeId ?? '__unassigned__'}
                      onChange={(e) => onAssigneeChange(task.id, e.target.value)}
                    >
                      <option value="__unassigned__">未割当</option>
                      {userOptions.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.email}
                        </option>
                      ))}
                    </FormSelect>
                  ) : (
                    <span className="text-xs text-slate-600">
                      {task.assignee?.email || '-'}
                    </span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Link
                      to={getTargetPath(task.targetType, task.targetId)}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                    >
                      詳細
                    </Link>
                    {canWrite && (
                      <button
                        type="button"
                        onClick={() => onDelete(task)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                      >
                        削除
                      </button>
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

type TasksKanbanProps = {
  tasks: Task[]
  canWrite: boolean
  selectedIds: string[]
  onToggleSelect: (taskId: string) => void
  onStatusChange: (taskId: string, status: string) => Promise<void>
  disabled: boolean
}

function TasksKanban({ tasks, canWrite, selectedIds, onToggleSelect, onStatusChange, disabled }: TasksKanbanProps) {
  return (
    <KanbanBoard
      tasks={tasks}
      canWrite={canWrite}
      selectedIds={selectedIds}
      onToggleSelect={onToggleSelect}
      onStatusChange={onStatusChange}
      disabled={disabled}
    />
  )
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
    setPagination,
    setPage,
    setPageSize,
    extraParams,
    setExtraParams,
  } = useUrlSync({
    pathname: '/tasks',
    defaultFilters,
    defaultParams: { scope: 'me', view: 'list' },
    resetPageOnFilterChange: false,
  })
  const scope = extraParams.scope === 'all' ? 'all' : 'me'
  const viewMode = extraParams.view === 'kanban' ? 'kanban' : 'list'
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkAssigneeId, setBulkAssigneeId] = useState('')
  const [bulkDueDate, setBulkDueDate] = useState('')
  const [clearBulkDueDate, setClearBulkDueDate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)

  const queryString = useListQuery(filters, pagination)

  const tasksUrl = useMemo(
    () =>
      scope === 'all'
        ? apiRoutes.tasks.list(queryString)
        : apiRoutes.tasks.myList(queryString),
    [queryString, scope]
  )

  const {
    data: tasksData,
    setData: setTasksData,
    error,
    setError,
    isLoading: isLoadingTasks,
    refetch: refetchTasks,
  } = useFetch<ApiListResponse<Task>>(tasksUrl, {
    errorMessage: 'タスクの読み込みに失敗しました',
    onSuccess: (data) => {
      setPagination((prev) => ({ ...prev, ...data.pagination }))
    },
  })

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
    { taskIds: string[]; status?: string; assigneeId?: string | null; dueDate?: string | null }
  >(apiRoutes.tasks.bulk(), 'PATCH')

  const { mutate: deleteTask, isLoading: isDeleting } = useMutation<void, void>(
    apiRoutes.tasks.base(),
    'DELETE'
  )

  const { data: userOptionsData } = useFetch<{
    users: Array<{ id: string; email: string; role: string }>
  }>(apiRoutes.users.options(), {
    errorMessage: 'Failed to load users',
    cacheTimeMs: 30_000,
  })

  const userOptions = userOptionsData?.users ?? []

  const tasks = useMemo(() => tasksData?.items ?? [], [tasksData])

  useEffect(() => {
    setSelectedIds([])
  }, [tasksData?.items])

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

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setPage(1)
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

  const handleAssigneeChange = async (taskId: string, value: string) => {
    if (!canWrite) return
    setError('')
    const assigneeId = value === '__unassigned__' ? null : value
    const nextAssignee = userOptions.find((option) => option.id === assigneeId)
    const previousItems = applyOptimisticTaskUpdate(taskId, (task) => ({
      ...task,
      assigneeId: assigneeId ?? null,
      assignee: assigneeId
        ? { id: assigneeId, email: nextAssignee?.email ?? assigneeId }
        : null,
    }))
    try {
      await updateTask(
        { assigneeId },
        { url: apiRoutes.tasks.detail(taskId), errorMessage: 'Failed to update assignee' }
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

  const handleBulkUpdate = async () => {
    if (!canWrite) return
    if (selectedIds.length === 0) {
      setError('Select tasks to update')
      return
    }
    if (!bulkStatus && !bulkAssigneeId && !bulkDueDate && !clearBulkDueDate) {
      setError('Choose fields to update')
      return
    }
    setError('')
    try {
      const payload: {
        taskIds: string[]
        status?: string
        assigneeId?: string | null
        dueDate?: string | null
      } = { taskIds: selectedIds }
      if (bulkStatus) payload.status = bulkStatus
      if (bulkAssigneeId) {
        payload.assigneeId = bulkAssigneeId === '__unassigned__' ? null : bulkAssigneeId
      }
      if (bulkDueDate) payload.dueDate = bulkDueDate
      if (clearBulkDueDate) payload.dueDate = null
      await bulkUpdateTasks(payload, { errorMessage: '一括更新に失敗しました' })
      setSelectedIds([])
      setBulkStatus('')
      setBulkAssigneeId('')
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

  const handleScopeChange = (nextScope: 'me' | 'all') => {
    setExtraParams((prev) => ({ ...prev, scope: nextScope }))
    if (nextScope === 'me') {
      setFilters({ ...filters, assigneeId: '' })
    }
    setPage(1)
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

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Tasks</p>
          <h2 className="text-3xl font-bold text-slate-900">マイタスク</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            登録数: <span className="font-semibold text-slate-700">{pagination.total}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-600 shadow-sm">
          <button
            type="button"
            onClick={() => handleScopeChange('me')}
            className={`rounded-full px-3 py-1 ${scope === 'me' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
          >
            マイタスク
          </button>
          <button
            type="button"
            onClick={() => handleScopeChange('all')}
            className={`rounded-full px-3 py-1 ${scope === 'all' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
          >
            すべてのタスク
          </button>
        </div>
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1 text-xs font-semibold text-slate-600 shadow-sm">
          <button
            type="button"
            onClick={() => setExtraParams((prev) => ({ ...prev, view: 'list' }))}
            className={`rounded-full px-3 py-1 ${viewMode === 'list' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
          >
            リスト
          </button>
          <button
            type="button"
            onClick={() => setExtraParams((prev) => ({ ...prev, view: 'kanban' }))}
            className={`rounded-full px-3 py-1 ${viewMode === 'kanban' ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'}`}
          >
            カンバン
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <TasksFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSubmit={handleSearchSubmit}
        hasActiveFilters={hasActiveFilters}
        onClearFilter={handleClearFilter}
        onClearAll={handleClearAllFilters}
        scope={scope}
        userOptions={userOptions}
        searchInputRef={searchInputRef}
      />

      {canWrite && tasks.length > 0 && (
        <TasksBulkActions
          selectedIds={selectedIds}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          bulkStatus={bulkStatus}
          onBulkStatusChange={setBulkStatus}
          bulkAssigneeId={bulkAssigneeId}
          onBulkAssigneeChange={setBulkAssigneeId}
          bulkDueDate={bulkDueDate}
          onBulkDueDateChange={setBulkDueDate}
          clearBulkDueDate={clearBulkDueDate}
          onClearBulkDueDateChange={setClearBulkDueDate}
          onBulkUpdate={handleBulkUpdate}
          isBulkUpdating={isBulkUpdating}
          userOptions={userOptions}
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
        description={`「${deleteTarget?.title}」を削除しますか？この操作は取り消せません。`}
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
        <TasksTable
          tasks={tasks}
          selectedIds={selectedIds}
          allSelected={allSelected}
          onToggleSelectAll={toggleSelectAll}
          onToggleSelected={toggleSelected}
          onStatusChange={handleStatusChange}
          onAssigneeChange={handleAssigneeChange}
          onDueDateChange={handleDueDateChange}
          onDelete={setDeleteTarget}
          canWrite={canWrite}
          isBulkUpdating={isBulkUpdating}
          userOptions={userOptions}
        />
      ) : (
        <TasksKanban
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
