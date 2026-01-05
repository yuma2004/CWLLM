export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0

export const isNullableString = (value: unknown): value is string | null | undefined =>
  value === undefined || value === null || typeof value === 'string'

export const parseDate = (value?: string | null) => {
  if (!value) return value === null ? null : undefined
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export const parseNumber = (value: unknown) => {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'number' || Number.isNaN(value)) return null
  return value
}

export const parseStringArray = (value: unknown): string[] | null | undefined => {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) return null
  if (value.some((item) => typeof item !== 'string')) return null
  return value
}
