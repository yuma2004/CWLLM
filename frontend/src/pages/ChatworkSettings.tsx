import { useCallback, useEffect, useState } from 'react'
import Button from '../components/ui/Button'
import ErrorAlert from '../components/ui/ErrorAlert'
import { usePermissions } from '../hooks/usePermissions'
import { apiRequest } from '../lib/apiClient'

interface ChatworkRoom {
  id: string
  roomId: string
  name: string
  description?: string | null
  isActive: boolean
  lastSyncAt?: string | null
  lastErrorAt?: string | null
  lastErrorMessage?: string | null
  lastErrorStatus?: number | null
}

interface JobRecord {
  id: string
  type: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'canceled'
  result?: Record<string, unknown> | null
  error?: { message?: string } | null
}

function ChatworkSettings() {
  const { isAdmin } = usePermissions()
  const [rooms, setRooms] = useState<ChatworkRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncMessage, setSyncMessage] = useState('')
  const [activeJob, setActiveJob] = useState<JobRecord | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const jobProgress = activeJob?.result as
    | { totalRooms?: number; processedRooms?: number; summary?: { rooms?: unknown[]; errors?: unknown[] } }
    | undefined

  const fetchRooms = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await apiRequest<{ rooms: ChatworkRoom[] }>('/api/chatwork/rooms')
      setRooms(data.rooms ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAdmin) {
      fetchRooms()
    }
  }, [fetchRooms, isAdmin])

  useEffect(() => {
    if (activeJob?.status === 'completed') {
      fetchRooms()
    }
  }, [activeJob?.status, fetchRooms])

  useEffect(() => {
    if (!activeJob?.id) return
    let isMounted = true
    let timer: number | undefined

    const poll = async () => {
      try {
        const data = await apiRequest<{ job: JobRecord }>(`/api/jobs/${activeJob.id}`)
        if (!isMounted) return
        setActiveJob(data.job)
        if (['completed', 'failed', 'canceled'].includes(data.job.status)) {
          if (timer) window.clearInterval(timer)
          setIsPolling(false)
        }
      } catch (err) {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Failed to check job status')
        if (timer) window.clearInterval(timer)
        setIsPolling(false)
      }
    }

    setIsPolling(true)
    void poll()
    timer = window.setInterval(poll, 2000)

    return () => {
      isMounted = false
      if (timer) window.clearInterval(timer)
      setIsPolling(false)
    }
  }, [activeJob?.id])

  const handleRoomSync = async () => {
    setSyncMessage('')
    try {
      const data = await apiRequest<{ jobId: string; status: JobRecord['status'] }>(
        '/api/chatwork/rooms/sync',
        {
          method: 'POST',
        }
      )
      setSyncMessage('Room sync queued')
      setActiveJob({ id: data.jobId, type: 'chatwork_rooms_sync', status: data.status })
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Failed to queue room sync')
    }
  }

  const handleMessageSync = async () => {
    setSyncMessage('')
    try {
      const data = await apiRequest<{ jobId: string; status: JobRecord['status'] }>(
        '/api/chatwork/messages/sync',
        {
          method: 'POST',
        }
      )
      setSyncMessage('Message sync queued')
      setActiveJob({ id: data.jobId, type: 'chatwork_messages_sync', status: data.status })
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : 'Failed to queue message sync')
    }
  }

  const handleToggle = async (room: ChatworkRoom) => {
    try {
      await apiRequest(`/api/chatwork/rooms/${room.id}`, {
        method: 'PATCH',
        body: { isActive: !room.isActive },
      })
      fetchRooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
        管理者のみがChatwork設定を操作できます。
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">設定</p>
        <h2 className="text-3xl font-bold text-slate-900">Chatwork 同期設定</h2>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={handleRoomSync}
          data-testid="chatwork-room-sync"
          variant="primary"
        >
          ルーム同期
        </Button>
        <Button type="button" onClick={handleMessageSync} variant="secondary">
          メッセージ同期
        </Button>
      </div>
      {syncMessage && (
        <div
          className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-600"
          data-testid="chatwork-sync-message"
        >
          {syncMessage}
        </div>
      )}
      {activeJob && (
        <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-600">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Job: {activeJob.type}</span>
            <span className="text-xs font-semibold uppercase">{activeJob.status}</span>
          </div>
          {jobProgress?.totalRooms !== undefined && (
            <div className="mt-1 text-xs text-slate-500">
              {jobProgress.processedRooms ?? 0}/{jobProgress.totalRooms} rooms
            </div>
          )}
          {activeJob.status === 'completed' && jobProgress?.summary && (
            <div className="mt-1 text-xs text-slate-500">
              Synced: {jobProgress.summary.rooms?.length ?? 0} rooms / Errors: {jobProgress.summary.errors?.length ?? 0}
            </div>
          )}
          {activeJob.error?.message && (
            <div className="mt-1 text-xs text-rose-600">{activeJob.error.message}</div>
          )}
          {isPolling && <div className="mt-1 text-xs text-slate-500">Updating?</div>}
        </div>
      )}

      {error && <ErrorAlert message={error} />}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">ルーム一覧</h3>

        <div className="mt-4">
          {isLoading ? (
            <div className="text-sm text-slate-500" data-testid="chatwork-room-loading">
              読み込み中...
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-sm text-slate-500" data-testid="chatwork-room-empty">
              ルームがまだ登録されていません。
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  data-testid="chatwork-room-item"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{room.name}</div>
                    <div className="text-xs text-slate-500">Room ID: {room.roomId}</div>
                    {room.lastErrorMessage && (
                      <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        <div>
                          同期失敗{room.lastErrorStatus ? ` (${room.lastErrorStatus})` : ''}
                        </div>
                        <div className="mt-1 whitespace-pre-wrap text-rose-600">
                          {room.lastErrorMessage}
                        </div>
                        {room.lastErrorAt && (
                          <div className="mt-1 text-[11px] text-rose-500">
                            {new Date(room.lastErrorAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(room)}
                    className={`rounded-full px-4 py-1 text-xs font-semibold ${
                      room.isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {room.isActive ? '取り込み中' : '除外中'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatworkSettings

