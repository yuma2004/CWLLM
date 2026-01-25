import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Tasks from './Tasks'
import { useAuth } from '../contexts/AuthContext'

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
    const initialTasks = {
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
      pagination: { page: 1, pageSize: 20, total: 1 },
    }
    const updatedTasks = {
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
      pagination: { page: 1, pageSize: 20, total: 1 },
    }

    let taskFetchCount = 0
    mockFetch.mockImplementation((input, init) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString()
      if (url === '/api/users/options') {
        return buildResponse({ users: [] })
      }
      if (url === '/api/tasks/t1' && init?.method === 'PATCH') {
        return buildResponse({ task: { id: 't1', status: 'done' } })
      }
      if (url.startsWith('/api/me/tasks')) {
        taskFetchCount += 1
        return buildResponse(taskFetchCount === 1 ? initialTasks : updatedTasks)
      }
      return buildResponse({})
    })

    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    )

    const titleCell = await screen.findByText('Follow up')
    const row = titleCell.closest('tr')
    if (!row) {
      throw new Error('Task row not found')
    }
    const statusTrigger = within(row).getByText('未対応')
    fireEvent.click(statusTrigger)
    const statusSelect = within(row).getByLabelText('ステータス')
    fireEvent.change(statusSelect, { target: { value: 'done' } })

    await waitFor(() => {
      const calls = mockFetch.mock.calls.map(([input, options]) => {
        const url =
          typeof input === 'string'
            ? input
            : input instanceof Request
              ? input.url
              : input.toString()
        return { url, method: options?.method }
      })
      const hasPatch = calls.some(
        (call) => call.url === '/api/tasks/t1' && call.method === 'PATCH'
      )
      expect(hasPatch).toBe(true)
    })
  })

  it('requests targetType filter', async () => {
    mockFetch.mockImplementation((input) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString()
      if (url === '/api/users/options') {
        return buildResponse({ users: [] })
      }
      if (url.startsWith('/api/me/tasks')) {
        return buildResponse({
          items: [],
          pagination: { page: 1, pageSize: 20, total: 0 },
        })
      }
      return buildResponse({})
    })

    render(
      <MemoryRouter>
        <Tasks />
      </MemoryRouter>
    )

    const filterButton = screen.getByText('フィルター')
    fireEvent.click(filterButton)
    const targetTypeSelect = screen.getByLabelText('対象で絞り込み')
    fireEvent.change(targetTypeSelect, { target: { value: 'company' } })

    await waitFor(() => {
      const hasTargetType = mockFetch.mock.calls.some(([url]) =>
        typeof url === 'string' ? url.includes('targetType=company') : false
      )
      expect(hasTargetType).toBe(true)
    })
  })
})

