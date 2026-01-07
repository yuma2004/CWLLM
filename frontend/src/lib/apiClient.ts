import { ApiError } from '../types'

type ApiRequestOptions = {
  method?: string
  body?: unknown
  headers?: HeadersInit
  signal?: AbortSignal
}

// API ベースURL（本番環境では環境変数から取得）
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

const buildUrl = (path: string): string => {
  // 絶対URLの場合はそのまま返す
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  // ベースURLがある場合は結合
  if (API_BASE_URL) {
    return `${API_BASE_URL}${path}`
  }
  // 開発環境ではそのまま（Vite proxy経由）
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

export const apiRequest = async <T,>(
  url: string,
  { method = 'GET', body, headers, signal }: ApiRequestOptions = {}
): Promise<T> => {
  const fullUrl = buildUrl(url)
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

  const response = await fetch(fullUrl, {
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
        : apiError?.error?.message ?? 'ネットワークエラー'
    throw new Error(message)
  }

  return responseData as T
}

export const apiDownload = async (
  url: string,
  { method = 'GET', body, headers, signal }: ApiRequestOptions = {}
): Promise<Blob> => {
  const fullUrl = buildUrl(url)
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

  const response = await fetch(fullUrl, {
    method,
    credentials: 'include',
    headers: requestHeaders,
    body: requestBody,
    signal,
  })

  if (!response.ok) {
    const apiError = await readJson<ApiError>(response)
    const message =
      typeof apiError?.error === 'string'
        ? apiError.error
        : apiError?.error?.message ?? 'ネットワークエラー'
    throw new Error(message)
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
