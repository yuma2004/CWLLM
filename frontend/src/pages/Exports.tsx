import { useEffect, useState } from 'react'
import Button from '../components/ui/Button'
import ErrorAlert from '../components/ui/ErrorAlert'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import { apiRequest } from '../lib/apiClient'
import { CompanyOptions } from '../types'
import { TARGET_TYPE_LABELS, TARGET_TYPE_OPTIONS, TASK_STATUS_LABELS, TASK_STATUS_OPTIONS } from '../constants'

type CompanyFilters = {
  from: string
  to: string
  status: string
  category: string
  tag: string
  ownerId: string
}

type TaskFilters = {
  dueFrom: string
  dueTo: string
  status: string
  targetType: string
  assigneeId: string
}

function Exports() {
  const [error, setError] = useState('')
  const [activeDownload, setActiveDownload] = useState<'companies' | 'tasks' | ''>('')
  const [companyOptions, setCompanyOptions] = useState<CompanyOptions>({
    categories: [],
    statuses: [],
    tags: [],
  })
  const [userOptions, setUserOptions] = useState<Array<{ id: string; email: string }>>([])
  const [companyFilters, setCompanyFilters] = useState<CompanyFilters>({
    from: '',
    to: '',
    status: '',
    category: '',
    tag: '',
    ownerId: '',
  })
  const [taskFilters, setTaskFilters] = useState<TaskFilters>({
    dueFrom: '',
    dueTo: '',
    status: '',
    targetType: '',
    assigneeId: '',
  })

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [companyData, userData] = await Promise.all([
          apiRequest<CompanyOptions>('/api/companies/options'),
          apiRequest<{ users: Array<{ id: string; email: string }> }>('/api/users/options'),
        ])
        setCompanyOptions(companyData)
        setUserOptions(userData.users ?? [])
      } catch {
        setCompanyOptions({ categories: [], statuses: [], tags: [] })
        setUserOptions([])
      }
    }
    loadOptions()
  }, [])

  const buildQuery = (params: Record<string, string>) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value) query.set(key, value)
    })
    return query.toString()
  }

  const downloadFile = async (path: string, filename: string, params: Record<string, string>) => {
    setError('')
    setActiveDownload(filename.includes('companies') ? 'companies' : 'tasks')
    try {
      const query = buildQuery(params)
      const url = query ? `${path}?${query}` : path
      const response = await fetch(url, { credentials: 'include' })
      if (!response.ok) {
        let message = 'Download failed'
        try {
          const data = await response.json()
          if (typeof data?.error === 'string') {
            message = data.error
          } else if (data?.error?.message) {
            message = data.error.message
          }
        } catch {
          // noop
        }
        throw new Error(message)
      }
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
    } finally {
      setActiveDownload('')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Exports</p>
        <h2 className="text-3xl font-bold text-slate-900">CSV Exports</h2>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Companies</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FormInput
              type="date"
              value={companyFilters.from}
              onChange={(e) => setCompanyFilters({ ...companyFilters, from: e.target.value })}
              placeholder="From"
            />
            <FormInput
              type="date"
              value={companyFilters.to}
              onChange={(e) => setCompanyFilters({ ...companyFilters, to: e.target.value })}
              placeholder="To"
            />
            <FormSelect
              value={companyFilters.status}
              onChange={(e) => setCompanyFilters({ ...companyFilters, status: e.target.value })}
            >
              <option value="">Status</option>
              {companyOptions.statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </FormSelect>
            <FormSelect
              value={companyFilters.category}
              onChange={(e) => setCompanyFilters({ ...companyFilters, category: e.target.value })}
            >
              <option value="">Category</option>
              {companyOptions.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </FormSelect>
            <FormSelect
              value={companyFilters.tag}
              onChange={(e) => setCompanyFilters({ ...companyFilters, tag: e.target.value })}
            >
              <option value="">Tag</option>
              {companyOptions.tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </FormSelect>
            <FormSelect
              value={companyFilters.ownerId}
              onChange={(e) => setCompanyFilters({ ...companyFilters, ownerId: e.target.value })}
            >
              <option value="">Owner</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </FormSelect>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={() => downloadFile('/api/export/companies.csv', 'companies.csv', companyFilters)}
              isLoading={activeDownload === 'companies'}
              loadingLabel="Downloading..."
            >
              Download CSV
            </Button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Tasks</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <FormInput
              type="date"
              value={taskFilters.dueFrom}
              onChange={(e) => setTaskFilters({ ...taskFilters, dueFrom: e.target.value })}
              placeholder="Due from"
            />
            <FormInput
              type="date"
              value={taskFilters.dueTo}
              onChange={(e) => setTaskFilters({ ...taskFilters, dueTo: e.target.value })}
              placeholder="Due to"
            />
            <FormSelect
              value={taskFilters.status}
              onChange={(e) => setTaskFilters({ ...taskFilters, status: e.target.value })}
            >
              <option value="">Status</option>
              {TASK_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {TASK_STATUS_LABELS[status]}
                </option>
              ))}
            </FormSelect>
            <FormSelect
              value={taskFilters.targetType}
              onChange={(e) => setTaskFilters({ ...taskFilters, targetType: e.target.value })}
            >
              <option value="">Target type</option>
              {TARGET_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {TARGET_TYPE_LABELS[type]}
                </option>
              ))}
            </FormSelect>
            <FormSelect
              value={taskFilters.assigneeId}
              onChange={(e) => setTaskFilters({ ...taskFilters, assigneeId: e.target.value })}
            >
              <option value="">Assignee</option>
              {userOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.email}
                </option>
              ))}
            </FormSelect>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={() => downloadFile('/api/export/tasks.csv', 'tasks.csv', taskFilters)}
              isLoading={activeDownload === 'tasks'}
              loadingLabel="Downloading..."
            >
              Download CSV
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Exports
