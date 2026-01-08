import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CompanyTasksSection from '../components/CompanyTasksSection'
import Badge from '../components/ui/Badge'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import Pagination from '../components/ui/Pagination'
import { Skeleton, SkeletonAvatar, SkeletonText } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import Tabs, { Tab } from '../components/ui/Tabs'
import Toast from '../components/ui/Toast'
import { usePagination } from '../hooks/usePagination'
import { usePermissions } from '../hooks/usePermissions'
import { useFetch, useMutation } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { apiRoutes } from '../lib/apiRoutes'
import {
  ApiListResponse,
  AvailableRoom,
  Company,
  Contact,
  LinkedRoom,
  MessageItem,
} from '../types'
import { formatDateGroup } from '../utils/date'
import { getAvatarColor, getInitials } from '../utils/string'
import {
  COMPANY_CATEGORY_DEFAULT_OPTIONS,
  COMPANY_STATUS_DEFAULT_OPTIONS,
} from '../constants/labels'
import FormSelect from '../components/ui/FormSelect'


// Group messages by date
function groupMessagesByDate(messages: MessageItem[]): Map<string, MessageItem[]> {
  const groups = new Map<string, MessageItem[]>()
  messages.forEach((msg) => {
    const dateKey = formatDateGroup(msg.sentAt)
    if (!groups.has(dateKey)) {
      groups.set(dateKey, [])
    }
    groups.get(dateKey)!.push(msg)
  })
  return groups
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const NETWORK_ERROR_MESSAGE = '通信エラーが発生しました'

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

function CompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const { canWrite, isAdmin } = usePermissions()
  const canManageChatwork = isAdmin
  const [company, setCompany] = useState<Company | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [contactError, setContactError] = useState('')
  const [companyError, setCompanyError] = useState('')
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [messageQuery, setMessageQuery] = useState('')
  const [messageFrom, setMessageFrom] = useState('')
  const [messageTo, setMessageTo] = useState('')
  const [messageLabel, setMessageLabel] = useState('')
  const [messageError, setMessageError] = useState('')
  const [labelInputs, setLabelInputs] = useState<Record<string, string>>({})
  const [linkedRooms, setLinkedRooms] = useState<LinkedRoom[]>([])
  const [roomInput, setRoomInput] = useState('')
  const [roomError, setRoomError] = useState('')
  const [showContactForm, setShowContactForm] = useState(false)
  const [isEditingTags, setIsEditingTags] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingCategory, setIsEditingCategory] = useState(false)
  const [isEditingStatus, setIsEditingStatus] = useState(false)
  const [form, setForm] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    memo: '',
  })
  const [editingContactId, setEditingContactId] = useState<string | null>(null)
  const [editContactForm, setEditContactForm] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    memo: '',
  })
  const [contactActionError, setContactActionError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDedupeConfirmOpen, setIsDedupeConfirmOpen] = useState(false)
  const [isDedupeWorking, setIsDedupeWorking] = useState(false)
  const [companyForm, setCompanyForm] = useState<{
    tags: string[]
    profile: string
    category: string
    status: string
  }>({
    tags: [],
    profile: '',
    category: '',
    status: '',
  })
  const [tagInput, setTagInput] = useState('')
  const { toast, showToast, clearToast } = useToast()

  const {
    pagination: messagePagination,
    setPagination: setMessagePagination,
    setPage: setMessagePage,
    setPageSize: setMessagePageSize,
  } = usePagination(30)

  const {
    error: companyFetchError,
    isLoading: isLoadingCompany,
    refetch: refetchCompany,
  } = useFetch<{ company: Company }>(id ? apiRoutes.companies.detail(id) : null, {
    enabled: Boolean(id),
    errorMessage: NETWORK_ERROR_MESSAGE,
    onSuccess: (data) => {
      setCompany(data.company)
      setCompanyForm({
        tags: data.company.tags ?? [],
        profile: data.company.profile || '',
        category: data.company.category || '',
        status: data.company.status || '',
      })
    },
  })

  const {
    error: contactsFetchError,
    isLoading: isLoadingContacts,
    refetch: refetchContacts,
  } = useFetch<{ contacts: Contact[] }>(id ? apiRoutes.companies.contacts(id) : null, {
    enabled: Boolean(id),
    errorMessage: NETWORK_ERROR_MESSAGE,
    onSuccess: (data) => setContacts(data.contacts ?? []),
  })


  // Group messages by date
  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages])
  const duplicateContactGroups = useMemo(() => {
    const groups = new Map<string, Contact[]>()
    contacts.forEach((contact) => {
      const emailKey = contact.email?.trim().toLowerCase()
      const phoneKey = contact.phone?.trim()
      const key = emailKey || phoneKey
      if (!key) return
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(contact)
    })
    return Array.from(groups.values()).filter((group) => group.length > 1)
  }, [contacts])

  // Tab configuration
  const tabs: Tab[] = useMemo(
    () => [
      { id: 'overview', label: '概要' },
      { id: 'timeline', label: 'タイムライン', count: messagePagination.total },
      { id: 'tasks', label: 'タスク' },
    ],
    [messagePagination.total]
  )


  const messagesUrl = useMemo(() => {
    if (!id) return null
    const params = new URLSearchParams()
    params.set('page', String(messagePagination.page))
    params.set('pageSize', String(messagePagination.pageSize))
    if (messageFrom) params.set('from', messageFrom)
    if (messageTo) params.set('to', messageTo)
    if (messageLabel.trim()) params.set('label', messageLabel.trim())
    const trimmedQuery = messageQuery.trim()
    if (trimmedQuery) {
      params.set('q', trimmedQuery)
      params.set('companyId', id)
      return apiRoutes.messages.search(params.toString())
    }
    return apiRoutes.companies.messages(id, params.toString())
  }, [
    id,
    messageFrom,
    messageTo,
    messageQuery,
    messageLabel,
    messagePagination.page,
    messagePagination.pageSize,
  ])

  const { isLoading: isLoadingMessages, refetch: refetchMessages } =
    useFetch<ApiListResponse<MessageItem>>(messagesUrl, {
    enabled: Boolean(messagesUrl),
    errorMessage: NETWORK_ERROR_MESSAGE,
    onStart: () => setMessageError(''),
    onSuccess: (data) => {
      setMessages(data.items ?? [])
      setMessagePagination((prev) => ({ ...prev, ...data.pagination }))
    },
    onError: setMessageError,
  })

  const { error: linkedRoomsFetchError, refetch: refetchLinkedRooms } = useFetch<{
    rooms: LinkedRoom[]
  }>(id ? apiRoutes.companies.chatworkRooms(id) : null, {
    enabled: Boolean(id),
    errorMessage: NETWORK_ERROR_MESSAGE,
    onSuccess: (data) => setLinkedRooms(data.rooms ?? []),
    onError: setRoomError,
  })

  const {
    data: availableRoomsData,
    isLoading: isLoadingRooms,
    error: availableRoomsFetchError,
  } = useFetch<{ rooms: AvailableRoom[] }>(apiRoutes.chatwork.rooms(), {
    enabled: canManageChatwork,
    errorMessage: 'Chatworkルーム一覧の取得に失敗しました。管理者権限が必要な場合があります。',
  })

  const availableRooms = useMemo(() => {
    const rooms = availableRoomsData?.rooms ?? []
    if (rooms.length === 0) return []
    const linkedRoomIds = new Set(linkedRooms.map((room) => room.roomId))
    return rooms.filter((room) => !linkedRoomIds.has(room.roomId))
  }, [availableRoomsData, linkedRooms])

  const { data: companyOptionsData } = useFetch<{
    categories: string[]
    statuses: string[]
    tags: string[]
  }>(apiRoutes.companies.options(), {
    errorMessage: '候補の取得に失敗しました',
    cacheTimeMs: 30_000,
  })

  const { data: labelOptionsData } = useFetch<{ items: Array<{ label: string }> }>(
    apiRoutes.messages.labels(20),
    {
      errorMessage: 'ラベル候補の取得に失敗しました',
      cacheTimeMs: 30_000,
    }
  )


  const tagOptions = companyOptionsData?.tags ?? []
  const labelOptions = labelOptionsData?.items?.map((item) => item.label) ?? []

  // 標準候補とAPIから取得した候補をマージ
  const mergedCategories = useMemo(() => {
    return Array.from(
      new Set([...COMPANY_CATEGORY_DEFAULT_OPTIONS, ...(companyOptionsData?.categories ?? [])])
    ).sort()
  }, [companyOptionsData?.categories])

  const mergedStatuses = useMemo(() => {
    return Array.from(
      new Set([...COMPANY_STATUS_DEFAULT_OPTIONS, ...(companyOptionsData?.statuses ?? [])])
    ).sort()
  }, [companyOptionsData?.statuses])

  const { mutate: addContact } = useMutation<
    { contact: Contact },
    { name: string; role?: string; email?: string; phone?: string; memo?: string }
  >(id ? apiRoutes.companies.contacts(id) : '', 'POST')

  const { mutate: updateContact } = useMutation<
    { contact: Contact },
    {
      name?: string
      role?: string | null
      email?: string | null
      phone?: string | null
      memo?: string | null
      sortOrder?: number | null
    }
  >(apiRoutes.contacts.base(), 'PATCH')

  const { mutate: deleteContact, isLoading: isDeletingContact } = useMutation<unknown, void>(
    apiRoutes.contacts.base(),
    'DELETE'
  )

  const { mutate: reorderContactsMutation, isLoading: isReorderWorking } = useMutation<
    unknown,
    { orderedIds: string[] }
  >(id ? apiRoutes.companies.contactsReorder(id) : '', 'PATCH')

  const { mutate: updateCompany } = useMutation<
    { company: Company },
    { tags?: string[]; profile?: string | null; category?: string | null; status?: string }
  >(id ? apiRoutes.companies.detail(id) : '', 'PATCH')

  const { mutate: addRoom } = useMutation<unknown, { roomId: string }>(
    id ? apiRoutes.companies.chatworkRooms(id) : '',
    'POST'
  )

  const { mutate: removeRoom } = useMutation<unknown, void>(
    id ? apiRoutes.companies.chatworkRooms(id) : '',
    'DELETE'
  )

  const { mutate: addLabel } = useMutation<unknown, { label: string }>(
    apiRoutes.messages.base(),
    'POST'
  )

  const { mutate: removeLabel } = useMutation<unknown, void>(apiRoutes.messages.base(), 'DELETE')

  const isLoading = isLoadingCompany || isLoadingContacts
  const pageError = companyFetchError || contactsFetchError
  const roomErrorMessage = roomError || linkedRoomsFetchError || availableRoomsFetchError



  useEffect(() => {
    setMessagePage(1)
  }, [messageQuery, messageFrom, messageTo, messageLabel, setMessagePage])

  const handleAddContact = async (event: React.FormEvent) => {
    event.preventDefault()
    setContactError('')
    if (!form.name.trim()) {
      setContactError('担当者名は必須です')
      return
    }
    if (!id) return

    try {
      await addContact(
        {
          name: form.name,
          role: form.role || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          memo: form.memo || undefined,
        },
        { errorMessage: '騾壻ｿ｡繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆' }
      )

      setForm({ name: '', role: '', email: '', phone: '', memo: '' })
      setShowContactForm(false)
      void refetchContacts(undefined, { ignoreCache: true })
    } catch (err) {
      setContactError(err instanceof Error ? err.message : NETWORK_ERROR_MESSAGE)
    }
  }

  const resetEditContactForm = () => {
    setEditContactForm({ name: '', role: '', email: '', phone: '', memo: '' })
  }

  const startEditContact = (contact: Contact) => {
    setContactActionError('')
    setEditingContactId(contact.id)
    setEditContactForm({
      name: contact.name,
      role: contact.role ?? '',
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      memo: contact.memo ?? '',
    })
  }

  const cancelEditContact = () => {
    setEditingContactId(null)
    resetEditContactForm()
    setContactActionError('')
  }

  const handleSaveContact = async () => {
    if (!editingContactId) return
    const name = editContactForm.name.trim()
    if (!name) {
      setContactActionError('担当者名は必須です')
      return
    }
    setContactActionError('')
    try {
      const data = await updateContact(
        {
          name,
          role: editContactForm.role.trim() || null,
          email: editContactForm.email.trim() || null,
          phone: editContactForm.phone.trim() || null,
          memo: editContactForm.memo.trim() || null,
        },
        {
          url: apiRoutes.contacts.detail(editingContactId),
          errorMessage: '担当者の更新に失敗しました',
        }
      )
      if (data?.contact) {
        const contact = data.contact
        setContacts((prev) =>
          prev.map((item) => (item.id === contact.id ? { ...item, ...contact } : item))
        )
      } else {
        void refetchContacts(undefined, { ignoreCache: true })
      }
      showToast('担当者を更新しました', 'success')
      setEditingContactId(null)
      resetEditContactForm()
    } catch (err) {
      setContactActionError(err instanceof Error ? err.message : '担当者の更新に失敗しました')
    }
  }
  const handleConfirmDeleteContact = async () => {
    if (!confirmDelete) return
    setContactActionError('')
    try {
      await deleteContact(undefined, {
        url: apiRoutes.contacts.detail(confirmDelete.id),
        errorMessage: '担当者の削除に失敗しました',
      })
      setContacts((prev) => prev.filter((contact) => contact.id !== confirmDelete.id))
      if (editingContactId === confirmDelete.id) {
        setEditingContactId(null)
        resetEditContactForm()
      }
      showToast('担当者を削除しました', 'success')
      setConfirmDelete(null)
    } catch (err) {
      setContactActionError(err instanceof Error ? err.message : '担当者の削除に失敗しました')
    }
  }
  const reorderContacts = async (nextContacts: Contact[]) => {
    if (!id) return
    setContactActionError('')
    const previous = contacts
    const orderedContacts = nextContacts.map((contact, index) => ({
      ...contact,
      sortOrder: index + 1,
    }))
    setContacts(orderedContacts)
    try {
      await reorderContactsMutation(
        { orderedIds: orderedContacts.map((contact) => contact.id) },
        { errorMessage: '並び替えに失敗しました' }
      )
    } catch (err) {
      setContacts(previous)
      setContactActionError(err instanceof Error ? err.message : '並び替えに失敗しました')
    }
  }
  const moveContact = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= contacts.length) return
    const nextContacts = [...contacts]
    const [moved] = nextContacts.splice(index, 1)
    nextContacts.splice(nextIndex, 0, moved)
    void reorderContacts(nextContacts)
  }

  const contactScore = (contact: Contact) =>
    [contact.name, contact.role, contact.email, contact.phone, contact.memo].filter(
      (value) => value && value.trim()
    ).length

  const pickContactValue = (...values: Array<string | null | undefined>) => {
    for (const value of values) {
      const trimmed = value?.trim()
      if (trimmed) return trimmed
    }
    return ''
  }

  const handleMergeDuplicates = async () => {
    if (duplicateContactGroups.length === 0) {
      setIsDedupeConfirmOpen(false)
      return
    }
    setIsDedupeWorking(true)
    setContactActionError('')
    try {
      let nextContacts = [...contacts]
      for (const group of duplicateContactGroups) {
        const sortedGroup = [...group].sort((a, b) => contactScore(b) - contactScore(a))
        const primary = sortedGroup[0]
        const merged = {
          name: pickContactValue(primary.name, ...sortedGroup.map((contact) => contact.name)),
          role: pickContactValue(primary.role, ...sortedGroup.map((contact) => contact.role)),
          email: pickContactValue(primary.email, ...sortedGroup.map((contact) => contact.email)),
          phone: pickContactValue(primary.phone, ...sortedGroup.map((contact) => contact.phone)),
          memo: pickContactValue(primary.memo, ...sortedGroup.map((contact) => contact.memo)),
        }
        const normalize = (value?: string | null) => value?.trim() || ''
        const needsUpdate =
          normalize(primary.name) !== merged.name ||
          normalize(primary.role) !== merged.role ||
          normalize(primary.email) !== merged.email ||
          normalize(primary.phone) !== merged.phone ||
          normalize(primary.memo) !== merged.memo

        let updatedPrimary = primary
        if (needsUpdate) {
          const data = await updateContact(
            {
              name: merged.name,
              role: merged.role || null,
              email: merged.email || null,
              phone: merged.phone || null,
              memo: merged.memo || null,
            },
            {
              url: apiRoutes.contacts.detail(primary.id),
              errorMessage: '担当者の削除に失敗しました',
            }
          )
          if (data?.contact) {
            updatedPrimary = data.contact
          }
        }

        nextContacts = nextContacts.map((contact) =>
          contact.id === updatedPrimary.id ? { ...contact, ...updatedPrimary } : contact
        )

        const duplicateContacts = group.filter((contact) => contact.id !== primary.id)
        for (const duplicate of duplicateContacts) {
          await deleteContact(undefined, {
            url: apiRoutes.contacts.detail(duplicate.id),
            errorMessage: '担当者の削除に失敗しました',
          })
        }
        if (duplicateContacts.length > 0) {
          const duplicateIds = new Set(duplicateContacts.map((contact) => contact.id))
          if (editingContactId && duplicateIds.has(editingContactId)) {
            setEditingContactId(null)
            resetEditContactForm()
          }
          nextContacts = nextContacts.filter((contact) => !duplicateIds.has(contact.id))
        }
      }

      setContacts(nextContacts)
      showToast('重複した担当者を統合しました', 'success')
    } catch (err) {
      setContactActionError(err instanceof Error ? err.message : '重複統合に失敗しました')
    } finally {
      setIsDedupeWorking(false)
      setIsDedupeConfirmOpen(false)
    }
  }
  const handleUpdateCompany = async (
    field: 'tags' | 'profile' | 'category' | 'status'
  ) => {
    setCompanyError('')
    if (!id) return

    const tags = field === 'tags' ? companyForm.tags : company?.tags || []
    const profile = field === 'profile' ? companyForm.profile || null : company?.profile
    const category =
      field === 'category'
        ? companyForm.category.trim() || null
        : company?.category || undefined
    const status =
      field === 'status'
        ? companyForm.status.trim() || undefined
        : company?.status || undefined

    try {
      const data = await updateCompany(
        {
          tags,
          profile,
          category,
          status,
        },
        { errorMessage: NETWORK_ERROR_MESSAGE }
      )

      if (data?.company) {
        setCompany(data.company)
        setCompanyForm({
          tags: data.company.tags ?? [],
          profile: data.company.profile || '',
          category: data.company.category || '',
          status: data.company.status || '',
        })
      } else {
        void refetchCompany(undefined, { ignoreCache: true })
      }

      if (field === 'tags') setIsEditingTags(false)
      if (field === 'profile') setIsEditingProfile(false)
      if (field === 'category') setIsEditingCategory(false)
      if (field === 'status') setIsEditingStatus(false)
    } catch (err) {
      setCompanyError(err instanceof Error ? err.message : NETWORK_ERROR_MESSAGE)
    }
  }
  const handleAddRoom = async (event: React.FormEvent) => {
    event.preventDefault()
    setRoomError('')
    if (!roomInput.trim() || !id) {
      setRoomError('')
      return
    }
    try {
      await addRoom(
        { roomId: roomInput.trim() },
        { errorMessage: NETWORK_ERROR_MESSAGE }
      )
      setRoomInput('')
      void refetchLinkedRooms(undefined, { ignoreCache: true })
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : NETWORK_ERROR_MESSAGE)
    }
  }
  const handleRemoveRoom = async (roomId: string) => {
    if (!id) return
    setRoomError('')
    try {
      await removeRoom(undefined, {
        url: apiRoutes.companies.chatworkRoom(id, roomId),
        errorMessage: NETWORK_ERROR_MESSAGE,
      })
      void refetchLinkedRooms(undefined, { ignoreCache: true })
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : NETWORK_ERROR_MESSAGE)
    }
  }
  const handleAddLabel = async (messageId: string) => {
    const label = (labelInputs[messageId] || '').trim()
    if (!label) {
      setMessageError('ラベルを入力してください')
      return
    }
    setMessageError('')
    try {
      await addLabel(
        { label },
        {
          url: apiRoutes.messages.messageLabels(messageId),
        }
      )
      setLabelInputs((prev) => ({ ...prev, [messageId]: '' }))
      void refetchMessages(undefined, { ignoreCache: true })
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : 'ネットワークエラー')
    }
  }
  const handleRemoveLabel = async (messageId: string, label: string) => {
    setMessageError('')
    try {
      await removeLabel(undefined, {
        url: apiRoutes.messages.messageLabel(messageId, label),
      })
      void refetchMessages(undefined, { ignoreCache: true })
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : 'ネットワークエラー')
    }
  }
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast('コピーしました', 'success')
    } catch (err) {
      showToast('コピーに失敗しました', 'error')
    }
  }
  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-8 w-48" />
            </div>
          </div>
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur">
          <Skeleton className="h-10 w-full mb-4" />
          <SkeletonText lines={4} />
        </div>
      </div>
    )
  }

  if (pageError) {
    return <ErrorAlert message={pageError} />
  }

  if (!company) {
    return <div className="text-slate-500">企業が見つかりませんでした。</div>
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <nav className="text-xs text-slate-400">
        <Link to="/companies" className="hover:text-slate-600">
          企業一覧
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-500">{company.name}</span>
      </nav>
      {/* Simple Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white ${getAvatarColor(company.name)}`}
          >
            {getInitials(company.name)}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Company</p>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">{company.name}</h2>
              <StatusBadge status={company.status} />
            </div>
          </div>
        </div>
        <Link
          to="/companies"
          className="flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          一覧に戻る
        </Link>
      </div>

      {/* Main Tabs Container */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Tabs tabs={tabs} defaultTab="overview" syncWithHash>
          {(activeTab) => (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900">基本情報</h3>
                    <dl className="space-y-3 text-sm">
                      {/* Category - Inline Edit */}
                      <div className="rounded-lg bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <dt className="text-slate-500">区分</dt>
                          {canWrite && !isEditingCategory && (
                            <button
                              onClick={() => {
                                setCompanyForm((prev) => ({
                                  ...prev,
                                  category: company.category || '',
                                }))
                                setIsEditingCategory(true)
                              }}
                              className="text-xs text-sky-600 hover:text-sky-700"
                            >
                              編集
                            </button>
                          )}
                        </div>
                        {isEditingCategory ? (
                          <div className="mt-2 space-y-2">
                            <FormSelect
                              value={companyForm.category}
                              onChange={(e) =>
                                setCompanyForm((prev) => ({ ...prev, category: e.target.value }))
                              }
                              className="text-sm"
                            >
                              <option value="">区分を選択</option>
                              {mergedCategories.map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </FormSelect>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateCompany('category')}
                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                              >
                                保存
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingCategory(false)
                                  setCompanyForm((prev) => ({
                                    ...prev,
                                    category: company.category || '',
                                  }))
                                }}
                                className="text-xs text-slate-500 hover:text-slate-700"
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        ) : (
                          <dd className="mt-2 font-medium text-slate-900">
                            {company.category || '-'}
                          </dd>
                        )}
                      </div>

                      {/* Status - Inline Edit */}
                      <div className="rounded-lg bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <dt className="text-slate-500">ステータス</dt>
                          {canWrite && !isEditingStatus && (
                            <button
                              onClick={() => {
                                setCompanyForm((prev) => ({
                                  ...prev,
                                  status: company.status || '',
                                }))
                                setIsEditingStatus(true)
                              }}
                              className="text-xs text-sky-600 hover:text-sky-700"
                            >
                              編集
                            </button>
                          )}
                        </div>
                        {isEditingStatus ? (
                          <div className="mt-2 space-y-2">
                            <FormSelect
                              value={companyForm.status}
                              onChange={(e) =>
                                setCompanyForm((prev) => ({ ...prev, status: e.target.value }))
                              }
                              className="text-sm"
                            >
                              <option value="">ステータスを選択</option>
                              {mergedStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </FormSelect>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateCompany('status')}
                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                              >
                                保存
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingStatus(false)
                                  setCompanyForm((prev) => ({
                                    ...prev,
                                    status: company.status || '',
                                  }))
                                }}
                                className="text-xs text-slate-500 hover:text-slate-700"
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        ) : (
                          <dd className="mt-2">
                            <StatusBadge status={company.status} size="sm" />
                          </dd>
                        )}
                      </div>

                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                        <dt className="text-slate-500">担当者</dt>
                        <dd className="font-medium text-slate-900">{company.ownerId || '-'}</dd>
                      </div>

                      {/* Tags - Inline Edit */}
                      <div className="rounded-lg bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <dt className="text-slate-500">タグ</dt>
                          {canWrite && !isEditingTags && (
                            <button
                              onClick={() => {
                                setCompanyForm((prev) => ({
                                  ...prev,
                                  tags: company.tags ?? [],
                                }))
                                setIsEditingTags(true)
                              }}
                              className="text-xs text-sky-600 hover:text-sky-700"
                            >
                              編集
                            </button>
                          )}
                        </div>
                        {isEditingTags ? (
                          <div className="mt-2 space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {companyForm.tags.length > 0 ? (
                                companyForm.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs text-slate-600 shadow-sm"
                                  >
                                    {tag}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCompanyForm((prev) => ({
                                          ...prev,
                                          tags: prev.tags.filter((item) => item !== tag),
                                        }))
                                      }
                                      className="text-slate-400 hover:text-rose-500"
                                      aria-label={`${tag}を削除`}
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400">タグがまだありません</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <input
                                className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                placeholder="タグを追加（Enterで確定）"
                                list="company-tag-options"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ',') {
                                    e.preventDefault()
                                    const value = tagInput.replace(',', '').trim()
                                    if (!value) return
                                    setCompanyForm((prev) => ({
                                      ...prev,
                                      tags: prev.tags.includes(value) ? prev.tags : [...prev.tags, value],
                                    }))
                                    setTagInput('')
                                  }
                                  if (e.key === 'Escape') {
                                    setTagInput('')
                                    setIsEditingTags(false)
                                    setCompanyForm((prev) => ({
                                      ...prev,
                                      tags: company.tags ?? [],
                                    }))
                                  }
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const value = tagInput.trim()
                                  if (!value) return
                                  setCompanyForm((prev) => ({
                                    ...prev,
                                    tags: prev.tags.includes(value) ? prev.tags : [...prev.tags, value],
                                  }))
                                  setTagInput('')
                                }}
                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                              >
                                追加
                              </button>
                            </div>
                            <datalist id="company-tag-options">
                              {tagOptions.map((option) => (
                                <option key={option} value={option} />
                              ))}
                            </datalist>
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => handleUpdateCompany('tags')}
                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                              >
                                保存
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingTags(false)
                                  setTagInput('')
                                  setCompanyForm((prev) => ({
                                    ...prev,
                                    tags: company.tags ?? [],
                                  }))
                                }}
                                className="text-xs text-slate-500 hover:text-slate-700"
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        ) : (
                          <dd className="mt-2 flex flex-wrap gap-1.5">
                            {company.tags.length > 0 ? (
                              company.tags.map((tag) => (
                                <Badge key={tag} label={tag} />
                              ))
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </dd>
                        )}
                      </div>

                      {/* Profile - Inline Edit */}
                      <div className="rounded-lg bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between">
                          <dt className="text-slate-500">プロフィール</dt>
                          {canWrite && !isEditingProfile && (
                            <button
                              onClick={() => setIsEditingProfile(true)}
                              className="text-xs text-sky-600 hover:text-sky-700"
                            >
                              編集
                            </button>
                          )}
                        </div>
                        {isEditingProfile ? (
                          <div className="mt-2 space-y-2">
                            <textarea
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                              value={companyForm.profile}
                              onChange={(e) => setCompanyForm({ ...companyForm, profile: e.target.value })}
                              rows={3}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateCompany('profile')}
                                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => {
                                  setIsEditingProfile(false)
                                  setCompanyForm({ ...companyForm, profile: company.profile || '' })
                                }}
                                className="text-xs text-slate-500 hover:text-slate-700"
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        ) : (
                          <dd className="mt-2 text-sm text-slate-700">
                            {company.profile || 'プロフィールはまだ登録されていません。'}
                          </dd>
                        )}
                      </div>
                    </dl>
                    {companyError && <ErrorAlert message={companyError} />}
                  </div>

                  {/* Contacts */}
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">担当者</h3>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                          {contacts.length}名
                        </span>
                        {canWrite && (
                          <button
                            onClick={() => setShowContactForm(!showContactForm)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-white transition-colors hover:bg-slate-800"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Add Contact Form */}
                    {canWrite && showContactForm && (
                      <form onSubmit={handleAddContact} className="mb-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="担当者名（必須）"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            placeholder="役職"
                            value={form.role}
                            onChange={(e) => setForm({ ...form, role: e.target.value })}
                          />
                          <input
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            placeholder="電話番号"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          />
                        </div>
                        <input
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                          placeholder="メールアドレス"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                        {contactError && (
                          <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{contactError}</div>
                        )}
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setShowContactForm(false)}
                            className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                          >
                            キャンセル
                          </button>
                          <button
                            type="submit"
                            className="rounded-lg bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                          >
                            追加
                          </button>
                        </div>
                      </form>
                    )}

                    {contactActionError && <ErrorAlert message={contactActionError} className="mb-3" />}

                    {duplicateContactGroups.length > 0 && (
                      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <div className="font-semibold">重複している担当者があります</div>
                            <div className="text-xs text-amber-700">メールまたは電話番号が一致しています。</div>
                          </div>
                          {canWrite && (
                            <button
                              type="button"
                              onClick={() => setIsDedupeConfirmOpen(true)}
                              disabled={isDedupeWorking}
                              className="rounded-full bg-amber-600 px-3 py-1 text-xs font-semibold text-white disabled:bg-amber-300"
                            >
                              {isDedupeWorking ? '統合中...' : '重複を統合'}
                            </button>
                          )}
                        </div>
                        <ul className="mt-2 space-y-1 text-xs text-amber-700">
                          {duplicateContactGroups.map((group) => (
                            <li key={group[0].id}>{group.map((contact) => contact.name).join(' / ')}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Contact List */}
                    <div className="space-y-2">
                      {contacts.length === 0 ? (
                        <div className="rounded-lg bg-slate-50 py-8 text-center text-sm text-slate-500">
                          担当者が登録されていません
                        </div>
                      ) : (
                        contacts.map((contact, index) => {
                          const isEditing = editingContactId === contact.id
                          return (
                            <div
                              key={contact.id}
                              className="rounded-lg border border-slate-100 bg-white p-3 transition-colors hover:border-slate-200"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${getAvatarColor(contact.name)}`}
                                  >
                                    {getInitials(contact.name)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    {isEditing ? (
                                      <div className="space-y-2">
                                        <input
                                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                          placeholder="担当者名（必須）"
                                          value={editContactForm.name}
                                          onChange={(e) =>
                                            setEditContactForm({ ...editContactForm, name: e.target.value })
                                          }
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                          <input
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                            placeholder="役職"
                                            value={editContactForm.role}
                                            onChange={(e) =>
                                              setEditContactForm({ ...editContactForm, role: e.target.value })
                                            }
                                          />
                                          <input
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                            placeholder="電話番号"
                                            value={editContactForm.phone}
                                            onChange={(e) =>
                                              setEditContactForm({ ...editContactForm, phone: e.target.value })
                                            }
                                          />
                                        </div>
                                        <input
                                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                          placeholder="メールアドレス"
                                          value={editContactForm.email}
                                          onChange={(e) =>
                                            setEditContactForm({ ...editContactForm, email: e.target.value })
                                          }
                                        />
                                        <textarea
                                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                          placeholder="メモ"
                                          rows={2}
                                          value={editContactForm.memo}
                                          onChange={(e) =>
                                            setEditContactForm({ ...editContactForm, memo: e.target.value })
                                          }
                                        />
                                      </div>
                                    ) : (
                                      <>
                                        <div className="font-semibold text-slate-900">{contact.name}</div>
                                        {contact.role && <div className="text-xs text-slate-500">{contact.role}</div>}
                                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                          {contact.email && (
                                            <button
                                              onClick={() => copyToClipboard(contact.email!)}
                                              className="text-slate-500 hover:text-sky-600"
                                            >
                                              {contact.email}
                                            </button>
                                          )}
                                          {contact.phone && (
                                            <button
                                              onClick={() => copyToClipboard(contact.phone!)}
                                              className="text-slate-500 hover:text-sky-600"
                                            >
                                              {contact.phone}
                                            </button>
                                          )}
                                        </div>
                                        {contact.memo && (
                                          <p className="mt-2 whitespace-pre-line text-xs text-slate-500">
                                            {contact.memo}
                                          </p>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                                {canWrite && (
                                  <div className="flex shrink-0 flex-col items-end gap-2">
                                    {!isEditing && (
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => moveContact(index, -1)}
                                          disabled={index === 0 || isReorderWorking}
                                          className="rounded border border-slate-200 p-1 text-slate-500 hover:text-slate-700 disabled:opacity-40"
                                        >
                                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                          </svg>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => moveContact(index, 1)}
                                          disabled={index === contacts.length - 1 || isReorderWorking}
                                          className="rounded border border-slate-200 p-1 text-slate-500 hover:text-slate-700 disabled:opacity-40"
                                        >
                                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </button>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                      {isEditing ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={handleSaveContact}
                                            className="text-xs font-medium text-sky-600 hover:text-sky-700"
                                          >
                                            保存
                                          </button>
                                          <button
                                            type="button"
                                            onClick={cancelEditContact}
                                            className="text-xs font-medium text-slate-500 hover:text-slate-700"
                                          >
                                            キャンセル
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => startEditContact(contact)}
                                            className="text-xs font-medium text-sky-600 hover:text-sky-700"
                                          >
                                            編集
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setConfirmDelete({ id: contact.id, name: contact.name })}
                                            className="text-xs font-medium text-rose-600 hover:text-rose-700"
                                          >
                                            削除
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline Tab */}
              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  {/* Chatwork Rooms */}
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="font-medium text-slate-900">Chatworkルーム</h4>
                      <span className="text-xs text-slate-500">{linkedRooms.length}件</span>
                    </div>
                    {roomErrorMessage && <ErrorAlert message={roomErrorMessage} className="mb-3" />}
                    <div className="flex flex-wrap gap-2">
                      {linkedRooms.length === 0 ? (
                        <span className="text-sm text-slate-500">ルームが紐づいていません</span>
                      ) : (
                        linkedRooms.map((room) => (
                          <div
                            key={room.id}
                            className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm shadow-sm"
                          >
                            <span className="text-slate-700">{room.name}</span>
                            {canWrite && (
                              <button
                                onClick={() => handleRemoveRoom(room.roomId)}
                                className="text-slate-400 hover:text-rose-600"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                    {canManageChatwork ? (
                      <form onSubmit={handleAddRoom} className="mt-3 flex gap-2">
                        <select
                          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
                          value={roomInput}
                          onChange={(e) => setRoomInput(e.target.value)}
                        >
                          <option value="">ルームを追加...</option>
                          {isLoadingRooms ? (
                            <option disabled>読み込み中...</option>
                          ) : (
                            availableRooms.map((room) => (
                              <option key={room.id} value={room.roomId}>
                                {room.name}
                              </option>
                            ))
                          )}
                        </select>
                        <button
                          type="submit"
                          disabled={!roomInput}
                          className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white disabled:bg-slate-300"
                        >
                          追加
                        </button>
                      </form>
                    ) : canWrite ? (
                      <div className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-500">
                        ルームの追加は管理者のみ可能です。
                      </div>
                    ) : null}
                  </div>

                  {/* Message Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                      value={messageFrom}
                      onChange={(e) => setMessageFrom(e.target.value)}
                    />
                    <span className="text-slate-400">〜</span>
                    <input
                      type="date"
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                      value={messageTo}
                      onChange={(e) => setMessageTo(e.target.value)}
                    />
                    <input
                      className="min-w-[150px] flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                      placeholder="本文検索"
                      value={messageQuery}
                      onChange={(e) => setMessageQuery(e.target.value)}
                    />
                    <input
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                      placeholder="ラベル"
                      value={messageLabel}
                      onChange={(e) => setMessageLabel(e.target.value)}
                      list="company-message-label-options"
                    />
                  </div>
                  <datalist id="company-message-label-options">
                    {labelOptions.map((item) => (
                      <option key={item} value={item} />
                    ))}
                  </datalist>

                  {messageError && <ErrorAlert message={messageError} />}

                  {/* Messages Timeline */}
                  {isLoadingMessages ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-4">
                          <SkeletonAvatar size="sm" />
                          <div className="flex-1">
                            <Skeleton className="mb-2 h-4 w-32" />
                            <Skeleton className="h-16 w-full rounded-lg" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-12 text-center text-sm text-slate-500">
                      メッセージがありません
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Array.from(groupedMessages.entries()).map(([dateLabel, msgs]) => (
                        <div key={dateLabel}>
                          <div className="mb-3 flex items-center gap-3">
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                              {dateLabel}
                            </span>
                            <div className="h-px flex-1 bg-slate-200" />
                          </div>
                          <div className="relative space-y-3 pl-6">
                            <div className="absolute bottom-0 left-2 top-0 w-0.5 bg-slate-200" />
                            {msgs.map((message) => (
                              <div key={message.id} className="relative">
                                <div className="absolute -left-4 top-3 h-2 w-2 rounded-full bg-slate-400" />
                                <div className="rounded-lg border border-slate-100 bg-white p-3">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="font-medium text-slate-900">{message.sender}</span>
                                    <span className="text-slate-400">
                                      {new Date(message.sentAt).toLocaleTimeString('ja-JP', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                  </div>
                                  <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                                    {highlightText(message.body, messageQuery)}
                                  </p>
                                  {message.labels && message.labels.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {message.labels.map((label) =>
                                        canWrite ? (
                                          <button
                                            key={label}
                                            onClick={() => handleRemoveLabel(message.id, label)}
                                            className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] text-indigo-600 hover:bg-indigo-100"
                                          >
                                            #{label} ×
                                          </button>
                                        ) : (
                                          <span
                                            key={label}
                                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
                                          >
                                            #{label}
                                          </span>
                                        )
                                      )}
                                    </div>
                                  )}
                                  {canWrite && (
                                    <div className="mt-2 flex gap-1">
                                      <input
                                        className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
                                        placeholder="ラベルを追加"
                                        value={labelInputs[message.id] || ''}
                                        onChange={(e) =>
                                          setLabelInputs((prev) => ({ ...prev, [message.id]: e.target.value }))
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault()
                                            handleAddLabel(message.id)
                                          }
                                        }}
                                        list="company-message-label-options"
                                      />
                                      <button
                                        onClick={() => handleAddLabel(message.id)}
                                        className="rounded bg-slate-900 px-2 py-1 text-xs text-white"
                                      >
                                        追加
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {messagePagination.total > 0 && (
                    <div className="mt-6">
                      <Pagination
                        page={messagePagination.page}
                        pageSize={messagePagination.pageSize}
                        total={messagePagination.total}
                        onPageChange={setMessagePage}
                        onPageSizeChange={setMessagePageSize}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Tasks Tab */}
              {activeTab === 'tasks' && id && <CompanyTasksSection companyId={id} canWrite={canWrite} />}
            </>
          )}
        </Tabs>
      </div>
      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="担当者を削除しますか？"
        description={confirmDelete ? `${confirmDelete.name} を削除します。` : undefined}
        confirmLabel="削除"
        cancelLabel="キャンセル"
        isLoading={isDeletingContact}
        onConfirm={handleConfirmDeleteContact}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmDialog
        isOpen={isDedupeConfirmOpen}
        title="重複した担当者を統合しますか？"
        description={`${duplicateContactGroups.length} 件のグループを統合し、重複レコードを削除します。`}
        confirmLabel="統合"
        cancelLabel="キャンセル"
        isLoading={isDedupeWorking}
        onConfirm={handleMergeDuplicates}
        onCancel={() => setIsDedupeConfirmOpen(false)}
      />
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant || 'success'}
          onClose={clearToast}
          className="fixed bottom-6 right-6 z-50"
        />
      )}
    </div>
  )
}

export default CompanyDetail
