import { ApiError } from '../types'

type ApiRequestOptions = {
  method?: string
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
}

export class ApiRequestError extends Error {
  constructor(message: string, public status: number) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

// API ベースURL（本番環境では環境変数から取得）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const buildUrl = (path: string): string => {
  if (path.startsWith('http://') || path.startsWith('https://')) {
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
  { method = 'GET', body, headers, signal }: ApiRequestOptions
): { fullUrl: string; init: RequestInit } => {
  const fullUrl = buildUrl(url)
  const requestHeaders = new Headers(headers)
  const hasBody = body !== undefined
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

  const token = localStorage.getItem('auth_token')
  if (token && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
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
      credentials: 'include',
      headers: requestHeaders,
      body: requestBody,
      signal,
    },
  }
}

const parseErrorMessage = async (response: Response): Promise<string> => {
  const apiError = await readJson<ApiError>(response)
  return typeof apiError?.error === 'string'
    ? apiError.error
    : apiError?.error?.message ?? 'ネットワークエラー'
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

export const apiDownload = async (
  url: string,
  options: ApiRequestOptions = {}
): Promise<Blob> => {
  const { fullUrl, init } = prepareRequest(url, options)
  const response = await fetch(fullUrl, init)

  if (!response.ok) {
    const message = await parseErrorMessage(response)
    throw new ApiRequestError(message, response.status)
  }

  return response.blob()
}

export const apiGet = async <T,>(url: string, options?: Omit<ApiRequestOptions, 'method'>) =>
  apiRequest<T>(url, { ...options, method: 'GET' })

export const apiSend = async <T, B = unknown>(
  url: string,
  method: 'POST' | 'PATCH' | 'DELETE',
  body?: B,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
) => apiRequest<T>(url, { ...options, method, body })
