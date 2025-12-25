import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'

interface MessageResult {
  id: string
  roomId: string
  messageId: string
  sender: string
  body: string
  sentAt: string
  companyId?: string | null
  labels?: string[]
}

const formatDate = (value: Date) => value.toISOString().slice(0, 10)

function MessageSearch() {
  const [query, setQuery] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [preset, setPreset] = useState<'all' | '7' | '30' | 'custom'>('all')
  const [results, setResults] = useState<MessageResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const applyPreset = (days?: number) => {
    if (!days) {
      setPreset('all')
      setFrom('')
      setTo('')
      return
    }
    const today = new Date()
    const fromDate = new Date(today)
    fromDate.setDate(today.getDate() - days + 1)
    setPreset(days === 7 ? '7' : '30')
    setFrom(formatDate(fromDate))
    setTo(formatDate(today))
  }

  const handleSearch = useCallback(async () => {
    const trimmed = query.trim()
    if (!trimmed) {
      setError('検索キーワードを入力してください')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      params.set('q', trimmed)
      params.set('page', '1')
      params.set('pageSize', '50')
      if (from) params.set('from', from)
      if (to) params.set('to', to)

      const response = await fetch(`/api/messages/search?${params.toString()}`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '検索に失敗しました')
      }
      setResults(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [from, query, to])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    handleSearch()
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Search</p>
        <h2 className="text-3xl font-bold text-slate-900">メッセージ検索</h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur"
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => applyPreset(7)}
            className={`rounded-full px-4 py-1 font-semibold ${
              preset === '7' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            直近7日
          </button>
          <button
            type="button"
            onClick={() => applyPreset(30)}
            className={`rounded-full px-4 py-1 font-semibold ${
              preset === '30' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            直近30日
          </button>
          <button
            type="button"
            onClick={() => applyPreset()}
            className={`rounded-full px-4 py-1 font-semibold ${
              preset === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            全期間
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="キーワード"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <input
            type="date"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value)
              setPreset('custom')
            }}
          />
          <input
            type="date"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={to}
            onChange={(event) => {
              setTo(event.target.value)
              setPreset('custom')
            }}
          />
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
          >
            検索
          </button>
        </div>
      </form>

      {error && <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        {isLoading ? (
          <div className="text-sm text-slate-500">検索中...</div>
        ) : results.length === 0 ? (
          <div className="text-sm text-slate-500">検索結果がありません。</div>
        ) : (
          <div className="space-y-4">
            {results.map((message) => (
              <div
                key={message.id}
                className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{message.sender}</span>
                  <span>{new Date(message.sentAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{message.body}</p>
                {message.labels && message.labels.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {message.labels.map((label) => (
                      <span
                        key={label}
                        className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600"
                      >
                        #{label}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>Room: {message.roomId}</span>
                  {message.companyId ? (
                    <Link
                      to={`/companies/${message.companyId}`}
                      className="font-semibold text-slate-700 hover:text-slate-900"
                    >
                      企業詳細へ
                    </Link>
                  ) : (
                    <span className="text-slate-400">未紐づけ</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MessageSearch
