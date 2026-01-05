import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import StatusBadge from '../components/ui/StatusBadge'
import Pagination from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import { Task, PaginationState, defaultPagination } from '../types'
import {
  TASK_STATUS_OPTIONS,
  TASK_STATUS_LABELS,
  TARGET_TYPE_OPTIONS,
  TARGET_TYPE_LABELS,
} from '../constants'

interface TaskFilters {
  status: string
  targetType: string
  dueFrom: string
  dueTo: string
}

const defaultFilters: TaskFilters = {
  status: '',
  targetType: '',
  dueFrom: '',
  dueTo: '',
}

function Tasks() {
  const { user } = useAuth()
  const canWrite = user?.role !== 'readonly'
  const [tasks, setTasks] = useState<Task[]>([])
  const [pagination, setPagination] = useState<PaginationState>(defaultPagination)
  const [filters, setFilters] = useState<TaskFilters>(defaultFilters)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const searchInputRef = useRef<HTMLSelectElement>(null)

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return filters.status || filters.targetType || filters.dueFrom || filters.dueTo
  }, [filters])

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (filters.status) params.set('status', filters.status)
    if (filters.targetType) params.set('targetType', filters.targetType)
    if (filters.dueFrom) params.set('dueFrom', filters.dueFrom)
    if (filters.dueTo) params.set('dueTo', filters.dueTo)
    params.set('page', String(pagination.page))
    params.set('pageSize', String(pagination.pageSize))
    return params.toString()
  }, [filters, pagination.page, pagination.pageSize])

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/me/tasks?${queryString}`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'タスクの読み込みに失敗しました')
      }
      setTasks(data.items)
      if (data.pagination) {
        setPagination(data.pagination)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ネットワークエラー')
    } finally {
      setIsLoading(false)
    }
  }, [queryString])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return
      }

      if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const handleStatusChange = async (taskId: string, nextStatus: string) => {
    if (!canWrite) return
    setError('')
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: nextStatus }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'タスクの更新に失敗しました')
      }
      fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ネットワークエラー')
    }
  }

  const handlePageChange = (nextPage: number) => {
    setPagination((prev) => ({ ...prev, page: nextPage }))
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize: newPageSize, page: 1 }))
  }

  const clearFilter = (key: keyof TaskFilters) => {
    setFilters((prev) => ({ ...prev, [key]: '' }))
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const clearAllFilters = () => {
    setFilters(defaultFilters)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const targetLink = (task: Task) => {
    if (task.targetType === 'company') return `/companies/${task.targetId}`
    if (task.targetType === 'project') return `/projects/${task.targetId}`
    return `/wholesales/${task.targetId}`
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Tasks</p>
          <h2 className="text-3xl font-bold text-slate-900">マイタスク</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            登録数: <span className="font-semibold text-slate-700">{pagination.total}</span>
          </span>
        </div>
      </div>

      {/* Search & Filter */}
      <form
        onSubmit={handleSearchSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-3 md:grid-cols-6">
          <select
            ref={searchInputRef}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">全てのステータス</option>
            {TASK_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {TASK_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            value={filters.targetType}
            onChange={(e) => setFilters({ ...filters, targetType: e.target.value })}
          >
            <option value="">全ての対象</option>
            {TARGET_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {TARGET_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            value={filters.dueFrom}
            onChange={(e) => setFilters({ ...filters, dueFrom: e.target.value })}
            placeholder="期日（開始）"
          />
          <input
            type="date"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
            value={filters.dueTo}
            onChange={(e) => setFilters({ ...filters, dueTo: e.target.value })}
            placeholder="期日（終了）"
          />
          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            検索
          </button>
        </div>

        {/* Active Filters */}
        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">絞り込み中:</span>
            {filters.status && (
              <button
                type="button"
                onClick={() => clearFilter('status')}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-200"
              >
                ステータス: {TASK_STATUS_LABELS[filters.status] || filters.status}
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {filters.targetType && (
              <button
                type="button"
                onClick={() => clearFilter('targetType')}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-200"
              >
                対象: {TARGET_TYPE_LABELS[filters.targetType] || filters.targetType}
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {filters.dueFrom && (
              <button
                type="button"
                onClick={() => clearFilter('dueFrom')}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-200"
              >
                期日開始: {filters.dueFrom}
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            {filters.dueTo && (
              <button
                type="button"
                onClick={() => clearFilter('dueTo')}
                className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 transition-colors hover:bg-slate-200"
              >
                期日終了: {filters.dueTo}
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={clearAllFilters}
              className="text-xs text-rose-600 hover:text-rose-700"
            >
              すべてクリア
            </button>
          </div>
        )}
      </form>

      {/* Readonly Notice */}
      {!canWrite && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          閲覧専用ロールのため、タスクのステータス変更はできません。
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
          <button onClick={() => setError('')} className="ml-2 text-rose-500 hover:text-rose-700">
            ×
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <SkeletonTable rows={5} columns={5} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3">タイトル</th>
                <th className="px-5 py-3">ステータス</th>
                <th className="px-5 py-3">対象</th>
                <th className="px-5 py-3">期日</th>
                <th className="px-5 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg
                        className="h-12 w-12 text-slate-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                        />
                      </svg>
                      <p className="text-slate-500">割り当てられたタスクはありません</p>
                    </div>
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="group transition-colors hover:bg-slate-50/80">
                    <td className="px-5 py-4">
                      <div>
                        <div className="font-semibold text-slate-900">{task.title}</div>
                        {task.description && (
                          <div className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                            {task.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {canWrite ? (
                        <select
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs focus:border-slate-400 focus:outline-none"
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value)}
                        >
                          {TASK_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {TASK_STATUS_LABELS[status]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <StatusBadge
                          status={TASK_STATUS_LABELS[task.status] || task.status}
                          size="sm"
                        />
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        to={targetLink(task)}
                        className="inline-flex items-center gap-1 text-slate-600 hover:text-sky-600"
                      >
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                          {TARGET_TYPE_LABELS[task.targetType] || task.targetType}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(task.dueDate)}</td>
                    <td className="px-5 py-4">
                      <Link
                        to={targetLink(task)}
                        className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                      >
                        詳細へ
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pagination.total > 0 && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="text-center text-xs text-slate-400">
        <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">/</kbd> フィルターにフォーカス
      </div>
    </div>
  )
}

export default Tasks
