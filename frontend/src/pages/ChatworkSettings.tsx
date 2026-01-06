import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '../components/ui/Button'
import ErrorAlert from '../components/ui/ErrorAlert'
import JobProgressCard from '../components/ui/JobProgressCard'
import Toast from '../components/ui/Toast'
import { useFetch, useMutation } from '../hooks/useApi'
import { usePermissions } from '../hooks/usePermissions'
import { useToast } from '../hooks/useToast'
import { ChatworkRoom, JobRecord } from '../types'

function ChatworkSettings() {
  const { isAdmin } = usePermissions()
  const [activeJob, setActiveJob] = useState<JobRecord | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [actionError, setActionError] = useState('')
  const { toast, showToast, clearToast } = useToast()
  const statusRef = useRef<JobRecord['status'] | null>(null)

  const {
    data: roomsData,
    isLoading: isLoadingRooms,
    error: roomsError,
    refetch: refetchRooms,
  } = useFetch<{ rooms: ChatworkRoom[] }>(
    isAdmin ? '/api/chatwork/rooms' : null,
    {
      enabled: isAdmin,
      errorMessage: '通信エラーが発生しました',
      cacheTimeMs: 10_000,
    }
  )

  const rooms = roomsData?.rooms ?? []

  const { mutate: queueRoomSync, isLoading: isQueueingRooms } = useMutation<
    { jobId: string; status: JobRecord['status'] },
    void
  >('/api/chatwork/rooms/sync', 'POST')

  const { mutate: queueMessageSync, isLoading: isQueueingMessages } = useMutation<
    { jobId: string; status: JobRecord['status'] },
    void
  >('/api/chatwork/messages/sync', 'POST')

  const { mutate: toggleRoom } = useMutation<{ room: ChatworkRoom }, { isActive: boolean }>(
    '/api/chatwork/rooms',
    'PATCH'
  )

  const { mutate: cancelJob } = useMutation<{ job: JobRecord }, void>('/api/jobs', 'POST')

  const { data: jobData, error: jobError, refetch: refetchJob } = useFetch<{ job: JobRecord }>(
    activeJob ? `/api/jobs/${activeJob.id}` : null,
    {
      enabled: false,
      errorMessage: 'ジョブステータスの確認に失敗しました',
    }
  )

  useEffect(() => {
    if (!jobData?.job) return
    setActiveJob(jobData.job)
  }, [jobData])

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
  }, [activeJob?.id, refetchJob])

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

  const handleRoomSync = async () => {
    setActionError('')
    try {
      const data = await queueRoomSync(undefined, {
        errorMessage: 'ルーム同期のキューに失敗しました',
      })
      if (data) {
        setActiveJob({ id: data.jobId, type: 'chatwork_rooms_sync', status: data.status })
        showToast('ルーム同期を開始しました', 'success')
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'ルーム同期のキューに失敗しました')
    }
  }

  const handleMessageSync = async () => {
    setActionError('')
    try {
      const data = await queueMessageSync(undefined, {
        errorMessage: 'メッセージ同期のキューに失敗しました',
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
      setActionError(err instanceof Error ? err.message : 'メッセージ同期のキューに失敗しました')
    }
  }

  const handleToggle = async (room: ChatworkRoom) => {
    setActionError('')
    try {
      await toggleRoom(
        { isActive: !room.isActive },
        {
          url: `/api/chatwork/rooms/${room.id}`,
          errorMessage: '通信エラーが発生しました',
          onSuccess: () => {
            void refetchRooms(undefined, { ignoreCache: true })
          },
        }
      )
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }

  const handleCancelJob = async () => {
    if (!activeJob?.id) return
    setActionError('')
    try {
      const data = await cancelJob(undefined, {
        url: `/api/jobs/${activeJob.id}/cancel`,
        errorMessage: 'ジョブのキャンセルに失敗しました',
      })
      if (data?.job) {
        setActiveJob(data.job)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'ジョブのキャンセルに失敗しました')
    }
  }

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
          { label: '同期済み', value: result.summary.rooms?.length ?? 0 },
          { label: 'エラー', value: result.summary.errors?.length ?? 0 },
        ]
      : undefined
    return {
      total: result.totalRooms,
      processed: result.processedRooms,
      summary,
    }
  }, [activeJob])

  const errorMessage = actionError || roomsError || jobError

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
        管理者のみがChatwork設定を操作できます。
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-400">設定</p>
        <h2 className="text-3xl font-bold text-slate-900">Chatwork 同期設定</h2>
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
      {activeJob && (
        <JobProgressCard
          title={`ジョブ: ${activeJob.type ?? 'chatwork'}`}
          job={activeJob}
          progress={jobProgress}
          isPolling={isPolling}
          onCancel={handleCancelJob}
        />
      )}

      {errorMessage && <ErrorAlert message={errorMessage} />}

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">ルーム一覧</h3>

        <div className="mt-4">
          {isLoadingRooms ? (
            <div className="text-sm text-slate-500" data-testid="chatwork-room-loading">
              読み込み中...
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-sm text-slate-500" data-testid="chatwork-room-empty">
              ルームがまだ登録されていません。
            </div>
          ) : (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  data-testid="chatwork-room-item"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{room.name}</div>
                    <div className="text-xs text-slate-500">Room ID: {room.roomId}</div>
                    {room.lastErrorMessage && (
                      <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                        <div>
                          同期失敗{room.lastErrorStatus ? ` (${room.lastErrorStatus})` : ''}
                        </div>
                        <div className="mt-1 whitespace-pre-wrap text-rose-600">
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
                  <button
                    type="button"
                    onClick={() => handleToggle(room)}
                    className={`rounded-full px-4 py-1 text-xs font-semibold ${
                      room.isActive
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {room.isActive ? '取り込み中' : '除外中'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant === 'error' ? 'error' : toast.variant === 'success' ? 'success' : 'info'}
          onClose={clearToast}
        />
      )}
    </div>
  )
}

export default ChatworkSettings

