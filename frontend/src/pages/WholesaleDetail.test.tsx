import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import WholesaleDetail from './WholesaleDetail'
import { AuthProvider } from '../contexts/AuthContext'
import { clearAuthToken, setAuthToken } from '../lib/authToken'
import { server } from '../test/msw/server'
import { createListResponse, createTask, createWholesale } from '../test/msw/factory'

type WholesaleUpdateRequestBody = {
  status?: string
  unitPrice?: number
  margin?: number
  agreedDate?: string | null
  conditions?: string | null
}

const toStringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const toNullableStringOrUndefined = (value: unknown): string | null | undefined => {
  if (value === null) return null
  return typeof value === 'string' ? value : undefined
}

const toNumberOrUndefined = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const parseWholesaleUpdateRequestBody = async (
  request: Request
): Promise<WholesaleUpdateRequestBody> => {
  const rawBody = await request.json().catch(() => null)
  if (typeof rawBody !== 'object' || rawBody === null) return {}
  return {
    status: toStringOrUndefined(Reflect.get(rawBody, 'status')),
    unitPrice: toNumberOrUndefined(Reflect.get(rawBody, 'unitPrice')),
    margin: toNumberOrUndefined(Reflect.get(rawBody, 'margin')),
    agreedDate: toNullableStringOrUndefined(Reflect.get(rawBody, 'agreedDate')),
    conditions: toNullableStringOrUndefined(Reflect.get(rawBody, 'conditions')),
  }
}

const renderWholesaleDetailPage = () =>
  render(
    <MemoryRouter initialEntries={['/wholesales/wholesale-1']}>
      <AuthProvider>
        <Routes>
          <Route path="/wholesales/:id" element={<WholesaleDetail />} />
          <Route path="/projects/:id" element={<h1>案件詳細画面</h1>} />
          <Route path="/projects" element={<h1>案件一覧画面</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  )

const setupWholesaleHandlers = () => {
  let wholesale = createWholesale({
    id: 'wholesale-1',
    status: 'active',
    projectId: 'project-1',
    companyId: 'company-1',
    company: { id: 'company-1', name: '株式会社テスト企業' },
    project: {
      id: 'project-1',
      name: '検証案件',
      company: { id: 'company-1', name: '株式会社テスト企業' },
    },
    conditions: '初期条件',
    unitPrice: 80000,
    margin: 12.5,
    agreedDate: '2026-01-15',
  })
  const relatedTasks = [
    createTask({
      id: 'task-1',
      title: '卸向け確認タスク',
      targetType: 'wholesale',
      targetId: 'wholesale-1',
      status: 'in_progress',
    }),
  ]

  server.use(
    http.get('/api/wholesales/:id', ({ params }) => {
      if (params.id !== wholesale.id) {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }
      return HttpResponse.json({ wholesale })
    }),
    http.get('/api/wholesales/:id/tasks', ({ params }) => {
      if (params.id !== wholesale.id) {
        return HttpResponse.json(createListResponse([]))
      }
      return HttpResponse.json(
        createListResponse(relatedTasks, { page: 1, pageSize: 10, total: relatedTasks.length })
      )
    }),
    http.patch('/api/wholesales/:id', async ({ params, request }) => {
      if (params.id !== wholesale.id) {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }
      const requestBody = await parseWholesaleUpdateRequestBody(request)
      wholesale = {
        ...wholesale,
        status: requestBody.status ?? wholesale.status,
        unitPrice: requestBody.unitPrice ?? wholesale.unitPrice,
        margin: requestBody.margin ?? wholesale.margin,
        agreedDate: requestBody.agreedDate === undefined ? wholesale.agreedDate : requestBody.agreedDate,
        conditions: requestBody.conditions === undefined ? wholesale.conditions : requestBody.conditions,
      }
      return HttpResponse.json({ wholesale })
    }),
    http.delete('/api/wholesales/:id', ({ params }) => {
      if (params.id !== wholesale.id) {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }
      return new HttpResponse(null, { status: 204 })
    })
  )
}

describe('卸詳細ページ', () => {
  beforeEach(() => {
    setAuthToken('test-token')
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('卸情報と関連タスクを表示する', async () => {
    // Arrange
    setupWholesaleHandlers()

    // Act
    renderWholesaleDetailPage()

    // Assert
    expect(await screen.findByRole('heading', { name: '卸詳細' })).toBeInTheDocument()
    const companyLinks = await screen.findAllByRole('link', { name: '株式会社テスト企業' })
    expect(companyLinks.length).toBeGreaterThan(0)
    expect(await screen.findByText('卸向け確認タスク')).toBeInTheDocument()
    expect(screen.getAllByText('稼働中').length).toBeGreaterThan(0)
  })

  it('編集して保存すると最新のステータスで再表示される', async () => {
    // Arrange
    const user = userEvent.setup()
    setupWholesaleHandlers()
    renderWholesaleDetailPage()
    await screen.findByRole('button', { name: '編集' })

    // Act
    await user.click(screen.getByRole('button', { name: '編集' }))
    const saveButton = await screen.findByRole('button', { name: '保存' })
    const editForm = saveButton.closest('form')
    if (!editForm) {
      throw new Error('編集フォームが見つかりません。')
    }
    await user.selectOptions(within(editForm).getByRole('combobox'), 'paused')
    await user.click(saveButton)

    // Assert
    expect(await screen.findByText('卸を更新しました。')).toBeInTheDocument()
    expect((await screen.findAllByText('一時停止')).length).toBeGreaterThan(0)
  })

  it('削除確認で削除を実行すると案件詳細へ戻る', async () => {
    // Arrange
    const user = userEvent.setup()
    setupWholesaleHandlers()
    renderWholesaleDetailPage()
    await screen.findByRole('button', { name: '削除' })

    // Act
    await user.click(screen.getByRole('button', { name: '削除' }))
    const dialog = await screen.findByRole('dialog', { name: '卸の削除' })
    await user.click(within(dialog).getByRole('button', { name: '削除' }))

    // Assert
    expect(await screen.findByRole('heading', { name: '案件詳細画面' })).toBeInTheDocument()
  })
})
