import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import ErrorAlert from '../components/ui/ErrorAlert'
import { useAuth } from '../contexts/AuthContext'
import { apiRequest } from '../lib/apiClient'
import { TARGET_TYPE_LABELS, TASK_STATUS_LABELS } from '../constants'

interface DashboardTask {
  id: string
  title: string
  dueDate?: string | null
  targetType: string
  targetId: string
  status: string
  assigneeId?: string | null
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
  const [overdueTasks, setOverdueTasks] = useState<DashboardTask[]>([])
  const [todayTasks, setTodayTasks] = useState<DashboardTask[]>([])
  const [soonTasks, setSoonTasks] = useState<DashboardTask[]>([])
  const [weekTasks, setWeekTasks] = useState<DashboardTask[]>([])
  const [unassignedMessageCount, setUnassignedMessageCount] = useState(0)
  const [latestSummaries, setLatestSummaries] = useState<DashboardSummary[]>([])
  const [recentCompanies, setRecentCompanies] = useState<DashboardCompany[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchDashboard = async () => {
      setIsLoading(true)
      setError('')
      try {
        const data = await apiRequest<{
          overdueTasks: DashboardTask[]
          todayTasks: DashboardTask[]
          soonTasks: DashboardTask[]
          weekTasks: DashboardTask[]
          latestSummaries: DashboardSummary[]
          recentCompanies: DashboardCompany[]
          unassignedMessageCount: number
        }>('/api/dashboard')
        setOverdueTasks(data.overdueTasks || [])
        setTodayTasks(data.todayTasks || [])
        setSoonTasks(data.soonTasks || [])
        setWeekTasks(data.weekTasks || [])
        setLatestSummaries(data.latestSummaries || [])
        setRecentCompanies(data.recentCompanies || [])
        setUnassignedMessageCount(data.unassignedMessageCount || 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ネットワークエラー')
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  const taskGroups = useMemo(
    () => [
      { id: 'overdue', label: '期限切れ', dotClass: 'bg-rose-500', tasks: overdueTasks },
      { id: 'today', label: '本日', dotClass: 'bg-amber-500', tasks: todayTasks },
      { id: 'soon', label: '3日以内', dotClass: 'bg-sky-500', tasks: soonTasks },
      { id: 'week', label: '7日以内', dotClass: 'bg-slate-500', tasks: weekTasks },
    ],
    [overdueTasks, todayTasks, soonTasks, weekTasks]
  )

  const targetLink = (task: DashboardTask) => {
    if (task.targetType === 'company') return `/companies/${task.targetId}`
    if (task.targetType === 'project') return `/projects/${task.targetId}`
    return `/wholesales/${task.targetId}`
  }

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

      {error && <ErrorAlert message={error} />}

      {unassignedMessageCount > 0 && (
        <Link
          to="/messages/unassigned"
          className="group flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 transition-colors hover:border-amber-300 hover:bg-amber-100"
        >
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-amber-500">Action</div>
            <div className="font-semibold text-amber-800">
              未割当メッセージが{unassignedMessageCount}件あります
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-700 group-hover:text-amber-900">
            割当画面へ →
          </span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Task Triage Panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col h-full shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <span className="w-2 h-6 bg-slate-900 rounded-sm"></span>
              タスクトリアージ
            </h3>
            <Link
              to="/tasks"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              全てのタスクへ
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {taskGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-lg border border-slate-100 bg-slate-50/40 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <span className={`h-2 w-2 rounded-full ${group.dotClass}`} />
                    {group.label}
                  </div>
                  <span className="text-xs text-slate-500">{group.tasks.length}件</span>
                </div>
                <div className="mt-2 space-y-2">
                  {isLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((index) => (
                        <div key={index} className="h-10 rounded bg-white/70" />
                      ))}
                    </div>
                  ) : group.tasks.length === 0 ? (
                    <div className="text-xs text-slate-400">該当タスクはありません</div>
                  ) : (
                    group.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-start justify-between gap-2 rounded-lg bg-white px-2 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-slate-900">
                            {task.title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span>
                              期限: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                            </span>
                            <span>
                              状態: {TASK_STATUS_LABELS[task.status] || task.status}
                            </span>
                            <span>担当: {task.assigneeId || '-'}</span>
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                              {TARGET_TYPE_LABELS[task.targetType] || task.targetType}
                            </span>
                          </div>
                        </div>
                        <Link
                          to={targetLink(task)}
                          className="mt-1 text-slate-400 hover:text-slate-600"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
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
