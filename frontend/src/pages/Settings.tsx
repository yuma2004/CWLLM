import { useEffect, useState } from 'react'
import Button from '../components/ui/Button'
import ErrorAlert from '../components/ui/ErrorAlert'
import FormInput from '../components/ui/FormInput'
import FormTextarea from '../components/ui/FormTextarea'
import Toast from '../components/ui/Toast'
import { useFetch, useMutation } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { apiRoutes } from '../lib/apiRoutes'
import { SettingsPayload } from '../types'

function Settings() {
  const [summaryDefaultPeriodDays, setSummaryDefaultPeriodDays] = useState(30)
  const [tagOptions, setTagOptions] = useState('')
  const [error, setError] = useState('')
  const { toast, showToast, clearToast } = useToast()

  const {
    data: settingsData,
    error: fetchError,
    isLoading: isLoadingSettings,
  } = useFetch<{ settings: SettingsPayload }>(apiRoutes.settings(), {
    cacheTimeMs: 30_000,
  })

  const { mutate: saveSettings, isLoading: isSaving } = useMutation<
    { settings: SettingsPayload },
    SettingsPayload
  >(apiRoutes.settings(), 'PATCH')

  useEffect(() => {
    if (settingsData?.settings) {
      setSummaryDefaultPeriodDays(settingsData.settings.summaryDefaultPeriodDays)
      setTagOptions((settingsData.settings.tagOptions || []).join('\n'))
    }
  }, [settingsData])

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    const tags = tagOptions
      .split('\n')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    try {
      const data = await saveSettings(
        {
          summaryDefaultPeriodDays,
          tagOptions: tags,
        }
      )
      if (data?.settings) {
        showToast('設定を保存しました', 'success')
        setTagOptions((data.settings.tagOptions || []).join('\n'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ネットワークエラー')
    }
  }

  const isLoading = isLoadingSettings || isSaving
  const displayError = error || fetchError

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase text-slate-400">設定</p>
        <h2 className="text-3xl font-bold text-slate-900">システム設定</h2>
      </div>

      {displayError && <ErrorAlert message={displayError} />}

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
            loadingLabel="保存中…"
          >
            保存する
          </Button>
        </div>
      </form>
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant === 'error' ? 'error' : toast.variant === 'success' ? 'success' : 'info'}
          onClose={clearToast}
          className="fixed bottom-6 right-6 z-50 safe-area-bottom"
        />
      )}
    </div>
  )
}

export default Settings
