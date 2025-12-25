import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface DashboardTask {
  id: string
  title: string
  dueDate?: string | null
  targetType: string
  targetId: string
}

interface DashboardSummary {
  id: string
  content: string
  createdAt: string
  company: {
    id: string
    name: string
  }
}

interface DashboardCompany {
  id: string
  name: string
  updatedAt: string
}

function Home() {
  const { user, logout } = useAuth()
  const [dueTasks, setDueTasks] = useState<DashboardTask[]>([])
  const [latestSummaries, setLatestSummaries] = useState<DashboardSummary[]>([])
  const [recentCompanies, setRecentCompanies] = useState<DashboardCompany[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await fetch('/api/dashboard', { credentials: 'include' })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load dashboard')
        }
        setDueTasks(data.dueTasks || [])
        setLatestSummaries(data.latestSummaries || [])
        setRecentCompanies(data.recentCompanies || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Dashboard</p>
          <h2 className="text-3xl font-bold text-slate-900">Dashboard</h2>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="rounded-full bg-white/80 px-4 py-2 text-slate-600 shadow">
            {user?.email} ({user?.role})
          </span>
          <button
            onClick={logout}
            className="rounded-full bg-rose-500 px-4 py-2 text-white hover:bg-rose-600"
          >
            Log out
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
          <h3 className="text-lg font-semibold text-slate-900">Overdue Tasks</h3>
          <p className="mt-1 text-xs text-slate-500">Tasks past due date.</p>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            {isLoading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : dueTasks.length === 0 ? (
              <div className="text-sm text-slate-500">No overdue tasks.</div>
            ) : (
              dueTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">{task.title}</div>
                    <div className="text-xs text-slate-500">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                    </div>
                  </div>
                  <Link
                    to={
                      task.targetType === 'company'
                        ? `/companies/${task.targetId}`
                        : task.targetType === 'project'
                          ? `/projects/${task.targetId}`
                          : `/wholesales/${task.targetId}`
                    }
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    View
                  </Link>
                </div>
              ))
            )}
          </div>
          <Link
            to="/tasks"
            className="mt-4 inline-flex items-center text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            Go to tasks Å®
          </Link>
        </div>
        <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
          <h3 className="text-lg font-semibold text-slate-900">Latest Summaries</h3>
          <div className="mt-4 space-y-3 text-sm text-slate-700">
            {isLoading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : latestSummaries.length === 0 ? (
              <div className="text-sm text-slate-500">No summaries yet.</div>
            ) : (
              latestSummaries.map((summary) => (
                <div key={summary.id} className="rounded-xl border border-slate-100 bg-white px-4 py-3">
                  <div className="text-xs text-slate-500">
                    {new Date(summary.createdAt).toLocaleDateString()}
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">{summary.company.name}</div>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-600">{summary.content}</p>
                  <Link
                    to={`/companies/${summary.company.id}`}
                    className="mt-2 inline-flex text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Open company Å®
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
          <h3 className="text-lg font-semibold text-slate-900">Recent Companies</h3>
          <div className="mt-4 space-y-2 text-sm text-slate-700">
            {isLoading ? (
              <div className="text-sm text-slate-500">Loading...</div>
            ) : recentCompanies.length === 0 ? (
              <div className="text-sm text-slate-500">No companies yet.</div>
            ) : (
              recentCompanies.map((company) => (
                <div key={company.id} className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-slate-900">{company.name}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(company.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Link
                    to={`/companies/${company.id}`}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    View
                  </Link>
                </div>
              ))
            )}
          </div>
          <Link
            to="/companies"
            className="mt-4 inline-flex items-center text-sm font-semibold text-sky-600 hover:text-sky-700"
          >
            Browse companies Å®
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Home
