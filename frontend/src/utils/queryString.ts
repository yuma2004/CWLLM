export type QueryValue = string | number | boolean | null | undefined

export const buildQueryString = (params: Record<string, QueryValue>): string => {
  const query = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return
    if (typeof value === 'string') {
      if (value === '') return
      query.set(key, value)
      return
    }
    query.set(key, String(value))
  })

  return query.toString()
}
