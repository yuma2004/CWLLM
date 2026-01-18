import { useMemo } from 'react'
import { useFetch, useMutation } from '../useApi'
import { useListQuery } from '../useListQuery'
import { apiRoutes } from '../../lib/apiRoutes'
import type { ApiListResponse, PaginationState, Project, ProjectsFilters } from '../../types'

// Payload types
export type ProjectCreatePayload = {
  companyId: string
  name: string
  status?: string
  unitPrice?: number
  conditions?: string
  periodStart?: string
  periodEnd?: string
  ownerId?: string
}

export type ProjectUpdatePayload = {
  name?: string
  status?: string
  unitPrice?: number | null
  conditions?: string | null
  periodStart?: string | null
  periodEnd?: string | null
  ownerId?: string | null
}

// Hook options
type UseProjectsListOptions = {
  filters: ProjectsFilters
  pagination: PaginationState
  debouncedQuery?: string
  enabled?: boolean
  onSuccess?: (data: ApiListResponse<Project>) => void
  onError?: (message: string, error?: unknown) => void
}

type UseProjectMutationOptions = {
  onSuccess?: () => void
  onError?: (message: string, error?: unknown) => void
}

/**
 * Hook for fetching project list
 */
export function useProjectsList(options: UseProjectsListOptions) {
  const {
    filters,
    pagination,
    debouncedQuery,
    enabled = true,
    onSuccess,
    onError,
  } = options

  const trimmedQuery = debouncedQuery?.trim()
  const queryString = useListQuery(
    filters,
    pagination,
    trimmedQuery !== undefined ? { q: trimmedQuery } : undefined
  )

  const url = useMemo(() => apiRoutes.projects.list(queryString), [queryString])

  const { data, setData, error, setError, isLoading, refetch } = useFetch<
    ApiListResponse<Project>
  >(url, {
    enabled,
    errorMessage: '案件一覧の取得に失敗しました',
    onSuccess,
    onError,
  })

  const projects = useMemo(() => data?.items ?? [], [data])

  return {
    projects,
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
 * Hook for project mutations (create, update, delete)
 */
export function useProjectMutation(options: UseProjectMutationOptions = {}) {
  const { onSuccess, onError } = options

  // Create mutation
  const {
    mutate: createMutate,
    error: createError,
    setError: setCreateError,
    isLoading: isCreating,
  } = useMutation<{ project: Project }, ProjectCreatePayload>(
    apiRoutes.projects.base(),
    'POST'
  )

  // Update mutation
  const {
    mutate: updateMutate,
    error: updateError,
    setError: setUpdateError,
    isLoading: isUpdating,
  } = useMutation<{ project: Project }, ProjectUpdatePayload>(
    apiRoutes.projects.base(),
    'PATCH'
  )

  // Delete mutation
  const {
    mutate: deleteMutate,
    error: deleteError,
    setError: setDeleteError,
    isLoading: isDeleting,
  } = useMutation<void, void>(apiRoutes.projects.base(), 'DELETE')

  // Wrapped mutations with callbacks
  const create = async (payload: ProjectCreatePayload) => {
    try {
      const result = await createMutate(payload, {
        errorMessage: '案件の作成に失敗しました',
      })
      onSuccess?.()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : '案件の作成に失敗しました'
      onError?.(message, err)
      throw err
    }
  }

  const update = async (projectId: string, payload: ProjectUpdatePayload) => {
    try {
      const result = await updateMutate(payload, {
        url: apiRoutes.projects.detail(projectId),
        errorMessage: '案件の更新に失敗しました',
      })
      onSuccess?.()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : '案件の更新に失敗しました'
      onError?.(message, err)
      throw err
    }
  }

  const remove = async (projectId: string) => {
    try {
      const result = await deleteMutate(undefined, {
        url: apiRoutes.projects.detail(projectId),
        errorMessage: '案件の削除に失敗しました',
      })
      onSuccess?.()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : '案件の削除に失敗しました'
      onError?.(message, err)
      throw err
    }
  }

  return {
    create,
    update,
    remove,
    isCreating,
    isUpdating,
    isDeleting,
    isLoading: isCreating || isUpdating || isDeleting,
    error: createError || updateError || deleteError,
    setError: (error: string) => {
      setCreateError(error)
      setUpdateError(error)
      setDeleteError(error)
    },
  }
}
