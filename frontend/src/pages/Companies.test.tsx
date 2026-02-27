import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Companies from './Companies'
import { useAuth } from '../contexts/AuthContext'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

const mockUseAuth = vi.mocked(useAuth)

const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()

const queueResponse = (payload: unknown) =>
  mockFetch.mockResolvedValueOnce({
    ok: true,
    text: async () => JSON.stringify(payload),
    json: async () => payload,
  } as Response)

describe('Companies page', () => {
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

  it('renders company list from API', async () => {
    queueResponse({
      items: [
        { id: 'c1', name: 'Acme', status: 'active', tags: [], ownerIds: [] },
      ],
      pagination: { page: 1, pageSize: 20, total: 1 },
    })
    queueResponse({ categories: [], statuses: [], tags: [] })
    queueResponse({ users: [] })

    render(
      <MemoryRouter>
        <Companies />
      </MemoryRouter>
    )

    expect(await screen.findByText('Acme')).toBeInTheDocument()
  })

  it('updates API call when filters change', async () => {
    queueResponse({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0 },
    })
    queueResponse({
      categories: ['カテゴリA'],
      statuses: ['active'],
      tags: ['VIP'],
    })
    queueResponse({ users: [] })
    queueResponse({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0 },
    })

    render(
      <MemoryRouter>
        <Companies />
      </MemoryRouter>
    )

    const searchInput = await screen.findByPlaceholderText('企業名で検索 (/ で移動)')
    fireEvent.change(searchInput, { target: { value: 'Acme' } })

    await waitFor(() => {
      const searchCall = mockFetch.mock.calls
        .map(([url]) => url as string)
        .find((url) => url.includes('/api/companies') && url.includes('q=Acme'))

      expect(searchCall).toBeTruthy()
    })
  })

  it('shows info toast when company is created but Chatwork link fails', async () => {
    const jsonResponse = (payload: unknown, status = 200) =>
      ({
        ok: status >= 200 && status < 300,
        status,
        text: async () => JSON.stringify(payload),
        json: async () => payload,
      } as Response)

    mockFetch.mockImplementation(async (input, init) => {
      const url = String(input)
      const method = (init?.method || 'GET').toUpperCase()

      if (method === 'POST' && url.includes('/chatwork-rooms')) {
        return jsonResponse({ error: '企業は作成されましたが、Chatwork連携に失敗しました。' }, 500)
      }

      if (method === 'POST' && url.endsWith('/api/companies')) {
        return jsonResponse({
          company: { id: 'c-new', name: 'Acme', status: 'active', tags: [], ownerIds: [] },
        })
      }

      if (method === 'GET' && url.includes('/api/chatwork/rooms')) {
        return jsonResponse({
          rooms: [{ id: 'r1', roomId: '100', name: '営業ルーム', description: '' }],
        })
      }

      if (method === 'GET' && url.includes('/api/companies/options')) {
        return jsonResponse({ categories: [], statuses: [], tags: [] })
      }

      if (method === 'GET' && url.includes('/api/users/options')) {
        return jsonResponse({ users: [] })
      }

      if (method === 'GET' && url.includes('/api/companies')) {
        return jsonResponse({
          items: [{ id: 'c-new', name: 'Acme', status: 'active', tags: [], ownerIds: [] }],
          pagination: { page: 1, pageSize: 20, total: 1 },
        })
      }

      return jsonResponse({})
    })

    render(
      <MemoryRouter>
        <Companies />
      </MemoryRouter>
    )

    fireEvent.click(await screen.findByRole('button', { name: '企業を作成' }))
    fireEvent.click(await screen.findByText('営業ルーム'))
    fireEvent.change(screen.getByPlaceholderText('企業名（必須）'), {
      target: { value: 'Acme' },
    })
    fireEvent.click(screen.getByRole('button', { name: '登録' }))

    expect(await screen.findByText('企業は作成されましたが、Chatwork連携に失敗しました。')).toBeInTheDocument()
  })
})
