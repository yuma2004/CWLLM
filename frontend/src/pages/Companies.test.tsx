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
        { id: 'c1', name: 'Acme', status: 'active', tags: [], ownerId: null },
      ],
      pagination: { page: 1, pageSize: 20, total: 1 },
    })

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
    queueResponse({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0 },
    })

    render(
      <MemoryRouter>
        <Companies />
      </MemoryRouter>
    )

    const searchInput = await screen.findByPlaceholderText('企業名で検索')
    fireEvent.change(searchInput, { target: { value: 'Acme' } })

    await waitFor(() => {
      const companyCalls = mockFetch.mock.calls.filter(
        ([url]) => typeof url === 'string' && (url as string).startsWith('/api/companies')
      )
      expect(companyCalls.length).toBeGreaterThanOrEqual(2)
    })

    const searchCall = mockFetch.mock.calls
      .map(([url]) => url as string)
      .find((url) => url.includes('/api/companies') && url.includes('q=Acme'))

    expect(searchCall).toBeTruthy()
  })
})
