import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

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

interface Company {
  id: string
  name: string
}

const formatDate = (value: Date) => value.toISOString().slice(0, 10)

function MessageSearch() {
  const location = useLocation()
  const initialParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const initialQuery = initialParams.get('q') ?? ''
  const initialMessageId = initialParams.get('messageId') ?? ''
  const initialCompanyId = initialParams.get('companyId') ?? ''

  const [query, setQuery] = useState(initialQuery)
  const [messageId, setMessageId] = useState(initialMessageId)
  const [companyId, setCompanyId] = useState(initialCompanyId)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [preset, setPreset] = useState<'all' | '7' | '30' | 'custom'>('all')
  const [results, setResults] = useState<MessageResult[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(false)
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

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

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
    if (!trimmed && !messageId.trim() && !companyId.trim()) {
      setError('キーワード、メッセージID、または企業を入力してください')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (trimmed) params.set('q', trimmed)
      if (messageId.trim()) params.set('messageId', messageId.trim())
      if (companyId.trim()) params.set('companyId', companyId.trim())
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
      setError(err instanceof Error ? err.message : 'ネットワークエラー')
    } finally {
      setIsLoading(false)
    }
  }, [companyId, from, messageId, query, to])

  useEffect(() => {
    if (initialQuery || initialMessageId) {
      handleSearch()
    }
  }, [handleSearch, initialMessageId, initialQuery])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    handleSearch()
  }

  const handleAssign = async (messageId: string) => {
    const targetCompanyId = assignTarget[messageId]
    if (!targetCompanyId) {
      setError('企業を選択してください')
      return
    }
    setError('')
    try {
      const response = await fetch(`/api/messages/${messageId}/assign-company`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ companyId: targetCompanyId }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '割当てに失敗しました')
      }
      // 割り当て成功後、該当メッセージの選択をクリアして再検索
      setAssignTarget((prev) => {
        const next = { ...prev }
        delete next[messageId]
        return next
      })
      handleSearch()
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Search</p>
        <h2 className="text-3xl font-bold text-slate-900">メッセージ検索</h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => applyPreset(7)}
            className={`rounded-full px-4 py-1 font-semibold ${
              preset === '7' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            過去7日
          </button>
          <button
            type="button"
            onClick={() => applyPreset(30)}
            className={`rounded-full px-4 py-1 font-semibold ${
              preset === '30' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            過去30日
          </button>
          <button
            type="button"
            onClick={() => applyPreset()}
            className={`rounded-full px-4 py-1 font-semibold ${
              preset === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            全て
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="キーワード"
            aria-label="search-query"
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
            aria-label="search-submit"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
          >
            検索
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr]">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="メッセージID"
            value={messageId}
            onChange={(event) => setMessageId(event.target.value)}
          />
          <select
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
            value={companyId}
            onChange={(event) => setCompanyId(event.target.value)}
          >
            <option value="">全ての企業</option>
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
        </div>
      </form>

      {error && <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
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
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>Room: {message.roomId}</span>
                    {message.companyId ? (
                      <Link
                        to={`/companies/${message.companyId}`}
                        className="font-semibold text-slate-700 hover:text-slate-900"
                      >
                        企業を表示
                      </Link>
                    ) : (
                      <span className="text-slate-400">未割当</span>
                    )}
                  </div>
                  {!message.companyId && (
                    <div className="flex flex-wrap gap-2 items-center">
                      <select
                        className="rounded-xl border border-slate-200 px-3 py-1 text-xs bg-white"
                        value={assignTarget[message.id] || ''}
                        onChange={(event) =>
                          setAssignTarget((prev) => ({
                            ...prev,
                            [message.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">企業を選択...</option>
                        {companies.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAssign(message.id)}
                        disabled={!assignTarget[message.id]}
                        className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
                      >
                        割当て
                      </button>
                    </div>
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
