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
import { useFetch, useMutation } from '../hooks/useApi'
import { usePermissions } from '../hooks/usePermissions'
import { useToast } from '../hooks/useToast'
import { apiSend } from '../lib/apiClient'
import { apiRoutes } from '../lib/apiRoutes'
import { cn } from '../lib/cn'
import { toErrorMessage } from '../utils/errorState'
import { ChatworkRoom, JobRecord } from '../types'

type RefetchResult<T> = (overrideInit?: RequestInit, options?: { ignoreCache?: boolean }) => Promise<T | null>

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
        showToast('同期が完了しました', 'success')
      } else if (activeJob.status === 'failed') {
        showToast('同期に失敗しました', 'error')
      } else if (activeJob.status === 'canceled') {
        showToast('同期をキャンセルしました', 'info')
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
      title={`ジョブ: ${activeJob.type ?? 'chatwork'}`}
      job={activeJob}
      progress={jobProgress}
      isPolling={isPolling}
      onCancel={onCancel}
    />
  )
}

function ChatworkSettings() {
  const { isAdmin } = usePermissions()
  const canManageChatwork = isAdmin
  const [activeJob, setActiveJob] = useState<JobRecord | null>(null)
  const [actionError, setActionError] = useState('')
  const [roomQuery, setRoomQuery] = useState('')
  const [roomFilter, setRoomFilter] = useState<'all' | 'active' | 'inactive' | 'error'>('all')
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [roomPage, setRoomPage] = useState(1)
  const [roomPageSize, setRoomPageSize] = useState(20)
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const { toast, showToast, clearToast } = useToast()

  const {
    data: roomsData,
    isLoading: isLoadingRooms,
    error: roomsError,
    refetch: refetchRooms,
  } = useFetch<{ rooms: ChatworkRoom[] }>(
    canManageChatwork ? apiRoutes.chatwork.rooms() : null,
    {
      enabled: canManageChatwork,
      errorMessage: 'Chatworkルーム一覧の取得に失敗しました',
      cacheTimeMs: 10_000,
    }
  )

  const filteredRooms = useMemo(() => {
    const rooms = roomsData?.rooms ?? []
    const query = roomQuery.trim().toLowerCase()
    return rooms.filter((room) => {
      if (roomFilter === 'active' && !room.isActive) return false
      if (roomFilter === 'inactive' && room.isActive) return false
      if (roomFilter === 'error' && !room.lastErrorMessage && !room.lastErrorAt) return false
      if (!query) return true
      const haystack = [
        room.name,
        room.roomId,
        room.description,
        room.lastErrorMessage,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [roomsData, roomFilter, roomQuery])

  const totalRooms = filteredRooms.length
  const totalPages = Math.max(1, Math.ceil(totalRooms / roomPageSize))
  const currentPage = Math.min(roomPage, totalPages)
  const pagedRooms = useMemo(() => {
    const start = (currentPage - 1) * roomPageSize
    return filteredRooms.slice(start, start + roomPageSize)
  }, [currentPage, filteredRooms, roomPageSize])
  const selectedRoomSet = useMemo(() => new Set(selectedRoomIds), [selectedRoomIds])
  const allFilteredSelected =
    filteredRooms.length > 0 && filteredRooms.every((room) => selectedRoomSet.has(room.id))

  const { mutate: queueRoomSync, isLoading: isQueueingRooms } = useMutation<
    { jobId: string; status: JobRecord['status'] },
    void
  >(apiRoutes.chatwork.roomsSync(), 'POST')

  const { mutate: queueMessageSync, isLoading: isQueueingMessages } = useMutation<
    { jobId: string; status: JobRecord['status'] },
    void
  >(apiRoutes.chatwork.messagesSync(), 'POST')

  const { mutate: toggleRoom } = useMutation<{ room: ChatworkRoom }, { isActive: boolean }>(
    apiRoutes.chatwork.rooms(),
    'PATCH'
  )

  const { mutate: cancelJob } = useMutation<{ job: JobRecord }, void>(apiRoutes.jobs.base(), 'POST')

  const { data: jobData, error: jobError, refetch: refetchJob } = useFetch<{ job: JobRecord }>(
    activeJob ? apiRoutes.jobs.detail(activeJob.id) : null,
    {
      enabled: false,
      errorMessage: 'ジョブの取得に失敗しました',
    }
  )

  useEffect(() => {
    if (!jobData?.job) return
    setActiveJob(jobData.job)
  }, [jobData])

  const handleRoomSync = async () => {
    setActionError('')
    try {
      const data = await queueRoomSync(undefined, {
        errorMessage: 'ルーム同期に失敗しました',
      })
      if (data) {
        setActiveJob({ id: data.jobId, type: 'chatwork_rooms_sync', status: data.status })
        showToast('ルーム同期を開始しました', 'success')
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'ルーム同期に失敗しました')
    }
  }

  const handleMessageSync = async () => {
    setActionError('')
    try {
      const data = await queueMessageSync(undefined, {
        errorMessage: 'メッセージ同期に失敗しました',
      })
      if (data) {
        setActiveJob({
          id: data.jobId,
          type: 'chatwork_messages_sync',
          status: data.status,
        })
        showToast('メッセージ同期を開始しました', 'success')
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'メッセージ同期に失敗しました')
    }
  }

  const handleToggle = async (room: ChatworkRoom) => {
    setActionError('')
    try {
      await toggleRoom(
        { isActive: !room.isActive },
        {
          url: apiRoutes.chatwork.room(room.id),
          errorMessage: 'ルームの更新に失敗しました',
          onSuccess: () => {
            void refetchRooms(undefined, { ignoreCache: true })
          },
        }
      )
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'ルームの更新に失敗しました')
    }
  }

  const handleRoomQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setRoomQuery(event.target.value)
    setRoomPage(1)
    setSelectedRoomIds([])
  }

  const handleRoomFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setRoomFilter(event.target.value as 'all' | 'active' | 'inactive' | 'error')
    setRoomPage(1)
    setSelectedRoomIds([])
  }

  const handleClearRoomFilters = () => {
    setRoomQuery('')
    setRoomFilter('all')
    setRoomPage(1)
    setSelectedRoomIds([])
  }

  const handleRoomPageSizeChange = (pageSize: number) => {
    setRoomPageSize(pageSize)
    setRoomPage(1)
  }

  const toggleSelectRoom = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    )
  }

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedRoomIds((prev) =>
        prev.filter((id) => !filteredRooms.some((room) => room.id === id))
      )
      return
    }
    setSelectedRoomIds((prev) => {
      const next = new Set(prev)
      filteredRooms.forEach((room) => next.add(room.id))
      return Array.from(next)
    })
  }

  const handleBulkToggle = async (nextActive: boolean) => {
    if (selectedRoomIds.length === 0) return
    setActionError('')
    setIsBulkUpdating(true)
    try {
      await Promise.all(
        selectedRoomIds.map((roomId) =>
          apiSend(apiRoutes.chatwork.room(roomId), 'PATCH', { isActive: nextActive })
        )
      )
      setSelectedRoomIds([])
      void refetchRooms(undefined, { ignoreCache: true })
      showToast(
        nextActive ? '選択したルームを有効にしました' : '選択したルームを無効にしました',
        'success'
      )
    } catch (err) {
      const message = toErrorMessage(err, '一括更新に失敗しました')
      setActionError(message)
      showToast(message, 'error')
    } finally {
      setIsBulkUpdating(false)
    }
  }

  const handleCancelJob = async () => {
    if (!activeJob?.id) return
    setActionError('')
    try {
      const data = await cancelJob(undefined, {
        url: apiRoutes.jobs.cancel(activeJob.id),
        errorMessage: 'ジョブのキャンセルに失敗しました',
      })
      if (data?.job) {
        setActiveJob(data.job)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'ジョブのキャンセルに失敗しました')
    }
  }

  const errorMessage = actionError || roomsError || jobError

  if (!canManageChatwork) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
        管理者のみChatworkを操作できます。
      </div>
    )
  }

  return (
    <div className="space-y-4 ">
      <div>
        <p className="text-sm uppercase  text-slate-400">チャットワーク</p>
        <h2 className="text-3xl font-bold text-slate-900">Chatwork設定</h2>
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
          メッセージ同期
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
            <p className="text-xs text-slate-400">{totalRooms}件</p>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleSelectAllFiltered}
              className="rounded border-slate-300"
              disabled={filteredRooms.length === 0 || isBulkUpdating || isLoadingRooms}
            />
            全選択
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <FormInput
            label="検索"
            value={roomQuery}
            onChange={handleRoomQueryChange}
            placeholder="ルーム名・ID・エラー内容"
            name="roomSearch"
            autoComplete="off"
          />
          <FormSelect
            label="状態"
            value={roomFilter}
            onChange={handleRoomFilterChange}
            name="roomFilter"
          >
            <option value="all">すべて</option>
            <option value="active">有効</option>
            <option value="inactive">無効</option>
            <option value="error">エラーあり</option>
          </FormSelect>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleClearRoomFilters}
              className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              disabled={isLoadingRooms}
            >
              条件をクリア
            </button>
          </div>
        </div>

        {selectedRoomIds.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-xs">
            <span className="text-slate-600">{selectedRoomIds.length}件選択中</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkToggle(true)}
                className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                disabled={isBulkUpdating}
              >
                一括有効化
              </button>
              <button
                type="button"
                onClick={() => handleBulkToggle(false)}
                className="rounded-full bg-slate-700 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
                disabled={isBulkUpdating}
              >
                一括無効化
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
              message="ルームがありません"
              description="同期を実行して最新のルーム一覧を取得してください。"
              action={
                <button
                  type="button"
                  onClick={handleRoomSync}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                >
                  ルーム同期を実行
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
                    {room.isActive ? '有効' : '無効'}
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
