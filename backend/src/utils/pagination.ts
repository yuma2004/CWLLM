export const parsePagination = (
  pageValue?: string,
  pageSizeValue?: string,
  maxPageSize = 100
) => {
  const rawPage = Number(pageValue)
  const rawPageSize = Number(pageSizeValue)
  const safePage = Number.isFinite(rawPage) ? rawPage : NaN
  const safePageSize = Number.isFinite(rawPageSize) ? rawPageSize : NaN
  const page = Math.max(safePage || 1, 1)
  const pageSize = Math.min(Math.max(safePageSize || 20, 1), maxPageSize)
  return { page, pageSize, skip: (page - 1) * pageSize }
}

export const parseLimit = (
  value?: string,
  defaultLimit = 20,
  maxLimit = 50
) => {
  const rawLimit = Number(value)
  const safeLimit = Number.isFinite(rawLimit) ? rawLimit : NaN
  const limit = safeLimit || defaultLimit
  return Math.min(Math.max(Math.floor(limit), 1), maxLimit)
}

export const buildPagination = (page: number, pageSize: number, total: number) => ({
  page,
  pageSize,
  total,
})

export const buildPaginatedResponse = <T>(
  items: T[],
  page: number,
  pageSize: number,
  total: number
) => ({
  items,
  pagination: buildPagination(page, pageSize, total),
})
