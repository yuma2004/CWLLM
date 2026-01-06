import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CompanySearchSelect from '../components/CompanySearchSelect'
import Pagination from '../components/ui/Pagination'
import FormSelect from '../components/ui/FormSelect'
import { usePermissions } from '../hooks/usePermissions'
import { usePagination } from '../hooks/usePagination'
import { apiRequest } from '../lib/apiClient'

interface Project {
  id: string
  name: string
  status: string
  companyId: string
}

function Projects() {
  const { canWrite } = usePermissions()
  const [projects, setProjects] = useState<Project[]>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('createdAt')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({ companyId: '', name: '' })
  const [formError, setFormError] = useState('')
  const { pagination, setPagination, setPage, setPageSize, paginationQuery } = usePagination()

  const fetchProjects = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams(paginationQuery)
      if (query.trim()) params.set('q', query.trim())
      if (sort) params.set('sort', sort)
      const data = await apiRequest<{
        items: Project[]
        pagination: { page: number; pageSize: number; total: number }
      }>(`/api/projects?${params.toString()}`)
      setProjects(data.items ?? [])
      setPagination((prev) => ({ ...prev, ...data.pagination }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ネットワークエラー')
    } finally {
      setIsLoading(false)
    }
  }, [paginationQuery, query, setPagination, sort])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')
    if (!form.companyId.trim() || !form.name.trim()) {
      setFormError('企業IDと案件名は必須です')
      return
    }
    try {
      await apiRequest('/api/projects', {
        method: 'POST',
        body: {
          companyId: form.companyId.trim(),
          name: form.name.trim(),
        },
      })
      setForm({ companyId: '', name: '' })
      fetchProjects()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'ネットワークエラー')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Projects</p>
        <h2 className="text-3xl font-bold text-slate-900">案件管理</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-2 text-xs">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="案件名で検索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <FormSelect value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="createdAt">Created</option>
            <option value="updatedAt">Updated</option>
            <option value="status">Status</option>
            <option value="name">Name</option>
          </FormSelect>
          <button
            type="button"
            onClick={fetchProjects}
            className="rounded-full bg-slate-900 px-4 py-1 text-xs font-semibold text-white"
          >
            検索
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {isLoading ? (
          <div className="text-sm text-slate-500">案件を読み込み中...</div>
        ) : projects.length === 0 ? (
          <div className="text-sm text-slate-500">案件はありません。</div>
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-semibold text-slate-900">{project.name}</div>
                  <div className="text-xs text-slate-500">{project.status}</div>
                </div>
                <Link
                  to={`/projects/${project.id}`}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  詳細へ
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {pagination.total > 0 && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {canWrite ? (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-slate-900">案件を作成</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <CompanySearchSelect
              value={form.companyId}
              onChange={(companyId) => setForm({ ...form, companyId })}
              placeholder="企業名で検索"
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="案件名"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>
          {formError && (
            <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {formError}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-sky-600 px-5 py-2 text-sm font-semibold text-white"
            >
              作成
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          案件を作成するには書き込み権限が必要です。
        </div>
      )}
    </div>
  )
}

export default Projects
