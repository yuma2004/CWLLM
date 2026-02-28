import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import ChatworkSettings from './ChatworkSettings'
import { AuthProvider } from '../contexts/AuthContext'
import { clearAuthToken, setAuthToken } from '../lib/authToken'
import { createUser } from '../test/msw/factory'
import { server } from '../test/msw/server'
import type { ChatworkRoom, JobRecord } from '../types'

type JsonObject = Record<string, unknown>

type ChatworkHandlerOptions = {
  role?: string
  initialRooms?: ChatworkRoom[]
  jobStatuses?: Array<JobRecord['status']>
  addRoomOnComplete?: boolean
  failBulkToggle?: boolean
}

const parseBody = async (request: Request): Promise<JsonObject> => {
  const raw = await request.json().catch(() => null)
  if (typeof raw !== 'object' || raw === null) return {}
  return raw as JsonObject
}

const readBoolean = (record: JsonObject, key: string): boolean | undefined => {
  const value = record[key]
  return typeof value === 'boolean' ? value : undefined
}

const createRoom = (overrides: Partial<ChatworkRoom> = {}): ChatworkRoom => ({
  id: 'room-1',
  roomId: '100',
  name: '営業ルーム',
  description: null,
  isActive: true,
  lastSyncAt: null,
  lastErrorAt: null,
  lastErrorMessage: null,
  lastErrorStatus: null,
  ...overrides,
})

const renderChatworkSettingsPage = () =>
  render(
    <MemoryRouter initialEntries={['/settings/chatwork']}>
      <AuthProvider>
        <ChatworkSettings />
      </AuthProvider>
    </MemoryRouter>
  )

const getRoomItem = (name: string): HTMLElement => {
  const label = screen.getByText(name)
  const item = label.closest('[data-testid="chatwork-room-item"]')
  if (!item) {
    throw new Error(`ルームカードが見つかりません: ${name}`)
  }
  return item as HTMLElement
}

const setupChatworkHandlers = ({
  role = 'admin',
  initialRooms = [
    createRoom({ id: 'room-1', roomId: '100', name: '営業ルーム', isActive: true }),
    createRoom({ id: 'room-2', roomId: '200', name: 'サポートルーム', isActive: false }),
  ],
  jobStatuses = ['processing', 'completed'],
  addRoomOnComplete = false,
  failBulkToggle = false,
}: ChatworkHandlerOptions = {}) => {
  let rooms = initialRooms.map((room) => ({ ...room }))
  let activeJob: JobRecord | null = null
  let jobStatusIndex = 0
  let isCompletedRoomAdded = false

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
    http.get('/api/chatwork/rooms', () => {
      return HttpResponse.json({ rooms })
    }),
    http.post('/api/chatwork/rooms/sync', () => {
      activeJob = {
        id: 'job-1',
        type: 'chatwork_rooms_sync',
        status: 'queued',
      }
      jobStatusIndex = 0
      return HttpResponse.json({ jobId: 'job-1', status: 'queued' })
    }),
    http.post('/api/chatwork/messages/sync', () => {
      return HttpResponse.json({ jobId: 'job-msg-1', status: 'queued' })
    }),
    http.get('/api/jobs/:id', ({ params }) => {
      if (!activeJob || params.id !== activeJob.id) {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }
      const nextStatus =
        jobStatuses[Math.min(jobStatusIndex, jobStatuses.length - 1)] ?? activeJob.status
      jobStatusIndex += 1
      if (nextStatus === 'completed' && addRoomOnComplete && !isCompletedRoomAdded) {
        rooms = [
          ...rooms,
          createRoom({
            id: 'room-99',
            roomId: '999',
            name: '同期追加ルーム',
            isActive: true,
          }),
        ]
        isCompletedRoomAdded = true
      }
      activeJob = {
        ...activeJob,
        status: nextStatus,
        result:
          nextStatus === 'completed'
            ? {
                totalRooms: rooms.length,
                processedRooms: rooms.length,
                summary: { rooms: rooms.map((room) => room.id), errors: [] as string[] },
              }
            : activeJob.result,
      }
      return HttpResponse.json({ job: activeJob })
    }),
    http.post('/api/jobs/:id/cancel', ({ params }) => {
      if (!activeJob || params.id !== activeJob.id) {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }
      activeJob = { ...activeJob, status: 'canceled' }
      return HttpResponse.json({ job: activeJob })
    }),
    http.patch('/api/chatwork/rooms/:id', async ({ params, request }) => {
      if (failBulkToggle) {
        return new HttpResponse(null, { status: 500 })
      }
      const body = await parseBody(request)
      const nextActive = readBoolean(body, 'isActive')
      if (nextActive === undefined) {
        return HttpResponse.json({ error: 'invalid isActive' }, { status: 400 })
      }
      const roomId = String(params.id)
      rooms = rooms.map((room) =>
        room.id === roomId
          ? {
              ...room,
              isActive: nextActive,
            }
          : room
      )
      const updated = rooms.find((room) => room.id === roomId)
      if (!updated) {
        return HttpResponse.json({ error: 'not found' }, { status: 404 })
      }
      return HttpResponse.json({ room: updated })
    })
  )
}

describe('Chatwork設定ページ', () => {
  beforeEach(() => {
    setAuthToken('test-token')
  })

  it('メッセージ同期開始時にメッセージ同期ジョブが表示される', async () => {
    // Arrange
    const user = userEvent.setup()
    setupChatworkHandlers()
    renderChatworkSettingsPage()
    await screen.findByText('営業ルーム')

    // Act
    await user.click(screen.getByRole('button', { name: 'メッセージ同期' }))

    // Assert
    expect(await screen.findByText('ジョブ: chatwork_messages_sync')).toBeInTheDocument()
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('管理権限がない場合はアクセス不可メッセージを表示する', async () => {
    // Arrange
    setupChatworkHandlers({ role: 'employee' })

    // Act
    renderChatworkSettingsPage()

    // Assert
    expect(
      await screen.findByText('権限が不足しているため、Chatwork設定を表示できません。')
    ).toBeInTheDocument()
  })

  it('ルーム同期ジョブ完了時に通知とルーム再取得が反映される', async () => {
    // Arrange
    const user = userEvent.setup()
    setupChatworkHandlers({ addRoomOnComplete: true, jobStatuses: ['completed'] })
    renderChatworkSettingsPage()
    await screen.findByText('営業ルーム')

    // Act
    await user.click(screen.getByTestId('chatwork-room-sync'))

    // Assert
    expect(await screen.findByText('ジョブ: chatwork_rooms_sync')).toBeInTheDocument()
    expect(await screen.findByText('同期が完了しました。')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByTestId('chatwork-room-item')).toHaveLength(3)
    })
    expect(screen.getByText('同期追加ルーム')).toBeInTheDocument()
  })

  it('選択ルームのみ一括有効化できる', async () => {
    // Arrange
    const user = userEvent.setup()
    setupChatworkHandlers()
    renderChatworkSettingsPage()
    await screen.findByText('サポートルーム')
    const roomCard = getRoomItem('サポートルーム')

    // Act
    await user.click(within(roomCard).getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: '一括有効化' }))

    // Assert
    await waitFor(() => {
      const updatedCard = getRoomItem('サポートルーム')
      expect(within(updatedCard).getByRole('button', { name: '有効' })).toBeInTheDocument()
    })
    expect(screen.queryByText('件選択中')).not.toBeInTheDocument()
  })

  it('一括有効化に失敗した場合はエラーを表示し選択状態を維持する', async () => {
    // Arrange
    const user = userEvent.setup()
    setupChatworkHandlers({ failBulkToggle: true })
    renderChatworkSettingsPage()
    await screen.findByText('サポートルーム')
    const roomCard = getRoomItem('サポートルーム')

    // Act
    await user.click(within(roomCard).getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: '一括有効化' }))

    // Assert
    expect((await screen.findAllByText('ネットワークエラー')).length).toBeGreaterThan(0)
    expect(screen.getByText('1 件選択中')).toBeInTheDocument()
    const unchangedCard = getRoomItem('サポートルーム')
    expect(within(unchangedCard).getByRole('button', { name: '無効' })).toBeInTheDocument()
  })

  it('検索・状態フィルタ・ページングを組み合わせて絞り込める', async () => {
    // Arrange
    const user = userEvent.setup()
    const rooms = Array.from({ length: 25 }, (_, index) => {
      const roomNumber = index + 1
      return createRoom({
        id: `room-${roomNumber}`,
        roomId: String(1000 + roomNumber),
        name: `Room ${String(roomNumber).padStart(2, '0')}`,
        isActive: roomNumber % 2 === 1,
      })
    })
    setupChatworkHandlers({ initialRooms: rooms, jobStatuses: ['processing'] })
    renderChatworkSettingsPage()
    await screen.findByText('Room 01')

    // Act
    await user.click(screen.getByRole('button', { name: '次のページ' }))
    expect(await screen.findByText('Room 21')).toBeInTheDocument()
    const searchInput = screen.getByLabelText('検索')
    await user.clear(searchInput)
    await user.type(searchInput, 'Room 24')
    await user.selectOptions(screen.getByLabelText('状態'), 'inactive')

    // Assert
    expect(await screen.findByText('Room 24')).toBeInTheDocument()
    expect(screen.queryByText('Room 21')).not.toBeInTheDocument()
    const roomCard = getRoomItem('Room 24')
    expect(within(roomCard).getByRole('button', { name: '無効' })).toBeInTheDocument()
  })

  it('エラーフィルタでエラー付きルームのみ表示できる', async () => {
    // Arrange
    const user = userEvent.setup()
    setupChatworkHandlers({
      initialRooms: [
        createRoom({ id: 'room-1', roomId: '100', name: '正常ルーム', isActive: true }),
        createRoom({
          id: 'room-2',
          roomId: '200',
          name: 'エラールーム',
          isActive: false,
          lastErrorMessage: '認証エラー',
          lastErrorAt: '2026-02-01T00:00:00.000Z',
          lastErrorStatus: 401,
        }),
      ],
    })
    renderChatworkSettingsPage()
    await screen.findByText('正常ルーム')

    // Act
    await user.selectOptions(screen.getByLabelText('状態'), 'error')

    // Assert
    expect(await screen.findByText('エラールーム')).toBeInTheDocument()
    expect(screen.queryByText('正常ルーム')).not.toBeInTheDocument()
  })

  it('ジョブをキャンセルするとキャンセル状態と通知が表示される', async () => {
    // Arrange
    const user = userEvent.setup()
    setupChatworkHandlers({ jobStatuses: ['processing', 'processing'] })
    renderChatworkSettingsPage()
    await screen.findByText('営業ルーム')
    await user.click(screen.getByTestId('chatwork-room-sync'))

    // Act
    await user.click(await screen.findByRole('button', { name: 'キャンセル' }))

    // Assert
    expect(await screen.findByText('同期をキャンセルしました。')).toBeInTheDocument()
    expect(await screen.findByText('キャンセル済み')).toBeInTheDocument()
  })
})
