import { useCallback } from 'react'
import type { PaginationState } from '../types'

type PaginationResponse = {
  pagination?: PaginationState
}

export const usePaginationSync = (
  setPagination: React.Dispatch<React.SetStateAction<PaginationState>>
) =>
  useCallback((data?: PaginationResponse | null) => {
    if (!data?.pagination) return
    setPagination((prev) => ({ ...prev, ...data.pagination }))
  }, [setPagination])
