import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { useFetch, useMutation } from '../../hooks/useApi'
import { usePermissions } from '../../hooks/usePermissions'
import { useToast } from '../../hooks/useToast'
import { apiSend } from '../../lib/apiClient'
import { apiRoutes } from '../../lib/apiRoutes'
import { toErrorMessage } from '../../utils/errorState'
import type { ChatworkRoom, JobRecord } from '../../types'

export type RoomFilter = 'all' | 'active' | 'inactive' | 'error'

export const useChatworkSettingsPage = () => {
  const { isAdmin } = usePermissions()
  const canManageChatwork = isAdmin
  const [activeJob, setActiveJob] = useState<JobRecord | null>(null)
  const [actionError, setActionError] = useState('')
  const [roomQuery, setRoomQuery] = useState('')
  const [roomFilter, setRoomFilter] = useState<RoomFilter>('all')
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
      errorMessage: 'Chatworkルームの取得に失敗しました。',
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
      const haystack = [room.name, room.roomId, room.description, room.lastErrorMessage]
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
      errorMessage: 'ジョブの取得に失敗しました。',
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
        errorMessage: 'ルーム同期ジョブの起動に失敗しました。',
      })
      if (data) {
        setActiveJob({ id: data.jobId, type: 'chatwork_rooms_sync', status: data.status })
        showToast('ルーム同期ジョブを開始しました。', 'success')
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'ルーム同期ジョブの起動に失敗しました。'
      )
    }
  }

  const handleMessageSync = async () => {
    setActionError('')
    try {
      const data = await queueMessageSync(undefined, {
        errorMessage: 'メッセージ同期ジョブの起動に失敗しました。',
      })
      if (data) {
        setActiveJob({
          id: data.jobId,
          type: 'chatwork_messages_sync',
          status: data.status,
        })
        showToast('メッセージ同期ジョブを開始しました。', 'success')
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'メッセージ同期ジョブの起動に失敗しました。'
      )
    }
  }

  const handleToggle = async (room: ChatworkRoom) => {
    setActionError('')
    try {
      await toggleRoom(
        { isActive: !room.isActive },
        {
          url: apiRoutes.chatwork.room(room.id),
          errorMessage: 'ルーム状態の更新に失敗しました。',
          onSuccess: () => {
            void refetchRooms(undefined, { ignoreCache: true })
          },
        }
      )
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'ルーム状態の更新に失敗しました。')
    }
  }

  const handleRoomQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    setRoomQuery(event.target.value)
    setRoomPage(1)
    setSelectedRoomIds([])
  }

  const handleRoomFilterChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setRoomFilter(event.target.value as RoomFilter)
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

  const handleRoomPageChange = (nextPage: number) => {
    if (totalPages <= 1) {
      setRoomPage(1)
      return
    }
    const normalizedPage = Math.max(1, Math.min(nextPage, totalPages))
    setRoomPage(normalizedPage)
  }

  const toggleSelectRoom = (roomId: string) => {
    setSelectedRoomIds((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]
    )
  }

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedRoomIds((prev) => prev.filter((id) => !filteredRooms.some((room) => room.id === id)))
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
        nextActive ? '選択したルームを有効化しました。' : '選択したルームを無効化しました。',
        'success'
      )
    } catch (err) {
      const message = toErrorMessage(err, 'ルームの一括更新に失敗しました。')
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
        errorMessage: 'ジョブのキャンセルに失敗しました。',
      })
      if (data?.job) {
        setActiveJob(data.job)
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'ジョブのキャンセルに失敗しました。')
    }
  }

  const errorMessage = actionError || roomsError || jobError

  return {
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
    totalPages,
    currentPage,
    roomPageSize,
    pagedRooms,
    selectedRoomSet,
    allFilteredSelected,
    isQueueingRooms,
    isQueueingMessages,
    errorMessage,
    handleRoomSync,
    handleMessageSync,
    handleToggle,
    handleRoomQueryChange,
    handleRoomFilterChange,
    handleClearRoomFilters,
    handleRoomPageChange,
    handleRoomPageSizeChange,
    toggleSelectRoom,
    toggleSelectAllFiltered,
    handleBulkToggle,
    handleCancelJob,
  }
}
