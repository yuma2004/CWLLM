import { PaginationState } from './common'

export interface ApiErrorDetail {
  code: string
  message: string
  details?: unknown
}

export interface ApiError {
  error: ApiErrorDetail | string
  details?: unknown
}

export interface ApiListResponse<T> {
  items: T[]
  pagination: PaginationState
}
