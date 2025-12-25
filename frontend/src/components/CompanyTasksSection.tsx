import { useCallback, useEffect, useState } from 'react'

interface Task {
  id: string
  title: string
  description?: string | null
  dueDate?: string | null
  status: string
}

const statusOptions = ['todo', 'in_progress', 'done', 'cancelled']

const formatDate = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString()
}

function CompanyTasksSection({ companyId, canWrite }: { companyId: string; canWrite: boolean }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', description: '', dueDate: '' })
  const [formError, setFormError] = useState('')

  const fetchTasks = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      params.set('page', '1')
      params.set('pageSize', '20')
      if (statusFilter) params.set('status', statusFilter)

      const response = await fetch(
        `/api/companies/${companyId}/tasks?${params.toString()}`,
        {
          credentials: 'include',
        }
      )
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
  }, [companyId, statusFilter])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setFormError('')
    if (!form.title.trim()) {
      setFormError('Title is required')
      return
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetType: 'company',
          targetId: companyId,
          title: form.title.trim(),
          description: form.description || undefined,
          dueDate: form.dueDate || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create task')
      }
      setForm({ title: '', description: '', dueDate: '' })
      fetchTasks()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Network error')
    }
  }

  const handleStatusChange = async (taskId: string, nextStatus: string) => {
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

  return (
    <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-slate-900">Tasks</h3>
        <select
          className="rounded-xl border border-slate-200 px-3 py-1 text-xs"
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
      </div>

      {error && (
        <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="text-sm text-slate-500">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="text-sm text-slate-500">No tasks yet.</div>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm"
            >
              <div>
                <div className="font-semibold text-slate-900">{task.title}</div>
                <div className="text-xs text-slate-500">
                  Due: {formatDate(task.dueDate)}
                </div>
              </div>
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
          ))
        )}
      </div>

      {canWrite ? (
        <form onSubmit={handleCreate} className="mt-4 space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Task title"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
            <input
              type="date"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={form.dueDate}
              onChange={(event) => setForm({ ...form, dueDate: event.target.value })}
            />
          </div>
          <textarea
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            rows={3}
            placeholder="Notes"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
          {formError && (
            <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {formError}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            >
              Add task
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 text-sm text-slate-500">You do not have write access.</div>
      )}
    </div>
  )
}

export default CompanyTasksSection
