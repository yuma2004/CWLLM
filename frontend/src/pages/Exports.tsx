import { useState } from 'react'

function Exports() {
  const [error, setError] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)

  const downloadFile = async (path: string, filename: string) => {
    setError('')
    setIsDownloading(true)
    try {
      const response = await fetch(path, { credentials: 'include' })
      if (!response.ok) {
        let message = 'Download failed'
        try {
          const data = await response.json()
          message = data?.error || message
        } catch (parseError) {
          void parseError
        }
        throw new Error(message)
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Export</p>
        <h2 className="text-3xl font-bold text-slate-900">CSV Export</h2>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="space-y-3 text-sm">
          <button
            type="button"
            className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => downloadFile('/api/export/companies.csv', 'companies.csv')}
            disabled={isDownloading}
          >
            Download companies CSV
          </button>
          <button
            type="button"
            className="w-full rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={() => downloadFile('/api/export/tasks.csv', 'tasks.csv')}
            disabled={isDownloading}
          >
            Download tasks CSV
          </button>
        </div>
      </div>
    </div>
  )
}

export default Exports
