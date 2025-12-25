import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import CompanyDetail from './CompanyDetail'
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

describe('CompanyDetail page', () => {
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

  it('shows validation error when contact name is empty', async () => {
    queueResponse({
      company: {
        id: 'c1',
        name: 'Acme',
        status: 'active',
        tags: [],
      },
    })
    queueResponse({ contacts: [] })
    queueResponse({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0 },
    })
    queueResponse({ rooms: [] })

    render(
      <MemoryRouter initialEntries={['/companies/c1']}>
        <Routes>
          <Route path="/companies/:id" element={<CompanyDetail />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Acme')).toBeInTheDocument()
    })

    const contactHeading = await screen.findByRole('heading', { name: '担当者を追加' })
    const form = contactHeading.closest('form')
    if (!form) {
      throw new Error('Contact form not found')
    }
    const submitButton = within(form).getByRole('button', { name: '追加' })
    fireEvent.click(submitButton)

    expect(await screen.findByText('担当者名は必須です')).toBeInTheDocument()
    expect(mockFetch).toHaveBeenCalledTimes(4)
  })

  it('calls search endpoint when query is set', async () => {
    queueResponse({
      company: {
        id: 'c1',
        name: 'Acme',
        status: 'active',
        tags: [],
      },
    })
    queueResponse({ contacts: [] })
    queueResponse({
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0 },
    })
    queueResponse({ rooms: [] })
    queueResponse({
      items: [
        {
          id: 'm1',
          roomId: 'room-1',
          messageId: '10',
          sender: 'sender',
          body: 'search hit',
          sentAt: new Date().toISOString(),
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1 },
    })

    render(
      <MemoryRouter initialEntries={['/companies/c1']}>
        <Routes>
          <Route path="/companies/:id" element={<CompanyDetail />} />
        </Routes>
      </MemoryRouter>
    )

    const searchInput = await screen.findByPlaceholderText('本文検索')
    fireEvent.change(searchInput, { target: { value: 'search' } })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(5)
    })

    const lastCall = mockFetch.mock.calls[4][0] as string
    expect(lastCall).toContain('/api/messages/search')
  })

  it('posts label assignment for a message', async () => {
    queueResponse({
      company: {
        id: 'c1',
        name: 'Acme',
        status: 'active',
        tags: [],
      },
    })
    queueResponse({ contacts: [] })
    queueResponse({
      items: [
        {
          id: 'm1',
          roomId: 'room-1',
          messageId: '10',
          sender: 'sender',
          body: 'label target',
          sentAt: new Date().toISOString(),
          labels: [],
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1 },
    })
    queueResponse({ rooms: [] })
    queueResponse({ message: { id: 'm1', labels: ['VIP'] } })
    queueResponse({
      items: [
        {
          id: 'm1',
          roomId: 'room-1',
          messageId: '10',
          sender: 'sender',
          body: 'label target',
          sentAt: new Date().toISOString(),
          labels: ['VIP'],
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1 },
    })

    render(
      <MemoryRouter initialEntries={['/companies/c1']}>
        <Routes>
          <Route path="/companies/:id" element={<CompanyDetail />} />
        </Routes>
      </MemoryRouter>
    )

    const labelInputs = await screen.findAllByPlaceholderText('ラベル')
    fireEvent.change(labelInputs[labelInputs.length - 1], { target: { value: 'VIP' } })

    fireEvent.click(screen.getByRole('button', { name: 'ラベル追加' }))

    await waitFor(() => {
      const hasLabelPost = mockFetch.mock.calls.some(
        ([url, options]) =>
          url === '/api/messages/m1/labels' &&
          typeof options === 'object' &&
          options !== null &&
          'method' in options &&
          options.method === 'POST'
      )
      expect(hasLabelPost).toBe(true)
    })
  })
})
