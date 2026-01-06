import { ApiError } from '../types'

type ApiRequestOptions = {
  method?: string
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
}

const readJson = async <T,>(response: Response): Promise<T | null> => {
  try {
    const text = await response.text()
    if (!text) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export const apiRequest = async <T,>(
  url: string,
  { method = 'GET', body, headers, signal }: ApiRequestOptions = {}
): Promise<T> => {
  const requestHeaders = new Headers(headers)
  const hasBody = body !== undefined
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  let requestBody: BodyInit | undefined
  if (hasBody) {
    requestBody = isFormData ? (body as BodyInit) : JSON.stringify(body)
    if (!isFormData && !requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json')
    }
  }

  const response = await fetch(url, {
    method,
    credentials: 'include',
    headers: requestHeaders,
    body: requestBody,
    signal,
  })
  const responseData = await readJson<T | ApiError>(response)

  if (!response.ok) {
    const apiError = responseData as ApiError | null
    const message =
      typeof apiError?.error === 'string'
        ? apiError.error
        : apiError?.error?.message ?? 'Network error'
    throw new Error(message)
  }

  return responseData as T
}

export const apiGet = async <T,>(url: string, options?: Omit<ApiRequestOptions, 'method'>) =>
  apiRequest<T>(url, { ...options, method: 'GET' })

export const apiSend = async <T, B = unknown>(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: B,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
) => apiRequest<T>(url, { ...options, method, body })
