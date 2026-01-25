import { useEffect, useMemo, useRef, useState } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import Button from '../components/ui/Button'
import ErrorAlert from '../components/ui/ErrorAlert'
import Pagination from '../components/ui/Pagination'
import CompanyFilters from '../components/companies/CompanyFilters'
import CompanyTable from '../components/companies/CompanyTable'
import CompanyCreateForm, { type CompanyFormState } from '../components/companies/CompanyCreateForm'
import { useFetch, useMutation } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import Toast from '../components/ui/Toast'
import { createSearchShortcut, useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { useListPage } from '../hooks/useListPage'
import { apiRoutes } from '../lib/apiRoutes'
import {
  COMPANY_CATEGORY_DEFAULT_OPTIONS,
  COMPANY_STATUS_DEFAULT_OPTIONS,
} from '../constants/labels'
import type {
  ChatworkRoom,
  CompaniesFilters,
  Company,
  CompanyOptions,
  User,
} from '../types'

const defaultFilters: CompaniesFilters = {
  q: '',
  category: '',
  status: '',
  tag: '',
  ownerId: '',
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

  const [form, setForm] = useState<CompanyFormState>({
    name: '',
    category: '',
    status: '',
    ownerIds: [],
    tags: '',
    profile: '',
  })
  const { toast, showToast, clearToast } = useToast()
  const {
    filters,
    setFilters,
    hasActiveFilters,
    clearFilter,
    clearAllFilters,
    pagination,
    setPage,
    setPageSize,
    handleSearchSubmit,
    data: companiesData,
    isLoading: isLoadingCompanies,
    refetch: refetchCompanies,
  } = useListPage<CompaniesFilters, Record<string, string>, Company>({
    urlSync: { pathname: '/companies', defaultFilters },
    buildUrl: apiRoutes.companies.list,
    debounce: { key: 'q', delayMs: 300 },
    fetchOptions: {
      errorMessage: '企業一覧の取得に失敗しました',
      onStart: () => setError(''),
      onError: setError,
    },
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
      ownerIds?: string[]
      tags: string[]
    }
  >(apiRoutes.companies.base(), 'POST')

  const { mutate: linkChatworkRoom } = useMutation<unknown, { roomId: string }>(
    apiRoutes.companies.base(),
    'POST'
  )

  const { data: usersData } = useFetch<{ users: User[] }>(apiRoutes.users.options(), {
    cacheTimeMs: 30_000,
  })
  const userOptions = usersData?.users ?? []

  const { mutate: updateCompanyOwner, isLoading: isUpdatingOwner } = useMutation<
    { company: Company },
    { ownerIds?: string[] }
  >(apiRoutes.companies.base(), 'PATCH')

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
      createSearchShortcut(searchInputRef),
      {
        key: 'n',
        handler: () => setShowCreateForm(true),
        preventDefault: true,
        ctrlKey: false,
        metaKey: false,
        enabled: canWrite,
      },
    ],
    [canWrite, searchInputRef]
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
          ownerIds: form.ownerIds.length > 0 ? form.ownerIds : undefined,
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
        ownerIds: [],
        tags: '',
        profile: '',
      })
      setSelectedRoomId('')
      setShowChatworkSelector(false)
      setShowCreateForm(false)
      void refetchCompanies()
      void refetchOptions()
      showToast('企業を作成しました', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : '通信エラーが発生しました')
    }
  }

  const handleClearFilter = (key: keyof CompaniesFilters) => {
    clearFilter(key)
  }

  const handleClearAllFilters = () => {
    clearAllFilters()
  }

  const handleOwnerChange = async (companyId: string, ownerIds: string[]) => {
    if (!canWrite) return
    setError('')
    try {
      await updateCompanyOwner(
        { ownerIds },
        { url: apiRoutes.companies.detail(companyId), errorMessage: '担当者の更新に失敗しました' }
      )
      void refetchCompanies(undefined, { ignoreCache: true })
      showToast('担当者を更新しました', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : '担当者の更新に失敗しました')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase text-notion-text-tertiary">企業</p>
          <h2 className="text-3xl font-semibold text-notion-text text-balance">企業一覧</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-notion-text-secondary">
            登録数: <span className="font-semibold text-notion-text tabular-nums">{pagination.total}</span>
          </span>
          {canWrite && (
            <Button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="inline-flex items-center gap-2"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              企業を追加
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filter */}
      <CompanyFilters
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
      <CompanyCreateForm
        isOpen={canWrite && showCreateForm}
        isAdmin={isAdmin}
        showChatworkSelector={showChatworkSelector}
        onToggleChatworkSelector={(nextOpen) => {
          setShowChatworkSelector(nextOpen)
          if (!nextOpen) {
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
        tagOptions={options.tags}
        userOptions={userOptions}
        categoryOptions={mergedCategories}
        statusOptions={mergedStatuses}
      />

      {/* Readonly Notice */}
      {!canWrite && (
        <div className="rounded-2xl border border-dashed border-notion-border p-4 text-sm text-notion-text-secondary">
          権限がないため、企業の追加・編集はできません。
        </div>
      )}

      {/* Error */}
      <ErrorAlert message={error} onClose={() => setError('')} />

      {/* Table */}
      <CompanyTable
        companies={companies}
        isLoading={isLoadingCompanies}
        canWrite={canWrite}
        userOptions={userOptions}
        isUpdatingOwner={isUpdatingOwner}
        onOwnerChange={handleOwnerChange}
        onOpenCreateForm={() => setShowCreateForm(true)}
      />

      {/* Pagination */}
      {pagination.total > 0 && (
        <Pagination
          page={pagination.page}
          pageSize={pagination.pageSize}
          total={pagination.total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="text-center text-xs text-notion-text-tertiary">
        <kbd className="rounded border border-notion-border bg-notion-bg-secondary px-1.5 py-0.5 font-mono">/</kbd> 検索
        {canWrite && (
          <>
            {' '}
            <kbd className="ml-2 rounded border border-notion-border bg-notion-bg-secondary px-1.5 py-0.5 font-mono">n</kbd> 新規追加
          </>
        )}
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

export default Companies
