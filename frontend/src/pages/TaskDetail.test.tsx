import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import TaskDetail from './TaskDetail'
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

describe('TaskDetail page', () => {
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

  it('shows readonly notice for non-writable role', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'u2', email: 'viewer@example.com', role: 'viewer' },
      login: vi.fn(async () => {}),
      logout: vi.fn(async () => {}),
      isLoading: false,
      isAuthenticated: true,
    })

    mockFetch.mockImplementation((input) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString()
      if (url === '/api/tasks/t1') {
        return buildResponse({
          task: {
            id: 't1',
            title: '閲覧専用タスク',
            status: 'todo',
            targetType: 'company',
            targetId: 'c1',
            dueDate: null,
          },
        })
      }
      if (url === '/api/users/options') {
        return buildResponse({ users: [] })
      }
      return buildResponse({})
    })

    render(
      <MemoryRouter initialEntries={['/tasks/t1']}>
        <Routes>
          <Route path="/tasks/:id" element={<TaskDetail />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: '閲覧専用タスク' })).toBeInTheDocument()
    expect(screen.getByText('権限がないため、タスクの編集・削除はできません。')).toBeInTheDocument()
  })

  it('validates title and sends patch update', async () => {
    let updated = false

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

    mockFetch.mockImplementation((input, init) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString()
      if (url === '/api/tasks/t1' && (!init?.method || init.method === 'GET')) {
        return buildResponse({ task: updated ? patchedTask : initialTask })
      }
      if (url === '/api/users/options') {
        return buildResponse({
          users: [{ id: 'u1', email: 'admin@example.com', name: 'Admin' }],
        })
      }
      if (url === '/api/tasks/t1' && init?.method === 'PATCH') {
        updated = true
        return buildResponse({ task: patchedTask })
      }
      return buildResponse({})
    })

    render(
      <MemoryRouter initialEntries={['/tasks/t1']}>
        <Routes>
          <Route path="/tasks/:id" element={<TaskDetail />} />
        </Routes>
      </MemoryRouter>
    )

    expect(await screen.findByRole('heading', { name: 'Follow up' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '編集' }))

    const titleInput = await screen.findByPlaceholderText('タスクのタイトル')
    fireEvent.change(titleInput, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))
    expect(await screen.findByText('タイトルは必須です')).toBeInTheDocument()

    fireEvent.change(titleInput, { target: { value: 'Updated title' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => {
      const patchCall = mockFetch.mock.calls.find(
        ([url, init]) => url === '/api/tasks/t1' && init?.method === 'PATCH'
      )
      expect(patchCall).toBeTruthy()
      if (!patchCall) return
      const [, init] = patchCall
      const payload = JSON.parse(String(init?.body))
      expect(payload.title).toBe('Updated title')
    })
  })
})
