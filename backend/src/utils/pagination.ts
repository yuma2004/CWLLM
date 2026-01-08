export const parsePagination = (
  pageValue?: string,
  pageSizeValue?: string,
  maxPageSize = 100
) => {
  const page = Math.max(Number(pageValue) || 1, 1)
  const pageSize = Math.min(Math.max(Number(pageSizeValue) || 20, 1), maxPageSize)
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
