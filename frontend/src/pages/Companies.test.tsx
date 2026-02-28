import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import Companies from './Companies'
import { AuthProvider } from '../contexts/AuthContext'
import { clearAuthToken, setAuthToken } from '../lib/authToken'
import { createUser } from '../test/msw/factory'
import { server } from '../test/msw/server'

type CompanyItem = {
  id: string
  name: string
  status: string
  tags: string[]
  ownerIds: string[]
}

type SetupCompaniesHandlersOptions = {
  initialCompanies?: CompanyItem[]
  failChatworkLink?: boolean
}

const renderCompaniesPage = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <Companies />
      </AuthProvider>
    </MemoryRouter>
  )

const setupCompaniesHandlers = ({
  initialCompanies = [{ id: 'c1', name: 'Acme', status: 'active', tags: [], ownerIds: [] }],
  failChatworkLink = false,
}: SetupCompaniesHandlersOptions = {}) => {
  let companies = initialCompanies.map((item) => ({ ...item }))
  let hasSearchQueryCall = false
  let createdCompanyId = 0

  server.use(
    http.get('/api/auth/me', () =>
      HttpResponse.json({
        user: createUser({
          id: 'u-admin',
          email: 'admin@example.com',
          role: 'admin',
          name: '管理者',
        }),
      })
    ),
    http.get('/api/users/options', () => HttpResponse.json({ users: [] })),
    http.get('/api/companies/options', () =>
      HttpResponse.json({ categories: ['カテゴリA'], statuses: ['active'], tags: ['VIP'] })
    ),
    http.get('/api/chatwork/rooms', () =>
      HttpResponse.json({
        rooms: [{ id: 'r1', roomId: '100', name: '営業ルーム', description: '' }],
      })
    ),
    http.get('/api/companies', ({ request }) => {
      const url = new URL(request.url)
      const q = url.searchParams.get('q')?.trim() ?? ''
      if (q) {
        hasSearchQueryCall = true
      }
      const filtered = q
        ? companies.filter((company) => company.name.toLowerCase().includes(q.toLowerCase()))
        : companies
      return HttpResponse.json({
        items: filtered,
        pagination: { page: 1, pageSize: 20, total: filtered.length },
      })
    }),
    http.post('/api/companies', async ({ request }) => {
      const payload = (await request.json()) as { name?: string }
      const name = payload.name?.trim() ?? ''
      createdCompanyId += 1
      const created = {
        id: `c-new-${createdCompanyId}`,
        name,
        status: 'active',
        tags: [],
        ownerIds: [],
      }
      companies = [created, ...companies]
      return HttpResponse.json({ company: created }, { status: 201 })
    }),
    http.post('/api/companies/:id/chatwork-rooms', () => {
      if (failChatworkLink) {
        return HttpResponse.json(
          { error: '企業は作成されましたが、Chatwork連携に失敗しました。' },
          { status: 500 }
        )
      }
      return HttpResponse.json({ linked: true })
    })
  )

  return {
    hasSearchQueryCall: () => hasSearchQueryCall,
  }
}

describe('企業一覧ページ', () => {
  beforeEach(() => {
    setAuthToken('test-token')
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('企業一覧APIから取得した企業を表示する', async () => {
    setupCompaniesHandlers()

    renderCompaniesPage()

    expect(await screen.findByText('Acme')).toBeInTheDocument()
  })

  it('検索フィルタを変更するとクエリ付きで再取得する', async () => {
    const user = userEvent.setup()
    const state = setupCompaniesHandlers()
    renderCompaniesPage()

    const searchInput = await screen.findByPlaceholderText('企業名で検索 (/ で移動)')
    await user.type(searchInput, 'Acme')

    await waitFor(() => {
      expect(state.hasSearchQueryCall()).toBe(true)
    })
  })

  it('企業作成成功後にChatwork連携が失敗した場合は情報トーストを表示する', async () => {
    const user = userEvent.setup()
    setupCompaniesHandlers({ failChatworkLink: true })

    renderCompaniesPage()

    await user.click(await screen.findByRole('button', { name: '企業を作成' }))
    await user.click(await screen.findByRole('button', { name: /営業ルーム/ }))
    await user.type(screen.getByPlaceholderText('企業名（必須）'), 'Acme')
    await user.click(screen.getByRole('button', { name: '登録' }))

    expect(
      await screen.findByText('企業は作成されましたが、Chatwork連携に失敗しました。')
    ).toBeInTheDocument()
  })
})
