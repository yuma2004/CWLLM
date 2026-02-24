import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Feedback from './Feedback'
import { useAuth } from '../contexts/AuthContext'
import { clearAuthToken, setAuthToken } from '../lib/authToken'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)
const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()

const buildResponse = (payload: unknown) =>
  Promise.resolve({
    ok: true,
    text: async () => JSON.stringify(payload),
    json: async () => payload,
  } as Response)

const feedbackItem = {
  id: 'f1',
  userId: 'u1',
  type: 'improvement' as const,
  title: '改善案',
  message: '現状メッセージ',
  pageUrl: 'http://localhost/page',
  createdAt: new Date('2026-02-01T00:00:00.000Z').toISOString(),
  updatedAt: new Date('2026-02-01T00:00:00.000Z').toISOString(),
  user: {
    id: 'u1',
    email: 'admin@example.com',
    name: 'Admin',
  },
}

describe('Feedback page', () => {
  beforeEach(() => {
    setAuthToken('test-token')
    mockUseAuth.mockReturnValue({
      user: { id: 'u1', email: 'admin@example.com', role: 'admin' },
      login: vi.fn(async () => {}),
      logout: vi.fn(async () => {}),
      isLoading: false,
      isAuthenticated: true,
    })
    mockFetch.mockReset()
    globalThis.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('validates message input before submit', async () => {
    mockFetch.mockImplementation((input) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString()
      if (url === '/api/feedback?type=improvement') {
        return buildResponse({ feedbacks: [] })
      }
      return buildResponse({})
    })

    render(<Feedback />)

    fireEvent.change(await screen.findByLabelText('内容'), {
      target: { value: '   ' },
    })
    fireEvent.click(await screen.findByRole('button', { name: '送信する' }))
    expect(await screen.findByText('内容を入力してください')).toBeInTheDocument()
  })

  it('submits trimmed feedback payload', async () => {
    mockFetch.mockImplementation((input, init) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString()
      if (url === '/api/feedback?type=improvement') {
        return buildResponse({ feedbacks: [] })
      }
      if (url === '/api/feedback' && init?.method === 'POST') {
        return buildResponse({ feedback: { id: 'created-feedback' } })
      }
      return buildResponse({})
    })

    render(<Feedback />)

    fireEvent.change(await screen.findByLabelText('タイトル（任意）'), {
      target: { value: '  新しいタイトル  ' },
    })
    fireEvent.change(await screen.findByLabelText('内容'), {
      target: { value: '  送信メッセージ  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: '送信する' }))

    await waitFor(() => {
      const postCall = mockFetch.mock.calls.find(
        ([url, init]) => url === '/api/feedback' && init?.method === 'POST'
      )
      expect(postCall).toBeTruthy()
      if (!postCall) return
      const [, init] = postCall
      const payload = JSON.parse(String(init?.body))
      expect(payload.type).toBe('bug')
      expect(payload.title).toBe('新しいタイトル')
      expect(payload.message).toBe('送信メッセージ')
      expect(typeof payload.pageUrl).toBe('string')
    })

    expect(
      await screen.findByText('フィードバックを送信しました。ありがとうございます。')
    ).toBeInTheDocument()
  })

  it('updates improvement item in place', async () => {
    mockFetch.mockImplementation((input, init) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString()
      if (url === '/api/feedback?type=improvement') {
        return buildResponse({ feedbacks: [feedbackItem] })
      }
      if (url === '/api/feedback/f1' && init?.method === 'PATCH') {
        return buildResponse({
          feedback: {
            ...feedbackItem,
            title: '更新タイトル',
            message: '更新後メッセージ',
            updatedAt: new Date('2026-02-02T00:00:00.000Z').toISOString(),
          },
        })
      }
      return buildResponse({})
    })

    render(<Feedback />)

    fireEvent.click(await screen.findByRole('button', { name: '編集する' }))
    const titleInputs = await screen.findAllByLabelText('タイトル（任意）')
    const messageInputs = await screen.findAllByLabelText('内容')
    fireEvent.change(titleInputs[titleInputs.length - 1], { target: { value: '更新タイトル' } })
    fireEvent.change(messageInputs[messageInputs.length - 1], {
      target: { value: '更新後メッセージ' },
    })
    fireEvent.click(screen.getByRole('button', { name: '保存する' }))

    await waitFor(() => {
      const patchCall = mockFetch.mock.calls.find(
        ([url, init]) => url === '/api/feedback/f1' && init?.method === 'PATCH'
      )
      expect(patchCall).toBeTruthy()
    })

    expect(await screen.findByText('改善案を更新しました。')).toBeInTheDocument()
  })
})
