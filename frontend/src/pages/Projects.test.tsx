import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Projects from './Projects'
import { AuthProvider } from '../contexts/AuthContext'
import { clearAuthToken, setAuthToken } from '../lib/authToken'

const mockFetch = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()

type JsonObject = Record<string, unknown>

type ProjectRole = 'admin' | 'employee' | 'viewer'

type SetupProjectsMockOptions = {
  role?: ProjectRole
  initialProjects?: Array<{
    id: string
    name: string
    companyId: string
    status: string
    unitPrice: number
    ownerId: string | null
    company?: { id: string; name: string }
  }>
}

const createJsonResponse = (payload: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(payload),
    json: async () => payload,
  }) as Response

const parseBody = (init?: RequestInit): JsonObject => {
  if (!init?.body || typeof init.body !== 'string') return {}
  const parsed = JSON.parse(init.body) as unknown
  if (typeof parsed !== 'object' || parsed === null) return {}
  return parsed as JsonObject
}

const readString = (record: JsonObject, key: string): string | undefined => {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

const setupProjectsMock = ({
  role = 'admin',
  initialProjects = [
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
}: SetupProjectsMockOptions = {}) => {
  const users = [
    { id: 'u-1', name: '担当 太郎', email: 'owner@example.com' },
    { id: 'u-2', name: '担当 花子', email: 'owner2@example.com' },
  ]
  const companies = [
    { id: 'c-1', name: '株式会社ベータ' },
    { id: 'c-2', name: '株式会社アルファ' },
  ]
  let projects = initialProjects.map((item) => ({ ...item }))
  let createProjectCallCount = 0
  let updateOwnerCallCount = 0

  mockFetch.mockImplementation(async (input, init) => {
    const rawUrl = typeof input === 'string' ? input : input.url
    const url = new URL(rawUrl, 'http://localhost')
    const pathname = url.pathname
    const method = init?.method ?? (typeof input === 'string' ? 'GET' : input.method)

    if (pathname === '/api/auth/me' && method === 'GET') {
      return createJsonResponse({
        user: { id: 'u-admin', email: 'admin@example.com', role },
      })
    }

    if (pathname === '/api/users/options' && method === 'GET') {
      return createJsonResponse({ users })
    }

    if (pathname === '/api/companies/search' && method === 'GET') {
      const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
      const items = companies.filter((company) => company.name.toLowerCase().includes(q))
      return createJsonResponse({ items })
    }

    if (pathname.startsWith('/api/companies/') && method === 'GET') {
      const companyId = pathname.split('/').at(-1) ?? ''
      const company = companies.find((item) => item.id === companyId)
      return createJsonResponse({ company: company ?? null }, company ? 200 : 404)
    }

    if (pathname === '/api/projects' && method === 'GET') {
      const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
      const status = url.searchParams.get('status') ?? ''
      const companyId = url.searchParams.get('companyId') ?? ''
      const ownerId = url.searchParams.get('ownerId') ?? ''
      const page = Number(url.searchParams.get('page')) || 1
      const pageSize = Number(url.searchParams.get('pageSize')) || 20
      let filtered = projects
      if (q) {
        filtered = filtered.filter((project) => project.name.toLowerCase().includes(q))
      }
      if (status) {
        filtered = filtered.filter((project) => project.status === status)
      }
      if (companyId) {
        filtered = filtered.filter((project) => project.companyId === companyId)
      }
      if (ownerId) {
        filtered = filtered.filter((project) => (project.ownerId ?? '') === ownerId)
      }
      const start = (page - 1) * pageSize
      return createJsonResponse({
        items: filtered.slice(start, start + pageSize),
        pagination: { page, pageSize, total: filtered.length },
      })
    }

    if (pathname === '/api/projects' && method === 'POST') {
      createProjectCallCount += 1
      const body = parseBody(init)
      const companyId = readString(body, 'companyId')
      const company = companies.find((item) => item.id === companyId)
      const name = readString(body, 'name')?.trim() ?? ''
      if (!companyId || !name || !company) {
        return createJsonResponse({ error: 'invalid payload' }, 400)
      }
      const created = {
        id: `p-${projects.length + 1}`,
        name,
        companyId,
        status: readString(body, 'status') ?? 'active',
        unitPrice: Number(body.unitPrice ?? 0),
        ownerId: (readString(body, 'ownerId') ?? '') || null,
        company: { id: company.id, name: company.name },
      }
      projects = [created, ...projects]
      return createJsonResponse({ project: created }, 201)
    }

    if (pathname.startsWith('/api/projects/') && method === 'PATCH') {
      updateOwnerCallCount += 1
      const projectId = pathname.split('/').at(-1) ?? ''
      const body = parseBody(init)
      const ownerId = readString(body, 'ownerId')
      projects = projects.map((project) =>
        project.id === projectId
          ? { ...project, ownerId: ownerId === undefined ? project.ownerId : ownerId || null }
          : project
      )
      const updated = projects.find((project) => project.id === projectId)
      if (!updated) {
        return createJsonResponse({ error: 'not found' }, 404)
      }
      return createJsonResponse({ project: updated })
    }

    return createJsonResponse({})
  })

  return {
    getCreateProjectCallCount: () => createProjectCallCount,
    getUpdateOwnerCallCount: () => updateOwnerCallCount,
  }
}

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
    setupProjectsMock()

    // Act
    renderProjectsPage()

    // Assert
    expect(await screen.findByRole('heading', { name: '案件一覧' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Beta案件' })).toBeInTheDocument()
    expect(screen.getByText('株式会社ベータ')).toBeInTheDocument()
  })

  it('検索語を入力するとクエリ付きで再取得し一覧が更新される', async () => {
    // Arrange
    setupProjectsMock({
      initialProjects: [
        {
          id: 'p-1',
          name: 'Beta案件',
          companyId: 'c-1',
          status: 'active',
          unitPrice: 120000,
          ownerId: 'u-1',
          company: { id: 'c-1', name: '株式会社ベータ' },
        },
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

  it('案件作成フォームを未入力で送信するとエラー表示し作成APIを呼ばない', async () => {
    // Arrange
    const user = userEvent.setup()
    const state = setupProjectsMock()
    renderProjectsPage()

    // Act
    await user.click(await screen.findByRole('button', { name: '案件を作成' }))
    await user.click(screen.getByRole('button', { name: '作成' }))

    // Assert
    expect(await screen.findByText('企業と案件名は必須です。')).toBeInTheDocument()
    expect(state.getCreateProjectCallCount()).toBe(0)
  })

  it('案件を新規作成すると成功通知と一覧反映が行われる', async () => {
    // Arrange
    const user = userEvent.setup()
    setupProjectsMock()
    renderProjectsPage()

    // Act
    await user.click(await screen.findByRole('button', { name: '案件を作成' }))
    await user.type(screen.getByPlaceholderText('企業名で検索'), 'アルファ')
    await user.click(await screen.findByRole('button', { name: '株式会社アルファ' }))
    await user.type(screen.getByLabelText('案件名'), '新規Gamma案件')
    await user.click(screen.getByRole('button', { name: '作成' }))

    // Assert
    expect(await screen.findByText('案件を作成しました。')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: '新規Gamma案件' })).toBeInTheDocument()
  })

  it('担当者を変更すると更新通知と更新後の担当者が反映される', async () => {
    // Arrange
    const user = userEvent.setup()
    const state = setupProjectsMock()
    renderProjectsPage()
    const projectLink = await screen.findByRole('link', { name: 'Beta案件' })
    const row = projectLink.closest('tr')
    if (!row) {
      throw new Error('案件行が見つかりません。')
    }

    // Act
    await user.selectOptions(within(row).getByRole('combobox'), 'u-2')

    // Assert
    expect(await screen.findByText('担当者を更新しました。')).toBeInTheDocument()
    const refreshedRowLink = await screen.findByRole('link', { name: 'Beta案件' })
    const refreshedRow = refreshedRowLink.closest('tr')
    if (!refreshedRow) {
      throw new Error('更新後の案件行が見つかりません。')
    }
    expect(within(refreshedRow).getByRole('combobox')).toHaveValue('u-2')
    expect(state.getUpdateOwnerCallCount()).toBeGreaterThan(0)
  })

  it('閲覧専用ユーザーは作成と担当者変更UIが表示されない', async () => {
    // Arrange
    setupProjectsMock({ role: 'viewer' })

    // Act
    renderProjectsPage()

    // Assert
    expect(
      await screen.findByText('権限がないため、案件の作成や担当者変更はできません。')
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '案件を作成' })).not.toBeInTheDocument()
    const projectLink = await screen.findByRole('link', { name: 'Beta案件' })
    const row = projectLink.closest('tr')
    if (!row) {
      throw new Error('案件行が見つかりません。')
    }
    expect(within(row).queryByRole('combobox')).not.toBeInTheDocument()
  })
})
