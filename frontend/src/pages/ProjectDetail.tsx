import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Project {
  id: string
  name: string
  status: string
  companyId: string
  conditions?: string | null
  unitPrice?: number | null
}

interface Wholesale {
  id: string
  status: string
  companyId: string
}

function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const canWrite = user?.role !== 'readonly'
  const [project, setProject] = useState<Project | null>(null)
  const [wholesales, setWholesales] = useState<Wholesale[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ companyId: '', status: 'active' })
  const [formError, setFormError] = useState('')

  const fetchData = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError('')
    try {
      const [projectResponse, wholesaleResponse] = await Promise.all([
        fetch(`/api/projects/${id}`, { credentials: 'include' }),
        fetch(`/api/projects/${id}/wholesales`, { credentials: 'include' }),
      ])

      const projectData = await projectResponse.json()
      const wholesaleData = await wholesaleResponse.json()

      if (!projectResponse.ok) {
        throw new Error(projectData.error || 'Failed to load project')
      }
      if (!wholesaleResponse.ok) {
        throw new Error(wholesaleData.error || 'Failed to load wholesales')
      }

      setProject(projectData.project)
      setWholesales(wholesaleData.wholesales)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleCreateWholesale = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!id) return
    setFormError('')
    if (!form.companyId.trim()) {
      setFormError('companyId is required')
      return
    }

    try {
      const response = await fetch('/api/wholesales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId: id,
          companyId: form.companyId.trim(),
          status: form.status,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create wholesale')
      }
      setForm({ companyId: '', status: 'active' })
      fetchData()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Network error')
    }
  }

  if (isLoading) {
    return <div className="text-slate-500">Loading...</div>
  }

  if (error) {
    return <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
  }

  if (!project) {
    return <div className="text-slate-500">Project not found.</div>
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Project</p>
          <h2 className="text-3xl font-bold text-slate-900">{project.name}</h2>
        </div>
        <Link to="/projects" className="text-sm text-slate-500 hover:text-slate-700">
          Back to list
        </Link>
      </div>

      <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        <h3 className="text-lg font-semibold text-slate-900">Project details</h3>
        <dl className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</dt>
            <dd className="mt-1 text-slate-800">{project.status}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Company</dt>
            <dd className="mt-1 text-slate-800">
              <Link to={`/companies/${project.companyId}`} className="text-slate-700 hover:text-slate-900">
                {project.companyId}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Unit price</dt>
            <dd className="mt-1 text-slate-800">{project.unitPrice ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Conditions</dt>
            <dd className="mt-1 text-slate-800">{project.conditions || '-'}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Wholesales</h3>
          <span className="text-xs text-slate-400">{wholesales.length} items</span>
        </div>
        <div className="mt-4 space-y-2 text-sm">
          {wholesales.length === 0 ? (
            <div className="text-sm text-slate-500">No wholesales yet.</div>
          ) : (
            wholesales.map((wholesale) => (
              <div
                key={wholesale.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-2"
              >
                <div>
                  <div className="font-semibold text-slate-900">{wholesale.id}</div>
                  <div className="text-xs text-slate-500">{wholesale.status}</div>
                </div>
                <Link
                  to={`/wholesales/${wholesale.id}`}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Open
                </Link>
              </div>
            ))
          )}
        </div>
      </div>

      {canWrite ? (
        <form
          onSubmit={handleCreateWholesale}
          className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <h3 className="text-lg font-semibold text-slate-900">Add wholesale</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Company ID"
              value={form.companyId}
              onChange={(event) => setForm({ ...form, companyId: event.target.value })}
            />
            <select
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="closed">closed</option>
            </select>
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
              Add wholesale
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          Write access required to add wholesales.
        </div>
      )}
    </div>
  )
}

export default ProjectDetail
