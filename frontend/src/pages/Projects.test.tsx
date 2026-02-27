import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Projects from './Projects'
import { AuthProvider } from '../contexts/AuthContext'
import { clearAuthToken, setAuthToken } from '../lib/authToken'

const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()

const createJsonResponse = (payload: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
    json: async () => payload,
  }) as Response

const renderProjectsPage = () =>
  render(
    <MemoryRouter initialEntries={['/projects']}>
      <AuthProvider>
        <Projects />
      </AuthProvider>
    </MemoryRouter>
  )

describe('案件一覧ページ', () => {
  beforeEach(() => {
    setAuthToken('test-token')
    mockFetch.mockReset()
    globalThis.fetch = mockFetch as unknown as typeof fetch
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('案件一覧APIから取得した案件を表示できる', async () => {
    // Arrange
    mockFetch.mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/api/auth/me')) {
        return createJsonResponse({
          user: { id: 'u-admin', email: 'admin@example.com', role: 'admin' },
        })
      }
      if (url.includes('/api/users/options')) {
        return createJsonResponse({
          users: [{ id: 'u-1', name: '担当 太郎', email: 'owner@example.com' }],
        })
      }
      if (url.includes('/api/projects')) {
        return createJsonResponse({
          items: [
            {
              id: 'p-1',
              name: 'Beta案件',
              companyId: 'c-1',
              status: 'active',
              unitPrice: 120000,
              ownerId: 'u-1',
              company: { id: 'c-1', name: '株式会社ベータ' },
            },
          ],
          pagination: { page: 1, pageSize: 20, total: 1 },
        })
      }
      return createJsonResponse({})
    })

    // Act
    renderProjectsPage()

    // Assert
    expect(await screen.findByRole('heading', { name: '案件一覧' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Beta案件' })).toBeInTheDocument()
    expect(screen.getByText('株式会社ベータ')).toBeInTheDocument()
  })

  it('検索語を入力するとクエリ付きで再取得し一覧が更新される', async () => {
    // Arrange
    mockFetch.mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/api/auth/me')) {
        return createJsonResponse({
          user: { id: 'u-admin', email: 'admin@example.com', role: 'admin' },
        })
      }
      if (url.includes('/api/users/options')) {
        return createJsonResponse({
          users: [{ id: 'u-1', name: '担当 太郎', email: 'owner@example.com' }],
        })
      }
      if (url.includes('/api/projects')) {
        if (url.includes('q=Alpha')) {
          return createJsonResponse({
            items: [
              {
                id: 'p-2',
                name: 'Alpha案件',
                companyId: 'c-2',
                status: 'active',
                unitPrice: 90000,
                ownerId: 'u-1',
                company: { id: 'c-2', name: '株式会社アルファ' },
              },
            ],
            pagination: { page: 1, pageSize: 20, total: 1 },
          })
        }
        return createJsonResponse({
          items: [
            {
              id: 'p-1',
              name: 'Beta案件',
              companyId: 'c-1',
              status: 'active',
              unitPrice: 120000,
              ownerId: 'u-1',
              company: { id: 'c-1', name: '株式会社ベータ' },
            },
          ],
          pagination: { page: 1, pageSize: 20, total: 1 },
        })
      }
      return createJsonResponse({})
    })
    const user = userEvent.setup()
    renderProjectsPage()

    // Act
    await user.type(await screen.findByLabelText('検索'), 'Alpha')

    // Assert
    expect(await screen.findByRole('link', { name: 'Alpha案件' })).toBeInTheDocument()
    await waitFor(() => {
      const hasSearchCall = mockFetch.mock.calls
        .map(([url]) => String(url))
        .some((url) => url.includes('/api/projects') && url.includes('q=Alpha'))
      expect(hasSearchCall).toBe(true)
    })
  })
})
