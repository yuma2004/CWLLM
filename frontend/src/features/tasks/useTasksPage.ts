import { useEffect, useMemo, useRef, useState } from 'react'
import { usePermissions } from '../../hooks/usePermissions'
import { useAuth } from '../../contexts/AuthContext'
import { useFetch, useMutation } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { createSearchShortcut, useKeyboardShortcut } from '../../hooks/useKeyboardShortcut'
import { useListPage } from '../../hooks/useListPage'
import { toErrorMessage } from '../../utils/errorState'
import type { Task, TasksFilters, User } from '../../types'
import { apiRoutes } from '../../lib/apiRoutes'
import { TASK_STRINGS } from '../../strings/tasks'
import {
  buildTaskCreatePayload,
  type TaskCreateFormState,
  type TaskCreateTargetType,
  validateTaskCreateForm,
} from './createForm'
import {
  buildBulkTaskUpdatePayload,
  toggleSelectAllTaskIds,
  toggleTaskSelection,
  validateBulkTaskUpdateInput,
} from './state'

const defaultFilters: TasksFilters = {
  q: '',
  status: '',
  assigneeId: '',
  targetType: '',
  dueFrom: '',
  dueTo: '',
}

export const CREATE_TARGET_OPTIONS = [
  { value: 'company', label: 'Company' },
  { value: 'general', label: 'General' },
] as const

export const useTasksPage = () => {
  const { canWrite, isAdmin } = usePermissions()
  const { user } = useAuth()
  const [taskScope, setTaskScope] = useState<'mine' | 'all' | 'user'>('mine')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const createTitleRef = useRef<HTMLInputElement>(null)
  const createCompanyRef = useRef<HTMLInputElement>(null)

  const buildTaskUrl = useMemo(
    () => (queryString: string) =>
      isAdmin && taskScope !== 'mine'
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
      defaultParams: { view: 'kanban' },
      resetPageOnFilterChange: false,
    },
    buildUrl: buildTaskUrl,
    debounce: { key: 'q', delayMs: 300 },
    fetchOptions: {
      authMode: 'bearer',
      errorMessage: TASK_STRINGS.errors.load,
    },
  })

  const viewMode = extraParams.view === 'kanban' ? 'kanban' : 'list'
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkStatus, setBulkStatus] = useState('')
  const [bulkDueDate, setBulkDueDate] = useState('')
  const [clearBulkDueDate, setClearBulkDueDate] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null)
  const [createForm, setCreateForm] = useState<TaskCreateFormState>({
    targetType: 'company',
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
    { task: Task },
    {
      targetType: string
      targetId: string
      title: string
      description?: string
      dueDate?: string
      assigneeId?: string
    }
  >(apiRoutes.tasks.base(), 'POST')

  const { mutate: updateTaskStatus } = useMutation<{ task: Task }, { status: string }>(
    apiRoutes.tasks.base(),
    'PATCH'
  )

  const { mutate: updateTask } = useMutation<
    { task: Task },
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
    authMode: 'bearer',
    cacheTimeMs: 30_000,
  })
  const userOptions = useMemo(() => usersData?.users ?? [], [usersData?.users])

  const tasks = useMemo(() => tasksData?.items ?? [], [tasksData])
  const hasBulkActions = canWrite && selectedIds.length > 0
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
    if (isAdmin) return
    if (!filters.assigneeId) return
    setFilters((prev) => ({ ...prev, assigneeId: '' }))
  }, [filters.assigneeId, isAdmin, setFilters])

  useEffect(() => {
    if (!isAdmin) return
    if (taskScope !== 'user') return
    if (filters.assigneeId) return
    const fallback =
      (user?.id ? userOptions.find((option) => option.id === user.id) : undefined) ??
      userOptions[0]
    if (fallback) {
      setFilters((prev) => ({ ...prev, assigneeId: fallback.id }))
    }
  }, [filters.assigneeId, isAdmin, setFilters, taskScope, user?.id, userOptions])

  useEffect(() => {
    if (!isCreateDirty) return undefined
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isCreateDirty])

  useEffect(() => {
    if (!isCreateOpen) return
    const frameId = window.requestAnimationFrame(() => {
      createTitleRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [isCreateOpen])

  const shortcuts = useMemo(() => [createSearchShortcut(searchInputRef)], [searchInputRef])
  useKeyboardShortcut(shortcuts)

  const applyOptimisticTaskUpdate = (taskId: string, updateTaskFn: (task: Task) => Task) => {
    const previousItems = tasksData?.items ?? []
    if (previousItems.length > 0) {
      setTasksData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map((task) => (task.id === taskId ? updateTaskFn(task) : task)),
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
        {
          authMode: 'bearer',
          url: apiRoutes.tasks.detail(taskId),
          errorMessage: TASK_STRINGS.errors.updateStatus,
        }
      )
      void refetchTasks()
      showToast(TASK_STRINGS.success.updateStatus, 'success')
    } catch (err) {
      restoreOptimisticTasks(previousItems)
      setError(err instanceof Error ? err.message : TASK_STRINGS.errors.updateStatus)
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
        {
          authMode: 'bearer',
          url: apiRoutes.tasks.detail(taskId),
          errorMessage: TASK_STRINGS.errors.updateDueDate,
        }
      )
      void refetchTasks()
      showToast(TASK_STRINGS.success.updateDueDate, 'success')
    } catch (err) {
      restoreOptimisticTasks(previousItems)
      setError(err instanceof Error ? err.message : TASK_STRINGS.errors.updateDueDate)
    }
  }

  const handleAssigneeChange = async (taskId: string, value: string) => {
    if (!canWrite) return
    setError('')
    const assigneeId = value || null
    const nextAssignee = assigneeId
      ? userOptions.find((userItem) => userItem.id === assigneeId)
      : undefined
    const previousItems = applyOptimisticTaskUpdate(taskId, (task) => ({
      ...task,
      assigneeId,
      assignee: nextAssignee
        ? { id: nextAssignee.id, email: nextAssignee.email, name: nextAssignee.name }
        : null,
    }))
    try {
      await updateTask(
        { assigneeId },
        {
          authMode: 'bearer',
          url: apiRoutes.tasks.detail(taskId),
          errorMessage: TASK_STRINGS.errors.updateAssignee,
        }
      )
      void refetchTasks()
      showToast(TASK_STRINGS.success.updateAssignee, 'success')
    } catch (err) {
      restoreOptimisticTasks(previousItems)
      setError(err instanceof Error ? err.message : TASK_STRINGS.errors.updateAssignee)
    }
  }

  const handleCreateTask = async (event: React.FormEvent) => {
    event.preventDefault()
    setCreateError('')
    const validationErrors = validateTaskCreateForm(createForm)
    const nextErrors: { title?: string; companyId?: string } = {
      ...(validationErrors.title ? { title: TASK_STRINGS.errors.createTitleRequired } : {}),
      ...(validationErrors.companyId
        ? { companyId: TASK_STRINGS.errors.createCompanyRequired }
        : {}),
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
      await createTask(buildTaskCreatePayload(createForm), {
        authMode: 'bearer',
        errorMessage: TASK_STRINGS.errors.create,
      })
      showToast(TASK_STRINGS.success.create, 'success')
      setCreateForm((prev) => ({ ...prev, title: '', description: '', dueDate: '' }))
      setCreateFieldErrors({})
      void refetchTasks()
    } catch (err) {
      setCreateError(toErrorMessage(err, TASK_STRINGS.errors.create))
    }
  }

  const handleBulkUpdate = async () => {
    if (!canWrite) return
    const validation = validateBulkTaskUpdateInput(
      selectedIds,
      bulkStatus,
      bulkDueDate,
      clearBulkDueDate
    )
    if (!validation.ok) {
      setError(
        validation.reason === 'missing-task-ids'
          ? TASK_STRINGS.errors.bulkSelectTargets
          : TASK_STRINGS.errors.bulkSelectFields
      )
      return
    }
    setError('')
    try {
      const payload = buildBulkTaskUpdatePayload(
        selectedIds,
        bulkStatus,
        bulkDueDate,
        clearBulkDueDate
      )
      await bulkUpdateTasks(payload, { authMode: 'bearer', errorMessage: TASK_STRINGS.errors.bulk })
      setSelectedIds([])
      setBulkStatus('')
      setBulkDueDate('')
      setClearBulkDueDate(false)
      void refetchTasks()
      showToast(TASK_STRINGS.success.bulk, 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : TASK_STRINGS.errors.bulk)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget || !canWrite) return
    setError('')
    try {
      await deleteTask(undefined, {
        authMode: 'bearer',
        url: apiRoutes.tasks.detail(deleteTarget.id),
        errorMessage: TASK_STRINGS.errors.delete,
      })
      setDeleteTarget(null)
      void refetchTasks()
      showToast(TASK_STRINGS.success.delete, 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : TASK_STRINGS.errors.delete)
    }
  }

  const allSelected = tasks.length > 0 && selectedIds.length === tasks.length

  const toggleSelectAll = () => {
    setSelectedIds(toggleSelectAllTaskIds(allSelected, tasks))
  }

  const toggleSelected = (taskId: string) => {
    setSelectedIds((prev) => toggleTaskSelection(prev, taskId))
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

  const handleScopeChange = (nextScope: 'mine' | 'all' | 'user') => {
    if (!isAdmin) return
    setTaskScope(nextScope)
    if (nextScope === 'mine' || nextScope === 'all') {
      setFilters((prev) => ({ ...prev, assigneeId: '' }))
    }
    setPage(1)
  }

  return {
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
  }
}
