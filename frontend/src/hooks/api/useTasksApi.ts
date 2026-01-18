import { useMemo } from 'react'
import { useFetch, useMutation } from '../useApi'
import { useListQuery } from '../useListQuery'
import { apiRoutes } from '../../lib/apiRoutes'
import type { ApiListResponse, PaginationState, Task, TasksFilters } from '../../types'

// Payload types
export type TaskCreatePayload = {
  targetType: string
  targetId: string
  title: string
  description?: string
  dueDate?: string
}

export type TaskUpdatePayload = {
  status?: string
  dueDate?: string | null
  title?: string
  description?: string
}

export type TaskBulkUpdatePayload = {
  taskIds: string[]
  status?: string
  dueDate?: string | null
}

// Hook options
type UseTasksListOptions = {
  filters: TasksFilters
  pagination: PaginationState
  variant?: 'all' | 'my'
  enabled?: boolean
  onSuccess?: (data: ApiListResponse<Task>) => void
  onError?: (message: string, error?: unknown) => void
}

type UseTaskMutationOptions = {
  onSuccess?: () => void
  onError?: (message: string, error?: unknown) => void
}

/**
 * Hook for fetching task list
 */
export function useTasksList(options: UseTasksListOptions) {
  const {
    filters,
    pagination,
    variant = 'my',
    enabled = true,
    onSuccess,
    onError,
  } = options

  const queryString = useListQuery(filters, pagination)

  const url = useMemo(() => {
    return variant === 'my'
      ? apiRoutes.tasks.myList(queryString)
      : apiRoutes.tasks.list(queryString)
  }, [queryString, variant])

  const { data, setData, error, setError, isLoading, refetch } = useFetch<
    ApiListResponse<Task>
  >(url, {
    enabled,
    errorMessage: 'タスクの読み込みに失敗しました',
    onSuccess,
    onError,
  })

  const tasks = useMemo(() => data?.items ?? [], [data])

  return {
    tasks,
    data,
    setData,
    error,
    setError,
    isLoading,
    refetch,
    pagination: data?.pagination,
  }
}

/**
 * Hook for task mutations (create, update, delete, bulk update)
 */
export function useTaskMutation(options: UseTaskMutationOptions = {}) {
  const { onSuccess, onError } = options

  // Create mutation
  const {
    mutate: createMutate,
    error: createError,
    setError: setCreateError,
    isLoading: isCreating,
  } = useMutation<Task, TaskCreatePayload>(apiRoutes.tasks.base(), 'POST')

  // Update mutation
  const {
    mutate: updateMutate,
    error: updateError,
    setError: setUpdateError,
    isLoading: isUpdating,
  } = useMutation<Task, TaskUpdatePayload>(apiRoutes.tasks.base(), 'PATCH')

  // Delete mutation
  const {
    mutate: deleteMutate,
    error: deleteError,
    setError: setDeleteError,
    isLoading: isDeleting,
  } = useMutation<void, void>(apiRoutes.tasks.base(), 'DELETE')

  // Bulk update mutation
  const {
    mutate: bulkUpdateMutate,
    error: bulkError,
    setError: setBulkError,
    isLoading: isBulkUpdating,
  } = useMutation<{ updated: number }, TaskBulkUpdatePayload>(
    apiRoutes.tasks.bulk(),
    'PATCH'
  )

  // Wrapped mutations with callbacks
  const create = async (payload: TaskCreatePayload) => {
    try {
      const result = await createMutate(payload, {
        errorMessage: 'タスクの作成に失敗しました',
      })
      onSuccess?.()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'タスクの作成に失敗しました'
      onError?.(message, err)
      throw err
    }
  }

  const update = async (taskId: string, payload: TaskUpdatePayload) => {
    try {
      const result = await updateMutate(payload, {
        url: apiRoutes.tasks.detail(taskId),
        errorMessage: 'タスクの更新に失敗しました',
      })
      onSuccess?.()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'タスクの更新に失敗しました'
      onError?.(message, err)
      throw err
    }
  }

  const remove = async (taskId: string) => {
    try {
      const result = await deleteMutate(undefined, {
        url: apiRoutes.tasks.detail(taskId),
        errorMessage: 'タスクの削除に失敗しました',
      })
      onSuccess?.()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'タスクの削除に失敗しました'
      onError?.(message, err)
      throw err
    }
  }

  const bulkUpdate = async (payload: TaskBulkUpdatePayload) => {
    try {
      const result = await bulkUpdateMutate(payload, {
        errorMessage: '一括更新に失敗しました',
      })
      onSuccess?.()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : '一括更新に失敗しました'
      onError?.(message, err)
      throw err
    }
  }

  return {
    create,
    update,
    remove,
    bulkUpdate,
    isCreating,
    isUpdating,
    isDeleting,
    isBulkUpdating,
    isLoading: isCreating || isUpdating || isDeleting || isBulkUpdating,
    error: createError || updateError || deleteError || bulkError,
    setError: (error: string) => {
      setCreateError(error)
      setUpdateError(error)
      setDeleteError(error)
      setBulkError(error)
    },
  }
}
