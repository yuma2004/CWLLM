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

const buildResponse = (payload: unknown) =>
  Promise.resolve({
    ok: true,
    text: async () => JSON.stringify(payload),
    json: async () => payload,
  } as Response)

describe('CompanyDetail page', () => {
  const companyId = 'c1'

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', email: 'admin@example.com', role: 'admin' },
      login: vi.fn(async () => {}),
      logout: vi.fn(async () => {}),
      isLoading: false,
      isAuthenticated: true,
    })

    const baseCompany = {
      id: companyId,
      name: 'Acme',
      status: 'active',
      tags: [],
    }

    mockFetch.mockImplementation((input, init) => {
      const url =
        typeof input === 'string' ? input : input instanceof Request ? input.url : input.toString()

      if (url === `/api/companies/${companyId}`) {
        return buildResponse({ company: baseCompany })
      }
      if (url === `/api/companies/${companyId}/contacts`) {
        return buildResponse({ contacts: [] })
      }
      if (url.startsWith(`/api/companies/${companyId}/messages`)) {
        return buildResponse({
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
      }
      if (url.startsWith('/api/messages/search')) {
        return buildResponse({
          items: [
            {
              id: 'm1',
              roomId: 'room-1',
              messageId: '10',
              sender: 'sender',
              body: 'search hit',
              sentAt: new Date().toISOString(),
              labels: [],
            },
          ],
          pagination: { page: 1, pageSize: 20, total: 1 },
        })
      }
      if (url === `/api/companies/${companyId}/chatwork-rooms`) {
        return buildResponse({ rooms: [] })
      }
      if (url === '/api/users/options') {
        return buildResponse({ users: [] })
      }
      if (url.startsWith(`/api/companies/${companyId}/tasks`)) {
        return buildResponse({
          items: [],
          pagination: { page: 1, pageSize: 20, total: 0 },
        })
      }
      if (url === `/api/companies/${companyId}/summaries`) {
        return buildResponse({ summaries: [] })
      }
      if (url === `/api/companies/${companyId}/projects`) {
        return buildResponse({ projects: [] })
      }
      if (url === `/api/companies/${companyId}/wholesales`) {
        return buildResponse({ wholesales: [] })
      }
      if (url === '/api/messages/m1/labels' && init?.method === 'POST') {
        return buildResponse({ message: { id: 'm1', labels: ['VIP'] } })
      }

      return buildResponse({})
    })

    globalThis.fetch = mockFetch as unknown as typeof fetch
  })

  it('shows validation error when contact name is empty', async () => {
    render(
      <MemoryRouter initialEntries={['/companies/c1']}>
        <Routes>
          <Route path="/companies/:id" element={<CompanyDetail />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Acme' })).toBeInTheDocument()
    })

    const contactHeading = await screen.findByRole('heading', { name: '担当者' })
    const contactHeader = contactHeading.closest('div')
    if (!contactHeader) {
      throw new Error('Contact header not found')
    }
    const toggleButton = within(contactHeader).getByRole('button')
    fireEvent.click(toggleButton)

    const nameInput = await screen.findByLabelText('担当者名（必須）')
    const form = nameInput.closest('form')
    if (!form) {
      throw new Error('Contact form not found')
    }
    fireEvent.submit(form)

    expect(await screen.findByText('担当者名は必須です')).toBeInTheDocument()
  })

  it('calls search endpoint when query is set', async () => {
    render(
      <MemoryRouter initialEntries={['/companies/c1']}>
        <Routes>
          <Route path="/companies/:id" element={<CompanyDetail />} />
        </Routes>
      </MemoryRouter>
    )

    const timelineTab = await screen.findByRole('button', { name: /タイムライン/ })
    fireEvent.click(timelineTab)

    const searchInput = await screen.findByPlaceholderText('本文検索')
    fireEvent.change(searchInput, { target: { value: 'search' } })

    await waitFor(() => {
      const hasSearchCall = mockFetch.mock.calls.some(([url]) =>
        typeof url === 'string' ? url.includes('/api/messages/search') : false
      )
      expect(hasSearchCall).toBe(true)
    })
  })

  it('posts label assignment for a message', async () => {
    render(
      <MemoryRouter initialEntries={['/companies/c1']}>
        <Routes>
          <Route path="/companies/:id" element={<CompanyDetail />} />
        </Routes>
      </MemoryRouter>
    )

    const timelineTab = await screen.findByRole('button', { name: /タイムライン/ })
    fireEvent.click(timelineTab)

    const labelInputs = await screen.findAllByPlaceholderText('ラベルを追加')
    const labelInput = labelInputs[labelInputs.length - 1]
    fireEvent.change(labelInput, { target: { value: 'VIP' } })

    const labelRow = labelInput.closest('div')
    if (!labelRow) {
      throw new Error('Label input row not found')
    }
    fireEvent.click(within(labelRow).getByRole('button', { name: '追加' }))

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
