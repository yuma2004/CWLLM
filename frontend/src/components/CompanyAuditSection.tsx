import { useCallback, useEffect, useState } from 'react'

interface AuditLog {
  id: string
  action: string
  userId?: string | null
  createdAt: string
}

function CompanyAuditSection({ companyId }: { companyId: string }) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({
        entityType: 'Company',
        entityId: companyId,
        page: '1',
        pageSize: '10',
      })
      const response = await fetch(`/api/audit-logs?${params.toString()}`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load audit logs')
      }
      setLogs(data.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Audit Logs</h3>
      </div>
      {error && (
        <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      {isLoading ? (
        <div className="mt-3 text-sm text-slate-500">Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className="mt-3 text-sm text-slate-500">No audit logs.</div>
      ) : (
        <div className="mt-4 space-y-2 text-sm">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2"
            >
              <div>
                <div className="font-semibold text-slate-900">{log.action}</div>
                <div className="text-xs text-slate-500">
                  {log.userId || 'system'} �E {new Date(log.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CompanyAuditSection
