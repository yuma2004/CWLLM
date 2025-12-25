import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface Task {
  id: string
  title: string
  status: string
  dueDate?: string | null
  targetType: string
  targetId: string
}

const statusOptions = ['todo', 'in_progress', 'done', 'cancelled']

function Tasks() {
  const { user } = useAuth()
  const canWrite = user?.role !== 'readonly'
  const [tasks, setTasks] = useState<Task[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [dueFrom, setDueFrom] = useState('')
  const [dueTo, setDueTo] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', '1')
      params.set('pageSize', '50')
      if (statusFilter) params.set('status', statusFilter)
      if (dueFrom) params.set('dueFrom', dueFrom)
      if (dueTo) params.set('dueTo', dueTo)

      const response = await fetch(`/api/me/tasks?${params.toString()}`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load tasks')
      }
      setTasks(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }, [dueFrom, dueTo, statusFilter])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleStatusChange = async (taskId: string, nextStatus: string) => {
    if (!canWrite) return
    setError('')
    try {
      const response = await fetch(`/api/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: nextStatus }),
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update task')
      }
      fetchTasks()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    }
  }

  const targetLink = (task: Task) => {
    if (task.targetType === 'company') return `/companies/${task.targetId}`
    if (task.targetType === 'project') return `/projects/${task.targetId}`
    return `/wholesales/${task.targetId}`
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Tasks</p>
        <h2 className="text-3xl font-bold text-slate-900">My Tasks</h2>
      </div>

      <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-wrap gap-2 text-xs">
          <select
            className="rounded-xl border border-slate-200 px-3 py-1"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input
            type="date"
            className="rounded-xl border border-slate-200 px-3 py-1"
            value={dueFrom}
            onChange={(event) => setDueFrom(event.target.value)}
          />
          <input
            type="date"
            className="rounded-xl border border-slate-200 px-3 py-1"
            value={dueTo}
            onChange={(event) => setDueTo(event.target.value)}
          />
          <button
            type="button"
            onClick={fetchTasks}
            className="rounded-full bg-slate-900 px-4 py-1 text-xs font-semibold text-white"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
      )}

      <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-sm text-slate-500">No tasks assigned.</div>
        ) : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-semibold text-slate-900">{task.title}</div>
                  <div className="text-xs text-slate-500">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'} ÅE{' '}
                    {task.targetType}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Link
                    to={targetLink(task)}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                  >
                    Open
                  </Link>
                  {canWrite ? (
                    <select
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs"
                      value={task.status}
                      onChange={(event) => handleStatusChange(task.id, event.target.value)}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                      {task.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Tasks
