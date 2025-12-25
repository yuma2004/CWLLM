import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

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

const formatDate = (value: Date) => value.toISOString().slice(0, 10)

const formatPeriod = (start: string, end: string) =>
  `${new Date(start).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`

function CompanySummarySection({
  companyId,
  canWrite,
}: {
  companyId: string
  canWrite: boolean
}) {
  const today = useMemo(() => new Date(), [])
  const defaultStart = useMemo(() => {
    const start = new Date()
    start.setDate(start.getDate() - 29)
    return start
  }, [])

  const [periodStart, setPeriodStart] = useState(formatDate(defaultStart))
  const [periodEnd, setPeriodEnd] = useState(formatDate(today))
  const [draftContent, setDraftContent] = useState('')
  const [draftSourceLinks, setDraftSourceLinks] = useState<string[]>([])
  const [draftType, setDraftType] = useState<'manual' | 'auto'>('auto')
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftError, setDraftError] = useState('')
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [summaryError, setSummaryError] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [candidateError, setCandidateError] = useState('')
  const [candidateLoading, setCandidateLoading] = useState(false)

  const fetchSummaries = useCallback(async () => {
    setSummaryLoading(true)
    setSummaryError('')
    try {
      const response = await fetch(`/api/companies/${companyId}/summaries`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load summaries')
      }
      setSummaries(data.summaries)
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setSummaryLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    fetchSummaries()
  }, [fetchSummaries])

  const handleGenerateDraft = async () => {
    setDraftLoading(true)
    setDraftError('')
    try {
      const response = await fetch(`/api/companies/${companyId}/summaries/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd).toISOString(),
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate draft')
      }
      setDraftContent(data.draft.content)
      setDraftSourceLinks(data.draft.sourceLinks || [])
      setDraftType('auto')
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setDraftLoading(false)
    }
  }

  const handleSaveSummary = async () => {
    setDraftError('')
    if (!draftContent.trim()) {
      setDraftError('Draft content is empty')
      return
    }
    try {
      const response = await fetch(`/api/companies/${companyId}/summaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: draftContent.trim(),
          type: draftType,
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd).toISOString(),
          sourceLinks: draftSourceLinks,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save summary')
      }
      setDraftContent('')
      setDraftSourceLinks([])
      setCandidates([])
      fetchSummaries()
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Network error')
    }
  }

  const handleLoadCandidates = async () => {
    const latest = summaries[0]
    if (!latest) {
      setCandidateError('No summary available')
      return
    }
    setCandidateLoading(true)
    setCandidateError('')
    try {
      const response = await fetch(`/api/summaries/${latest.id}/tasks/candidates`, {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load candidates')
      }
      setCandidates(data.candidates || [])
    } catch (err) {
      setCandidateError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setCandidateLoading(false)
    }
  }

  const handleCreateTask = async (candidate: Candidate) => {
    setCandidateError('')
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          targetType: 'company',
          targetId: companyId,
          title: candidate.title,
          dueDate: candidate.dueDate,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create task')
      }
    } catch (err) {
      setCandidateError(err instanceof Error ? err.message : 'Network error')
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">AI Summary</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            <input
              type="date"
              className="rounded-xl border border-slate-200 px-3 py-1"
              value={periodStart}
              onChange={(event) => setPeriodStart(event.target.value)}
            />
            <input
              type="date"
              className="rounded-xl border border-slate-200 px-3 py-1"
              value={periodEnd}
              onChange={(event) => setPeriodEnd(event.target.value)}
            />
            <button
              type="button"
              onClick={handleGenerateDraft}
              className="rounded-full bg-slate-900 px-4 py-1 text-xs font-semibold text-white"
              disabled={draftLoading}
            >
              Generate
            </button>
          </div>
        </div>
        {draftError && (
          <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {draftError}
          </div>
        )}
        <div className="mt-4 space-y-3">
          <textarea
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            rows={6}
            placeholder="Draft summary"
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
              <option value="auto">auto</option>
              <option value="manual">manual</option>
            </select>
            {canWrite ? (
              <button
                type="button"
                onClick={handleSaveSummary}
                className="rounded-full bg-sky-600 px-4 py-1 text-xs font-semibold text-white"
              >
                Save summary
              </button>
            ) : (
              <span className="text-slate-400">Write access required to save</span>
            )}
          </div>
          {draftSourceLinks.length > 0 && (
            <div className="text-xs text-slate-500">
              Sources:{' '}
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

      <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-900">Summary history</h4>
          <button
            type="button"
            onClick={handleLoadCandidates}
            className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
            disabled={candidateLoading}
          >
            Task candidates
          </button>
        </div>
        {summaryError && (
          <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {summaryError}
          </div>
        )}
        {summaryLoading ? (
          <div className="mt-3 text-sm text-slate-500">Loading summaries...</div>
        ) : summaries.length === 0 ? (
          <div className="mt-3 text-sm text-slate-500">No summaries yet.</div>
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
                    Sources:{' '}
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

        {candidateError && (
          <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {candidateError}
          </div>
        )}
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
                    <div className="text-xs text-slate-500">Due: {candidate.dueDate}</div>
                  )}
                </div>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => handleCreateTask(candidate)}
                    className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white"
                  >
                    Create task
                  </button>
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
