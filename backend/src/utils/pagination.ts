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
