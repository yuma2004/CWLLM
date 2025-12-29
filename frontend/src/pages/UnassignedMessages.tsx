import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface MessageItem {
  id: string
  roomId: string
  messageId: string
  sender: string
  body: string
  sentAt: string
}

interface Company {
  id: string
  name: string
}

function UnassignedMessages() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)
  const [error, setError] = useState('')
  const [assignTarget, setAssignTarget] = useState<Record<string, string>>({})

  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true)
    try {
      const response = await fetch('/api/companies?page=1&pageSize=1000', {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('企業一覧の取得に失敗しました')
      }
      const data = await response.json()
      setCompanies(data.items || [])
    } catch (err) {
      console.error('企業一覧の取得エラー:', err)
    } finally {
      setIsLoadingCompanies(false)
    }
  }, [])

  const fetchMessages = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/messages/unassigned', { credentials: 'include' })
      if (!response.ok) {
        throw new Error('未紐づけメッセージの取得に失敗しました')
      }
      const data = await response.json()
      setMessages(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMessages()
    fetchCompanies()
  }, [fetchMessages, fetchCompanies])

  const handleAssign = async (messageId: string) => {
    const companyId = assignTarget[messageId]
    if (!companyId) {
      setError('企業を選択してください')
      return
    }
    setError('')
    try {
      const response = await fetch(`/api/messages/${messageId}/assign-company`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ companyId }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '割当てに失敗しました')
      }
      // 割り当て成功後、該当メッセージの選択をクリア
      setAssignTarget((prev) => {
        const next = { ...prev }
        delete next[messageId]
        return next
      })
      fetchMessages()
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }

  const canWrite = user?.role !== 'readonly'

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Inbox</p>
        <h2 className="text-3xl font-bold text-slate-900">未紐づけメッセージ</h2>
      </div>
      {error && <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}
      <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        {isLoading ? (
          <div className="text-sm text-slate-500">読み込み中...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-slate-500">未紐づけメッセージはありません。</div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{message.sender}</span>
                  <span>{new Date(message.sentAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{message.body}</p>
                <div className="mt-2 text-xs text-slate-400">Room: {message.roomId}</div>
                {canWrite ? (
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <select
                      className="flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3 py-1.5 text-sm bg-white"
                      value={assignTarget[message.id] || ''}
                      onChange={(event) =>
                        setAssignTarget((prev) => ({
                          ...prev,
                          [message.id]: event.target.value,
                        }))
                      }
                    >
                      <option value="">企業を選択...</option>
                      {isLoadingCompanies ? (
                        <option disabled>読み込み中...</option>
                      ) : (
                        companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAssign(message.id)}
                      disabled={!assignTarget[message.id]}
                      className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                    >
                      割当て
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 text-xs text-slate-400">
                    閲覧専用ロールは割当てできません。
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default UnassignedMessages
