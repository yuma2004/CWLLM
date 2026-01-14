import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import ErrorAlert from '../components/ui/ErrorAlert'
import LoadingState from '../components/ui/LoadingState'
import FilterBadge from '../components/ui/FilterBadge'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import FormTextarea from '../components/ui/FormTextarea'
import Pagination from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import { useFetch, useMutation } from '../hooks/useApi'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { useUrlSync } from '../hooks/useUrlSync'
import { getAvatarColor, getInitials } from '../utils/string'
import { buildQueryString } from '../utils/queryString'
import { apiRoutes } from '../lib/apiRoutes'
import {
  COMPANY_CATEGORY_DEFAULT_OPTIONS,
  COMPANY_STATUS_DEFAULT_OPTIONS,
} from '../constants/labels'
import type {
  ApiListResponse,
  ChatworkRoom,
  CompaniesFilters,
  Company,
  CompanyOptions,
} from '../types'

const defaultFilters: CompaniesFilters = {
  q: '',
  category: '',
  status: '',
  tag: '',
  ownerId: '',
}

type CompanyFormState = {
  name: string
  category: string
  status: string
  tags: string
  profile: string
}

type CompaniesFiltersProps = {
  filters: CompaniesFilters
  onFiltersChange: (next: CompaniesFilters) => void
  onSubmit: (event: React.FormEvent) => void
  hasActiveFilters: boolean
  onClearFilter: (key: keyof CompaniesFilters) => void
  onClearAll: () => void
  mergedCategories: string[]
  mergedStatuses: string[]
  tagOptions: string[]
  searchInputRef: React.RefObject<HTMLInputElement>
}

function CompaniesFilters({
  filters,
  onFiltersChange,
  onSubmit,
  hasActiveFilters,
  onClearFilter,
  onClearAll,
  mergedCategories,
  mergedStatuses,
  tagOptions,
  searchInputRef,
}: CompaniesFiltersProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="grid gap-3 md:grid-cols-6">
        <div className="relative md:col-span-2">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <FormInput
            ref={searchInputRef}
            className="pl-10 pr-3"
            placeholder="企業名で検索 (/ で移動)"
            value={filters.q}
            onChange={(event) => {
              onFiltersChange({ ...filters, q: event.target.value })
            }}
          />
        </div>
        <FormSelect
          value={filters.category}
          onChange={(event) => {
            onFiltersChange({ ...filters, category: event.target.value })
          }}
        >
          <option value="">区分</option>
          {mergedCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </FormSelect>
        <FormSelect
          value={filters.status}
          onChange={(event) => {
            onFiltersChange({ ...filters, status: event.target.value })
          }}
        >
          <option value="">ステータス</option>
          {mergedStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </FormSelect>
        <div className="relative">
          <FormInput
            placeholder="タグ"
            value={filters.tag}
            onChange={(event) => {
              onFiltersChange({ ...filters, tag: event.target.value })
            }}
            list="tag-filter-options"
          />
          <datalist id="tag-filter-options">
            {tagOptions.map((tag) => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
        </div>
        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          検索
        </button>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">絞り込み:</span>
          {filters.q && (
            <FilterBadge label={`企業名: ${filters.q}`} onRemove={() => onClearFilter('q')} />
          )}
          {filters.category && (
            <FilterBadge
              label={`区分: ${filters.category}`}
              onRemove={() => onClearFilter('category')}
            />
          )}
          {filters.status && (
            <FilterBadge
              label={`ステータス: ${filters.status}`}
              onRemove={() => onClearFilter('status')}
            />
          )}
          {filters.tag && (
            <FilterBadge label={`タグ: ${filters.tag}`} onRemove={() => onClearFilter('tag')} />
          )}
          {filters.ownerId && (
            <FilterBadge
              label={`担当者: ${filters.ownerId}`}
              onRemove={() => onClearFilter('ownerId')}
            />
          )}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs text-rose-600 hover:text-rose-700"
          >
            すべて解除
          </button>
        </div>
      )}
    </form>
  )
}

type CompaniesCreateFormProps = {
  isOpen: boolean
  isAdmin: boolean
  showChatworkSelector: boolean
  onToggleChatworkSelector: () => void
  onClose: () => void
  roomSearchQuery: string
  onRoomSearchChange: (value: string) => void
  isLoadingRooms: boolean
  chatworkRooms: ChatworkRoom[]
  filteredChatworkRooms: ChatworkRoom[]
  onRoomSelect: (room: ChatworkRoom) => void
  selectedRoomId: string
  form: CompanyFormState
  onFormChange: (next: CompanyFormState) => void
  onSubmit: (event: React.FormEvent) => void
  mergedCategories: string[]
  mergedStatuses: string[]
  tagOptions: string[]
}

function CompaniesCreateForm({
  isOpen,
  isAdmin,
  showChatworkSelector,
  onToggleChatworkSelector,
  onClose,
  roomSearchQuery,
  onRoomSearchChange,
  isLoadingRooms,
  chatworkRooms,
  filteredChatworkRooms,
  onRoomSelect,
  selectedRoomId,
  form,
  onFormChange,
  onSubmit,
  mergedCategories,
  mergedStatuses,
  tagOptions,
}: CompaniesCreateFormProps) {
  if (!isOpen) return null

  return (
    <div className="animate-fade-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">企業を追加</h3>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleChatworkSelector}
            disabled={!isAdmin}
            title={!isAdmin ? '管理者のみ' : undefined}
            className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-600 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {showChatworkSelector ? '手動入力' : 'Chatworkから追加'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 transition-colors hover:text-slate-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {showChatworkSelector ? (
        <div className="space-y-4">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <FormInput
              type="text"
              className="pl-10 pr-3"
              placeholder="Chatwork Room IDで検索"
              value={roomSearchQuery}
              onChange={(e) => onRoomSearchChange(e.target.value)}
            />
          </div>
          {isLoadingRooms ? (
            <LoadingState className="py-4" message="Chatworkルームを読み込み中..." />
          ) : chatworkRooms.length === 0 ? (
            <div className="py-4 text-sm text-slate-500">
              Chatworkルームが見つかりません。同期を実行してください。
            </div>
          ) : filteredChatworkRooms.length === 0 ? (
            <div className="py-4 text-sm text-slate-500">
              「${roomSearchQuery}」に一致するルームが見つかりません。
            </div>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
              {filteredChatworkRooms.map((room) => (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => onRoomSelect(room)}
                  className="w-full rounded-lg border border-slate-200 p-3 text-left transition-colors hover:border-indigo-300 hover:bg-slate-50"
                >
                  <div className="font-medium text-slate-900">{room.name}</div>
                  {room.description && (
                    <div className="mt-1 line-clamp-1 text-xs text-slate-500">{room.description}</div>
                  )}
                  <div className="mt-1 text-xs text-slate-400">Room ID: {room.roomId}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          {selectedRoomId && (
            <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
              Chatwork連携: {form.name} (Room ID: {selectedRoomId})
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              placeholder="企業名（必須）"
              value={form.name}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
              required
            />
            <FormSelect
              value={form.category}
              onChange={(event) => onFormChange({ ...form, category: event.target.value })}
            >
              <option value="">区分</option>
              {mergedCategories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </FormSelect>
            <FormSelect
              value={form.status}
              onChange={(event) => onFormChange({ ...form, status: event.target.value })}
            >
              <option value="">ステータス</option>
              {mergedStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </FormSelect>
            <div className="relative">
              <FormInput
                placeholder="タグを追加: VIP, 重要"
                value={form.tags}
                onChange={(event) => onFormChange({ ...form, tags: event.target.value })}
                list="form-tag-options"
              />
              <datalist id="form-tag-options">
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
            </div>
            <FormTextarea
              containerClassName="md:col-span-2"
              className="min-h-[88px]"
              placeholder="プロフィールを入力"
              value={form.profile}
              onChange={(event) => onFormChange({ ...form, profile: event.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-6 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
            >
              登録
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

type CompaniesTableProps = {
  companies: Company[]
  isLoading: boolean
  canWrite: boolean
  onOpenCreateForm: () => void
}

function CompaniesTable({ companies, isLoading, canWrite, onOpenCreateForm }: CompaniesTableProps) {
  if (isLoading) {
    return <SkeletonTable rows={5} columns={5} />
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-5 py-3">企業名</th>
            <th className="px-5 py-3">区分</th>
            <th className="px-5 py-3">ステータス</th>
            <th className="px-5 py-3">タグ</th>
            <th className="px-5 py-3">担当者</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {companies.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-5 py-12 text-center">
                <div className="flex flex-col items-center gap-2">
                  <svg
                    className="h-12 w-12 text-slate-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                  </svg>
                  <p className="text-slate-500">企業が見つかりません</p>
                  {canWrite && (
                    <button
                      onClick={onOpenCreateForm}
                      className="mt-2 text-sm text-sky-600 hover:text-sky-700"
                    >
                      企業を追加
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            companies.map((company) => (
              <tr key={company.id} className="group transition-colors hover:bg-slate-50/80">
                <td className="px-5 py-4">
                  <Link to={`/companies/${company.id}`} className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${getAvatarColor(company.name)}`}
                    >
                      {getInitials(company.name)}
                    </div>
                    <span className="font-semibold text-slate-900 group-hover:text-sky-600">
                      {company.name}
                    </span>
                  </Link>
                </td>
                <td className="px-5 py-4 text-slate-600">{company.category || '-'}</td>
                <td className="px-5 py-4">
                  <StatusBadge status={company.status} size="sm" />
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap items-center gap-1">
                    {company.tags.length > 0 ? (
                      <>
                        {company.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                        {company.tags.length > 2 && (
                          <span className="text-xs text-slate-400">+{company.tags.length - 2}</span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-600">{company.ownerId || '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function Companies() {
  const { canWrite, isAdmin } = usePermissions()
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showChatworkSelector, setShowChatworkSelector] = useState(false)
  const [chatworkRooms, setChatworkRooms] = useState<ChatworkRoom[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [roomSearchQuery, setRoomSearchQuery] = useState('')
  const [options, setOptions] = useState<CompanyOptions>({
    categories: [],
    statuses: [],
    tags: [],
  })
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { filters, setFilters, hasActiveFilters, clearFilter, clearAllFilters, pagination, setPagination, setPage, setPageSize } =
    useUrlSync({ pathname: '/companies', defaultFilters })
  const debouncedQuery = useDebouncedValue(filters.q, 300)

  const [form, setForm] = useState<CompanyFormState>({
    name: '',
    category: '',
    status: '',
    tags: '',
    profile: '',
  })


  const queryString = useMemo(() => {
    return buildQueryString({
      q: debouncedQuery,
      category: filters.category,
      status: filters.status,
      tag: filters.tag,
      ownerId: filters.ownerId,
      page: pagination.page,
      pageSize: pagination.pageSize,
    })
  }, [debouncedQuery, filters.category, filters.status, filters.tag, filters.ownerId, pagination.page, pagination.pageSize])

  const {
    data: companiesData,
    isLoading: isLoadingCompanies,
    refetch: refetchCompanies,
  } = useFetch<ApiListResponse<Company>>(apiRoutes.companies.list(queryString), {
    errorMessage: '企業一覧の取得に失敗しました',
    onStart: () => setError(''),
    onSuccess: (data) => {
      setPagination((prev) => ({ ...prev, ...data.pagination }))
    },
    onError: setError,
  })

  const { refetch: refetchOptions } = useFetch<CompanyOptions>(apiRoutes.companies.options(), {
    onSuccess: (data) => {
      setOptions({
        categories: data?.categories ?? [],
        statuses: data?.statuses ?? [],
        tags: data?.tags ?? [],
      })
    },
    onError: (message) => {
      console.error('候補の取得エラー:', message)
    },
  })

  const { isLoading: isLoadingRooms } = useFetch<{ rooms?: ChatworkRoom[] }>(
    isAdmin && showChatworkSelector ? apiRoutes.chatwork.rooms() : null,
    {
      enabled: isAdmin && showChatworkSelector,
      errorMessage: 'Chatworkルーム一覧の取得に失敗しました。管理者権限が必要な場合があります。',
      onSuccess: (data) => setChatworkRooms(data.rooms ?? []),
      onError: setError,
    }
  )

  const { mutate: createCompany } = useMutation<
    { company?: Company },
    {
      name: string
      category?: string
      status?: string
      profile?: string
      tags: string[]
    }
  >(apiRoutes.companies.base(), 'POST')

  const { mutate: linkChatworkRoom } = useMutation<unknown, { roomId: string }>(
    apiRoutes.companies.base(),
    'POST'
  )

  const companies = companiesData?.items ?? []

  // 標準候補とAPIから取得した候補をマージ
  const mergedCategories = useMemo(() => {
    // 標準候補を先に、その後APIから取得した候補を追加（重複を除去）
    return Array.from(new Set([...COMPANY_CATEGORY_DEFAULT_OPTIONS, ...options.categories])).sort()
  }, [options.categories])

  const mergedStatuses = useMemo(() => {
    // 標準候補を先に、その後APIから取得した候補を追加（重複を除去）
    return Array.from(new Set([...COMPANY_STATUS_DEFAULT_OPTIONS, ...options.statuses])).sort()
  }, [options.statuses])

  const shortcuts = useMemo(
    () => [
      {
        key: '/',
        handler: () => searchInputRef.current?.focus(),
        preventDefault: true,
        ctrlKey: false,
        metaKey: false,
      },
      {
        key: 'n',
        handler: () => setShowCreateForm(true),
        preventDefault: true,
        ctrlKey: false,
        metaKey: false,
        enabled: canWrite,
      },
    ],
    [canWrite]
  )

  useKeyboardShortcut(shortcuts)

  // フォームが開かれたときにデフォルトでChatworkから選択モードにする
  useEffect(() => {
    if (showCreateForm && isAdmin) {
      setShowChatworkSelector(true)
    } else if (!showCreateForm) {
      setShowChatworkSelector(false)
      setRoomSearchQuery('')
    }
  }, [showCreateForm, isAdmin])

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setPage(1)
  }

  const handleRoomSelect = (room: ChatworkRoom) => {
    setSelectedRoomId(room.roomId)
    setForm((prev) => ({
      ...prev,
      name: room.name,
      profile: room.description || '',
    }))
    setShowChatworkSelector(false)
    setRoomSearchQuery('')
  }

  const filteredChatworkRooms = useMemo(() => {
    if (!roomSearchQuery.trim()) return chatworkRooms
    const query = roomSearchQuery.toLowerCase()
    return chatworkRooms.filter(
      (room) =>
        room.name.toLowerCase().includes(query) ||
        room.description?.toLowerCase().includes(query) ||
        room.roomId.toLowerCase().includes(query)
    )
  }, [chatworkRooms, roomSearchQuery])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('企業名は必須です')
      return
    }
    setError('')

    const tags = form.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    try {
      const companyData = await createCompany(
        {
          name: form.name,
          category: form.category || undefined,
          status: form.status || undefined,
          profile: form.profile || undefined,
          tags,
        },
        { errorMessage: '企業の作成に失敗しました' }
      )
      const newCompanyId = companyData?.company?.id

      // Chatworkルームが選択されている場合、自動的に紐づける
      if (selectedRoomId && newCompanyId) {
        try {
          await linkChatworkRoom(
            { roomId: selectedRoomId },
            { url: apiRoutes.companies.chatworkRooms(newCompanyId) }
          )
        } catch (err) {
          console.error('ルームの紐づけに失敗しました:', err)
        }
      }

      setForm({
        name: '',
        category: '',
        status: '',
        tags: '',
        profile: '',
      })
      setSelectedRoomId('')
      setShowChatworkSelector(false)
      setShowCreateForm(false)
      void refetchCompanies()
      void refetchOptions()
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
  }

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
  }

  const handleClearFilter = (key: keyof CompaniesFilters) => {
    clearFilter(key)
  }

  const handleClearAllFilters = () => {
    clearAllFilters()
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Company</p>
          <h2 className="text-3xl font-bold text-slate-900">企業一覧</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            登録数: <span className="font-semibold text-slate-700">{pagination.total}</span>
          </span>
          {canWrite && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              企業を追加
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <CompaniesFilters
        filters={filters}
        onFiltersChange={setFilters}
        onSubmit={handleSearchSubmit}
        hasActiveFilters={hasActiveFilters}
        onClearFilter={handleClearFilter}
        onClearAll={handleClearAllFilters}
        mergedCategories={mergedCategories}
        mergedStatuses={mergedStatuses}
        tagOptions={options.tags}
        searchInputRef={searchInputRef}
      />

      {/* Create Form (Collapsible) */}
      <CompaniesCreateForm
        isOpen={canWrite && showCreateForm}
        isAdmin={isAdmin}
        showChatworkSelector={showChatworkSelector}
        onToggleChatworkSelector={() => {
          setShowChatworkSelector(!showChatworkSelector)
          if (!showChatworkSelector) {
            setRoomSearchQuery('')
          }
        }}
        onClose={() => setShowCreateForm(false)}
        roomSearchQuery={roomSearchQuery}
        onRoomSearchChange={setRoomSearchQuery}
        isLoadingRooms={isLoadingRooms}
        chatworkRooms={chatworkRooms}
        filteredChatworkRooms={filteredChatworkRooms}
        onRoomSelect={handleRoomSelect}
        selectedRoomId={selectedRoomId}
        form={form}
        onFormChange={setForm}
        onSubmit={handleCreate}
        mergedCategories={mergedCategories}
        mergedStatuses={mergedStatuses}
        tagOptions={options.tags}
      />

      {/* Readonly Notice */}
      {!canWrite && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          閲覧専用ロールのため、企業の追加・編集はできません。
        </div>
      )}

      {/* Error */}
      <ErrorAlert message={error} onClose={() => setError('')} />

      {/* Table */}
      <CompaniesTable
        companies={companies}
        isLoading={isLoadingCompanies}
        canWrite={canWrite}
        onOpenCreateForm={() => setShowCreateForm(true)}
      />

      {/* Pagination */}
      {pagination.total > 0 && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="text-center text-xs text-slate-400">
        <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">/</kbd> 検索
        {canWrite && (
          <>
            {' '}
            <kbd className="ml-2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono">n</kbd> 新規追加
          </>
        )}
      </div>
    </div>
  )
}

export default Companies
