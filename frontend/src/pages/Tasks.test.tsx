import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import Tasks from './Tasks'
import { AuthProvider } from '../contexts/AuthContext'
import { clearAuthToken, setAuthToken } from '../lib/authToken'
import { TASK_STRINGS } from '../strings/tasks'
import { createListResponse, createTask, createUser } from '../test/msw/factory'
import { statusLabel } from '../constants/labels'
import { server } from '../test/msw/server'
import type { Task } from '../types'

type JsonObject = Record<string, unknown>

type TaskHandlersOptions = {
  role?: string
  initialTasks?: Task[]
  failStatusUpdateTaskId?: string
  failBulkUpdate?: boolean
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

const readBoolean = (record: JsonObject, key: string): boolean | undefined => {
  const value = record[key]
  return typeof value === 'boolean' ? value : undefined
}

const renderTasksPage = () =>
  render(
    <MemoryRouter initialEntries={['/tasks']}>
      <AuthProvider>
        <Tasks />
      </AuthProvider>
    </MemoryRouter>
  )

const setupTaskHandlers = ({
  role = 'admin',
  initialTasks,
  failStatusUpdateTaskId,
  failBulkUpdate = false,
}: TaskHandlersOptions = {}) => {
  const users = [
    createUser({
      id: 'user-1',
      email: 'admin@example.com',
      name: '管理者',
      role: 'admin',
    }),
    createUser({
      id: 'user-2',
      email: 'member@example.com',
      name: '担当A',
      role: 'employee',
    }),
  ]
  const authUser = createUser({
    id: 'user-1',
    email: 'admin@example.com',
    name: '管理者',
    role,
  })
  let tasks: Task[] =
    initialTasks?.map((task) => ({ ...task })) ?? [
      createTask({
        id: 'task-1',
        title: '既存タスクA',
        status: 'todo',
        targetType: 'company',
        targetId: 'company-1',
        target: { id: 'company-1', type: 'company', name: 'テスト会社' },
        assigneeId: 'user-1',
        assignee: { id: 'user-1', email: 'admin@example.com', name: '管理者' },
      }),
      createTask({
        id: 'task-2',
        title: '既存タスクB',
        status: 'in_progress',
        targetType: 'general',
        targetId: 'general',
        target: { id: 'general', type: 'general', name: '未紐づけ' },
        assigneeId: null,
        assignee: null,
      }),
    ]
  let myListCallCount = 0
  let allListCallCount = 0
  let bulkUpdateCallCount = 0

  const listTasks = (request: Request) => {
    const url = new URL(request.url)
    const q = url.searchParams.get('q')?.trim().toLowerCase() ?? ''
    const status = url.searchParams.get('status') ?? ''
    const targetType = url.searchParams.get('targetType') ?? ''
    const assigneeId = url.searchParams.get('assigneeId') ?? ''
    const page = Math.max(Number(url.searchParams.get('page')) || 1, 1)
    const pageSize = Math.max(Number(url.searchParams.get('pageSize')) || 20, 1)

    let filtered = tasks
    if (q) {
      filtered = filtered.filter((task) => {
        const haystack = [task.title, task.description ?? '', task.target?.name ?? '', task.targetId]
          .join(' ')
          .toLowerCase()
        return haystack.includes(q)
      })
    }
    if (status) {
      filtered = filtered.filter((task) => task.status === status)
    }
    if (targetType) {
      filtered = filtered.filter((task) => task.targetType === targetType)
    }
    if (assigneeId) {
      filtered = filtered.filter((task) => (task.assigneeId ?? '') === assigneeId)
    }

    const start = (page - 1) * pageSize
    const items = filtered.slice(start, start + pageSize)
    return HttpResponse.json(createListResponse(items, { page, pageSize, total: filtered.length }))
  }

  server.use(
    http.get('/api/auth/me', () => {
      return HttpResponse.json({ user: authUser })
    }),
    http.get('/api/users/options', () => {
      return HttpResponse.json({ users })
    }),
    http.get('/api/me/tasks', ({ request }) => {
      myListCallCount += 1
      return listTasks(request)
    }),
    http.get('/api/tasks', ({ request }) => {
      allListCallCount += 1
      return listTasks(request)
    }),
    http.post('/api/tasks', async ({ request }) => {
      const body = await parseBody(request)
      const title = readString(body, 'title') ?? 'Untitled'
      const targetType = readString(body, 'targetType') ?? 'general'
      const targetId = readString(body, 'targetId') ?? 'general'
      const createdTask = createTask({
        id: `task-${tasks.length + 1}`,
        title,
        description: readString(body, 'description') ?? null,
        targetType,
        targetId,
        status: 'todo',
        dueDate: readString(body, 'dueDate') ?? null,
        assigneeId: readString(body, 'assigneeId') ?? null,
        assignee: readString(body, 'assigneeId')
          ? {
              id: readString(body, 'assigneeId') ?? '',
              email: `${readString(body, 'assigneeId') ?? ''}@example.com`,
              name: `user-${readString(body, 'assigneeId') ?? ''}`,
            }
          : null,
        target:
          targetType === 'general'
            ? { id: targetId, type: 'general', name: '未紐づけ' }
            : { id: targetId, type: targetType, name: `Target ${targetId}` },
      })
      tasks = [createdTask, ...tasks]
      return HttpResponse.json({ task: createdTask }, { status: 201 })
    }),
    http.patch('/api/tasks/bulk', async ({ request }) => {
      bulkUpdateCallCount += 1
      if (failBulkUpdate) {
        return HttpResponse.json({ error: 'bulk update failed' }, { status: 500 })
      }
      const body = await parseBody(request)
      const taskIds = readStringArray(body, 'taskIds') ?? []
      const status = readString(body, 'status')
      const dueDate = readNullableString(body, 'dueDate')
      const clearDueDate = readBoolean(body, 'clearDueDate')
      tasks = tasks.map((task) =>
        taskIds.includes(task.id)
          ? {
              ...task,
              status: status ?? task.status,
              dueDate: clearDueDate ? null : (dueDate ?? task.dueDate),
            }
          : task
      )
      return HttpResponse.json({ updated: taskIds.length })
    }),
    http.patch('/api/tasks/:id', async ({ params, request }) => {
      const body = await parseBody(request)
      const taskId = String(params.id)
      if (failStatusUpdateTaskId === taskId) {
        return new HttpResponse(null, { status: 500 })
      }
      tasks = tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: readString(body, 'status') ?? task.status,
              dueDate: readNullableString(body, 'dueDate') ?? task.dueDate,
              assigneeId: readNullableString(body, 'assigneeId') ?? task.assigneeId,
            }
          : task
      )
      const updated = tasks.find((task) => task.id === taskId)
      if (!updated) {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }
      return HttpResponse.json({ task: updated })
    }),
    http.delete('/api/tasks/:id', ({ params }) => {
      const taskId = String(params.id)
      tasks = tasks.filter((task) => task.id !== taskId)
      return new HttpResponse(null, { status: 204 })
    })
  )

  return {
    getMyListCallCount: () => myListCallCount,
    getAllListCallCount: () => allListCallCount,
    getBulkUpdateCallCount: () => bulkUpdateCallCount,
  }
}

describe('タスク一覧ページ', () => {
  beforeEach(() => {
    setAuthToken('test-token')
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('作成フォーム未入力で送信すると必須エラーを表示する', async () => {
    // Arrange
    const user = userEvent.setup()
    setupTaskHandlers()
    renderTasksPage()

    // Act
    const createButton = await screen.findByRole(
      'button',
      { name: TASK_STRINGS.actions.new },
      { timeout: 5000 }
    )
    await user.click(createButton)
    const panel = await screen.findByRole('dialog', { name: TASK_STRINGS.panel.createTitle })
    await user.click(within(panel).getByRole('button', { name: TASK_STRINGS.actions.create }))

    // Assert
    expect(await screen.findByText(TASK_STRINGS.errors.createTitleRequired)).toBeInTheDocument()
    expect(screen.getByText(TASK_STRINGS.errors.createCompanyRequired)).toBeInTheDocument()
  })

  it('一般タスクを作成すると一覧に追加される', async () => {
    // Arrange
    const user = userEvent.setup()
    setupTaskHandlers()
    renderTasksPage()

    // Act
    const createButton = await screen.findByRole(
      'button',
      { name: TASK_STRINGS.actions.new },
      { timeout: 5000 }
    )
    await user.click(createButton)
    const panel = await screen.findByRole('dialog', { name: TASK_STRINGS.panel.createTitle })
    await user.type(within(panel).getByLabelText(TASK_STRINGS.labels.createTitle), 'フォローアップ新規')
    await user.selectOptions(within(panel).getByLabelText(TASK_STRINGS.labels.createTargetType), 'general')
    await user.click(within(panel).getByRole('button', { name: TASK_STRINGS.actions.create }))

    // Assert
    expect(await screen.findByText(TASK_STRINGS.success.create)).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'フォローアップ新規' })).toBeInTheDocument()
  }, 15000)

  it('管理者が表示範囲を全件に切り替えると全件APIで再取得する', async () => {
    // Arrange
    const user = userEvent.setup()
    const state = setupTaskHandlers()
    renderTasksPage()
    await screen.findByRole('link', { name: '既存タスクA' })

    // Act
    await user.click(screen.getByRole('button', { name: TASK_STRINGS.labels.scopeAll }))

    // Assert
    await waitFor(() => {
      expect(state.getAllListCallCount()).toBeGreaterThan(0)
    })
    expect(state.getMyListCallCount()).toBeGreaterThan(0)
  })

  it('ステータス更新に失敗した場合はエラーを表示し表示ステータスを元に戻す', async () => {
    // Arrange
    const user = userEvent.setup()
    setupTaskHandlers({
      failStatusUpdateTaskId: 'task-1',
      initialTasks: [
        createTask({
          id: 'task-1',
          title: '更新失敗タスク',
          status: 'todo',
          targetType: 'company',
          targetId: 'company-1',
        }),
      ],
    })
    renderTasksPage()
    await user.click(await screen.findByRole('button', { name: TASK_STRINGS.labels.viewList }))
    const taskLink = await screen.findByRole('link', { name: '更新失敗タスク' })
    const row = taskLink.closest('tr')
    if (!row) {
      throw new Error('更新対象タスク行が見つかりません。')
    }

    // Act
    await user.click(within(row).getByRole('button', { name: statusLabel('task', 'todo') }))
    await user.selectOptions(
      await screen.findByLabelText(`更新失敗タスク ${TASK_STRINGS.labels.statusForTaskSuffix}`),
      'done'
    )

    // Assert
    await waitFor(() => {
      expect(within(row).getByRole('button', { name: statusLabel('task', 'todo') })).toBeInTheDocument()
    })
    expect(screen.queryByText(TASK_STRINGS.success.updateStatus)).not.toBeInTheDocument()
  })

  it('一括更新で更新項目が未指定の場合はバリデーションエラーを表示しAPIを呼ばない', async () => {
    // Arrange
    const user = userEvent.setup()
    const state = setupTaskHandlers({
      initialTasks: [
        createTask({
          id: 'task-1',
          title: '未更新項目タスク',
          status: 'todo',
          targetType: 'company',
          targetId: 'company-1',
        }),
      ],
    })
    renderTasksPage()
    await user.click(await screen.findByRole('button', { name: TASK_STRINGS.labels.viewList }))

    // Act
    await user.click(await screen.findByRole('checkbox', { name: /未更新項目タスク/ }))
    await user.click(screen.getByRole('button', { name: TASK_STRINGS.bulk.submitLabel }))

    // Assert
    expect(await screen.findByText(TASK_STRINGS.errors.bulkSelectFields)).toBeInTheDocument()
    expect(state.getBulkUpdateCallCount()).toBe(0)
  })

  it('選択タスクの一括更新後に選択状態がクリアされる', async () => {
    // Arrange
    const user = userEvent.setup()
    setupTaskHandlers({
      initialTasks: [
        createTask({
          id: 'task-1',
          title: '未対応タスクA',
          status: 'todo',
          targetType: 'company',
          targetId: 'company-1',
        }),
        createTask({
          id: 'task-2',
          title: '未対応タスクB',
          status: 'todo',
          targetType: 'general',
          targetId: 'general',
        }),
      ],
    })
    renderTasksPage()
    await user.click(await screen.findByRole('button', { name: TASK_STRINGS.labels.viewList }))
    const taskRowLabel = await screen.findByRole('checkbox', { name: /未対応タスクA/ })

    // Act
    await user.click(taskRowLabel)
    await user.selectOptions(screen.getByLabelText(TASK_STRINGS.bulk.statusLabel), 'done')
    await user.click(screen.getByRole('button', { name: TASK_STRINGS.bulk.submitLabel }))

    // Assert
    expect(await screen.findByText(TASK_STRINGS.success.bulk)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: TASK_STRINGS.bulk.submitLabel })).not.toBeInTheDocument()
    })
    const titleCell = screen.getByRole('link', { name: '未対応タスクA' })
    const row = titleCell.closest('tr')
    if (!row) {
      throw new Error('更新対象タスク行が見つかりません。')
    }
    expect(within(row).getByText(statusLabel('task', 'done'))).toBeInTheDocument()
  })

  it('削除確認ダイアログで削除すると対象タスクが消える', async () => {
    // Arrange
    const user = userEvent.setup()
    setupTaskHandlers({
      initialTasks: [
        createTask({
          id: 'task-1',
          title: '削除対象タスク',
          status: 'todo',
          targetType: 'general',
          targetId: 'general',
        }),
      ],
    })
    renderTasksPage()
    await user.click(await screen.findByRole('button', { name: TASK_STRINGS.labels.viewList }))
    const taskLink = await screen.findByRole('link', { name: '削除対象タスク' })
    const row = taskLink.closest('tr')
    if (!row) {
      throw new Error('削除対象タスク行が見つかりません。')
    }

    // Act
    await user.click(within(row).getByRole('button', { name: TASK_STRINGS.confirm.deleteConfirmLabel }))
    const dialog = await screen.findByRole('dialog', { name: TASK_STRINGS.confirm.deleteTitle })
    await user.click(within(dialog).getByRole('button', { name: TASK_STRINGS.confirm.deleteConfirmLabel }))

    // Assert
    expect(await screen.findByText(TASK_STRINGS.success.delete)).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: '削除対象タスク' })).not.toBeInTheDocument()
    })
  })

  it('書き込み権限がないユーザーは更新操作が表示されない', async () => {
    // Arrange
    const user = userEvent.setup()
    setupTaskHandlers({
      role: 'viewer',
      initialTasks: [
        createTask({
          id: 'task-1',
          title: '閲覧専用タスク',
          status: 'todo',
          targetType: 'company',
          targetId: 'company-1',
        }),
      ],
    })

    // Act
    renderTasksPage()

    // Assert
    expect(await screen.findByText(TASK_STRINGS.notices.readonly)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: TASK_STRINGS.actions.new })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: TASK_STRINGS.labels.viewList }))
    expect(screen.queryByRole('button', { name: TASK_STRINGS.confirm.deleteConfirmLabel })).not.toBeInTheDocument()
  })
})
