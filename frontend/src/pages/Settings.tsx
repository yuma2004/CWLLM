import { useEffect, useState } from 'react'

function Settings() {
  const [summaryDefaultPeriodDays, setSummaryDefaultPeriodDays] = useState(30)
  const [tagOptions, setTagOptions] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true)
      setError('')
      try {
        const response = await fetch('/api/settings', { credentials: 'include' })
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load settings')
        }
        setSummaryDefaultPeriodDays(data.settings.summaryDefaultPeriodDays)
        setTagOptions((data.settings.tagOptions || []).join('\n'))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Network error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const tags = tagOptions
      .split('\n')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          summaryDefaultPeriodDays,
          tagOptions: tags,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }
      setSuccess('Settings updated')
      setTagOptions((data.settings.tagOptions || []).join('\n'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Settings</p>
        <h2 className="text-3xl font-bold text-slate-900">Settings</h2>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
      )}
      {success && (
        <div className="rounded-xl bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSave}
        className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Summary default period (days)
            </label>
            <input
              type="number"
              min={1}
              max={365}
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={summaryDefaultPeriodDays}
              onChange={(event) => setSummaryDefaultPeriodDays(Number(event.target.value))}
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-[0.2em] text-slate-400">Tag options</label>
            <textarea
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              rows={5}
              value={tagOptions}
              onChange={(event) => setTagOptions(event.target.value)}
              placeholder="vip\npriority"
              disabled={isLoading}
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
            disabled={isLoading}
          >
            Save settings
          </button>
        </div>
      </form>
    </div>
  )
}

export default Settings
