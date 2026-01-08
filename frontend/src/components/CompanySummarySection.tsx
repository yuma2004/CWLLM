import { useEffect, useMemo, useRef, useState } from 'react'
import Button from './ui/Button'
import ErrorAlert from './ui/ErrorAlert'
import JobProgressCard from './ui/JobProgressCard'
import LoadingState from './ui/LoadingState'
import Toast from './ui/Toast'
import { useFetch, useMutation } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { JobRecord, Summary, SummaryCandidate, SummaryDraft } from '../types'
import { formatDate, formatDateInput } from '../utils/date'

const formatPeriod = (start: string, end: string) => `${formatDate(start)} - ${formatDate(end)}`
const useLegacyPeriodConversion = import.meta.env.VITE_SUMMARY_PERIOD_USE_LEGACY === 'true'
const usePeriodEndOfDay = import.meta.env.VITE_SUMMARY_PERIOD_END_OF_DAY === 'true'

const getStartDateFromDays = (days: number) => {
  const start = new Date()
  const diff = Math.max(days - 1, 0)
  start.setDate(start.getDate() - diff)
  return start
}

const parseDateInput = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map((item) => Number(item))
  if (!year || !month || !day) return null
  return { year, month, day }
}

const getUtcTimestampFromDateInput = (value: string) => {
  const parsed = parseDateInput(value)
  if (!parsed) return null
  return Date.UTC(parsed.year, parsed.month - 1, parsed.day)
}

const toUtcIsoFromDateInput = (value: string, options?: { endOfDay?: boolean }) => {
  if (useLegacyPeriodConversion) {
    return new Date(value).toISOString()
  }
  const parsed = parseDateInput(value)
  if (!parsed) return null
  const hours = options?.endOfDay ? 23 : 0
  const minutes = options?.endOfDay ? 59 : 0
  const seconds = options?.endOfDay ? 59 : 0
  const milliseconds = options?.endOfDay ? 999 : 0
  return new Date(
    Date.UTC(parsed.year, parsed.month - 1, parsed.day, hours, minutes, seconds, milliseconds)
  ).toISOString()
}

type DraftResponse = {
  cached?: boolean
  draft?: SummaryDraft
  jobId?: string
  status?: JobRecord['status']
}

type SummarySavePayload = {
  content: string
  type: 'manual' | 'auto'
  periodStart: string
  periodEnd: string
  sourceLinks: string[]
  model?: string | null
  promptVersion?: string | null
  sourceMessageCount?: number | null
  tokenUsage?: unknown
  draftId?: string | null
}

function CompanySummarySection({
  companyId,
  canWrite,
}: {
  companyId: string
  canWrite: boolean
}) {
  const today = useMemo(() => new Date(), [])
  const { toast, showToast, clearToast } = useToast()
  const [periodStart, setPeriodStart] = useState(formatDateInput(getStartDateFromDays(30)))
  const [periodEnd, setPeriodEnd] = useState(formatDateInput(today))
  const [hasCustomPeriod, setHasCustomPeriod] = useState(false)
  const [draftContent, setDraftContent] = useState('')
  const [draftSourceLinks, setDraftSourceLinks] = useState<string[]>([])
  const [draftType, setDraftType] = useState<'manual' | 'auto'>('auto')
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftError, setDraftError] = useState('')
  const [draftId, setDraftId] = useState<string | null>(null)
  const [draftMeta, setDraftMeta] = useState<{
    model?: string | null
    promptVersion?: string | null
    sourceMessageCount?: number | null
    tokenUsage?: unknown
  } | null>(null)
  const [draftJobId, setDraftJobId] = useState<string | null>(null)
  const [draftJob, setDraftJob] = useState<JobRecord | null>(null)
  const [isDraftPolling, setIsDraftPolling] = useState(false)
  const [candidates, setCandidates] = useState<SummaryCandidate[]>([])
  const [candidateError, setCandidateError] = useState('')
  const [isCreatingCandidates, setIsCreatingCandidates] = useState(false)
  const draftStatusRef = useRef<JobRecord['status'] | null>(null)

  const { data: settingsData } = useFetch<{ settings: { summaryDefaultPeriodDays?: number } }>(
    '/api/settings',
    {
      errorMessage: '設定の取得に失敗しました',
      cacheTimeMs: 30_000,
    }
  )

  const {
    data: summariesData,
    error: summaryError,
    isLoading: summaryLoading,
    refetch: refetchSummaries,
  } = useFetch<{ summaries: Summary[] }>(
    `/api/companies/${companyId}/summaries`,
    {
      errorMessage: '読み込みに失敗しました',
    }
  )

  const summaries = summariesData?.summaries ?? []

  const { mutate: generateDraft } = useMutation<DraftResponse, { periodStart: string; periodEnd: string }>(
    `/api/companies/${companyId}/summaries/draft`,
    'POST'
  )

  const { mutate: saveSummary, isLoading: isSavingSummary } = useMutation<
    { summary: Summary },
    SummarySavePayload
  >(`/api/companies/${companyId}/summaries`, 'POST')

  const { mutate: loadCandidates, isLoading: isLoadingCandidates } = useMutation<
    { candidates: SummaryCandidate[] },
    void
  >('/api/summaries', 'POST')

  const { mutate: createTask } = useMutation<
    unknown,
    { targetType: string; targetId: string; title: string; dueDate?: string }
  >('/api/tasks', 'POST')

  const { mutate: cancelJob } = useMutation<{ job: JobRecord }, void>('/api/jobs', 'POST')

  const { refetch: refetchDraftJob } = useFetch<{ job: JobRecord }>(
    draftJobId ? `/api/jobs/${draftJobId}` : null,
    {
      enabled: false,
      errorMessage: 'Failed to check draft status',
    }
  )

  useEffect(() => {
    if (!hasCustomPeriod) {
      const days = settingsData?.settings?.summaryDefaultPeriodDays ?? 30
      setPeriodStart(formatDateInput(getStartDateFromDays(days)))
      setPeriodEnd(formatDateInput(new Date()))
    }
  }, [hasCustomPeriod, settingsData])

  useEffect(() => {
    if (!draftJobId) return
    let isMounted = true
    const poll = async () => {
      try {
        const data = await refetchDraftJob(undefined, { ignoreCache: true })
        if (!isMounted) return
        if (!data?.job) return
        const job = data.job
        setDraftJob(job)
        if (job.status === 'completed') {
          const result = job.result as { draft?: SummaryDraft } | undefined
          const draft = result?.draft
          if (draft) {
            setDraftContent(draft.content)
            setDraftSourceLinks(draft.sourceLinks || [])
            setDraftType('auto')
            setDraftId(draft.id)
            setDraftMeta({
              model: draft.model ?? null,
              promptVersion: draft.promptVersion ?? null,
              sourceMessageCount: draft.sourceMessageCount ?? null,
              tokenUsage: draft.tokenUsage,
            })
            showToast('要約を生成しました', 'success')
          }
          setDraftLoading(false)
          setIsDraftPolling(false)
          setDraftJobId(null)
          window.clearInterval(timer)
        }
        if (job.status === 'failed' || job.status === 'canceled') {
          setDraftError(job.error?.message || '要約生成に失敗しました')
          if (job.status === 'failed') {
            showToast('要約生成に失敗しました', 'error')
          } else {
            showToast('要約生成をキャンセルしました', 'info')
          }
          setDraftLoading(false)
          setIsDraftPolling(false)
          setDraftJobId(null)
          window.clearInterval(timer)
        }
        const previous = draftStatusRef.current
        if (previous && previous !== job.status) {
          draftStatusRef.current = job.status
        }
        if (!previous) {
          draftStatusRef.current = job.status
        }
      } catch (err) {
        if (!isMounted) return
        setDraftError(err instanceof Error ? err.message : '要約ステータスの確認に失敗しました')
        setDraftLoading(false)
        setIsDraftPolling(false)
        setDraftJobId(null)
        window.clearInterval(timer)
      }
    }

    setDraftLoading(true)
    setIsDraftPolling(true)
    const timer = window.setInterval(poll, 2000)
    void poll()

    return () => {
      isMounted = false
      if (timer) window.clearInterval(timer)
      setIsDraftPolling(false)
    }
  }, [draftJobId, refetchDraftJob, showToast])

  const getPeriodValidationError = () => {
    if (!periodStart || !periodEnd) {
      return '期間を入力してください'
    }
    const startUtc = getUtcTimestampFromDateInput(periodStart)
    const endUtc = getUtcTimestampFromDateInput(periodEnd)
    if (startUtc === null || endUtc === null) {
      return '期間を正しい形式で入力してください'
    }
    if (startUtc > endUtc) {
      return '開始日は終了日以前に設定してください'
    }
    return null
  }

  const buildPeriodPayload = () => {
    const validationError = getPeriodValidationError()
    if (validationError) {
      setDraftError(validationError)
      return null
    }
    const startIso = toUtcIsoFromDateInput(periodStart)
    const endIso = toUtcIsoFromDateInput(periodEnd, { endOfDay: usePeriodEndOfDay })
    if (!startIso || !endIso) {
      setDraftError('期間の変換に失敗しました')
      return null
    }
    return { periodStart: startIso, periodEnd: endIso }
  }

  const handleGenerateDraft = async () => {
    setDraftError('')
    const payload = buildPeriodPayload()
    if (!payload) return
    setDraftLoading(true)
    try {
      const data = await generateDraft(
        {
          periodStart: payload.periodStart,
          periodEnd: payload.periodEnd,
        },
        { errorMessage: '要約生成に失敗しました' }
      )
      if (!data) {
        setDraftLoading(false)
        setDraftError('要約生成に失敗しました')
        return
      }
      if (data.draft) {
        setDraftContent(data.draft.content)
        setDraftSourceLinks(data.draft.sourceLinks || [])
        setDraftType('auto')
        setDraftId(data.draft.id)
        setDraftMeta({
          model: data.draft.model ?? null,
          promptVersion: data.draft.promptVersion ?? null,
          sourceMessageCount: data.draft.sourceMessageCount ?? null,
          tokenUsage: data.draft.tokenUsage,
        })
        setDraftLoading(false)
        setDraftJob(null)
        setDraftJobId(null)
        showToast('要約を生成しました', 'success')
      } else if (data.jobId) {
        setDraftJobId(data.jobId)
        setDraftJob({
          id: data.jobId,
          status: data.status ?? 'queued',
        })
        draftStatusRef.current = data.status ?? 'queued'
      } else {
        setDraftLoading(false)
        setDraftError('要約生成に失敗しました')
      }
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : '要約生成に失敗しました')
      setDraftLoading(false)
    }
  }

  const handleSaveSummary = async () => {
    setDraftError('')
    if (!draftContent.trim()) {
      setDraftError('Summary content is required')
      return
    }
    const payload = buildPeriodPayload()
    if (!payload) return
    try {
      await saveSummary(
        {
          content: draftContent.trim(),
          type: draftType,
          periodStart: payload.periodStart,
          periodEnd: payload.periodEnd,
          sourceLinks: draftSourceLinks,
          model: draftMeta?.model,
          promptVersion: draftMeta?.promptVersion,
          sourceMessageCount: draftMeta?.sourceMessageCount,
          tokenUsage: draftMeta?.tokenUsage,
          draftId,
        },
        { errorMessage: 'Failed to save summary' }
      )
      setDraftContent('')
      setDraftSourceLinks([])
      setDraftId(null)
      setDraftMeta(null)
      setCandidates([])
      showToast('サマリーを保存しました', 'success')
      void refetchSummaries(undefined, { ignoreCache: true })
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Failed to save summary')
    }
  }

  const handleLoadCandidates = async () => {
    const latest = summaries[0]
    if (!latest) {
      setCandidateError('サマリーがまだありません')
      return
    }
    setCandidateError('')
    try {
      const data = await loadCandidates(undefined, {
        url: `/api/summaries/${latest.id}/tasks/candidates`,
        errorMessage: '候補の取得に失敗しました',
      })
      setCandidates(data?.candidates ?? [])
    } catch (err) {
      setCandidateError(err instanceof Error ? err.message : '候補の取得に失敗しました')
    }
  }

  const handleCreateTask = async (candidate: SummaryCandidate) => {
    setCandidateError('')
    try {
      await createTask(
        {
          targetType: 'company',
          targetId: companyId,
          title: candidate.title,
          dueDate: candidate.dueDate,
        },
        { errorMessage: 'タスク作成に失敗しました' }
      )
      showToast('タスクを作成しました', 'success')
    } catch (err) {
      setCandidateError(err instanceof Error ? err.message : 'タスク作成に失敗しました')
    }
  }

  const handleCreateAllTasks = async () => {
    if (candidates.length === 0) return
    setIsCreatingCandidates(true)
    setCandidateError('')
    try {
      for (const candidate of candidates) {
        await createTask(
          {
            targetType: 'company',
            targetId: companyId,
            title: candidate.title,
            dueDate: candidate.dueDate,
          },
          { errorMessage: 'タスク作成に失敗しました' }
        )
      }
      setCandidates([])
      showToast('タスク候補を作成しました', 'success')
    } catch (err) {
      setCandidateError(err instanceof Error ? err.message : 'タスク作成に失敗しました')
    } finally {
      setIsCreatingCandidates(false)
    }
  }

  const handleCancelDraftJob = async () => {
    if (!draftJobId) return
    setDraftError('')
    try {
      const data = await cancelJob(undefined, {
        url: `/api/jobs/${draftJobId}/cancel`,
        errorMessage: 'Failed to cancel job',
      })
      if (data?.job) {
        setDraftJob(data.job)
      }
      setIsDraftPolling(false)
      setDraftLoading(false)
      setDraftJobId(null)
      showToast('要約生成をキャンセルしました', 'info')
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Failed to cancel job')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">AIサマリー</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <input
              type="date"
              className="rounded-xl border border-slate-200 px-3 py-1"
              value={periodStart}
              onChange={(event) => {
                setHasCustomPeriod(true)
                setPeriodStart(event.target.value)
              }}
            />
            <input
              type="date"
              className="rounded-xl border border-slate-200 px-3 py-1"
              value={periodEnd}
              onChange={(event) => {
                setHasCustomPeriod(true)
                setPeriodEnd(event.target.value)
              }}
            />
            <Button
              type="button"
              onClick={handleGenerateDraft}
              size="sm"
              isLoading={draftLoading}
              loadingLabel="生成中..."
            >
              要約を生成
            </Button>
          </div>
        </div>
        {draftJob && (
          <div className="mt-3">
            <JobProgressCard
              title="要約生成ジョブ"
              job={draftJob}
              isPolling={isDraftPolling}
              onCancel={handleCancelDraftJob}
            />
          </div>
        )}
        {draftError && <ErrorAlert message={draftError} className="mt-3" />}
        <div className="mt-4 space-y-3">
          <textarea
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            rows={6}
            placeholder="要約内容を入力"
            value={draftContent}
            onChange={(event) => setDraftContent(event.target.value)}
            disabled={draftLoading}
          />
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <select
              className="rounded-xl border border-slate-200 px-3 py-1"
              value={draftType}
              onChange={(event) =>
                setDraftType(event.target.value === 'manual' ? 'manual' : 'auto')
              }
            >
              <option value="auto">自動</option>
              <option value="manual">手動</option>
            </select>
            {canWrite ? (
              <Button
                type="button"
                onClick={handleSaveSummary}
                size="sm"
                variant="secondary"
                isLoading={isSavingSummary}
                loadingLabel="保存中..."
              >
                サマリーを保存
              </Button>
            ) : (
              <span className="text-slate-400">書き込み権限が必要です</span>
            )}
          </div>
          {draftSourceLinks.length > 0 && (
            <div className="text-xs text-slate-500">
              参照元:{' '}
              {draftSourceLinks.map((link) => (
                <span key={link} className="mr-2 text-slate-600">
                  {link}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">サマリー履歴</h4>
          <div className="flex items-center gap-2">
            {candidates.length > 0 && canWrite && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={handleCreateAllTasks}
                isLoading={isCreatingCandidates}
                loadingLabel="作成中..."
              >
                候補を一括作成
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              onClick={handleLoadCandidates}
              isLoading={isLoadingCandidates}
              loadingLabel="取得中..."
            >
              タスク候補を取得
            </Button>
          </div>
        </div>
        {summaryError && <ErrorAlert message={summaryError} className="mt-3" />}
        {summaryLoading ? (
          <LoadingState className="mt-3" message="サマリーを読み込み中..." />
        ) : summaries.length === 0 ? (
          <div className="mt-3 text-sm text-slate-500">サマリーはまだありません。</div>
        ) : (
          <div className="mt-4 space-y-3">
            {summaries.map((summary) => (
              <div
                key={summary.id}
                className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{summary.type}</span>
                  <span>{formatPeriod(summary.periodStart, summary.periodEnd)}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                  {summary.content}
                </p>
                {summary.sourceLinks.length > 0 && (
                  <div className="mt-2 text-xs text-slate-500">
                    参照元:{' '}
                    {summary.sourceLinks.map((link) => (
                      <span key={link} className="mr-2 text-slate-600">
                        {link}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {candidateError && <ErrorAlert message={candidateError} className="mt-3" />}
        {candidates.length > 0 && (
          <div className="mt-4 space-y-2 text-sm">
            {candidates.map((candidate, index) => (
              <div
                key={`${candidate.title}-${index}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-white px-4 py-2"
              >
                <div>
                  <div className="font-semibold text-slate-800">{candidate.title}</div>
                  {candidate.dueDate && (
                    <div className="text-xs text-slate-500">期日: {candidate.dueDate}</div>
                  )}
                </div>
                {canWrite && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleCreateTask(candidate)}
                  >
                    タスク作成
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {toast && (
        <Toast
          message={toast.message}
          variant={
            toast.variant === 'error'
              ? 'error'
              : toast.variant === 'success'
                ? 'success'
                : 'info'
          }
          onClose={clearToast}
        />
      )}
    </div>
  )
}

export default CompanySummarySection
