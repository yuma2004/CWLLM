import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import ProjectDetail from './ProjectDetail'
import { AuthProvider } from '../contexts/AuthContext'
import { clearAuthToken, setAuthToken } from '../lib/authToken'
import { statusLabel } from '../constants/labels'
import { createProject, createUser, createWholesale } from '../test/msw/factory'
import { server } from '../test/msw/server'

type JsonObject = Record<string, unknown>

type ProjectDetailHandlersOptions = {
  role?: string
  failDeleteWholesale?: boolean
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

const readNullableNumber = (record: JsonObject, key: string): number | null | undefined => {
  const value = record[key]
  if (value === null) return null
  return typeof value === 'number' ? value : undefined
}

const renderProjectDetailPage = () =>
  render(
    <MemoryRouter initialEntries={['/projects/project-1']}>
      <AuthProvider>
        <Routes>
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects" element={<h1>案件一覧画面</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

const setupProjectDetailHandlers = ({
  role = 'admin',
  failDeleteWholesale = false,
}: ProjectDetailHandlersOptions = {}) => {
  const users = [
    createUser({
      id: 'user-1',
      role: 'admin',
      email: 'admin@example.com',
      name: '管理者',
    }),
    createUser({
      id: 'user-2',
      role: 'employee',
      email: 'member@example.com',
      name: '担当A',
    }),
  ]
  let project = createProject({
    id: 'project-1',
    name: 'Alphaプロジェクト',
    status: 'active',
    companyId: 'company-1',
    company: { id: 'company-1', name: 'テスト元請け' },
    ownerId: 'user-1',
    owner: { id: 'user-1', email: 'admin@example.com', name: '管理者' },
    unitPrice: 100000,
    conditions: '初期条件',
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31',
  })
  let wholesales = [
    createWholesale({
      id: 'wholesale-1',
      projectId: 'project-1',
      companyId: 'company-2',
      company: { id: 'company-2', name: 'テスト卸先' },
      status: 'active',
      unitPrice: 80000,
      conditions: '初期卸条件',
      agreedDate: '2026-02-01',
    }),
  ]
  let createWholesaleCallCount = 0
  let projectUpdateCallCount = 0
  let deleteWholesaleCallCount = 0

  server.use(
    http.get('/api/auth/me', () => {
      return HttpResponse.json({
        user: {
          ...users[0],
          role,
        },
      })
    }),
    http.get('/api/projects/:id', ({ params }) => {
      if (params.id !== project.id) {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }
      return HttpResponse.json({ project })
    }),
    http.get('/api/projects/:id/wholesales', ({ params }) => {
      if (params.id !== project.id) {
        return HttpResponse.json({ wholesales: [] })
      }
      return HttpResponse.json({ wholesales })
    }),
    http.get('/api/users/options', () => {
      return HttpResponse.json({ users })
    }),
    http.patch('/api/projects/:id', async ({ params, request }) => {
      if (params.id !== project.id) {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }
      projectUpdateCallCount += 1
      const body = await parseBody(request)
      project = {
        ...project,
        name: readString(body, 'name') ?? project.name,
        status: readString(body, 'status') ?? project.status,
        unitPrice: readNullableNumber(body, 'unitPrice') ?? project.unitPrice,
        conditions: readNullableString(body, 'conditions') ?? project.conditions,
        periodStart: readNullableString(body, 'periodStart') ?? project.periodStart,
        periodEnd: readNullableString(body, 'periodEnd') ?? project.periodEnd,
        ownerId: readNullableString(body, 'ownerId') ?? project.ownerId,
      }
      return HttpResponse.json({ project })
    }),
    http.post('/api/wholesales', async ({ request }) => {
      createWholesaleCallCount += 1
      const body = await parseBody(request)
      const companyId = readString(body, 'companyId')
      if (!companyId) {
        return HttpResponse.json({ error: 'company required' }, { status: 400 })
      }
      const createdWholesale = createWholesale({
        id: `wholesale-${wholesales.length + 1}`,
        projectId: readString(body, 'projectId') ?? project.id,
        companyId,
        company: { id: companyId, name: `Company ${companyId}` },
        status: readString(body, 'status') ?? 'active',
        unitPrice: readNullableNumber(body, 'unitPrice') ?? null,
        conditions: readString(body, 'conditions') ?? null,
        agreedDate: readString(body, 'agreedDate') ?? null,
      })
      wholesales = [...wholesales, createdWholesale]
      return HttpResponse.json({ wholesale: createdWholesale }, { status: 201 })
    }),
    http.patch('/api/wholesales/:id', async ({ params, request }) => {
      const body = await parseBody(request)
      const wholesaleId = String(params.id)
      wholesales = wholesales.map((item) =>
        item.id === wholesaleId
          ? {
              ...item,
              status: readString(body, 'status') ?? item.status,
              unitPrice: readNullableNumber(body, 'unitPrice') ?? item.unitPrice,
              conditions: readNullableString(body, 'conditions') ?? item.conditions,
              agreedDate: readNullableString(body, 'agreedDate') ?? item.agreedDate,
            }
          : item
      )
      const updated = wholesales.find((item) => item.id === wholesaleId)
      if (!updated) {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }
      return HttpResponse.json({ wholesale: updated })
    }),
    http.delete('/api/wholesales/:id', ({ params }) => {
      deleteWholesaleCallCount += 1
      if (failDeleteWholesale) {
        return new HttpResponse(null, { status: 500 })
      }
      const wholesaleId = String(params.id)
      wholesales = wholesales.filter((item) => item.id !== wholesaleId)
      return new HttpResponse(null, { status: 204 })
    })
  )

  return {
    getCreateWholesaleCallCount: () => createWholesaleCallCount,
    getProjectUpdateCallCount: () => projectUpdateCallCount,
    getDeleteWholesaleCallCount: () => deleteWholesaleCallCount,
  }
}

describe('案件詳細ページ', () => {
  beforeEach(() => {
    setAuthToken('test-token')
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('案件詳細を取得して案件情報と卸一覧が表示される', async () => {
    // Arrange
    setupProjectDetailHandlers()

    // Act
    renderProjectDetailPage()

    // Assert
    expect(await screen.findByRole('heading', { name: 'Alphaプロジェクト' })).toBeInTheDocument()
    expect(await screen.findByText('テスト卸先')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '編集' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '卸を追加' })).toBeInTheDocument()
  })

  it('案件編集で保存すると表示内容が更新される', async () => {
    // Arrange
    const user = userEvent.setup()
    setupProjectDetailHandlers()
    renderProjectDetailPage()
    await screen.findByRole('heading', { name: 'Alphaプロジェクト' })

    // Act
    const editButtons = screen.getAllByRole('button', { name: '編集' })
    await user.click(editButtons[0])
    const nameInput = screen.getByLabelText('案件名')
    await user.clear(nameInput)
    await user.type(nameInput, 'Betaプロジェクト')
    await user.selectOptions(screen.getByLabelText('ステータス'), 'paused')
    await user.click(screen.getByRole('button', { name: '保存' }))

    // Assert
    expect(await screen.findByRole('heading', { name: 'Betaプロジェクト' })).toBeInTheDocument()
    expect(screen.getByText(statusLabel('project', 'paused'))).toBeInTheDocument()
  })

  it('案件編集で案件名を空にして保存するとエラー表示し更新APIを呼ばない', async () => {
    // Arrange
    const user = userEvent.setup()
    const state = setupProjectDetailHandlers()
    renderProjectDetailPage()
    await screen.findByRole('heading', { name: 'Alphaプロジェクト' })

    // Act
    await user.click(screen.getAllByRole('button', { name: '編集' })[0])
    const nameInput = screen.getByLabelText('案件名')
    await user.clear(nameInput)
    await user.click(screen.getByRole('button', { name: '保存' }))

    // Assert
    expect(await screen.findByText('案件名は必須です。')).toBeInTheDocument()
    expect(state.getProjectUpdateCallCount()).toBe(0)
  })

  it('卸作成で企業が未選択の場合はバリデーションエラーになる', async () => {
    // Arrange
    const user = userEvent.setup()
    const handlerState = setupProjectDetailHandlers()
    renderProjectDetailPage()
    await screen.findByRole('heading', { name: 'Alphaプロジェクト' })

    // Act
    await user.click(screen.getByRole('button', { name: '卸を追加' }))
    await user.click(screen.getByRole('button', { name: '追加' }))

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent(/企業|会社/)
    expect(handlerState.getCreateWholesaleCallCount()).toBe(0)
  })

  it('卸編集モーダルで保存するとステータスが更新される', async () => {
    // Arrange
    const user = userEvent.setup()
    setupProjectDetailHandlers()
    renderProjectDetailPage()
    const companyCell = await screen.findByText('テスト卸先')
    const row = companyCell.closest('tr')
    if (!row) {
      throw new Error('卸一覧の行が見つかりません。')
    }

    // Act
    await user.click(within(row).getByRole('button', { name: '編集' }))
    const dialog = await screen.findByRole('dialog', { name: '卸を編集' })
    await user.selectOptions(within(dialog).getByLabelText('ステータス'), 'paused')
    await user.click(within(dialog).getByRole('button', { name: '保存' }))

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '卸を編集' })).not.toBeInTheDocument()
    })
    expect(await screen.findByText(statusLabel('wholesale', 'paused'))).toBeInTheDocument()
  })

  it('卸削除確認で削除すると一覧から対象が消える', async () => {
    // Arrange
    const user = userEvent.setup()
    setupProjectDetailHandlers()
    renderProjectDetailPage()
    const companyCell = await screen.findByText('テスト卸先')
    const row = companyCell.closest('tr')
    if (!row) {
      throw new Error('卸一覧の行が見つかりません。')
    }

    // Act
    await user.click(within(row).getByRole('button', { name: '削除' }))
    const dialog = await screen.findByRole('dialog', { name: '卸の削除' })
    await user.click(within(dialog).getByRole('button', { name: '削除する' }))

    // Assert
    await waitFor(() => {
      expect(screen.queryByText('テスト卸先')).not.toBeInTheDocument()
    })
    expect(screen.getByText('卸がありません')).toBeInTheDocument()
  })

  it('卸削除が失敗した場合はエラー表示し対象データを保持する', async () => {
    // Arrange
    const user = userEvent.setup()
    const state = setupProjectDetailHandlers({ failDeleteWholesale: true })
    renderProjectDetailPage()
    const companyCell = await screen.findByText('テスト卸先')
    const row = companyCell.closest('tr')
    if (!row) {
      throw new Error('卸一覧の行が見つかりません。')
    }

    // Act
    await user.click(within(row).getByRole('button', { name: '削除' }))
    const dialog = await screen.findByRole('dialog', { name: '卸の削除' })
    await user.click(within(dialog).getByRole('button', { name: '削除する' }))

    // Assert
    expect(await screen.findByText('ネットワークエラー')).toBeInTheDocument()
    expect(await screen.findByText('テスト卸先')).toBeInTheDocument()
    expect(state.getDeleteWholesaleCallCount()).toBe(1)
  })

  it('閲覧専用ユーザーには卸の更新操作を表示しない', async () => {
    // Arrange
    setupProjectDetailHandlers({ role: 'viewer' })

    // Act
    renderProjectDetailPage()

    // Assert
    expect(await screen.findByRole('heading', { name: 'Alphaプロジェクト' })).toBeInTheDocument()
    expect(
      screen.getByText('権限がないため、卸の追加・編集はできません。')
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '卸を追加' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '編集' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '削除' })).not.toBeInTheDocument()
  })
})
