import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import CompanySearchSelect from '../components/CompanySearchSelect'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import ErrorAlert from '../components/ui/ErrorAlert'
import Pagination from '../components/ui/Pagination'
import { usePagination } from '../hooks/usePagination'
import { usePermissions } from '../hooks/usePermissions'
import { apiRequest } from '../lib/apiClient'
import { ApiListResponse } from '../types'
import { formatDateInput } from '../utils/date'

interface MessageResult {
  id: string
  roomId: string
  messageId: string
  sender: string
  body: string
  sentAt: string
  companyId?: string | null
  labels?: string[]
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const highlightText = (text: string, keyword: string) => {
  if (!keyword.trim()) return text
  const pattern = new RegExp(`(${escapeRegExp(keyword.trim())})`, 'gi')
  return text.split(pattern).map((part, index) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark key={`${part}-${index}`} className="rounded bg-amber-100 px-1 text-slate-900">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

function MessageSearch() {
  const location = useLocation()
  const navigate = useNavigate()
  const { canWrite } = usePermissions()
  const initialParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const initialQuery = initialParams.get('q') ?? ''
  const initialMessageId = initialParams.get('messageId') ?? ''
  const initialCompanyId = initialParams.get('companyId') ?? ''
  const initialLabel = initialParams.get('label') ?? ''
  const initialFrom = initialParams.get('from') ?? ''
  const initialTo = initialParams.get('to') ?? ''
  const initialPage = Math.max(Number(initialParams.get('page')) || 1, 1)
  const initialPageSize = Math.max(Number(initialParams.get('pageSize')) || 50, 1)

  const [query, setQuery] = useState(initialQuery)
  const [messageId, setMessageId] = useState(initialMessageId)
  const [companyId, setCompanyId] = useState(initialCompanyId)
  const [label, setLabel] = useState(initialLabel)
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const [preset, setPreset] = useState<'all' | '7' | '30' | 'custom'>('all')
  const [results, setResults] = useState<MessageResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [assignTarget, setAssignTarget] = useState<Record<string, string>>({})
  const [assigningIds, setAssigningIds] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkCompanyId, setBulkCompanyId] = useState('')
  const [bulkLabel, setBulkLabel] = useState('')
  const [labelOptions, setLabelOptions] = useState<string[]>([])
  const [isBulkWorking, setIsBulkWorking] = useState(false)
  const [hasSearched, setHasSearched] = useState(
    Boolean(initialQuery || initialMessageId || initialCompanyId || initialLabel)
  )
  const { pagination, setPagination, setPage, setPageSize } = usePagination(initialPageSize)

  const fetchLabelOptions = useCallback(async () => {
    try {
      const data = await apiRequest<{ items: Array<{ label: string }> }>(
        '/api/messages/labels?limit=20'
      )
      setLabelOptions(data.items.map((item) => item.label))
    } catch {
      setLabelOptions([])
    }
  }, [])

  useEffect(() => {
    fetchLabelOptions()
  }, [fetchLabelOptions])

  useEffect(() => {
    if (initialPage !== pagination.page) {
      setPage(initialPage)
    }
  }, [initialPage, pagination.page, setPage])

  const applyPreset = (days?: number) => {
    if (!days) {
      setPreset('all')
      setFrom('')
      setTo('')
      return
    }
    const today = new Date()
    const fromDate = new Date(today)
    fromDate.setDate(today.getDate() - days + 1)
    setPreset(days === 7 ? '7' : '30')
    setFrom(formatDateInput(fromDate))
    setTo(formatDateInput(today))
  }

  const handleSearch = useCallback(
    async (pageOverride?: number) => {
      const trimmed = query.trim()
      if (!trimmed && !messageId.trim() && !companyId.trim() && !label.trim()) {
        setError('キーワード、メッセージID、企業、またはラベルを入力してください')
        return
      }

      setIsLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()
        if (trimmed) params.set('q', trimmed)
        if (messageId.trim()) params.set('messageId', messageId.trim())
        if (companyId.trim()) params.set('companyId', companyId.trim())
        if (label.trim()) params.set('label', label.trim())
        params.set('page', String(pageOverride ?? pagination.page))
        params.set('pageSize', String(pagination.pageSize))
        if (from) params.set('from', from)
        if (to) params.set('to', to)

        const data = await apiRequest<ApiListResponse<MessageResult>>(
          `/api/messages/search?${params.toString()}`
        )
        setResults(data.items ?? [])
        setPagination((prev) => ({ ...prev, ...data.pagination }))
        setSelectedIds([])
        setHasSearched(true)
        navigate({ pathname: '/messages/search', search: params.toString() }, { replace: true })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'ネットワークエラー')
      } finally {
        setIsLoading(false)
      }
    },
    [companyId, from, label, messageId, navigate, pagination.page, pagination.pageSize, query, setPagination, to]
  )

  useEffect(() => {
    if (hasSearched) {
      handleSearch()
    }
  }, [handleSearch, hasSearched, pagination.page, pagination.pageSize])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setPage(1)
    handleSearch(1)
  }

  const handleAssign = async (messageId: string) => {
    const targetCompanyId = assignTarget[messageId]
    if (!targetCompanyId) {
      setError('企業を選択してください')
      return
    }
    setError('')
    setAssigningIds((prev) => [...prev, messageId])
    try {
      await apiRequest(`/api/messages/${messageId}/assign-company`, {
        method: 'PATCH',
        body: { companyId: targetCompanyId },
      })
      // 割り当て成功後、該当メッセージの選択をクリアして再検索
      setAssignTarget((prev) => {
        const next = { ...prev }
        delete next[messageId]
        return next
      })
      handleSearch()
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setAssigningIds((prev) => prev.filter((id) => id !== messageId))
    }
  }

  const handleBulkAssign = async () => {
    if (selectedIds.length === 0) {
      setError('対象メッセージを選択してください')
      return
    }
    if (!bulkCompanyId) {
      setError('企業を選択してください')
      return
    }
    setError('')
    setIsBulkWorking(true)
    try {
      await apiRequest('/api/messages/assign-company', {
        method: 'PATCH',
        body: { companyId: bulkCompanyId, messageIds: selectedIds },
      })
      setSelectedIds([])
      setBulkCompanyId('')
      handleSearch()
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setIsBulkWorking(false)
    }
  }

  const handleBulkLabelAdd = async () => {
    if (selectedIds.length === 0) {
      setError('対象メッセージを選択してください')
      return
    }
    if (!bulkLabel.trim()) {
      setError('ラベルを入力してください')
      return
    }
    setError('')
    setIsBulkWorking(true)
    try {
      await apiRequest('/api/messages/labels/bulk', {
        method: 'POST',
        body: { label: bulkLabel.trim(), messageIds: selectedIds },
      })
      setBulkLabel('')
      setSelectedIds([])
      handleSearch()
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setIsBulkWorking(false)
    }
  }

  const handleBulkLabelRemove = async () => {
    if (selectedIds.length === 0) {
      setError('対象メッセージを選択してください')
      return
    }
    if (!bulkLabel.trim()) {
      setError('ラベルを入力してください')
      return
    }
    setError('')
    setIsBulkWorking(true)
    try {
      await apiRequest('/api/messages/labels/bulk/remove', {
        method: 'POST',
        body: { label: bulkLabel.trim(), messageIds: selectedIds },
      })
      setBulkLabel('')
      setSelectedIds([])
      handleSearch()
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setIsBulkWorking(false)
    }
  }

  const allSelected = results.length > 0 && selectedIds.length === results.length

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(results.map((message) => message.id))
    }
  }

  const toggleSelected = (messageId: string) => {
    setSelectedIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Search</p>
        <h2 className="text-3xl font-bold text-slate-900">メッセージ検索</h2>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            onClick={() => applyPreset(7)}
            className={`rounded-full px-4 py-1 font-semibold ${
              preset === '7' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            過去7日
          </button>
          <button
            type="button"
            onClick={() => applyPreset(30)}
            className={`rounded-full px-4 py-1 font-semibold ${
              preset === '30' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            過去30日
          </button>
          <button
            type="button"
            onClick={() => applyPreset()}
            className={`rounded-full px-4 py-1 font-semibold ${
              preset === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            全て
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="キーワード"
            aria-label="search-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <input
            type="date"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value)
              setPreset('custom')
            }}
          />
          <input
            type="date"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={to}
            onChange={(event) => {
              setTo(event.target.value)
              setPreset('custom')
            }}
          />
          <button
            type="submit"
            aria-label="search-submit"
            className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
          >
            検索
          </button>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="メッセージID"
            value={messageId}
            onChange={(event) => setMessageId(event.target.value)}
          />
          <CompanySearchSelect
            value={companyId}
            onChange={(nextId) => setCompanyId(nextId)}
            placeholder="企業名で検索"
          />
          <div>
            <input
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="ラベルで絞り込み"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              list="message-label-options"
            />
            <datalist id="message-label-options">
              {labelOptions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>
        </div>
      </form>

      {error && <ErrorAlert message={error} />}

      {results.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="rounded border-slate-300"
                disabled={isBulkWorking}
              />
              全選択
            </label>
            <span className="text-xs text-slate-500">{selectedIds.length}件選択</span>
            <div className="min-w-[220px] flex-1">
              <CompanySearchSelect
                value={bulkCompanyId}
                onChange={(nextId) => setBulkCompanyId(nextId)}
                placeholder="一括割当の企業を選択"
                disabled={!canWrite || isBulkWorking || isLoading}
              />
            </div>
            <Button
              type="button"
              onClick={handleBulkAssign}
              isLoading={isBulkWorking}
              loadingLabel="処理中..."
              disabled={!canWrite}
            >
              一括割当
            </Button>
            <input
              className="min-w-[160px] rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="ラベル"
              value={bulkLabel}
              onChange={(event) => setBulkLabel(event.target.value)}
              list="message-label-options"
              disabled={!canWrite || isBulkWorking || isLoading}
            />
            <Button
              type="button"
              onClick={handleBulkLabelAdd}
              variant="secondary"
              isLoading={isBulkWorking}
              loadingLabel="処理中..."
              disabled={!canWrite}
            >
              ラベル追加
            </Button>
            <Button
              type="button"
              onClick={handleBulkLabelRemove}
              variant="ghost"
              isLoading={isBulkWorking}
              loadingLabel="処理中..."
              disabled={!canWrite}
            >
              ラベル解除
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        {isLoading ? (
          <div className="text-sm text-slate-500">検索中...</div>
        ) : !hasSearched ? (
          <div className="text-sm text-slate-500">条件を入力して検索してください。</div>
        ) : results.length === 0 ? (
          <div className="text-sm text-slate-500">検索結果がありません。</div>
        ) : (
          <div className="space-y-4">
            {results.map((message) => (
              <div
                key={message.id}
                className={[
                  'rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700',
                  selectedIds.includes(message.id) ? 'bg-slate-50' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(message.id)}
                      onChange={() => toggleSelected(message.id)}
                      className="rounded border-slate-300"
                      disabled={isBulkWorking}
                    />
                    選択
                  </label>
                  <span>{message.sender}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{new Date(message.sentAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                  {highlightText(message.body, query)}
                </p>
                {message.labels && message.labels.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {message.labels.map((label) => (
                      <Badge key={label} label={`#${label}`} />
                    ))}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>Room: {message.roomId}</span>
                    {message.companyId ? (
                      <Link
                        to={`/companies/${message.companyId}`}
                        className="font-semibold text-slate-700 hover:text-slate-900"
                      >
                        企業を表示
                      </Link>
                    ) : (
                      <span className="text-slate-400">未割当</span>
                    )}
                  </div>
                  {!message.companyId && canWrite && (
                    <div className="flex flex-wrap gap-2 items-center">
                      <div className="min-w-[200px]">
                        <CompanySearchSelect
                          value={assignTarget[message.id] || ''}
                          onChange={(companyId) =>
                            setAssignTarget((prev) => ({ ...prev, [message.id]: companyId }))
                          }
                          placeholder="企業を選択..."
                          disabled={assigningIds.includes(message.id) || isBulkWorking}
                        />
                      </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAssign(message.id)}
                          disabled={!assignTarget[message.id]}
                          isLoading={assigningIds.includes(message.id)}
                          loadingLabel="割当中..."
                        >
                          割当て
                        </Button>
                    </div>
                  )}
                  {!message.companyId && !canWrite && (
                    <span className="text-xs text-slate-400">閲覧専用ロールは割当てできません。</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {pagination.total > 0 && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  )
}

export default MessageSearch
