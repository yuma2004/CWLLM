import { useEffect, useMemo, useRef, useState } from 'react'
import { usePermissions } from '../hooks/usePermissions'
import ErrorAlert from '../components/ui/ErrorAlert'
import Pagination from '../components/ui/Pagination'
import CompanyFilters from '../components/companies/CompanyFilters'
import CompanyTable from '../components/companies/CompanyTable'
import CompanyCreateForm, { type CompanyFormState } from '../components/companies/CompanyCreateForm'
import { useFetch, useMutation } from '../hooks/useApi'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { useListQuery } from '../hooks/useListQuery'
import { useUrlSync } from '../hooks/useUrlSync'
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
  const queryString = useListQuery(filters, pagination, { q: debouncedQuery })

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
    <div className="space-y-4 ">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase  text-slate-400">Company</p>
          <h2 className="text-3xl font-bold text-slate-900">企業一覧</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            登録数: <span className="font-semibold text-slate-700">{pagination.total}</span>
          </span>
          {canWrite && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white  hover:bg-slate-800"
            >
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              企業を追加
            </button>
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
      <CompanyTable
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
