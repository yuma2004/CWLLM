import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import CompanySearchSelect from '../components/CompanySearchSelect'
import Pagination from '../components/ui/Pagination'
import FormSelect from '../components/ui/FormSelect'
import { usePermissions } from '../hooks/usePermissions'
import { useFetch, useMutation } from '../hooks/useApi'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { usePagination } from '../hooks/usePagination'
import { ApiListResponse, Project } from '../types'

function Projects() {
  const { canWrite } = usePermissions()
  const location = useLocation()
  const navigate = useNavigate()
  const initialParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const initialQuery = initialParams.get('q') ?? ''
  const initialSortParam = initialParams.get('sort') ?? 'createdAt'
  const initialSort = ['createdAt', 'updatedAt', 'status', 'name'].includes(initialSortParam)
    ? initialSortParam
    : 'createdAt'
  const initialPageSize = Math.max(Number(initialParams.get('pageSize')) || 20, 1)
  const initialPage = Math.max(Number(initialParams.get('page')) || 1, 1)
  const [query, setQuery] = useState(initialQuery)
  const [sort, setSort] = useState(initialSort)
  const [form, setForm] = useState({ companyId: '', name: '' })
  const [formError, setFormError] = useState('')
  const { pagination, setPagination, setPage, setPageSize, paginationQuery } =
    usePagination(initialPageSize)
  const debouncedQuery = useDebouncedValue(query, 300)

  const queryString = useMemo(() => {
    const params = new URLSearchParams(paginationQuery)
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
    if (sort) params.set('sort', sort)
    return params.toString()
  }, [debouncedQuery, paginationQuery, sort])

  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    error: fetchError,
    refetch: refetchProjects,
  } = useFetch<ApiListResponse<Project>>(`/api/projects?${queryString}`, {
    errorMessage: 'ネットワークエラー',
    onSuccess: (data) => {
      setPagination((prev) => ({ ...prev, ...data.pagination }))
    },
  })

  const projects = projectsData?.items ?? []

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setQuery(params.get('q') ?? '')
    const nextSortParam = params.get('sort') ?? 'createdAt'
    const nextSort = ['createdAt', 'updatedAt', 'status', 'name'].includes(nextSortParam)
      ? nextSortParam
      : 'createdAt'
    setSort(nextSort)
    const nextPage = Math.max(Number(params.get('page')) || initialPage, 1)
    const nextPageSize = Math.max(Number(params.get('pageSize')) || initialPageSize, 1)
    setPagination((prev) => ({
      ...prev,
      page: nextPage,
      pageSize: nextPageSize,
    }))
  }, [initialPage, initialPageSize, location.search, setPagination])

  useEffect(() => {
    const params = new URLSearchParams()
    if (debouncedQuery.trim()) params.set('q', debouncedQuery.trim())
    if (sort) params.set('sort', sort)
    params.set('page', String(pagination.page))
    params.set('pageSize', String(pagination.pageSize))
    const nextSearch = params.toString()
    const currentSearch = location.search.replace(/^\?/, '')
    if (nextSearch !== currentSearch) {
      navigate({ pathname: '/projects', search: nextSearch }, { replace: true })
    }
  }, [debouncedQuery, location.search, navigate, pagination.page, pagination.pageSize, sort])

  const { mutate: createProject, isLoading: isCreating } = useMutation<
    { project: Project },
    { companyId: string; name: string }
  >('/api/projects', 'POST')

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')
    if (!form.companyId.trim() || !form.name.trim()) {
      setFormError('企業IDと案件名は必須です')
      return
    }
    try {
      await createProject(
        {
          companyId: form.companyId.trim(),
          name: form.name.trim(),
        },
        { errorMessage: 'ネットワークエラー' }
      )
      setForm({ companyId: '', name: '' })
      void refetchProjects(undefined, { ignoreCache: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'ネットワークエラー')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Project</p>
        <h2 className="text-3xl font-bold text-slate-900">案件管理</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-2 text-xs">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="案件名で検索"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
          />
          <FormSelect
            value={sort}
            onChange={(event) => {
              setSort(event.target.value)
              setPage(1)
            }}
          >
            <option value="createdAt">作成日</option>
            <option value="updatedAt">更新日</option>
            <option value="status">ステータス</option>
            <option value="name">名前</option>
          </FormSelect>
          <button
            type="button"
            onClick={() => {
              setPage(1)
              void refetchProjects(undefined, { ignoreCache: true })
            }}
            className="rounded-full bg-slate-900 px-4 py-1 text-xs font-semibold text-white"
          >
            検索
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{fetchError}</div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {isLoadingProjects ? (
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
              disabled={isCreating}
            >
              {isCreating ? '作成中...' : '作成'}
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
