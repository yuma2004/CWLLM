import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

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

function ChatworkSettings() {
  const { user } = useAuth()
  const [rooms, setRooms] = useState<ChatworkRoom[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [syncMessage, setSyncMessage] = useState('')

  const fetchRooms = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/chatwork/rooms', { credentials: 'include' })
      if (!response.ok) {
        throw new Error('ルーム一覧の取得に失敗しました')
      }
      const data = await response.json()
      setRooms(data.rooms)
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchRooms()
    }
  }, [fetchRooms, user?.role])

  const handleRoomSync = async () => {
    setSyncMessage('')
    try {
      const response = await fetch('/api/chatwork/rooms/sync', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ルーム同期に失敗しました')
      }
      setSyncMessage(`ルーム同期完了: ${data.total}件`)
      fetchRooms()
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }

  const handleMessageSync = async () => {
    setSyncMessage('')
    try {
      const response = await fetch('/api/chatwork/messages/sync', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'メッセージ同期に失敗しました')
      }
      setSyncMessage(`メッセージ同期完了: ${data.rooms.length}ルーム`)
      fetchRooms()
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }

  const handleToggle = async (room: ChatworkRoom) => {
    try {
      const response = await fetch(`/api/chatwork/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !room.isActive }),
      })
      if (!response.ok) {
        throw new Error('更新に失敗しました')
      }
      fetchRooms()
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }

  if (user?.role !== 'admin') {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
        管理者のみがChatwork設定を操作できます。
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Settings</p>
        <h2 className="text-3xl font-bold text-slate-900">Chatwork 同期設定</h2>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleRoomSync}
          className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
        >
          ルーム同期
        </button>
        <button
          type="button"
          onClick={handleMessageSync}
          className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white"
        >
          メッセージ同期
        </button>
      </div>
      {syncMessage && (
        <div className="rounded-xl bg-slate-100 px-4 py-2 text-sm text-slate-600">
          {syncMessage}
        </div>
      )}
      {error && <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        <h3 className="text-lg font-semibold text-slate-900">ルーム一覧</h3>
        <div className="mt-4">
          {isLoading ? (
            <div className="text-sm text-slate-500">読み込み中...</div>
          ) : rooms.length === 0 ? (
            <div className="text-sm text-slate-500">ルームがまだ登録されていません。</div>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{room.name}</div>
                    <div className="text-xs text-slate-500">Room ID: {room.roomId}</div>
                    {room.lastErrorMessage && (
                      <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        <div>
                          Sync failed {room.lastErrorStatus ? ` (${room.lastErrorStatus})` : ''}
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
