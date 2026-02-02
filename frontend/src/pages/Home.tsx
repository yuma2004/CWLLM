import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import ErrorAlert from '../components/ui/ErrorAlert'
import { useAuth } from '../contexts/AuthContext'
import { useFetch } from '../hooks/useApi'
import { apiRoutes } from '../lib/apiRoutes'
import { cn } from '../lib/cn'
import { DashboardResponse } from '../types'

function Home() {
  const { user, logout } = useAuth()
  const { data: dashboardData, error, isLoading } = useFetch<DashboardResponse>(
    apiRoutes.dashboard(),
    {
      cacheTimeMs: 10_000,
    }
  )
  const recentCompanies = dashboardData?.recentCompanies ?? []
  const unassignedMessageCount = dashboardData?.unassignedMessageCount ?? 0

  const taskGroups = useMemo(() => {
    const overdueTasks = dashboardData?.overdueTasks ?? []
    const todayTasks = dashboardData?.todayTasks ?? []
    const soonTasks = dashboardData?.soonTasks ?? []
    const weekTasks = dashboardData?.weekTasks ?? []
    const upcomingTasks = [...todayTasks, ...soonTasks, ...weekTasks]

    return [
      { id: 'overdue', label: '期限切れ', dotClass: 'bg-rose-500', tasks: overdueTasks },
      { id: 'upcoming', label: '直近の期限', dotClass: 'bg-sky-600', tasks: upcomingTasks },
    ]
  }, [dashboardData])
  const totalTasks = useMemo(
    () => taskGroups.reduce((sum, group) => sum + group.tasks.length, 0),
    [taskGroups]
  )

  const summaryCards = useMemo(
    () => [
      ...taskGroups.map((group) => ({
        id: group.id,
        label: group.label,
        dotClass: group.dotClass,
        value: group.tasks.length,
      })),
      {
        id: 'unassigned',
        label: '未割当メッセージ',
        dotClass: 'bg-amber-500',
        value: unassignedMessageCount,
      },
    ],
    [taskGroups, unassignedMessageCount]
  )

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-balance text-2xl font-bold text-slate-900">ダッシュボード</h2>
          <p className="text-pretty text-slate-500 text-sm mt-1">
            ワークスペースの最新情報をまとめて確認できます。
          </p>
        </div>
        <div className="flex items-center text-sm">
          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="size-1.5 rounded-full bg-green-500" />
              <span className="text-slate-600 font-medium">{user?.email}</span>
            </div>
            <span className="h-4 w-px bg-slate-200" aria-hidden="true" />
            <button onClick={logout} className="text-slate-500 hover:text-slate-900 font-medium">
              ログアウト
            </button>
          </div>
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="grid gap-3 sm:grid-cols-3">
        {summaryCards.map((card) => (
          <div
            key={`summary-${card.id}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <span className={cn('size-1.5 rounded-full', card.dotClass)} />
              {card.label}
            </div>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-2xl font-semibold text-slate-900 tabular-nums">
                {card.value}
              </span>
              <span className="text-xs text-slate-400">件</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Task Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col h-full shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-balance text-base font-semibold text-slate-900 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-sky-600"></span>
              タスク
            </h3>
            <Link
              to="/tasks"
              className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700"
            >
              タスク一覧へ
              <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {taskGroups.map((group) => (
              <div
                key={group.id}
                className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-4"
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className={cn('size-2 rounded-full', group.dotClass)} />
                  {group.label}
                </div>
                <div className="mt-3 flex items-end gap-2">
                  {isLoading ? (
                    <div className="h-8 w-16 rounded bg-white/70" />
                  ) : (
                    <span className="text-2xl font-semibold text-slate-900 tabular-nums">
                      {group.tasks.length}
                    </span>
                  )}
                  <span className="text-xs text-slate-500">件</span>
                </div>
              </div>
            ))}
          </div>
          {!isLoading && totalTasks === 0 && (
            <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-center">
              <p className="text-xs text-slate-500">
                タスクが見つかりません。必要に応じて新しいタスクを作成してください。
              </p>
              <Link
                to="/tasks"
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                タスク一覧へ
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Companies Panel */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col h-full shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-balance text-base font-semibold text-slate-900 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-sky-600"></span>
              最近更新された企業
            </h3>
          </div>

          <div className="flex-1 space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-50 rounded-lg" />
                ))}
              </div>
            ) : recentCompanies.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-center text-slate-500">
                <p className="text-pretty text-sm font-medium text-slate-600">
                  企業がまだ登録されていません。
                </p>
                <Link
                  to="/companies"
                  className="mt-2 inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
                >
                  企業一覧へ
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ) : (
              recentCompanies.map((company) => {
                const updatedAtLabel = company.updatedAt
                  ? new Date(company.updatedAt).toLocaleDateString()
                  : '-'
                return (
                  <Link
                    key={company.id}
                    to={`/companies/${company.id}`}
                    className="group flex items-center justify-between rounded-lg border border-transparent px-2 py-2 hover:border-slate-200 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                        {company.name.slice(0, 1)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900 text-sm">
                          {company.name}
                        </div>
                        <div className="text-xs text-slate-400 tabular-nums">{updatedAtLabel}</div>
                      </div>
                    </div>
                    <svg
                      className="size-4 text-slate-300 group-hover:text-sky-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )
              })
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              to="/companies"
              className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700 hover:bg-sky-100"
            >
              すべての企業を見る
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
