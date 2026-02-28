import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import CompanyDetail from './CompanyDetail'
import { AuthProvider } from '../contexts/AuthContext'
import { clearAuthToken, setAuthToken } from '../lib/authToken'
import { createProject, createUser, createWholesale } from '../test/msw/factory'
import { server } from '../test/msw/server'
import type { Contact, MessageItem, Project, Summary, Wholesale } from '../types'

type JsonObject = Record<string, unknown>

type SetupCompanyDetailHandlersOptions = {
  role?: string
  failReorder?: boolean
  contacts?: Contact[]
  messages?: MessageItem[]
  projects?: Project[]
  wholesales?: Wholesale[]
  summaries?: Summary[]
}

const parseBody = async (request: Request): Promise<JsonObject> => {
  const raw = await request.json().catch(() => null)
  if (typeof raw !== 'object' || raw === null) return {}
  return raw as JsonObject
}

const readString = (record: JsonObject, key: string): string | undefined => {
  const value = record[key]
  return typeof value === 'string' ? value : undefined
}

const readNullableString = (record: JsonObject, key: string): string | null | undefined => {
  const value = record[key]
  if (value === null) return null
  return typeof value === 'string' ? value : undefined
}

const readStringArray = (record: JsonObject, key: string): string[] | undefined => {
  const value = record[key]
  if (!Array.isArray(value)) return undefined
  if (!value.every((item) => typeof item === 'string')) return undefined
  return value as string[]
}

const companyId = 'c1'

const renderCompanyDetailPage = () =>
  render(
    <MemoryRouter initialEntries={[`/companies/${companyId}`]}>
      <AuthProvider>
        <Routes>
          <Route path="/companies/:id" element={<CompanyDetail />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

const setupCompanyDetailHandlers = ({
  role = 'admin',
  failReorder = false,
  contacts: initialContacts = [],
  messages: initialMessages = [
    {
      id: 'm1',
      roomId: 'room-1',
      messageId: '10',
      sender: 'sender',
      body: 'label target',
      sentAt: '2026-02-01T10:00:00.000Z',
      labels: [],
      companyId,
    },
  ],
  projects = [
    createProject({
      id: 'project-1',
      companyId,
      name: '企業案件A',
      company: { id: companyId, name: 'Acme' },
      unitPrice: 120000,
    }),
  ],
  wholesales = [
    createWholesale({
      id: 'wholesale-1',
      projectId: 'project-1',
      project: {
        id: 'project-1',
        name: '卸案件A',
        company: { id: companyId, name: 'Acme' },
      },
      companyId,
      company: { id: companyId, name: 'Acme' },
    }),
  ],
  summaries = [
    {
      id: 'summary-1',
      content: '週次サマリー本文',
      type: 'manual',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      sourceLinks: ['https://example.com/source'],
      createdAt: '2026-02-01T00:00:00.000Z',
    },
  ],
}: SetupCompanyDetailHandlersOptions = {}) => {
  const company = {
    id: companyId,
    name: 'Acme',
    status: 'active',
    tags: [],
  }
  let contacts = initialContacts.map((contact) => ({ ...contact }))
  let messages = initialMessages.map((message) => ({ ...message }))
  let messageSearchCallCount = 0

  server.use(
    http.get('/api/auth/me', () => {
      return HttpResponse.json({
        user: createUser({
          id: 'user-1',
          email: 'admin@example.com',
          role,
          name: '管理者',
        }),
      })
    }),
    http.get('/api/companies/options', () => {
      return HttpResponse.json({ categories: [], statuses: [], tags: [] })
    }),
    http.get('/api/messages/labels', () => {
      return HttpResponse.json({ items: [{ label: 'VIP' }] })
    }),
    http.get('/api/users/options', () => {
      return HttpResponse.json({ users: [createUser({ id: 'user-1', role: 'admin' })] })
    }),
    http.get('/api/companies/:id', ({ params }) => {
      if (String(params.id) !== companyId) {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }
      return HttpResponse.json({ company })
    }),
    http.get('/api/companies/:id/contacts', ({ params }) => {
      if (String(params.id) !== companyId) {
        return HttpResponse.json({ contacts: [] })
      }
      return HttpResponse.json({ contacts })
    }),
    http.post('/api/companies/:id/contacts', async ({ params, request }) => {
      if (String(params.id) !== companyId) {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }
      const body = await parseBody(request)
      const name = readString(body, 'name')?.trim() ?? ''
      if (!name) {
        return HttpResponse.json({ error: 'name is required' }, { status: 400 })
      }
      const created: Contact = {
        id: `contact-${contacts.length + 1}`,
        name,
        role: readString(body, 'role') ?? null,
        email: readString(body, 'email') ?? null,
        phone: readString(body, 'phone') ?? null,
        memo: readString(body, 'memo') ?? null,
      }
      contacts = [...contacts, created]
      return HttpResponse.json({ contact: created }, { status: 201 })
    }),
    http.patch('/api/contacts/:id', async ({ params, request }) => {
      const contactId = String(params.id)
      const body = await parseBody(request)
      contacts = contacts.map((contact) =>
        contact.id === contactId
          ? {
              ...contact,
              name: readString(body, 'name') ?? contact.name,
              role: readNullableString(body, 'role') ?? contact.role,
              email: readNullableString(body, 'email') ?? contact.email,
              phone: readNullableString(body, 'phone') ?? contact.phone,
              memo: readNullableString(body, 'memo') ?? contact.memo,
            }
          : contact
      )
      const updated = contacts.find((contact) => contact.id === contactId)
      if (!updated) {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }
      return HttpResponse.json({ contact: updated })
    }),
    http.delete('/api/contacts/:id', ({ params }) => {
      const contactId = String(params.id)
      contacts = contacts.filter((contact) => contact.id !== contactId)
      return new HttpResponse(null, { status: 204 })
    }),
    http.patch('/api/companies/:id/contacts/reorder', async ({ params, request }) => {
      if (String(params.id) !== companyId) {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }
      if (failReorder) {
        return new HttpResponse(null, { status: 500 })
      }
      const body = await parseBody(request)
      const orderedIds = readStringArray(body, 'orderedIds') ?? []
      const orderedContacts = orderedIds
        .map((id) => contacts.find((contact) => contact.id === id))
        .filter((contact): contact is Contact => Boolean(contact))
      if (orderedContacts.length === contacts.length) {
        contacts = orderedContacts
      }
      return HttpResponse.json({ contacts })
    }),
    http.get('/api/companies/:id/messages', ({ params, request }) => {
      if (String(params.id) !== companyId) {
        return HttpResponse.json({ items: [], pagination: { page: 1, pageSize: 20, total: 0 } })
      }
      const url = new URL(request.url)
      const page = Number(url.searchParams.get('page')) || 1
      const pageSize = Number(url.searchParams.get('pageSize')) || 30
      return HttpResponse.json({
        items: messages,
        pagination: { page, pageSize, total: messages.length },
      })
    }),
    http.get('/api/messages/search', ({ request }) => {
      messageSearchCallCount += 1
      const url = new URL(request.url)
      const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
      const filtered = messages.filter((message) =>
        message.body.toLowerCase().includes(q)
      )
      return HttpResponse.json({
        items: filtered,
        pagination: { page: 1, pageSize: 30, total: filtered.length },
      })
    }),
    http.post('/api/messages/:id/labels', async ({ params, request }) => {
      const messageId = String(params.id)
      const body = await parseBody(request)
      const label = readString(body, 'label')?.trim()
      if (!label) {
        return HttpResponse.json({ error: 'label is required' }, { status: 400 })
      }
      messages = messages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              labels: Array.from(new Set([...(message.labels ?? []), label])),
            }
          : message
      )
      const updated = messages.find((message) => message.id === messageId)
      return HttpResponse.json({ message: updated })
    }),
    http.delete('/api/messages/:id/labels/:label', ({ params }) => {
      const messageId = String(params.id)
      const label = decodeURIComponent(String(params.label))
      messages = messages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              labels: (message.labels ?? []).filter((item) => item !== label),
            }
          : message
      )
      return new HttpResponse(null, { status: 204 })
    }),
    http.get('/api/companies/:id/projects', ({ params }) => {
      if (String(params.id) !== companyId) {
        return HttpResponse.json({ projects: [] })
      }
      return HttpResponse.json({ projects })
    }),
    http.get('/api/companies/:id/wholesales', ({ params }) => {
      if (String(params.id) !== companyId) {
        return HttpResponse.json({ wholesales: [] })
      }
      return HttpResponse.json({ wholesales })
    }),
    http.get('/api/companies/:id/summaries', ({ params }) => {
      if (String(params.id) !== companyId) {
        return HttpResponse.json({ summaries: [] })
      }
      return HttpResponse.json({ summaries })
    }),
    http.get('/api/companies/:id/tasks', ({ params }) => {
      if (String(params.id) !== companyId) {
        return HttpResponse.json({ items: [], pagination: { page: 1, pageSize: 20, total: 0 } })
      }
      return HttpResponse.json({ items: [], pagination: { page: 1, pageSize: 20, total: 0 } })
    }),
    http.get('/api/companies/:id/chatwork-rooms', ({ params }) => {
      if (String(params.id) !== companyId) {
        return HttpResponse.json({ rooms: [] })
      }
      return HttpResponse.json({ rooms: [] })
    })
  )

  return {
    getMessageSearchCallCount: () => messageSearchCallCount,
  }
}

describe('企業詳細ページ', () => {
  beforeEach(() => {
    setAuthToken('test-token')
    window.location.hash = ''
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('連絡先名が未入力で追加するとバリデーションエラーを表示する', async () => {
    // Arrange
    const user = userEvent.setup()
    setupCompanyDetailHandlers()
    renderCompanyDetailPage()
    await screen.findByRole('heading', { name: 'Acme' })

    // Act
    await user.click(await screen.findByRole('button', { name: '追加' }))
    const dialog = await screen.findByRole('dialog', { name: '担当者を追加' })
    await user.type(within(dialog).getByLabelText('担当者名（必須）'), '   ')
    await user.click(within(dialog).getByRole('button', { name: '追加' }))

    // Assert
    expect(await screen.findByText('担当者名は必須です')).toBeInTheDocument()
  })

  it('本文検索を入力すると検索APIで再取得される', async () => {
    // Arrange
    const user = userEvent.setup()
    const state = setupCompanyDetailHandlers({
      messages: [
        {
          id: 'm1',
          roomId: 'room-1',
          messageId: '10',
          sender: 'sender',
          body: 'search hit message',
          sentAt: '2026-02-01T10:00:00.000Z',
          labels: [],
          companyId,
        },
      ],
    })
    renderCompanyDetailPage()

    // Act
    await user.click(await screen.findByRole('button', { name: /タイムライン/ }))
    await user.type(await screen.findByPlaceholderText('本文検索'), 'search')

    // Assert
    expect(await screen.findByText(/hit message/)).toBeInTheDocument()
    await waitFor(() => {
      expect(state.getMessageSearchCallCount()).toBeGreaterThan(0)
    })
  })

  it('メッセージにラベルを追加できる', async () => {
    // Arrange
    const user = userEvent.setup()
    setupCompanyDetailHandlers()
    renderCompanyDetailPage()

    // Act
    await user.click(await screen.findByRole('button', { name: /タイムライン/ }))
    const labelInput = await screen.findByPlaceholderText('ラベルを追加')
    await user.type(labelInput, 'VIP')
    const formRow = labelInput.closest('div')
    if (!formRow) {
      throw new Error('ラベル入力行が見つかりません。')
    }
    await user.click(within(formRow).getByRole('button', { name: '追加' }))

    // Assert
    expect(await screen.findByRole('button', { name: '#VIP' })).toBeInTheDocument()
  })

  it('メッセージのラベル削除が反映される', async () => {
    // Arrange
    const user = userEvent.setup()
    setupCompanyDetailHandlers({
      messages: [
        {
          id: 'm1',
          roomId: 'room-1',
          messageId: '10',
          sender: 'sender',
          body: 'label remove target',
          sentAt: '2026-02-01T10:00:00.000Z',
          labels: ['VIP'],
          companyId,
        },
      ],
    })
    renderCompanyDetailPage()

    // Act
    await user.click(await screen.findByRole('button', { name: /タイムライン/ }))
    await user.click(await screen.findByRole('button', { name: '#VIP' }))

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: '#VIP' })).not.toBeInTheDocument()
    })
  })

  it('重複連絡先の統合で重複データを削除し統合後データを保持する', async () => {
    // Arrange
    const user = userEvent.setup()
    setupCompanyDetailHandlers({
      contacts: [
        {
          id: 'contact-1',
          name: '重複連絡先A',
          role: '',
          email: 'dup@example.com',
          phone: '',
          memo: '統合後メモ',
        },
        {
          id: 'contact-2',
          name: '重複連絡先B',
          role: '営業',
          email: 'dup@example.com',
          phone: '03-0000-0000',
          memo: '',
        },
      ],
    })
    renderCompanyDetailPage()
    await screen.findByRole('heading', { name: 'Acme' })
    await user.click(screen.getByRole('button', { name: /概要/ }))
    expect(await screen.findByText('重複している担当者があります')).toBeInTheDocument()

    // Act
    await user.click(await screen.findByRole('button', { name: '重複を統合' }))
    const dialog = await screen.findByRole('dialog', { name: '重複している担当者を統合しますか？' })
    await user.click(within(dialog).getByRole('button', { name: '統合' }))

    // Assert
    expect(await screen.findByText('重複している担当者を統合しました')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByText('重複連絡先A')).not.toBeInTheDocument()
    })
    expect(screen.getByText('重複連絡先B')).toBeInTheDocument()
    expect(screen.getByText('統合後メモ')).toBeInTheDocument()
  })

  it('連絡先並び替え失敗時はエラー表示し順序を元に戻す', async () => {
    // Arrange
    const user = userEvent.setup()
    setupCompanyDetailHandlers({
      failReorder: true,
      contacts: [
        { id: 'contact-1', name: '担当者A', role: null, email: null, phone: null, memo: null },
        { id: 'contact-2', name: '担当者B', role: null, email: null, phone: null, memo: null },
      ],
    })
    renderCompanyDetailPage()
    await screen.findByRole('heading', { name: 'Acme' })
    await user.click(screen.getByRole('button', { name: /概要/ }))
    expect(await screen.findByText('担当者A')).toBeInTheDocument()

    // Act
    await user.click(await screen.findByRole('button', { name: '担当者Aを下へ移動' }))

    // Assert
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '担当者Aを上へ移動' })).toBeDisabled()
    })
  })

  it('案件・卸・サマリータブを切り替えて各データを表示できる', async () => {
    // Arrange
    const user = userEvent.setup()
    setupCompanyDetailHandlers()
    renderCompanyDetailPage()
    await screen.findByRole('heading', { name: 'Acme' })

    // Act
    await user.click(screen.getByRole('button', { name: /案件/ }))

    // Assert
    expect(await screen.findByRole('link', { name: '企業案件A' })).toBeInTheDocument()

    // Act
    await user.click(screen.getByRole('button', { name: /卸/ }))

    // Assert
    expect(await screen.findByRole('link', { name: '卸案件A' })).toBeInTheDocument()

    // Act
    await user.click(screen.getByRole('button', { name: /サマリー/ }))

    // Assert
    expect(await screen.findByText('参照: 1件')).toBeInTheDocument()
  })
})
