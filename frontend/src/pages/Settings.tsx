import { useEffect, useState } from 'react'
import Button from '../components/ui/Button'
import ErrorAlert from '../components/ui/ErrorAlert'
import FormInput from '../components/ui/FormInput'
import FormTextarea from '../components/ui/FormTextarea'
import SuccessAlert from '../components/ui/SuccessAlert'
import { apiRequest } from '../lib/apiClient'

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
        const data = await apiRequest<{ settings: { summaryDefaultPeriodDays: number; tagOptions?: string[] } }>(
          '/api/settings'
        )
        setSummaryDefaultPeriodDays(data.settings.summaryDefaultPeriodDays)
        setTagOptions((data.settings.tagOptions || []).join('\n'))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ネットワークエラー')
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
      const data = await apiRequest<{ settings: { summaryDefaultPeriodDays: number; tagOptions?: string[] } }>(
        '/api/settings',
        {
          method: 'PATCH',
          body: {
            summaryDefaultPeriodDays,
            tagOptions: tags,
          },
        }
      )
      setSuccess('設定を保存しました')
      setTagOptions((data.settings.tagOptions || []).join('\n'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ネットワークエラー')
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">設定</p>
        <h2 className="text-3xl font-bold text-slate-900">設定</h2>
      </div>

      {error && <ErrorAlert message={error} />}
      {success && <SuccessAlert message={success} />}

      <form
        onSubmit={handleSave}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormInput
            type="number"
            min={1}
            max={365}
            label="要約のデフォルト期間（日）"
            value={summaryDefaultPeriodDays}
            onChange={(event) => setSummaryDefaultPeriodDays(Number(event.target.value))}
            disabled={isLoading}
          />
          <FormTextarea
            label="タグ候補"
            rows={5}
            value={tagOptions}
            onChange={(event) => setTagOptions(event.target.value)}
            placeholder="vip\npriority"
            disabled={isLoading}
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            type="submit"
            isLoading={isLoading}
            loadingLabel="保存中..."
          >
            保存する
          </Button>
        </div>
      </form>
    </div>
  )
}

export default Settings
