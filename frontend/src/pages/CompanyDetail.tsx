import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import CompanyTasksSection from '../components/CompanyTasksSection'
import CompanySummarySection from '../components/CompanySummarySection'
import CompanyRelationsSection from '../components/CompanyRelationsSection'
import CompanyAuditSection from '../components/CompanyAuditSection'

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
      params.set('pageSize', '20')
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
      // 既に紐づけられているルームIDを取得
      const linkedRoomIds = new Set(linkedRooms.map((r) => r.roomId))
      // 未紐づけのルームのみをフィルタリング
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
      fetchData()
    } catch (err) {
      setContactError(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }

  const handleUpdateCompany = async (event: React.FormEvent) => {
    event.preventDefault()
    setCompanyError('')
    if (!id) return

    const tags = companyForm.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    try {
      const response = await fetch(`/api/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tags,
          profile: companyForm.profile || null,
        }),
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || '企業情報の更新に失敗しました')
      }

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

  if (isLoading) {
    return <div className="text-slate-500">読み込み中...</div>
  }

  if (error) {
    return <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
  }

  if (!company) {
    return <div className="text-slate-500">企業が見つかりませんでした。</div>
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Company</p>
          <h2 className="text-3xl font-bold text-slate-900">{company.name}</h2>
        </div>
        <Link to="/companies" className="text-sm text-slate-500 hover:text-slate-700">
          一覧に戻る
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
          <h3 className="text-lg font-semibold text-slate-900">基本情報</h3>
          <dl className="mt-4 grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">区分</dt>
              <dd className="mt-1 text-slate-800">{company.category || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">ステータス</dt>
              <dd className="mt-1 text-slate-800">{company.status}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">担当者</dt>
              <dd className="mt-1 text-slate-800">{company.ownerId || '-'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-[0.2em] text-slate-400">タグ</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {company.tags.length > 0 ? (
                  company.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </dd>
            </div>
          </dl>
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            {company.profile || 'プロフィールはまだ登録されていません。'}
          </div>
          {canWrite && (
            <form onSubmit={handleUpdateCompany} className="mt-4 space-y-3">
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  タグ（カンマ区切り）
                </label>
                <input
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={companyForm.tags}
                  onChange={(event) =>
                    setCompanyForm({ ...companyForm, tags: event.target.value })
                  }
                  placeholder="VIP, 休眠"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  プロフィール
                </label>
                <textarea
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={companyForm.profile}
                  onChange={(event) =>
                    setCompanyForm({ ...companyForm, profile: event.target.value })
                  }
                  rows={3}
                />
              </div>
              {companyError && (
                <div className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
                  {companyError}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white"
                >
                  更新する
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">担当者</h3>
            <span className="text-xs text-slate-400">全 {contacts.length} 名</span>
          </div>
          <div className="mt-4 space-y-3">
            {contacts.length === 0 ? (
              <p className="text-sm text-slate-500">担当者が登録されていません。</p>
            ) : (
              contacts.map((contact) => (
                <div
                  key={contact.id}
                  className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  <div className="font-semibold text-slate-900">{contact.name}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{contact.role || '役割未設定'}</span>
                    <span>{contact.email || 'メール未設定'}</span>
                    <span>{contact.phone || '電話未設定'}</span>
                  </div>
                  {contact.memo && <p className="mt-2 text-xs text-slate-500">{contact.memo}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {canWrite ? (
        <form
          onSubmit={handleAddContact}
          className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur"
        >
          <h3 className="text-lg font-semibold text-slate-900">担当者を追加</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="担当者名（必須）"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="役職"
              value={form.role}
              onChange={(event) => setForm({ ...form, role: event.target.value })}
            />
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="メールアドレス"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
            />
            <input
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              placeholder="電話番号"
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
            />
            <textarea
              className="min-h-[80px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm md:col-span-2"
              placeholder="メモ"
              value={form.memo}
              onChange={(event) => setForm({ ...form, memo: event.target.value })}
            />
          </div>
          {contactError && (
            <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
              {contactError}
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white hover:bg-sky-700"
            >
              追加
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500">
          閲覧専用ロールのため、担当者の追加はできません。
        </div>
      )}

      <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Chatworkルーム</h3>
          <span className="text-xs text-slate-400">紐づけ済み {linkedRooms.length}件</span>
        </div>
        {roomError && (
          <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {roomError}
          </div>
        )}
        <div className="mt-4 space-y-3">
          {linkedRooms.length === 0 ? (
            <div className="text-sm text-slate-500">まだルームが紐づいていません。</div>
          ) : (
            linkedRooms.map((room) => (
              <div
                key={room.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm"
              >
                <div>
                  <div className="font-semibold text-slate-900">{room.name}</div>
                  <div className="text-xs text-slate-500">Room ID: {room.roomId}</div>
                </div>
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => handleRemoveRoom(room.roomId)}
                    className="rounded-full bg-rose-50 px-4 py-1 text-xs font-semibold text-rose-600"
                  >
                    解除
                  </button>
                )}
              </div>
            ))
          )}
        </div>
        {canWrite && (
          <form onSubmit={handleAddRoom} className="mt-4 flex flex-wrap gap-2">
            <select
              className="flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
              value={roomInput}
              onChange={(event) => setRoomInput(event.target.value)}
            >
              <option value="">ルームを選択...</option>
              {isLoadingRooms ? (
                <option disabled>読み込み中...</option>
              ) : availableRooms.length === 0 ? (
                <option disabled>利用可能なルームがありません</option>
              ) : (
                availableRooms.map((room) => (
                  <option key={room.id} value={room.roomId}>
                    {room.name} ({room.roomId})
                  </option>
                ))
              )}
            </select>
            <button
              type="submit"
              disabled={!roomInput}
              className="rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:bg-slate-300 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors"
            >
              追加
            </button>
          </form>
        )}
      </div>

      <div className="rounded-2xl bg-white/80 p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-slate-900">タイムライン</h3>
          <div className="flex flex-wrap gap-2 text-sm">
            <input
              type="date"
              className="rounded-xl border border-slate-200 px-3 py-1 text-xs"
              value={messageFrom}
              onChange={(event) => setMessageFrom(event.target.value)}
            />
            <input
              type="date"
              className="rounded-xl border border-slate-200 px-3 py-1 text-xs"
              value={messageTo}
              onChange={(event) => setMessageTo(event.target.value)}
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-1 text-xs"
              placeholder="本文検索"
              value={messageQuery}
              onChange={(event) => setMessageQuery(event.target.value)}
            />
            <input
              className="rounded-xl border border-slate-200 px-3 py-1 text-xs"
              placeholder="ラベル"
              value={messageLabel}
              onChange={(event) => setMessageLabel(event.target.value)}
            />
          </div>
        </div>
        {messageError && (
          <div className="mt-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-700">
            {messageError}
          </div>
        )}
        <div className="mt-4 space-y-3">
          {messageLoading ? (
            <div className="text-sm text-slate-500">読み込み中...</div>
          ) : messages.length === 0 ? (
            <div className="text-sm text-slate-500">メッセージがありません。</div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{message.sender}</span>
                  <span>{new Date(message.sentAt).toLocaleString()}</span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
                  {message.body}
                </p>
                {message.labels && message.labels.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    {message.labels.map((label) =>
                      canWrite ? (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleRemoveLabel(message.id, label)}
                          aria-label={`ラベルを外す: ${label}`}
                          className="rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-600"
                        >
                          #{label} ×
                        </button>
                      ) : (
                        <span
                          key={label}
                          className="rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-600"
                        >
                          #{label}
                        </span>
                      )
                    )}
                  </div>
                )}
                {canWrite && (
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <input
                      className="rounded-xl border border-slate-200 px-3 py-1 text-xs"
                      placeholder="ラベル"
                      value={labelInputs[message.id] || ''}
                      onChange={(event) =>
                        setLabelInputs((prev) => ({
                          ...prev,
                          [message.id]: event.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => handleAddLabel(message.id)}
                      className="rounded-full bg-slate-900 px-4 py-1 text-xs font-semibold text-white"
                    >
                      ラベル追加
                    </button>
                  </div>
                )}
                <div className="mt-2 text-xs text-slate-400">Room: {message.roomId}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {id && (
        <CompanyTasksSection companyId={id} canWrite={canWrite} />
      )}

      {id && (
        <CompanySummarySection companyId={id} canWrite={canWrite} />
      )}

      {id && <CompanyRelationsSection companyId={id} />}

      {id && <CompanyAuditSection companyId={id} />}
    </div>
  )
}

export default CompanyDetail
