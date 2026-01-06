import { useCallback, useEffect, useState } from 'react'
import CompanySearchSelect from '../components/CompanySearchSelect'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import ErrorAlert from '../components/ui/ErrorAlert'
import Pagination from '../components/ui/Pagination'
import { usePagination } from '../hooks/usePagination'
import { usePermissions } from '../hooks/usePermissions'
import { apiRequest } from '../lib/apiClient'
import { ApiListResponse } from '../types'

interface MessageItem {
  id: string
  roomId: string
  messageId: string
  sender: string
  body: string
  sentAt: string
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

function UnassignedMessages() {
  const { canWrite } = usePermissions()
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [assignTarget, setAssignTarget] = useState<Record<string, string>>({})
  const [assigningIds, setAssigningIds] = useState<string[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkCompanyId, setBulkCompanyId] = useState('')
  const [bulkLabel, setBulkLabel] = useState('')
  const [labelOptions, setLabelOptions] = useState<string[]>([])
  const [isBulkWorking, setIsBulkWorking] = useState(false)
  const { pagination, setPagination, setPage, setPageSize } = usePagination(50)

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

  const fetchMessages = useCallback(
    async (pageOverride?: number) => {
      setIsLoading(true)
      setError('')
      try {
        const params = new URLSearchParams()
        params.set('page', String(pageOverride ?? pagination.page))
        params.set('pageSize', String(pagination.pageSize))
        if (query.trim()) params.set('q', query.trim())

        const data = await apiRequest<ApiListResponse<MessageItem>>(
          `/api/messages/unassigned?${params.toString()}`
        )
        setMessages(data.items ?? [])
        setPagination((prev) => ({ ...prev, ...data.pagination }))
        setSelectedIds([])
      } catch (err) {
        setError(err instanceof Error ? err.message : '通信エラーが発生しました')
      } finally {
        setIsLoading(false)
      }
    },
    [pagination.page, pagination.pageSize, query, setPagination]
  )

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    fetchLabelOptions()
  }, [fetchLabelOptions])

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setPage(1)
    fetchMessages(1)
  }

  const handleAssign = async (messageId: string) => {
    const companyId = assignTarget[messageId]
    if (!companyId) {
      setError('企業を選択してください')
      return
    }
    setError('')
    setAssigningIds((prev) => [...prev, messageId])
    try {
      await apiRequest(`/api/messages/${messageId}/assign-company`, {
        method: 'PATCH',
        body: { companyId },
      })
      setAssignTarget((prev) => {
        const next = { ...prev }
        delete next[messageId]
        return next
      })
      fetchMessages()
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
      fetchMessages()
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
      fetchMessages()
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
      fetchMessages()
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setIsBulkWorking(false)
    }
  }

  const allSelected = messages.length > 0 && selectedIds.length === messages.length

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(messages.map((message) => message.id))
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
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Inbox</p>
        <h2 className="text-3xl font-bold text-slate-900">未紐づけメッセージ</h2>
      </div>

      <form
        onSubmit={handleSearchSubmit}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap gap-3">
          <input
            className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="本文検索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <Button type="submit" variant="primary">
            検索
          </Button>
        </div>
      </form>

      {error && <ErrorAlert message={error} />}

      {!canWrite && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          閲覧専用ロールは割当てできません。
        </div>
      )}

      {messages.length > 0 && (
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
                disabled={isBulkWorking || isLoading || !canWrite}
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
              list="unassigned-label-options"
              disabled={!canWrite || isBulkWorking}
            />
            <datalist id="unassigned-label-options">
              {labelOptions.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
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
          <div className="text-sm text-slate-500">読み込み中...</div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-slate-500">未紐づけメッセージはありません。</div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
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
                <div className="mt-2 text-xs text-slate-400">Room: {message.roomId}</div>
                {canWrite && (
                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    <div className="min-w-[200px] flex-1">
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

export default UnassignedMessages
