export type ErrorDetails = Record<string, unknown> | unknown

export interface ApiErrorPayload {
  error: {
    code: string
    message: string
    details?: ErrorDetails
  }
}

const statusToCode = (statusCode: number) => {
  if (statusCode >= 500) return 'INTERNAL_SERVER_ERROR'
  if (statusCode === 400) return 'BAD_REQUEST'
  if (statusCode === 401) return 'UNAUTHORIZED'
  if (statusCode === 403) return 'FORBIDDEN'
  if (statusCode === 404) return 'NOT_FOUND'
  if (statusCode === 409) return 'CONFLICT'
  if (statusCode === 422) return 'VALIDATION_ERROR'
  if (statusCode === 429) return 'TOO_MANY_REQUESTS'
  return 'ERROR'
}

const isErrorObject = (
  value: unknown
): value is { code?: string; message?: string; details?: ErrorDetails } => {
  if (!value || typeof value !== 'object') return false
  return 'message' in value || 'code' in value
}

export const buildErrorPayload = (
  statusCode: number,
  message: string,
  details?: ErrorDetails,
  code?: string
): ApiErrorPayload => ({
  error: {
    code: code ?? statusToCode(statusCode),
    message,
    ...(details !== undefined ? { details } : {}),
  },
})

export const normalizeErrorPayload = (
  payload: unknown,
  statusCode: number
): ApiErrorPayload | unknown => {
  if (!payload || typeof payload !== 'object') return payload
  if (!('error' in payload)) return payload
  const raw = (payload as { error: unknown }).error
  if (typeof raw === 'string') {
    return buildErrorPayload(statusCode, raw)
  }
  if (isErrorObject(raw)) {
    return buildErrorPayload(
      statusCode,
      raw.message ?? 'Unknown error',
      raw.details,
      raw.code
    )
  }
  return buildErrorPayload(statusCode, 'Unknown error')
}

// Convenience helpers for common error responses
export const badRequest = (message: string, details?: ErrorDetails) =>
  buildErrorPayload(400, message, details)

export const unauthorized = (message = 'Unauthorized') =>
  buildErrorPayload(401, message)

export const forbidden = (message = 'Forbidden') =>
  buildErrorPayload(403, message)

export const notFound = (entity: string) =>
  buildErrorPayload(404, `${entity} not found`)

export const conflict = (message: string, details?: ErrorDetails) =>
  buildErrorPayload(409, message, details)
