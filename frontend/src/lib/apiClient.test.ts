import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError, apiRequest } from './apiClient'

const createJsonResponse = (payload: unknown, status = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
  }) as Response

describe('APIクライアント', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('許可されていない絶対URLを拒否する', async () => {
    // Arrange
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    // Act & Assert
    await expect(apiRequest('https://example.invalid/api/tasks')).rejects.toThrow(
      'Absolute URL requests are not allowed in apiClient.'
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('Bearer認証時にトークンがない場合はリクエスト前に失敗する', async () => {
    // Arrange
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    // Act & Assert
    await expect(apiRequest('/api/secure', { authMode: 'bearer', authToken: null })).rejects.toThrow(
      '認証トークンがありません。再ログインしてください。'
    )
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('JSONボディ送信時にContent-Typeを自動設定する', async () => {
    // Arrange
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createJsonResponse({ ok: true }))

    // Act
    await apiRequest<{ ok: boolean }>('/api/tasks', {
      method: 'POST',
      body: { title: 'task' },
    })

    // Assert
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    const headers = new Headers(requestInit?.headers)
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('FormData送信時はContent-Typeを自動設定しない', async () => {
    // Arrange
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createJsonResponse({ ok: true }))
    const formData = new FormData()
    formData.append('file', new Blob(['sample'], { type: 'text/plain' }), 'sample.txt')

    // Act
    await apiRequest('/api/upload', {
      method: 'POST',
      body: formData,
    })

    // Assert
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined
    const headers = new Headers(requestInit?.headers)
    expect(headers.has('Content-Type')).toBe(false)
  })

  it('非2xx時はAPIエラーメッセージを優先してApiRequestErrorを投げる', async () => {
    // Arrange
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      createJsonResponse(
        {
          error: {
            code: 'E500',
            message: 'API側エラー',
          },
        },
        500
      )
    )

    // Act
    let thrownError: unknown = null
    try {
      await apiRequest('/api/fail')
    } catch (error) {
      thrownError = error
    }

    // Assert
    expect(thrownError).toBeInstanceOf(ApiRequestError)
    if (thrownError instanceof ApiRequestError) {
      expect(thrownError.message).toBe('API側エラー')
      expect(thrownError.status).toBe(500)
    }
  })
})
