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
          throw new Error(data.error || 'ダッシュボードの読み込みに失敗しました')
        }
        setDueTasks(data.dueTasks || [])
        setLatestSummaries(data.latestSummaries || [])
        setRecentCompanies(data.recentCompanies || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ネットワークエラー')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            ダッシュボード
          </h2>
          <p className="text-slate-500 text-sm mt-1">ワークスペースの概要</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-md border border-slate-200">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            <span className="text-slate-600 font-medium">
              {user?.email}
            </span>
          </div>
          <button
            onClick={logout}
            className="text-slate-500 hover:text-slate-900 font-medium transition-colors"
          >
            ログアウト
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Overdue Tasks Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col h-full shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-6 bg-rose-500 rounded-sm"></span>
              期限切れタスク
            </h3>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">
              {dueTasks.length} 件
            </span>
          </div>

          <div className="flex-1 space-y-3">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-50 rounded" />)}
              </div>
            ) : dueTasks.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-center text-slate-400">
                <p className="text-sm">期限切れタスクはありません</p>
              </div>
            ) : (
              dueTasks.map((task) => (
                <div key={task.id} className="flex items-start justify-between group p-2 -mx-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="min-w-0 pr-2">
                    <div className="font-medium text-slate-900 text-sm truncate">{task.title}</div>
                    <div className="text-xs text-rose-500 flex items-center gap-1 mt-0.5">
                      期限: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
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
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-indigo-600 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              ))
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              to="/tasks"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
            >
              全てのタスクを表示
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>

        {/* Latest Summaries Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col h-full shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-6 bg-purple-500 rounded-sm"></span>
              最新の要約
            </h3>
          </div>

          <div className="flex-1 space-y-4">
            {isLoading ? (
              <div className="animate-pulse space-y-4">
                 {[1, 2, 3].map(i => <div key={i} className="h-16 bg-slate-50 rounded" />)}
              </div>
            ) : latestSummaries.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-center text-slate-400">
                <p className="text-sm">要約はまだありません</p>
              </div>
            ) : (
              latestSummaries.map((summary) => (
                <div key={summary.id} className="relative pl-4 border-l-2 border-slate-100 hover:border-purple-200 transition-colors">
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="text-xs text-slate-400">
                      {new Date(summary.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="font-medium text-slate-900 text-sm mb-1">{summary.company.name}</div>
                  <p className="line-clamp-2 text-xs text-slate-500 leading-relaxed">{summary.content}</p>
                  <Link
                    to={`/companies/${summary.company.id}`}
                    className="absolute inset-0"
                    aria-label={`${summary.company.name} の要約を表示`}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Companies Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col h-full shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
               <span className="w-2 h-6 bg-sky-500 rounded-sm"></span>
              最近更新した企業
            </h3>
          </div>

          <div className="flex-1 space-y-3">
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-50 rounded" />)}
              </div>
            ) : recentCompanies.length === 0 ? (
              <div className="h-32 flex flex-col items-center justify-center text-center text-slate-400">
                <p className="text-sm">企業はまだありません</p>
              </div>
            ) : (
              recentCompanies.map((company) => (
                <div key={company.id} className="flex items-center justify-between group p-2 -mx-2 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                      {company.name.slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 text-sm">{company.name}</div>
                      <div className="text-xs text-slate-400">
                        {new Date(company.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Link
                    to={`/companies/${company.id}`}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-sky-600 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              ))
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              to="/companies"
              className="text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 transition-colors"
            >
              全ての企業を表示
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
