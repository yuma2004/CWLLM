import { useMemo } from 'react'
import { useFetch, useMutation } from '../useApi'
import { useListQuery } from '../useListQuery'
import { apiRoutes } from '../../lib/apiRoutes'
import type {
  ApiListResponse,
  Company,
  CompaniesFilters,
  CompanyOptions,
  PaginationState,
} from '../../types'

// Payload types
export type CompanyCreatePayload = {
  name: string
  category?: string
  status?: string
  profile?: string
  tags: string[]
}

export type CompanyUpdatePayload = {
  name?: string
  category?: string
  status?: string
  profile?: string
  tags?: string[]
  ownerId?: string | null
}

// Hook options
type UseCompaniesListOptions = {
  filters: CompaniesFilters
  pagination: PaginationState
  debouncedQuery?: string
  enabled?: boolean
  onSuccess?: (data: ApiListResponse<Company>) => void
  onError?: (message: string, error?: unknown) => void
}

type UseCompanyMutationOptions = {
  onSuccess?: () => void
  onError?: (message: string, error?: unknown) => void
}

type UseCompanyOptionsOptions = {
  enabled?: boolean
  onSuccess?: (data: CompanyOptions) => void
  onError?: (message: string, error?: unknown) => void
}

/**
 * Hook for fetching company list
 */
export function useCompaniesList(options: UseCompaniesListOptions) {
  const {
    filters,
    pagination,
    debouncedQuery,
    enabled = true,
    onSuccess,
    onError,
  } = options

  const queryString = useListQuery(
    filters,
    pagination,
    debouncedQuery !== undefined ? { q: debouncedQuery } : undefined
  )

  const url = useMemo(() => apiRoutes.companies.list(queryString), [queryString])

  const { data, setData, error, setError, isLoading, refetch } = useFetch<
    ApiListResponse<Company>
  >(url, {
    enabled,
    errorMessage: '企業一覧の取得に失敗しました',
    onSuccess,
    onError,
  })

  const companies = useMemo(() => data?.items ?? [], [data])

  return {
    companies,
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
 * Hook for fetching company options (categories, statuses, tags)
 */
export function useCompanyOptions(options: UseCompanyOptionsOptions = {}) {
  const { enabled = true, onSuccess, onError } = options

  const { data, error, setError, isLoading, refetch } = useFetch<CompanyOptions>(
    apiRoutes.companies.options(),
    {
      enabled,
      onSuccess,
      onError: (message) => {
        console.error('候補の取得エラー:', message)
        onError?.(message)
      },
    }
  )

  return {
    options: data ?? { categories: [], statuses: [], tags: [] },
    error,
    setError,
    isLoading,
    refetch,
  }
}

/**
 * Hook for company mutations (create, update, delete)
 */
export function useCompanyMutation(options: UseCompanyMutationOptions = {}) {
  const { onSuccess, onError } = options

  // Create mutation
  const {
    mutate: createMutate,
    error: createError,
    setError: setCreateError,
    isLoading: isCreating,
  } = useMutation<{ company?: Company }, CompanyCreatePayload>(
    apiRoutes.companies.base(),
    'POST'
  )

  // Update mutation
  const {
    mutate: updateMutate,
    error: updateError,
    setError: setUpdateError,
    isLoading: isUpdating,
  } = useMutation<{ company?: Company }, CompanyUpdatePayload>(
    apiRoutes.companies.base(),
    'PATCH'
  )

  // Delete mutation
  const {
    mutate: deleteMutate,
    error: deleteError,
    setError: setDeleteError,
    isLoading: isDeleting,
  } = useMutation<void, void>(apiRoutes.companies.base(), 'DELETE')

  // Link Chatwork room mutation
  const {
    mutate: linkChatworkMutate,
    error: linkError,
    setError: setLinkError,
    isLoading: isLinking,
  } = useMutation<unknown, { roomId: string }>(apiRoutes.companies.base(), 'POST')

  // Wrapped mutations with callbacks
  const create = async (payload: CompanyCreatePayload) => {
    try {
      const result = await createMutate(payload, {
        errorMessage: '企業の作成に失敗しました',
      })
      onSuccess?.()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : '企業の作成に失敗しました'
      onError?.(message, err)
      throw err
    }
  }

  const update = async (companyId: string, payload: CompanyUpdatePayload) => {
    try {
      const result = await updateMutate(payload, {
        url: apiRoutes.companies.detail(companyId),
        errorMessage: '企業の更新に失敗しました',
      })
      onSuccess?.()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : '企業の更新に失敗しました'
      onError?.(message, err)
      throw err
    }
  }

  const remove = async (companyId: string) => {
    try {
      const result = await deleteMutate(undefined, {
        url: apiRoutes.companies.detail(companyId),
        errorMessage: '企業の削除に失敗しました',
      })
      onSuccess?.()
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : '企業の削除に失敗しました'
      onError?.(message, err)
      throw err
    }
  }

  const linkChatworkRoom = async (companyId: string, roomId: string) => {
    try {
      const result = await linkChatworkMutate(
        { roomId },
        {
          url: apiRoutes.companies.chatworkRooms(companyId),
          errorMessage: 'Chatworkルームの紐づけに失敗しました',
        }
      )
      onSuccess?.()
      return result
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Chatworkルームの紐づけに失敗しました'
      onError?.(message, err)
      throw err
    }
  }

  return {
    create,
    update,
    remove,
    linkChatworkRoom,
    isCreating,
    isUpdating,
    isDeleting,
    isLinking,
    isLoading: isCreating || isUpdating || isDeleting || isLinking,
    error: createError || updateError || deleteError || linkError,
    setError: (error: string) => {
      setCreateError(error)
      setUpdateError(error)
      setDeleteError(error)
      setLinkError(error)
    },
  }
}
