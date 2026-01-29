import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CompanyContactsSection from '../components/companies/CompanyContactsSection'
import CompanyOverviewTab from '../components/companies/CompanyOverviewTab'
import CompanyTasksSection from '../components/companies/CompanyTasksSection'
import CompanyTimelineTab from '../components/companies/CompanyTimelineTab'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import { Skeleton, SkeletonText } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import Tabs, { Tab } from '../components/ui/Tabs'
import Toast from '../components/ui/Toast'
import { usePagination } from '../hooks/usePagination'
import { usePaginationSync } from '../hooks/usePaginationSync'
import { usePermissions } from '../hooks/usePermissions'
import { useFetch, useMutation } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { apiRoutes } from '../lib/apiRoutes'
import { cn } from '../lib/cn'
import { ApiListResponse, Company, Contact, MessageItem, User } from '../types'
import { toErrorMessage } from '../utils/errorState'
import { getAvatarColor, getInitials } from '../utils/string'
import {
  COMPANY_CATEGORY_DEFAULT_OPTIONS,
  COMPANY_STATUS_DEFAULT_OPTIONS,
} from '../constants/labels'


const NETWORK_ERROR_MESSAGE = '通信エラーが発生しました'

function CompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const { canWrite } = usePermissions()
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
  const labelInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [showContactForm, setShowContactForm] = useState(false)
  const [isEditingOverview, setIsEditingOverview] = useState(false)
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
    ownerIds: string[]
  }>({
    tags: [],
    profile: '',
    category: '',
    status: '',
    ownerIds: [],
  })
  const [tagInput, setTagInput] = useState('')
  const { toast, showToast, clearToast } = useToast()

  const {
    pagination: messagePagination,
    setPagination: setMessagePagination,
    setPage: setMessagePage,
    setPageSize: setMessagePageSize,
  } = usePagination(30)
  const syncMessagePagination = usePaginationSync(setMessagePagination)

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
        ownerIds: data.company.ownerIds ?? [],
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
        syncMessagePagination(data)
      },
      onError: setMessageError,
    })


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

  const { data: usersData } = useFetch<{ users: User[] }>(apiRoutes.users.options(), {
    cacheTimeMs: 30_000,
  })
  const userOptions = usersData?.users ?? []


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

  const { mutate: updateCompany, isLoading: isUpdatingCompany } = useMutation<
    { company: Company },
    {
      tags?: string[]
      profile?: string | null
      category?: string | null
      status?: string
      ownerIds?: string[]
    }
  >(id ? apiRoutes.companies.detail(id) : '', 'PATCH')

  const { mutate: addLabel } = useMutation<unknown, { label: string }>(
    apiRoutes.messages.base(),
    'POST'
  )

  const { mutate: removeLabel } = useMutation<unknown, void>(apiRoutes.messages.base(), 'DELETE')

  const isLoading = isLoadingCompany || isLoadingContacts
  const pageError = companyFetchError || contactsFetchError

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
        { errorMessage: NETWORK_ERROR_MESSAGE }
      )

      setForm({ name: '', role: '', email: '', phone: '', memo: '' })
      setShowContactForm(false)
      void refetchContacts(undefined, { ignoreCache: true })
    } catch (err) {
      setContactError(toErrorMessage(err, NETWORK_ERROR_MESSAGE))
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
  const resetCompanyForm = (nextCompany?: Company | null) => {
    const source = nextCompany ?? company
    if (!source) return
    setCompanyForm({
      tags: source.tags ?? [],
      profile: source.profile || '',
      category: source.category || '',
      status: source.status || '',
      ownerIds: source.ownerIds ?? [],
    })
    setTagInput('')
  }

  const handleUpdateCompany = async () => {
    setCompanyError('')
    if (!id) return

    try {
      const data = await updateCompany(
        {
          tags: companyForm.tags,
          profile: companyForm.profile.trim() || null,
          category: companyForm.category.trim() || null,
          status: companyForm.status.trim() || undefined,
          ownerIds: companyForm.ownerIds,
        },
        { errorMessage: NETWORK_ERROR_MESSAGE }
      )

      if (data?.company) {
        setCompany(data.company)
        resetCompanyForm(data.company)
      } else {
        void refetchCompany(undefined, { ignoreCache: true })
      }

      setIsEditingOverview(false)
      showToast('企業情報を更新しました', 'success')
    } catch (err) {
      setCompanyError(toErrorMessage(err, NETWORK_ERROR_MESSAGE))
    }
  }

  const handleCancelCompanyEdit = () => {
    resetCompanyForm()
    setIsEditingOverview(false)
    setCompanyError('')
  }

  const handleAddLabel = async (messageId: string) => {
    const label = (labelInputRefs.current[messageId]?.value || '').trim()
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
      if (labelInputRefs.current[messageId]) {
        labelInputRefs.current[messageId]!.value = ''
      }
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
      <div className="space-y-4">
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

  const ownerLabels =
    company.ownerIds?.map((ownerId) => {
      const owner = userOptions.find((user) => user.id === ownerId)
      return owner?.name || owner?.email || ownerId
    }) ?? []
  const visibleTags = company.tags?.slice(0, 3) ?? []


  return (
    <div className="space-y-4">
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
            className={cn(
              'flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white',
              getAvatarColor(company.name)
            )}
          >
            {getInitials(company.name)}
          </div>
          <div>
            <p className="text-xs uppercase  text-slate-400">企業</p>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">{company.name}</h2>
              <StatusBadge status={company.status} kind="company" />
            </div>
          </div>
        </div>
        <Link
          to="/companies"
          className="flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          一覧に戻る
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">区分</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {company.category || '-'}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">ステータス</div>
          <div className="mt-1">
            <StatusBadge status={company.status} kind="company" />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">担当者</div>
          <div className="mt-1 text-sm font-semibold text-slate-900">
            {ownerLabels.length > 0 ? ownerLabels.join(', ') : '未設定'}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">タグ</div>
          <div className="mt-2 flex flex-wrap gap-1">
            {visibleTags.length > 0 ? (
              <>
                {visibleTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
                {company.tags.length > visibleTags.length && (
                  <span className="text-xs text-slate-400">
                    +{company.tags.length - visibleTags.length}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-slate-400">-</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {/* Main Tabs Container */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Tabs tabs={tabs} defaultTab="overview" syncWithHash>
              {(activeTab) => (
                <>
                  {/* Overview Tab */}
                  {activeTab === 'overview' && (
                    <CompanyOverviewTab
                      company={company}
                      canWrite={canWrite}
                      companyForm={companyForm}
                      setCompanyForm={setCompanyForm}
                      tagInput={tagInput}
                      setTagInput={setTagInput}
                      tagOptions={tagOptions}
                      mergedCategories={mergedCategories}
                      mergedStatuses={mergedStatuses}
                      userOptions={userOptions}
                      companyError={companyError}
                      isEditing={isEditingOverview}
                      isSaving={isUpdatingCompany}
                      onStartEdit={() => {
                        resetCompanyForm()
                        setIsEditingOverview(true)
                      }}
                      onCancelEdit={handleCancelCompanyEdit}
                      onSave={handleUpdateCompany}
                      contactsSection={
                        <CompanyContactsSection
                          contacts={contacts}
                          canWrite={canWrite}
                          showContactForm={showContactForm}
                          setShowContactForm={setShowContactForm}
                          form={form}
                          setForm={setForm}
                          contactError={contactError}
                          contactActionError={contactActionError}
                          duplicateContactGroups={duplicateContactGroups}
                          isDedupeWorking={isDedupeWorking}
                          isReorderWorking={isReorderWorking}
                          onOpenDedupeConfirm={() => setIsDedupeConfirmOpen(true)}
                          onAddContact={handleAddContact}
                          editingContactId={editingContactId}
                          editContactForm={editContactForm}
                          setEditContactForm={setEditContactForm}
                          onStartEditContact={startEditContact}
                          onCancelEditContact={cancelEditContact}
                          onSaveContact={handleSaveContact}
                          onRequestDelete={(contact) =>
                            setConfirmDelete({ id: contact.id, name: contact.name })
                          }
                          onMoveContact={moveContact}
                          onCopy={copyToClipboard}
                        />
                      }
                    />
                  )}

                  {/* Timeline Tab */}
                  {activeTab === 'timeline' && (
                    <CompanyTimelineTab
                      messageFrom={messageFrom}
                      setMessageFrom={setMessageFrom}
                      messageTo={messageTo}
                      setMessageTo={setMessageTo}
                      messageQuery={messageQuery}
                      setMessageQuery={setMessageQuery}
                      messageLabel={messageLabel}
                      setMessageLabel={setMessageLabel}
                      labelOptions={labelOptions}
                      messageError={messageError}
                      isLoading={isLoadingMessages}
                      messages={messages}
                      canWrite={canWrite}
                      onAddLabel={handleAddLabel}
                      onRemoveLabel={handleRemoveLabel}
                      labelInputRefs={labelInputRefs}
                      pagination={messagePagination}
                      onPageChange={setMessagePage}
                      onPageSizeChange={setMessagePageSize}
                    />
                  )}
                </>
              )}
            </Tabs>
          </div>
        </div>
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-24">
            {id ? <CompanyTasksSection companyId={id} canWrite={canWrite} /> : null}
          </div>
        </aside>
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
          className="fixed bottom-6 right-6 z-50 safe-area-bottom"
        />
      )}
    </div>
  )
}

export default CompanyDetail
