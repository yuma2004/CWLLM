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

export const validatePassword = (value: unknown) => {
  if (typeof value !== 'string') return { ok: false, reason: 'Password is required' }
  const trimmed = value.trim()
  if (trimmed.length < 8) {
    return { ok: false, reason: 'Password must be at least 8 characters' }
  }
  if (!/[a-zA-Z]/.test(trimmed) || !/\d/.test(trimmed)) {
    return { ok: false, reason: 'Password must include letters and numbers' }
  }
  return { ok: true }
}

/**
 * Creates a normalizer function for enum values.
 * Returns undefined if input is undefined, null if invalid, or the valid enum value.
 */
export const createEnumNormalizer = <T extends string>(
  validValues: Set<T>
) => (value?: string): T | null | undefined => {
  if (value === undefined) return undefined
  if (!validValues.has(value as T)) return null
  return value as T
}
