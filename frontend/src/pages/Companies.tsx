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

function Companies() {
  const { user } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [pagination, setPagination] = useState<Pagination>(defaultPagination)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

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
      if (!response.ok) {
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

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
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

      setForm({
        name: '',
        category: '',
        status: '',
        tags: '',
        profile: '',
      })
      fetchCompanies()
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
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="区分"
            value={filters.category}
            onChange={(event) => setFilters({ ...filters, category: event.target.value })}
          />
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="ステータス"
            value={filters.status}
            onChange={(event) => setFilters({ ...filters, status: event.target.value })}
          />
          <input
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            placeholder="タグ"
            value={filters.tag}
            onChange={(event) => setFilters({ ...filters, tag: event.target.value })}
          />
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
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">企業を追加</h3>
            <span className="text-xs text-slate-400">タグはカンマ区切り</span>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="企業名（必須）"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="区分"
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
            />
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="ステータス"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            />
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="タグ（例：VIP, 休眠）"
              value={form.tags}
              onChange={(event) => setForm({ ...form, tags: event.target.value })}
            />
            <textarea
              className="min-h-[88px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm md:col-span-2"
              placeholder="プロフィールメモ"
              value={form.profile}
              onChange={(event) => setForm({ ...form, profile: event.target.value })}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              追加
            </button>
          </div>
        </form>
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
