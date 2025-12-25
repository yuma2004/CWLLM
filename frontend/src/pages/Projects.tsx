import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Project {
  id: string
  name: string
  status: string
  companyId: string
}

function Projects() {
  const { user } = useAuth()
  const canWrite = user?.role !== 'readonly'
  const [projects, setProjects] = useState<Project[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({ companyId: '', name: '' })
  const [formError, setFormError] = useState('')

  const fetchProjects = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', '1')
      params.set('pageSize', '50')
      if (query.trim()) params.set('q', query.trim())

      const response = await fetch(`/api/projects?${params.toString()}`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load projects')
      }
      setProjects(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }, [query])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')
    if (!form.companyId.trim() || !form.name.trim()) {
      setFormError('companyId and name are required')
      return
    }
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          companyId: form.companyId.trim(),
          name: form.name.trim(),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create project')
      }
      setForm({ companyId: '', name: '' })
      fetchProjects()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Network error')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Projects</p>
        <h2 className="text-3xl font-bold text-slate-900">Projects</h2>
      </div>

      <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-wrap gap-2 text-xs">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="Search by name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button
            type="button"
            onClick={fetchProjects}
            className="rounded-full bg-slate-900 px-4 py-1 text-xs font-semibold text-white"
          >
            Search
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
      )}

      <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-sm text-slate-500">No projects.</div>
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
                  Open
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {canWrite ? (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <h3 className="text-lg font-semibold text-slate-900">Create project</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Company ID"
              value={form.companyId}
              onChange={(event) => setForm({ ...form, companyId: event.target.value })}
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Project name"
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
              Create
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          Write access required to create projects.
        </div>
      )}
    </div>
  )
}

export default Projects
