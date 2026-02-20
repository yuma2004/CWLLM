import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import Button from '../components/ui/Button'
import ErrorAlert from '../components/ui/ErrorAlert'
import JobProgressCard from '../components/ui/JobProgressCard'
import LoadingState from '../components/ui/LoadingState'
import Toast from '../components/ui/Toast'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import Pagination from '../components/ui/Pagination'
import EmptyState from '../components/ui/EmptyState'
import ActiveFilters from '../components/ui/ActiveFilters'
import FilterBadge from '../components/ui/FilterBadge'
import { cn } from '../lib/cn'
import { ChatworkRoom, JobRecord } from '../types'
import { useChatworkSettingsPage } from '../features/chatwork/useChatworkSettingsPage'

type RefetchResult<T> = (
  overrideInit?: RequestInit,
  options?: { ignoreCache?: boolean }
) => Promise<T | null>

type ChatworkJobProgressProps = {
  activeJob: JobRecord | null
  setActiveJob: (job: JobRecord | null) => void
  refetchJob: RefetchResult<{ job: JobRecord }>
  refetchRooms: RefetchResult<{ rooms: ChatworkRoom[] }>
  showToast: (message: string, variant: 'success' | 'error' | 'info' | undefined) => void
  onCancel: () => void
}

function ChatworkJobProgress({
  activeJob,
  setActiveJob,
  refetchJob,
  refetchRooms,
  showToast,
  onCancel,
}: ChatworkJobProgressProps) {
  const [isPolling, setIsPolling] = useState(false)
  const statusRef = useRef<JobRecord['status'] | null>(null)

  useEffect(() => {
    if (activeJob?.status === 'completed') {
      void refetchRooms(undefined, { ignoreCache: true })
    }
  }, [activeJob?.status, refetchRooms])

  useEffect(() => {
    if (!activeJob?.id) return
    let isMounted = true
    const poll = async () => {
      try {
        const data = await refetchJob(undefined, { ignoreCache: true })
        if (!isMounted) return
        if (data?.job) {
          setActiveJob(data.job)
          if (['completed', 'failed', 'canceled'].includes(data.job.status)) {
            window.clearInterval(timer)
            setIsPolling(false)
          }
        }
      } catch {
        if (!isMounted) return
        window.clearInterval(timer)
        setIsPolling(false)
      }
    }

    setIsPolling(true)
    const timer = window.setInterval(poll, 2000)
    void poll()

    return () => {
      isMounted = false
      if (timer) window.clearInterval(timer)
      setIsPolling(false)
    }
  }, [activeJob?.id, refetchJob, setActiveJob])

  useEffect(() => {
    if (!activeJob) return
    const previous = statusRef.current
    if (previous && previous !== activeJob.status) {
      if (activeJob.status === 'completed') {
        showToast('同期が完亁E��ました、E, 'success')
      } else if (activeJob.status === 'failed') {
        showToast('同期に失敗しました、E, 'error')
      } else if (activeJob.status === 'canceled') {
        showToast('同期をキャンセルしました、E, 'info')
      }
    }
    statusRef.current = activeJob.status
  }, [activeJob, showToast])

  const jobProgress = useMemo(() => {
    if (!activeJob?.result) return undefined
    const result = activeJob.result as {
      totalRooms?: number
      processedRooms?: number
      summary?: { rooms?: unknown[]; errors?: unknown[] }
    }
    if (!result) return undefined
    const summary = result.summary
      ? [
          { label: '成功', value: result.summary.rooms?.length ?? 0 },
          { label: 'エラー', value: result.summary.errors?.length ?? 0 },
        ]
      : undefined
    return {
      total: result.totalRooms,
      processed: result.processedRooms,
      summary,
    }
  }, [activeJob])

  if (!activeJob) return null

  return (
    <JobProgressCard
      title={`ジョチE ${activeJob.type ?? 'chatwork'}`}
      job={activeJob}
      progress={jobProgress}
      isPolling={isPolling}
      onCancel={onCancel}
    />
  )
}

function ChatworkSettings() {
  const {
    canManageChatwork,
    activeJob,
    setActiveJob,
    roomQuery,
    setRoomQuery,
    roomFilter,
    setRoomFilter,
    selectedRoomIds,
    setSelectedRoomIds,
    isBulkUpdating,
    toast,
    clearToast,
    isLoadingRooms,
    refetchRooms,
    refetchJob,
    showToast,
    filteredRooms,
    totalRooms,
    currentPage,
    pagedRooms,
    selectedRoomSet,
    allFilteredSelected,
    hasRoomFilters,
    roomFilterLabel,
    isQueueingRooms,
    isQueueingMessages,
    errorMessage,
    handleRoomSync,
    handleMessageSync,
    handleToggle,
    handleRoomQueryChange,
    handleRoomFilterChange,
    handleClearRoomFilters,
    handleRoomPageSizeChange,
    toggleSelectRoom,
    toggleSelectAllFiltered,
    handleBulkToggle,
    handleCancelJob,
  } = useChatworkSettingsPage()
  if (!canManageChatwork) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
        権限が不足してぁE��ため、Chatwork設定を表示できません、E
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase text-slate-400">Chatwork</p>
        <h2 className="text-3xl font-bold text-slate-900">Chatwork設宁E/h2>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={handleRoomSync}
          data-testid="chatwork-room-sync"
          variant="primary"
          isLoading={isQueueingRooms}
          loadingLabel="同期中..."
        >
          ルーム同期
        </Button>
        <Button
          type="button"
          onClick={handleMessageSync}
          variant="secondary"
          isLoading={isQueueingMessages}
          loadingLabel="同期中..."
        >
          メチE��ージ同期
        </Button>
      </div>

      <ChatworkJobProgress
        activeJob={activeJob}
        setActiveJob={setActiveJob}
        refetchJob={refetchJob}
        refetchRooms={refetchRooms}
        showToast={showToast}
        onCancel={handleCancelJob}
      />

      {errorMessage && <ErrorAlert message={errorMessage} />}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Chatworkルーム</h3>
            <p className="text-xs text-slate-400">{totalRooms} 件</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAllFiltered}
              className="rounded border-slate-300"
              disabled={filteredRooms.length === 0 || isBulkUpdating || isLoadingRooms}
            />
            すべて選抁E
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <FormInput
            label="検索"
            value={roomQuery}
            onChange={handleRoomQueryChange}
            placeholder="ルーム名�EID・エラー冁E��"
            name="roomSearch"
            autoComplete="off"
          />
          <FormSelect
            label="状慁E
            value={roomFilter}
            onChange={handleRoomFilterChange}
            name="roomFilter"
          >
            <option value="all">すべて</option>
            <option value="active">稼働中</option>
            <option value="inactive">停止中</option>
            <option value="error">エラーあり</option>
          </FormSelect>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleClearRoomFilters}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              disabled={isLoadingRooms}
            >
              フィルターを解除
            </button>
          </div>
        </div>

        <ActiveFilters isActive={hasRoomFilters} className="border-t border-slate-100 pt-3">
          <span className="text-xs text-slate-500">絞り込み:</span>
          {roomQuery.trim() && (
            <FilterBadge
              label={`検索: ${roomQuery.trim()}`}
              onRemove={() => {
                setRoomQuery('')
                setRoomPage(1)
                setSelectedRoomIds([])
              }}
            />
          )}
          {roomFilter !== 'all' && (
            <FilterBadge
              label={`状慁E ${roomFilterLabel}`}
              onRemove={() => {
                setRoomFilter('all')
                setRoomPage(1)
                setSelectedRoomIds([])
              }}
            />
          )}
          {hasRoomFilters && (
            <button
              type="button"
              onClick={handleClearRoomFilters}
              className="text-xs text-rose-600 hover:text-rose-700"
            >
              すべて解除
            </button>
          )}
        </ActiveFilters>

        {selectedRoomIds.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
            <span className="text-slate-600">{selectedRoomIds.length} 件選択中</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkToggle(true)}
                className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                disabled={isBulkUpdating}
              >
                一括有効匁E
              </button>
              <button
                type="button"
                onClick={() => handleBulkToggle(false)}
                className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                disabled={isBulkUpdating}
              >
                一括無効匁E
              </button>
              <button
                type="button"
                onClick={() => setSelectedRoomIds([])}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                disabled={isBulkUpdating}
              >
                選択解除
              </button>
            </div>
          </div>
        )}

        <div className="mt-4">
          {isLoadingRooms ? (
            <LoadingState data-testid="chatwork-room-loading" />
          ) : totalRooms === 0 ? (
            <EmptyState
              data-testid="chatwork-room-empty"
              message="ルームが見つかりません"
              description="同期を実行して最新のルーム一覧を取得してください、E
              action={
                <button
                  type="button"
                  onClick={handleRoomSync}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                >
                  ルーム同期を実衁E
                </button>
              }
            />
          ) : (
            <div className="space-y-3">
              {pagedRooms.map((room) => (
                <div
                  key={room.id}
                  data-testid="chatwork-room-item"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedRoomSet.has(room.id)}
                      onChange={() => toggleSelectRoom(room.id)}
                      className="mt-1 rounded border-slate-300"
                      disabled={isBulkUpdating}
                    />
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{room.name}</div>
                      <div className="text-xs text-slate-500 break-words">Room ID: {room.roomId}</div>
                      {room.lastErrorMessage && (
                        <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                          <div>
                            エラー{room.lastErrorStatus ? ` (${room.lastErrorStatus})` : ''}
                          </div>
                          <div className="mt-1 break-words text-rose-600">
                            {room.lastErrorMessage}
                          </div>
                          {room.lastErrorAt && (
                            <div className="mt-1 text-[11px] text-rose-500">
                              {new Date(room.lastErrorAt).toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggle(room)}
                    disabled={isBulkUpdating}
                    className={cn(
                      'rounded-full px-4 py-1 text-xs font-semibold focus-visible:ring-2 focus-visible:ring-slate-300',
                      room.isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    )}
                  >
                    {room.isActive ? '稼働中' : '停止中'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4">
          <Pagination
            page={currentPage}
            pageSize={roomPageSize}
            total={totalRooms}
            onPageChange={setRoomPage}
            onPageSizeChange={handleRoomPageSizeChange}
            pageSizeOptions={[20, 50, 100]}
          />
        </div>
      </div>
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

export default ChatworkSettings

