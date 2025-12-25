import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

interface Wholesale {
  id: string
  status: string
  projectId: string
  companyId: string
  conditions?: string | null
  unitPrice?: number | null
  margin?: number | null
  agreedDate?: string | null
}

function WholesaleDetail() {
  const { id } = useParams<{ id: string }>()
  const [wholesale, setWholesale] = useState<Wholesale | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchWholesale = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/wholesales/${id}`, { credentials: 'include' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load wholesale')
      }
      setWholesale(data.wholesale)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchWholesale()
  }, [fetchWholesale])

  if (isLoading) {
    return <div className="text-slate-500">Loading...</div>
  }

  if (error) {
    return <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
  }

  if (!wholesale) {
    return <div className="text-slate-500">Wholesale not found.</div>
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Wholesale</p>
          <h2 className="text-3xl font-bold text-slate-900">{wholesale.id}</h2>
        </div>
        <Link to="/wholesales" className="text-sm text-slate-500 hover:text-slate-700">
          Back to list
        </Link>
      </div>

      <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        <h3 className="text-lg font-semibold text-slate-900">Wholesale details</h3>
        <dl className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Status</dt>
            <dd className="mt-1 text-slate-800">{wholesale.status}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Project</dt>
            <dd className="mt-1 text-slate-800">
              <Link to={`/projects/${wholesale.projectId}`} className="text-slate-700 hover:text-slate-900">
                {wholesale.projectId}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Company</dt>
            <dd className="mt-1 text-slate-800">
              <Link to={`/companies/${wholesale.companyId}`} className="text-slate-700 hover:text-slate-900">
                {wholesale.companyId}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Unit price</dt>
            <dd className="mt-1 text-slate-800">{wholesale.unitPrice ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Margin</dt>
            <dd className="mt-1 text-slate-800">{wholesale.margin ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Agreed</dt>
            <dd className="mt-1 text-slate-800">
              {wholesale.agreedDate ? new Date(wholesale.agreedDate).toLocaleDateString() : '-'}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">Conditions</dt>
            <dd className="mt-1 text-slate-800">{wholesale.conditions || '-'}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

export default WholesaleDetail
