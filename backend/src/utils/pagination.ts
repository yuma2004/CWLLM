export const parsePagination = (pageValue?: string, pageSizeValue?: string) => {
  const page = Math.max(Number(pageValue) || 1, 1)
  const pageSize = Math.min(Math.max(Number(pageSizeValue) || 20, 1), 100)
  return { page, pageSize, skip: (page - 1) * pageSize }
}
