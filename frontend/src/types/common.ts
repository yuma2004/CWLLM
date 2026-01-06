// ページネーション共通型
export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export const defaultPagination: PaginationState = {
  page: 1,
  pageSize: 20,
  total: 0,
}

// フィルター共通型
export interface BaseFilters {
  q?: string
  status?: string
}

// ユーザー型（担当者選択用）
export interface UserOption {
  id: string
  email: string
}
