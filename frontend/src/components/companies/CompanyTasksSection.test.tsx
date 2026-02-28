import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import CompanyTasksSection from './CompanyTasksSection'
import { createTask } from '../../test/msw/factory'
import { server } from '../../test/msw/server'
import type { Task } from '../../types'

const companyId = 'company-1'

type SetupTaskHandlersOptions = {
  tasks?: Task[]
  fetchDelayMs?: number
  failStatusUpdate?: boolean
}

const readBody = async (request: Request): Promise<Record<string, unknown>> => {
  const raw = await request.json().catch(() => null)
  if (typeof raw !== 'object' || raw === null) return {}
  return raw as Record<string, unknown>
}

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const setupTaskHandlers = ({
  tasks: initialTasks = [],
  fetchDelayMs = 0,
  failStatusUpdate = false,
}: SetupTaskHandlersOptions = {}) => {
  let tasks = initialTasks.map((task) => ({ ...task }))
  const createPayloads: Array<Record<string, unknown>> = []
  const taskQueryHistory: string[] = []

  server.use(
    http.get('/api/companies/:id/tasks', async ({ params, request }) => {
      if (String(params.id) !== companyId) {
        return HttpResponse.json({
          items: [],
          pagination: { page: 1, pageSize: 20, total: 0 },
        })
      }
      if (fetchDelayMs > 0) {
        await delay(fetchDelayMs)
      }
      const url = new URL(request.url)
      const query = url.searchParams.toString()
      taskQueryHistory.push(query)
      const statusFilter = url.searchParams.get('status') ?? ''
      const filtered = statusFilter
        ? tasks.filter((task) => task.status === statusFilter)
        : tasks
      return HttpResponse.json({
        items: filtered,
        pagination: { page: 1, pageSize: 20, total: filtered.length },
      })
    }),
    http.post('/api/tasks', async ({ request }) => {
      const body = await readBody(request)
      createPayloads.push(body)

      const title = readString(body.title)?.trim() ?? ''
      if (!title) {
        return HttpResponse.json({ error: 'タイトルは必須です' }, { status: 400 })
      }

      const created = createTask({
        id: `task-${tasks.length + 1}`,
        title,
        description: readString(body.description) ?? null,
        dueDate: readString(body.dueDate) ?? null,
        targetType: readString(body.targetType) ?? 'company',
        targetId: readString(body.targetId) ?? companyId,
      })
      tasks = [created, ...tasks]

      return HttpResponse.json(created, { status: 201 })
    }),
    http.patch('/api/tasks/:id', async ({ params, request }) => {
      if (failStatusUpdate) {
        return HttpResponse.json({ error: 'タスクの更新に失敗しました' }, { status: 500 })
      }
      const taskId = String(params.id)
      const body = await readBody(request)
      const nextStatus = readString(body.status)
      if (!nextStatus) {
        return HttpResponse.json({ error: 'status is required' }, { status: 400 })
      }
      tasks = tasks.map((task) =>
        task.id === taskId ? { ...task, status: nextStatus } : task
      )
      const updated = tasks.find((task) => task.id === taskId)
      if (!updated) {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }
      return HttpResponse.json(updated)
    })
  )

  return {
    getCreatePayloads: () => createPayloads,
    getTaskQueryHistory: () => taskQueryHistory,
  }
}

describe('企業詳細のタスクセクション', () => {
  it('読み込み中表示の後に空状態を表示し、追加導線で入力にフォーカスできる', async () => {
    const user = userEvent.setup()
    setupTaskHandlers({ fetchDelayMs: 80 })
    render(<CompanyTasksSection companyId={companyId} canWrite />)

    expect(await screen.findByText('タスクを読み込み中...')).toBeInTheDocument()
    expect(await screen.findByText('タスクはまだありません')).toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: 'タスクを追加' })[0])
    expect(screen.getByPlaceholderText('タスクタイトル')).toHaveFocus()
  })

  it('タイトル必須バリデーションを行い、作成成功時はtrim済みタイトルで一覧を更新する', async () => {
    const user = userEvent.setup()
    const state = setupTaskHandlers()
    render(<CompanyTasksSection companyId={companyId} canWrite />)

    await screen.findByText('タスクはまだありません')
    const titleInput = screen.getByPlaceholderText('タスクタイトル')
    const form = titleInput.closest('form')
    if (!form) {
      throw new Error('作成フォームが見つかりません。')
    }

    await user.click(screen.getAllByRole('button', { name: 'タスクを追加' })[0])
    await user.click(within(form).getByRole('button', { name: 'タスクを追加' }))
    expect(await screen.findByText('タイトルは必須です')).toBeInTheDocument()

    await user.type(titleInput, '  追加タスク  ')
    await user.type(screen.getByPlaceholderText('メモ・備考'), '作成メモ')
    await user.click(within(form).getByRole('button', { name: 'タスクを追加' }))

    expect(await screen.findByText('追加タスク')).toBeInTheDocument()
    const payload = state.getCreatePayloads().at(-1)
    expect(payload?.title).toBe('追加タスク')
    expect(payload?.targetType).toBe('company')
    expect(payload?.targetId).toBe(companyId)
  })

  it('ステータス絞り込みで再取得し、更新失敗時はエラー表示して表示ステータスを戻す', async () => {
    const user = userEvent.setup()
    const state = setupTaskHandlers({
      tasks: [
        createTask({ id: 'task-1', title: '未対応タスク', status: 'todo' }),
        createTask({ id: 'task-2', title: '完了タスク', status: 'done' }),
      ],
      failStatusUpdate: true,
    })
    render(<CompanyTasksSection companyId={companyId} canWrite />)

    await screen.findByText('未対応タスク')

    await user.selectOptions(screen.getByDisplayValue('全てのステータス'), 'done')
    expect(await screen.findByText('完了タスク')).toBeInTheDocument()
    await waitFor(() => {
      expect(state.getTaskQueryHistory().some((query) => query.includes('status=done'))).toBe(true)
    })

    const selects = screen.getAllByRole('combobox')
    const taskStatusSelect = selects[1]
    await user.selectOptions(taskStatusSelect, 'cancelled')

    expect(await screen.findByRole('alert')).toHaveTextContent('タスクの更新に失敗しました')
    expect(taskStatusSelect).toHaveValue('done')
  })

  it('閲覧専用モードでは更新UIを表示せずステータスバッジと案内文を表示する', async () => {
    setupTaskHandlers({
      tasks: [createTask({ id: 'task-1', title: '閲覧専用タスク', status: 'todo' })],
    })
    render(<CompanyTasksSection companyId={companyId} canWrite={false} />)

    expect(await screen.findByText('閲覧専用タスク')).toBeInTheDocument()
    expect(screen.getByText('書き込み権限がありません')).toBeInTheDocument()
    expect(screen.getAllByText('未対応').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'タスクを追加' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('combobox').length).toBe(1)
  })
})
