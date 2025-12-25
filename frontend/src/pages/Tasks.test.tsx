import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Tasks from './Tasks'
import { useAuth } from '../contexts/AuthContext'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)
const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()

const queueResponse = (payload: unknown) =>
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => payload,
  } as Response)

describe('Tasks page', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'admin@example.com', role: 'admin' },
      login: vi.fn(async () => {}),
      logout: vi.fn(async () => {}),
      isLoading: false,
      isAuthenticated: true,
    })
    mockFetch.mockReset()
    globalThis.fetch = mockFetch as unknown as typeof fetch
  })

  it('renders tasks from API', async () => {
    queueResponse({
      items: [
        {
          id: 't1',
          title: 'Follow up',
          status: 'todo',
          targetType: 'company',
          targetId: 'c1',
          dueDate: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, pageSize: 50, total: 1 },
    })
    queueResponse({ task: { id: 't1', status: 'done' } })
    queueResponse({
      items: [
        {
          id: 't1',
          title: 'Follow up',
          status: 'done',
          targetType: 'company',
          targetId: 'c1',
          dueDate: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, pageSize: 50, total: 1 },
    })

    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Follow up')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByDisplayValue('todo'), { target: { value: 'done' } })

    await waitFor(() => {
      const hasPatch = mockFetch.mock.calls.some(
        ([url, options]) =>
          url === '/api/tasks/t1' &&
          typeof options === 'object' &&
          options !== null &&
          'method' in options &&
          options.method === 'PATCH'
      )
      expect(hasPatch).toBe(true)
    })
  })
})
