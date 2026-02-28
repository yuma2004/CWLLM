import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import Feedback from './Feedback'
import { AuthProvider } from '../contexts/AuthContext'
import { clearAuthToken, setAuthToken } from '../lib/authToken'
import { createUser } from '../test/msw/factory'
import { server } from '../test/msw/server'

type FeedbackItem = {
  id: string
  userId: string
  type: 'bug' | 'improvement' | 'other'
  title?: string | null
  message: string
  pageUrl?: string | null
  createdAt: string
  updatedAt: string
  user: {
    id: string
    email: string
    name?: string | null
  }
}

const renderFeedbackPage = () =>
  render(
    <MemoryRouter initialEntries={['/feedback']}>
      <AuthProvider>
        <Routes>
          <Route path="/feedback" element={<Feedback />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

const setupAuthHandler = () => {
  server.use(
    http.get('/api/auth/me', () =>
      HttpResponse.json({
        user: createUser({
          id: 'u1',
          email: 'admin@example.com',
          role: 'admin',
          name: '管理者',
        }),
      })
    )
  )
}

describe('フィードバックページ', () => {
  beforeEach(() => {
    setAuthToken('test-token')
    setupAuthHandler()
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('内容が空白のみで送信するとバリデーションエラーを表示する', async () => {
    const user = userEvent.setup()
    let postCalled = false
    server.use(
      http.get('/api/feedback', () => HttpResponse.json({ feedbacks: [] })),
      http.post('/api/feedback', () => {
        postCalled = true
        return HttpResponse.json({ feedback: { id: 'created-feedback' } }, { status: 201 })
      })
    )

    renderFeedbackPage()

    await user.type(await screen.findByLabelText('内容'), '   ')
    await user.click(screen.getByRole('button', { name: '送信する' }))

    expect(await screen.findByText('内容を入力してください')).toBeInTheDocument()
    expect(postCalled).toBe(false)
  })

  it('送信時に前後空白を除去したペイロードを保存する', async () => {
    const user = userEvent.setup()
    let submittedPayload: Record<string, unknown> | null = null
    server.use(
      http.get('/api/feedback', () => HttpResponse.json({ feedbacks: [] })),
      http.post('/api/feedback', async ({ request }) => {
        submittedPayload = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({ feedback: { id: 'created-feedback' } }, { status: 201 })
      })
    )

    renderFeedbackPage()

    await user.type(await screen.findByLabelText('タイトル（任意）'), '  新しいタイトル  ')
    await user.type(await screen.findByLabelText('内容'), '  送信メッセージ  ')
    await user.click(screen.getByRole('button', { name: '送信する' }))

    await waitFor(() => {
      expect(submittedPayload).not.toBeNull()
    })
    expect(submittedPayload?.type).toBe('bug')
    expect(submittedPayload?.title).toBe('新しいタイトル')
    expect(submittedPayload?.message).toBe('送信メッセージ')
    expect(typeof submittedPayload?.pageUrl).toBe('string')
    expect(
      await screen.findByText('フィードバックを送信しました。ありがとうございます。')
    ).toBeInTheDocument()
  })

  it('改善案を編集して保存すると一覧に反映される', async () => {
    const user = userEvent.setup()
    let improvements: FeedbackItem[] = [
      {
        id: 'f1',
        userId: 'u1',
        type: 'improvement',
        title: '改善案',
        message: '現状メッセージ',
        pageUrl: 'http://localhost/page',
        createdAt: new Date('2026-02-01T00:00:00.000Z').toISOString(),
        updatedAt: new Date('2026-02-01T00:00:00.000Z').toISOString(),
        user: {
          id: 'u1',
          email: 'admin@example.com',
          name: '管理者',
        },
      },
    ]
    server.use(
      http.get('/api/feedback', () => HttpResponse.json({ feedbacks: improvements })),
      http.patch('/api/feedback/:id', async ({ params, request }) => {
        const id = String(params.id)
        const payload = (await request.json()) as { title?: string; message?: string }
        improvements = improvements.map((item) =>
          item.id === id
            ? {
                ...item,
                title: payload.title ?? item.title,
                message: payload.message ?? item.message,
                updatedAt: new Date('2026-02-02T00:00:00.000Z').toISOString(),
              }
            : item
        )
        const updated = improvements.find((item) => item.id === id)
        return HttpResponse.json({ feedback: updated })
      })
    )

    renderFeedbackPage()

    await user.click(await screen.findByRole('button', { name: '編集する' }))
    const titleInputs = await screen.findAllByLabelText('タイトル（任意）')
    const messageInputs = await screen.findAllByLabelText('内容')
    await user.clear(titleInputs[titleInputs.length - 1])
    await user.type(titleInputs[titleInputs.length - 1], '更新タイトル')
    await user.clear(messageInputs[messageInputs.length - 1])
    await user.type(messageInputs[messageInputs.length - 1], '更新後メッセージ')
    await user.click(screen.getByRole('button', { name: '保存する' }))

    expect(await screen.findByText('改善案を更新しました。')).toBeInTheDocument()
    expect(await screen.findByText('更新タイトル')).toBeInTheDocument()
    expect(await screen.findByText('更新後メッセージ')).toBeInTheDocument()
  })
})
