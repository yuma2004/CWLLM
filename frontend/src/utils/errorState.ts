const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const flattenErrorParts = (value: unknown): string[] => {
  if (!value) return []
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenErrorParts(item))
  }
  if (isRecord(value)) {
    if (typeof value.message === 'string') return [value.message]
    if (typeof value.error === 'string') return [value.error]
    if (isRecord(value.error)) return flattenErrorParts(value.error)
    if (value.errors) return flattenErrorParts(value.errors)
    return Object.entries(value).flatMap(([key, val]) => {
      const nested = flattenErrorParts(val)
      if (nested.length === 0) return []
      return nested.map((text) => `${key}: ${text}`)
    })
  }
  return []
}

const parseMessage = (message: string): string | null => {
  const trimmed = message.trim()
  if (!trimmed) return null
  try {
    const parsed = JSON.parse(trimmed) as unknown
    const flattened = flattenErrorParts(parsed)
    if (flattened.length > 0) {
      return flattened.join(' / ')
    }
  } catch {
    // noop - keep original
  }
  return trimmed
}

export const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return parseMessage(error.message) ?? fallback
  }
  if (typeof error === 'string') {
    return parseMessage(error) ?? fallback
  }
  return fallback
}
