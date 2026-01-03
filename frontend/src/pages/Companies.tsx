import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Company {
  id: string
  name: string
  category?: string | null
  status: string
  tags: string[]
  ownerId?: string | null
  profile?: string | null
}

interface ChatworkRoom {
  id: string
  roomId: string
  name: string
  description?: string | null
  isActive: boolean
}

interface Pagination {
  page: number
  pageSize: number
  total: number
}

const defaultPagination: Pagination = {
  page: 1,
  pageSize: 20,
  total: 0,
}

interface CompanyOptions {
  categories: string[]
  statuses: string[]
  tags: string[]
}

function Companies() {
  const { user } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [pagination, setPagination] = useState<Pagination>(defaultPagination)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showChatworkSelector, setShowChatworkSelector] = useState(false)
  const [chatworkRooms, setChatworkRooms] = useState<ChatworkRoom[]>([])
  const [isLoadingRooms, setIsLoadingRooms] = useState(false)
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [options, setOptions] = useState<CompanyOptions>({
    categories: [],
    statuses: [],
    tags: [],
  })

  const [filters, setFilters] = useState({
    q: '',
    category: '',
    status: '',
    tag: '',
    ownerId: '',
  })

  const [form, setForm] = useState({
    name: '',
    category: '',
    status: '',
    tags: '',
    profile: '',
  })

  const canWrite = user?.role !== 'readonly'

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.q) params.set('q', filters.q)
    if (filters.category) params.set('category', filters.category)
    if (filters.status) params.set('status', filters.status)
    if (filters.tag) params.set('tag', filters.tag)
    if (filters.ownerId) params.set('ownerId', filters.ownerId)
    params.set('page', String(pagination.page))
    params.set('pageSize', String(pagination.pageSize))
    return params.toString()
  }, [filters, pagination.page, pagination.pageSize])

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/companies?${queryString}`, {
        credentials: 'include',
      })
      if (!response?.ok) {
        throw new Error('企業一覧の取得に失敗しました')
      }
      const data = await response.json()
      setCompanies(data.items)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [queryString])

  const fetchChatworkRooms = useCallback(async () => {
    setIsLoadingRooms(true)
    try {
      const response = await fetch('/api/chatwork/rooms', { credentials: 'include' })
      if (!response?.ok) {
        throw new Error('Chatworkルーム一覧の取得に失敗しました')
      }
      const data = await response.json()
      setChatworkRooms(data.rooms || [])
    } catch (err) {
      console.error('Chatworkルーム一覧の取得エラー:', err)
      setError('Chatworkルーム一覧の取得に失敗しました。管理者権限が必要な場合があります。')
    } finally {
      setIsLoadingRooms(false)
    }
  }, [])

  const fetchOptions = useCallback(async () => {
    try {
      const response = await fetch('/api/companies/options', { credentials: 'include' })
      if (response?.ok) {
        const data = await response.json()
        setOptions({
          categories: data?.categories ?? [],
          statuses: data?.statuses ?? [],
          tags: data?.tags ?? [],
        })
      }
    } catch (err) {
      console.error('候補の取得エラー:', err)
    }
  }, [])

  useEffect(() => {
    fetchCompanies()
    fetchOptions()
  }, [fetchCompanies, fetchOptions])

  useEffect(() => {
    if (showChatworkSelector) {
      fetchChatworkRooms()
    }
  }, [showChatworkSelector, fetchChatworkRooms])

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleRoomSelect = (room: ChatworkRoom) => {
    setSelectedRoomId(room.roomId)
    setForm({
      ...form,
      name: room.name,
      profile: room.description || '',
    })
    setShowChatworkSelector(false)
  }

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('企業名は必須です')
      return
    }

    const tags = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          category: form.category || undefined,
          status: form.status || undefined,
          profile: form.profile || undefined,
          tags,
        }),
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || '企業の作成に失敗しました')
      }

      const companyData = await response.json()
      const newCompanyId = companyData.company?.id

      // Chatworkルームが選択されている場合、自動的に紐づける
      if (selectedRoomId && newCompanyId) {
        try {
          await fetch(`/api/companies/${newCompanyId}/chatwork-rooms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ roomId: selectedRoomId }),
          })
        } catch (err) {
          console.error('ルームの紐づけに失敗しました:', err)
          // 企業は作成されたが、ルームの紐づけに失敗した場合は警告のみ
        }
      }

      setForm({
        name: '',
        category: '',
        status: '',
        tags: '',
        profile: '',
      })
      setSelectedRoomId('')
      setShowChatworkSelector(false)
      fetchCompanies()
      fetchOptions() // 候補を更新
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }

  const handlePageChange = (nextPage: number) => {
    setPagination((prev) => ({ ...prev, page: nextPage }))
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Company</p>
          <h2 className="text-3xl font-bold text-slate-900">企業一覧</h2>
        </div>
        <div className="text-sm text-slate-500">
          登録数: <span className="font-semibold text-slate-700">{pagination.total}</span>
        </div>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="rounded-2xl bg-white/80 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur"
      >
        <div className="grid gap-4 md:grid-cols-5">
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="企業名で検索"
            value={filters.q}
            onChange={(event) => setFilters({ ...filters, q: event.target.value })}
          />
          <div className="relative">
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full"
              placeholder="区分"
              value={filters.category}
              onChange={(event) => setFilters({ ...filters, category: event.target.value })}
              list="category-options"
            />
            <datalist id="category-options">
              {options.categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
          <div className="relative">
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full"
              placeholder="ステータス"
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
              list="status-options"
            />
            <datalist id="status-options">
              {options.statuses.map((status) => (
                <option key={status} value={status} />
              ))}
            </datalist>
          </div>
          <div className="relative">
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full"
              placeholder="タグ"
              value={filters.tag}
              onChange={(event) => setFilters({ ...filters, tag: event.target.value })}
              list="tag-filter-options"
            />
            <datalist id="tag-filter-options">
              {options.tags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
          </div>
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="担当者ID"
            value={filters.ownerId}
            onChange={(event) => setFilters({ ...filters, ownerId: event.target.value })}
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
          >
            検索
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters({ q: '', category: '', status: '', tag: '', ownerId: '' })
              setPagination((prev) => ({ ...prev, page: 1 }))
            }}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            条件をリセット
          </button>
        </div>
      </form>

      {canWrite ? (
        <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">企業を追加</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">タグはカンマ区切り</span>
              <button
                type="button"
                onClick={() => {
                  setShowChatworkSelector(!showChatworkSelector)
                  if (!showChatworkSelector) {
                    fetchChatworkRooms()
                  }
                }}
                className="text-xs px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
              >
                {showChatworkSelector ? '手動入力に戻る' : 'Chatworkから選択'}
              </button>
            </div>
          </div>

          {showChatworkSelector ? (
            <div className="space-y-4">
              {isLoadingRooms ? (
                <div className="text-sm text-slate-500 py-4">Chatworkルームを読み込み中...</div>
              ) : chatworkRooms.length === 0 ? (
                <div className="text-sm text-slate-500 py-4">
                  Chatworkルームが見つかりませんでした。管理者がルーム同期を実行してください。
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 rounded-xl p-3">
                  {chatworkRooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => handleRoomSelect(room)}
                      className="w-full text-left p-3 rounded-lg border border-slate-200 hover:bg-slate-50 hover:border-indigo-300 transition-colors"
                    >
                      <div className="font-medium text-slate-900">{room.name}</div>
                      {room.description && (
                        <div className="text-xs text-slate-500 mt-1 line-clamp-1">
                          {room.description}
                        </div>
                      )}
                      <div className="text-xs text-slate-400 mt-1">Room ID: {room.roomId}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              {selectedRoomId && (
                <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2 text-sm text-indigo-700">
                  Chatworkルームから選択中: {form.name} (Room ID: {selectedRoomId})
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  placeholder="企業名（必須）"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
                <div className="relative">
                  <input
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full"
                    placeholder="区分"
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                    list="form-category-options"
                  />
                  <datalist id="form-category-options">
                    {options.categories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>
                <div className="relative">
                  <input
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full"
                    placeholder="ステータス"
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value })}
                    list="form-status-options"
                  />
                  <datalist id="form-status-options">
                    {options.statuses.map((status) => (
                      <option key={status} value={status} />
                    ))}
                  </datalist>
                </div>
                <div className="relative">
                  <input
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm w-full"
                    placeholder="タグ（例：VIP, 休眠）"
                    value={form.tags}
                    onChange={(event) => setForm({ ...form, tags: event.target.value })}
                    list="form-tag-options"
                  />
                  <datalist id="form-tag-options">
                    {options.tags.map((tag) => (
                      <option key={tag} value={tag} />
                    ))}
                  </datalist>
                </div>
                <textarea
                  className="min-h-[88px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm md:col-span-2"
                  placeholder="プロフィールメモ"
                  value={form.profile}
                  onChange={(event) => setForm({ ...form, profile: event.target.value })}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-700"
                >
                  追加
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          閲覧専用ロールのため、企業の追加・編集はできません。
        </div>
      )}

      {error && <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="overflow-hidden rounded-2xl bg-white/80 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3">企業名</th>
              <th className="px-5 py-3">区分</th>
              <th className="px-5 py-3">ステータス</th>
              <th className="px-5 py-3">タグ</th>
              <th className="px-5 py-3">担当者</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                  読み込み中...
                </td>
              </tr>
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-slate-500">
                  企業がまだ登録されていません
                </td>
              </tr>
            ) : (
              companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50/80">
                  <td className="px-5 py-4">
                    <Link
                      to={`/companies/${company.id}`}
                      className="font-semibold text-slate-900 hover:text-sky-600"
                    >
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{company.category || '-'}</td>
                  <td className="px-5 py-4 text-slate-600">{company.status}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {company.tags.length > 0 ? (
                        company.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{company.ownerId || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {pagination.page} / {Math.max(Math.ceil(pagination.total / pagination.pageSize), 1)}
        </span>
        <div className="flex gap-2">
          <button
            className="rounded-full border border-slate-200 px-4 py-1"
            disabled={pagination.page <= 1}
            onClick={() => handlePageChange(pagination.page - 1)}
          >
            前へ
          </button>
          <button
            className="rounded-full border border-slate-200 px-4 py-1"
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
            onClick={() => handlePageChange(pagination.page + 1)}
          >
            次へ
          </button>
        </div>
      </div>
    </div>
  )
}

export default Companies
