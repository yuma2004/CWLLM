import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Wholesale {
  id: string
  status: string
  projectId: string
  companyId: string
}

function Wholesales() {
  const { user } = useAuth()
  const canWrite = user?.role !== 'readonly'
  const [wholesales, setWholesales] = useState<Wholesale[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [form, setForm] = useState({ projectId: '', companyId: '', status: 'active' })
  const [formError, setFormError] = useState('')

  const fetchWholesales = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch('/api/wholesales?page=1&pageSize=50', {
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load wholesales')
      }
      setWholesales(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchWholesales()
  }, [fetchWholesales])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')
    if (!form.projectId.trim() || !form.companyId.trim()) {
      setFormError('projectId and companyId are required')
      return
    }

    try {
      const response = await fetch('/api/wholesales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          projectId: form.projectId.trim(),
          companyId: form.companyId.trim(),
          status: form.status,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create wholesale')
      }
      setForm({ projectId: '', companyId: '', status: 'active' })
      fetchWholesales()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Network error')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Wholesales</p>
        <h2 className="text-3xl font-bold text-slate-900">Wholesales</h2>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
      )}

      <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading wholesales...</div>
        ) : wholesales.length === 0 ? (
          <div className="text-sm text-slate-500">No wholesales.</div>
        ) : (
          <div className="space-y-3">
            {wholesales.map((wholesale) => (
              <div
                key={wholesale.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm"
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
            ))}
          </div>
        )}
      </div>

      {canWrite ? (
        <form
          onSubmit={handleCreate}
          className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <h3 className="text-lg font-semibold text-slate-900">Create wholesale</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Project ID"
              value={form.projectId}
              onChange={(event) => setForm({ ...form, projectId: event.target.value })}
            />
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
              Create
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          Write access required to create wholesales.
        </div>
      )}
    </div>
  )
}

export default Wholesales
