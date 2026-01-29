import { getAuthToken } from './authToken'
import { ApiError } from '../types'

type ApiRequestOptions = {
  method?: string
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
  authMode?: 'bearer'
  authToken?: string | null
}

export class ApiRequestError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

// API base URL. Empty means same-origin requests.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const isAbsoluteUrl = (value: string) =>
  value.startsWith('http://') || value.startsWith('https://')

const isAllowedAbsoluteUrl = (url: string) => {
  if (!API_BASE_URL) return false
  return url.startsWith(API_BASE_URL)
}

const buildUrl = (path: string): string => {
  if (isAbsoluteUrl(path)) {
    return path
  }
  if (API_BASE_URL) {
    return `${API_BASE_URL}${path}`
  }
  return path
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

const prepareRequest = (
  url: string,
  { method = 'GET', body, headers, signal, authMode, authToken }: ApiRequestOptions
): { fullUrl: string; init: RequestInit } => {
  const isAbsoluteInput = isAbsoluteUrl(url)
  const isAllowedAbsolute = isAbsoluteInput && isAllowedAbsoluteUrl(url)
  if (isAbsoluteInput && !isAllowedAbsolute) {
    throw new Error('Absolute URL requests are not allowed in apiClient.')
  }
  const fullUrl = buildUrl(url)
  const requestHeaders = new Headers(headers)
  const hasBody = body !== undefined
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  if (authMode === 'bearer' && !requestHeaders.has('Authorization')) {
    const token = authToken ?? getAuthToken()
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`)
    }
  }

  let requestBody: BodyInit | undefined
  if (hasBody) {
    requestBody = isFormData ? (body as BodyInit) : JSON.stringify(body)
    if (!isFormData && !requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json')
    }
  }

  return {
    fullUrl,
    init: {
      method,
      credentials: isAbsoluteInput ? 'omit' : 'include',
      headers: requestHeaders,
      body: requestBody,
      signal,
    },
  }
}

export const apiRequest = async <T,>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> => {
  const { fullUrl, init } = prepareRequest(url, options)
  const response = await fetch(fullUrl, init)
  const responseData = await readJson<T | ApiError>(response)

  if (!response.ok) {
    const apiError = responseData as ApiError | null
    const message =
      typeof apiError?.error === 'string'
        ? apiError.error
        : apiError?.error?.message ?? 'ネットワークエラー'
    throw new ApiRequestError(message, response.status)
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


