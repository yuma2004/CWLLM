import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import TaskDetail from './TaskDetail'
import { AuthProvider } from '../contexts/AuthContext'
import { clearAuthToken, setAuthToken } from '../lib/authToken'
import { createUser } from '../test/msw/factory'
import { server } from '../test/msw/server'

type SetupTaskDetailHandlersOptions = {
  role?: string
}

const renderTaskDetailPage = () =>
  render(
    <MemoryRouter initialEntries={['/tasks/t1']}>
      <AuthProvider>
        <Routes>
          <Route path="/tasks/:id" element={<TaskDetail />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

const setupTaskDetailHandlers = ({ role = 'admin' }: SetupTaskDetailHandlersOptions = {}) => {
  let updatedPayload: Record<string, unknown> | null = null
  const initialTask = {
    id: 't1',
    title: 'Follow up',
    description: '詳細',
    status: 'todo',
    targetType: 'company',
    targetId: 'c1',
    dueDate: '2026-02-10T00:00:00.000Z',
    assigneeId: 'u1',
    assignee: {
      id: 'u1',
      email: 'admin@example.com',
      name: 'Admin',
    },
    target: {
      id: 'c1',
      type: 'company',
      name: 'Acme',
    },
  }
  const patchedTask = {
    ...initialTask,
    title: 'Updated title',
  }
  let isPatched = false

  server.use(
    http.get('/api/auth/me', () =>
      HttpResponse.json({
        user: createUser({
          id: 'u1',
          email: 'admin@example.com',
          role,
          name: role === 'viewer' ? '閲覧者' : '管理者',
        }),
      })
    ),
    http.get('/api/users/options', () =>
      HttpResponse.json({
        users: [{ id: 'u1', email: 'admin@example.com', name: 'Admin' }],
      })
    ),
    http.get('/api/tasks/:id', () => HttpResponse.json({ task: isPatched ? patchedTask : initialTask })),
    http.patch('/api/tasks/:id', async ({ request }) => {
      updatedPayload = (await request.json()) as Record<string, unknown>
      isPatched = true
      return HttpResponse.json({ task: patchedTask })
    })
  )

  return {
    getUpdatedPayload: () => updatedPayload,
  }
}

describe('タスク詳細ページ', () => {
  beforeEach(() => {
    setAuthToken('test-token')
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('書き込み権限がない場合は閲覧専用メッセージを表示する', async () => {
    setupTaskDetailHandlers({ role: 'viewer' })

    renderTaskDetailPage()

    expect(await screen.findByRole('heading', { name: 'Follow up' })).toBeInTheDocument()
    expect(screen.getByText('権限がないため、タスクの編集・削除はできません。')).toBeInTheDocument()
  })

  it('タイトル必須バリデーション後に更新リクエストを送信できる', async () => {
    const user = userEvent.setup()
    const state = setupTaskDetailHandlers({ role: 'admin' })

    renderTaskDetailPage()

    expect(await screen.findByRole('heading', { name: 'Follow up' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '編集' }))

    const titleInput = await screen.findByPlaceholderText('タスクのタイトル')
    await user.clear(titleInput)
    await user.type(titleInput, '   ')
    await user.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByText('タイトルは必須です')).toBeInTheDocument()

    await user.clear(titleInput)
    await user.type(titleInput, 'Updated title')
    await user.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(state.getUpdatedPayload()).not.toBeNull()
    })
    expect(state.getUpdatedPayload()?.title).toBe('Updated title')
  })
})
