import { useCallback, useEffect, useState, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import CompanyTasksSection from '../components/CompanyTasksSection'
import CompanySummarySection from '../components/CompanySummarySection'
import CompanyRelationsSection from '../components/CompanyRelationsSection'
import CompanyAuditSection from '../components/CompanyAuditSection'
import Tabs, { Tab } from '../components/ui/Tabs'
import StatusBadge from '../components/ui/StatusBadge'
import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard } from '../components/ui/Skeleton'

interface Company {
  id: string
  name: string
  category?: string | null
  status: string
  tags: string[]
  profile?: string | null
  ownerId?: string | null
}

interface Contact {
  id: string
  name: string
  role?: string | null
  email?: string | null
  phone?: string | null
  memo?: string | null
}

interface MessageItem {
  id: string
  roomId: string
  messageId: string
  sender: string
  body: string
  sentAt: string
  labels?: string[]
}

interface LinkedRoom {
  id: string
  roomId: string
  name: string
  isActive: boolean
}

interface AvailableRoom {
  id: string
  roomId: string
  name: string
  description?: string | null
  isActive: boolean
}

// Get initials from name
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// Get consistent color for avatar
function getAvatarColor(name: string): string {
  const colors = [
    'bg-sky-500',
    'bg-emerald-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-violet-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Format date for grouping
function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return '今日'
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨日'
  }
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
}

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

function CompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [company, setCompany] = useState<Company | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [contactError, setContactError] = useState('')
  const [companyError, setCompanyError] = useState('')
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [messageQuery, setMessageQuery] = useState('')
  const [messageFrom, setMessageFrom] = useState('')
  const [messageTo, setMessageTo] = useState('')
  const [messageLabel, setMessageLabel] = useState('')
  const [messageLoading, setMessageLoading] = useState(false)
  const [messageError, setMessageError] = useState('')
  const [labelInputs, setLabelInputs] = useState<Record<string, string>>({})
  const [linkedRooms, setLinkedRooms] = useState<LinkedRoom[]>([])
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([])
  const [roomInput, setRoomInput] = useState('')
  const [roomError, setRoomError] = useState('')
  const [isLoadingRooms, setIsLoadingRooms] = useState(false)
  const [showContactForm, setShowContactForm] = useState(false)
  const [isEditingTags, setIsEditingTags] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [form, setForm] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    memo: '',
  })
  const [companyForm, setCompanyForm] = useState({
    tags: '',
    profile: '',
  })

  const canWrite = user?.role !== 'readonly'

  // Group messages by date
  const groupedMessages = useMemo(() => groupMessagesByDate(messages), [messages])

  // Tab configuration
  const tabs: Tab[] = useMemo(
    () => [
      { id: 'overview', label: '概要' },
      { id: 'timeline', label: 'タイムライン', count: messages.length },
      { id: 'tasks', label: 'タスク' },
      { id: 'summary', label: 'AIサマリー' },
      { id: 'relations', label: '関連データ' },
      { id: 'audit', label: '変更履歴' },
    ],
    [messages.length]
  )

  const fetchData = useCallback(async () => {
    if (!id) return
    setIsLoading(true)
    setError('')
    try {
      const [companyResponse, contactsResponse] = await Promise.all([
        fetch(`/api/companies/${id}`, { credentials: 'include' }),
        fetch(`/api/companies/${id}/contacts`, { credentials: 'include' }),
      ])

      if (!companyResponse.ok) {
        throw new Error('企業情報の取得に失敗しました')
      }
      if (!contactsResponse.ok) {
        throw new Error('担当者一覧の取得に失敗しました')
      }

      const companyData = await companyResponse.json()
      const contactsData = await contactsResponse.json()
      setCompany(companyData.company)
      setContacts(contactsData.contacts)
      setCompanyForm({
        tags: companyData.company.tags.join(', '),
        profile: companyData.company.profile || '',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  const fetchMessages = useCallback(async () => {
    if (!id) return
    setMessageLoading(true)
    setMessageError('')
    try {
      const params = new URLSearchParams()
      params.set('page', '1')
      params.set('pageSize', '50')
      if (messageFrom) params.set('from', messageFrom)
      if (messageTo) params.set('to', messageTo)
      if (messageLabel.trim()) params.set('label', messageLabel.trim())

      const trimmedQuery = messageQuery.trim()
      const url = trimmedQuery
        ? `/api/messages/search?${params.toString()}&q=${encodeURIComponent(trimmedQuery)}&companyId=${id}`
        : `/api/companies/${id}/messages?${params.toString()}`

      const response = await fetch(url, { credentials: 'include' })
      if (!response.ok) {
        throw new Error('メッセージの取得に失敗しました')
      }
      const data = await response.json()
      setMessages(data.items)
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : '通信エラーが発生しました')
    } finally {
      setMessageLoading(false)
    }
  }, [id, messageFrom, messageTo, messageQuery, messageLabel])

  const fetchRooms = useCallback(async () => {
    if (!id) return
    setRoomError('')
    try {
      const response = await fetch(`/api/companies/${id}/chatwork-rooms`, {
        credentials: 'include',
      })
      if (!response.ok) {
        throw new Error('Chatworkルームの取得に失敗しました')
      }
      const data = await response.json()
      setLinkedRooms(data.rooms)
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }, [id])

  const fetchAvailableRooms = useCallback(async () => {
    setIsLoadingRooms(true)
    try {
      const response = await fetch('/api/chatwork/rooms', { credentials: 'include' })
      if (!response?.ok) {
        throw new Error('利用可能なルーム一覧の取得に失敗しました')
      }
      const data = await response.json()
      const linkedRoomIds = new Set(linkedRooms.map((r) => r.roomId))
      const available = (data?.rooms ?? []).filter(
        (room: AvailableRoom) => !linkedRoomIds.has(room.roomId)
      )
      setAvailableRooms(available)
    } catch (err) {
      console.error('利用可能なルーム一覧の取得エラー:', err)
    } finally {
      setIsLoadingRooms(false)
    }
  }, [linkedRooms])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    fetchMessages()
  }, [fetchMessages])

  useEffect(() => {
    fetchRooms()
  }, [fetchRooms])

  useEffect(() => {
    if (linkedRooms.length >= 0 && canWrite) {
      fetchAvailableRooms()
    }
  }, [linkedRooms, canWrite, fetchAvailableRooms])

  const handleAddContact = async (event: React.FormEvent) => {
    event.preventDefault()
    setContactError('')
    if (!form.name.trim()) {
      setContactError('担当者名は必須です')
      return
    }
    if (!id) return

    try {
      const response = await fetch(`/api/companies/${id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: form.name,
          role: form.role || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          memo: form.memo || undefined,
        }),
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || '担当者の追加に失敗しました')
      }

      setForm({ name: '', role: '', email: '', phone: '', memo: '' })
      setShowContactForm(false)
      fetchData()
    } catch (err) {
      setContactError(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }

  const handleUpdateCompany = async (field: 'tags' | 'profile') => {
    setCompanyError('')
    if (!id) return

    const tags =
      field === 'tags'
        ? companyForm.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : company?.tags || []

    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tags,
          profile: field === 'profile' ? companyForm.profile || null : company?.profile,
        }),
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || '企業情報の更新に失敗しました')
      }

      if (field === 'tags') setIsEditingTags(false)
      if (field === 'profile') setIsEditingProfile(false)
      fetchData()
    } catch (err) {
      setCompanyError(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }

  const handleAddRoom = async (event: React.FormEvent) => {
    event.preventDefault()
    setRoomError('')
    if (!roomInput.trim() || !id) {
      setRoomError('ルームを選択してください')
      return
    }
    try {
      const response = await fetch(`/api/companies/${id}/chatwork-rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ roomId: roomInput.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ルームの追加に失敗しました')
      }
      setRoomInput('')
      fetchRooms()
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }

  const handleRemoveRoom = async (roomId: string) => {
    if (!id) return
    setRoomError('')
    try {
      const response = await fetch(`/api/companies/${id}/chatwork-rooms/${roomId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'ルームの削除に失敗しました')
      }
      fetchRooms()
    } catch (err) {
      setRoomError(err instanceof Error ? err.message : '通信エラーが発生しました')
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
      const response = await fetch(`/api/messages/${messageId}/labels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ label }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ラベルの追加に失敗しました')
      }
      setLabelInputs((prev) => ({ ...prev, [messageId]: '' }))
      fetchMessages()
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : 'ネットワークエラー')
    }
  }

  const handleRemoveLabel = async (messageId: string, label: string) => {
    setMessageError('')
    try {
      const response = await fetch(
        `/api/messages/${messageId}/labels/${encodeURIComponent(label)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'ラベルの削除に失敗しました')
      }
      fetchMessages()
    } catch (err) {
      setMessageError(err instanceof Error ? err.message : 'ネットワークエラー')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy:', err)
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

  if (error) {
    return <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
  }

  if (!company) {
    return <div className="text-slate-500">企業が見つかりませんでした。</div>
  }

  return (
    <div className="space-y-6 animate-fade-up">
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
                      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                        <dt className="text-slate-500">区分</dt>
                        <dd className="font-medium text-slate-900">{company.category || '-'}</dd>
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
                              onClick={() => setIsEditingTags(true)}
                              className="text-xs text-sky-600 hover:text-sky-700"
                            >
                              編集
                            </button>
                          )}
                        </div>
                        {isEditingTags ? (
                          <div className="mt-2 flex gap-2">
                            <input
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                              value={companyForm.tags}
                              onChange={(e) => setCompanyForm({ ...companyForm, tags: e.target.value })}
                              placeholder="カンマ区切りで入力"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleUpdateCompany('tags')
                                }
                                if (e.key === 'Escape') {
                                  setIsEditingTags(false)
                                  setCompanyForm({ ...companyForm, tags: company.tags.join(', ') })
                                }
                              }}
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateCompany('tags')}
                              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                            >
                              保存
                            </button>
                          </div>
                        ) : (
                          <dd className="mt-2 flex flex-wrap gap-1.5">
                            {company.tags.length > 0 ? (
                              company.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-white px-2.5 py-0.5 text-xs text-slate-600 shadow-sm"
                                >
                                  {tag}
                                </span>
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
                              autoFocus
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
                    {companyError && (
                      <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        {companyError}
                      </div>
                    )}
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

                    {/* Contact List */}
                    <div className="space-y-2">
                      {contacts.length === 0 ? (
                        <div className="rounded-lg bg-slate-50 py-8 text-center text-sm text-slate-500">
                          担当者が登録されていません
                        </div>
                      ) : (
                        contacts.map((contact) => (
                          <div
                            key={contact.id}
                            className="rounded-lg border border-slate-100 bg-white p-3 transition-colors hover:border-slate-200"
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${getAvatarColor(contact.name)}`}
                              >
                                {getInitials(contact.name)}
                              </div>
                              <div className="min-w-0 flex-1">
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
                              </div>
                            </div>
                          </div>
                        ))
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
                    {roomError && (
                      <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                        {roomError}
                      </div>
                    )}
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
                    {canWrite && (
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
                    )}
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
                    />
                  </div>

                  {messageError && (
                    <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                      {messageError}
                    </div>
                  )}

                  {/* Messages Timeline */}
                  {messageLoading ? (
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
                                    {message.body}
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
                </div>
              )}

              {/* Tasks Tab */}
              {activeTab === 'tasks' && id && <CompanyTasksSection companyId={id} canWrite={canWrite} />}

              {/* Summary Tab */}
              {activeTab === 'summary' && id && <CompanySummarySection companyId={id} canWrite={canWrite} />}

              {/* Relations Tab */}
              {activeTab === 'relations' && id && <CompanyRelationsSection companyId={id} />}

              {/* Audit Tab */}
              {activeTab === 'audit' && id && <CompanyAuditSection companyId={id} />}
            </>
          )}
        </Tabs>
      </div>
    </div>
  )
}

export default CompanyDetail
