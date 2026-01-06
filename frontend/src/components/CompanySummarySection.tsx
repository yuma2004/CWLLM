import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from './ui/Button'
import ErrorAlert from './ui/ErrorAlert'
import { apiRequest } from '../lib/apiClient'
import { formatDate, formatDateInput } from '../utils/date'

interface Summary {
  id: string
  content: string
  type: string
  periodStart: string
  periodEnd: string
  sourceLinks: string[]
  createdAt: string
}

interface Candidate {
  title: string
  dueDate?: string
}

interface JobRecord {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'canceled'
  result?: { draft?: SummaryDraft }
  error?: { message?: string }
}

interface SummaryDraft {
  id: string
  content: string
  periodStart: string
  periodEnd: string
  sourceLinks: string[]
  model?: string | null
  promptVersion?: string | null
  sourceMessageCount?: number | null
  tokenUsage?: unknown
}

const formatPeriod = (start: string, end: string) => `${formatDate(start)} - ${formatDate(end)}`

const getStartDateFromDays = (days: number) => {
  const start = new Date()
  const diff = Math.max(days - 1, 0)
  start.setDate(start.getDate() - diff)
  return start
}

function CompanySummarySection({
  companyId,
  canWrite,
}: {
  companyId: string
  canWrite: boolean
}) {
  const today = useMemo(() => new Date(), [])
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
  const [isDraftPolling, setIsDraftPolling] = useState(false)
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [summaryError, setSummaryError] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [candidateError, setCandidateError] = useState('')
  const [candidateLoading, setCandidateLoading] = useState(false)
  const [isCreatingCandidates, setIsCreatingCandidates] = useState(false)

  const fetchSettings = useCallback(async () => {
    try {
      const data = await apiRequest<{ settings: { summaryDefaultPeriodDays?: number } }>(
        '/api/settings'
      )
      const days = data.settings?.summaryDefaultPeriodDays ?? 30
      if (!hasCustomPeriod) {
        setPeriodStart(formatDateInput(getStartDateFromDays(days)))
        setPeriodEnd(formatDateInput(new Date()))
      }
    } catch {
      if (!hasCustomPeriod) {
        setPeriodStart(formatDateInput(getStartDateFromDays(30)))
        setPeriodEnd(formatDateInput(new Date()))
      }
    }
  }, [hasCustomPeriod])

  const fetchSummaries = useCallback(async () => {
    setSummaryLoading(true)
    setSummaryError('')
    try {
      const data = await apiRequest<{ summaries: Summary[] }>(
        `/api/companies/${companyId}/summaries`
      )
      setSummaries(data.summaries ?? [])
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : '読み込みに失敗しました')
    } finally {
      setSummaryLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    fetchSummaries()
  }, [fetchSummaries])

  useEffect(() => {
    if (!draftJobId) return
    let isMounted = true
    let timer: number | undefined

    const poll = async () => {
      try {
        const data = await apiRequest<{ job: JobRecord }>(`/api/jobs/${draftJobId}`)
        if (!isMounted) return
        const job = data.job
        if (job.status === 'completed' && job.result?.draft) {
          const draft = job.result.draft
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
          setDraftLoading(false)
          setIsDraftPolling(false)
          setDraftJobId(null)
          if (timer) window.clearInterval(timer)
        }
        if (job.status === 'failed' || job.status === 'canceled') {
          setDraftError(job.error?.message || 'Draft generation failed')
          setDraftLoading(false)
          setIsDraftPolling(false)
          setDraftJobId(null)
          if (timer) window.clearInterval(timer)
        }
      } catch (err) {
        if (!isMounted) return
        setDraftError(err instanceof Error ? err.message : 'Failed to check draft status')
        setDraftLoading(false)
        setIsDraftPolling(false)
        setDraftJobId(null)
        if (timer) window.clearInterval(timer)
      }
    }

    setDraftLoading(true)
    setIsDraftPolling(true)
    void poll()
    timer = window.setInterval(poll, 2000)

    return () => {
      isMounted = false
      if (timer) window.clearInterval(timer)
      setIsDraftPolling(false)
    }
  }, [draftJobId])

  const handleGenerateDraft = async () => {
    setDraftLoading(true)
    setDraftError('')
    try {
      const data = await apiRequest<{
        cached?: boolean
        draft?: SummaryDraft
        jobId?: string
        status?: string
      }>(`/api/companies/${companyId}/summaries/draft`, {
        method: 'POST',
        body: {
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd).toISOString(),
        },
      })
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
      } else if (data.jobId) {
        setDraftJobId(data.jobId)
      } else {
        setDraftLoading(false)
        setDraftError('Draft generation failed')
      }
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Draft generation failed')
      setDraftLoading(false)
    }
  }

  const handleSaveSummary = async () => {
    setDraftError('')
    if (!draftContent.trim()) {
      setDraftError('Summary content is required')
      return
    }
    try {
      await apiRequest(`/api/companies/${companyId}/summaries`, {
        method: 'POST',
        body: {
          content: draftContent.trim(),
          type: draftType,
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd).toISOString(),
          sourceLinks: draftSourceLinks,
          model: draftMeta?.model,
          promptVersion: draftMeta?.promptVersion,
          sourceMessageCount: draftMeta?.sourceMessageCount,
          tokenUsage: draftMeta?.tokenUsage,
          draftId,
        },
      })
      setDraftContent('')
      setDraftSourceLinks([])
      setDraftId(null)
      setDraftMeta(null)
      setCandidates([])
      fetchSummaries()
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
    setCandidateLoading(true)
    setCandidateError('')
    try {
      const data = await apiRequest<{ candidates: Candidate[] }>(
        `/api/summaries/${latest.id}/tasks/candidates`,
        { method: 'POST' }
      )
      setCandidates(data.candidates || [])
    } catch (err) {
      setCandidateError(err instanceof Error ? err.message : '候補の取得に失敗しました')
    } finally {
      setCandidateLoading(false)
    }
  }

  const handleCreateTask = async (candidate: Candidate) => {
    setCandidateError('')
    try {
      await apiRequest('/api/tasks', {
        method: 'POST',
        body: {
          targetType: 'company',
          targetId: companyId,
          title: candidate.title,
          dueDate: candidate.dueDate,
        },
      })
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
        await apiRequest('/api/tasks', {
          method: 'POST',
          body: {
            targetType: 'company',
            targetId: companyId,
            title: candidate.title,
            dueDate: candidate.dueDate,
          },
        })
      }
      setCandidates([])
    } catch (err) {
      setCandidateError(err instanceof Error ? err.message : 'タスク作成に失敗しました')
    } finally {
      setIsCreatingCandidates(false)
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
            {isDraftPolling && (
              <span className="text-xs text-slate-500">Generating draft...</span>
            )}
          </div>
        </div>
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
                <Link
                  key={link}
                  to={`/messages/search?messageId=${encodeURIComponent(
                    link
                  )}&companyId=${encodeURIComponent(companyId)}`}
                  className="mr-2 text-slate-600 hover:text-slate-900"
                >
                  {link}
                </Link>
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
              isLoading={candidateLoading}
              loadingLabel="取得中..."
            >
              タスク候補を取得
            </Button>
          </div>
        </div>
        {summaryError && <ErrorAlert message={summaryError} className="mt-3" />}
        {summaryLoading ? (
          <div className="mt-3 text-sm text-slate-500">サマリーを読み込み中...</div>
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
                      <Link
                        key={link}
                        to={`/messages/search?messageId=${encodeURIComponent(
                          link
                        )}&companyId=${encodeURIComponent(companyId)}`}
                        className="mr-2 text-slate-600 hover:text-slate-900"
                      >
                        {link}
                      </Link>
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
    </div>
  )
}

export default CompanySummarySection
