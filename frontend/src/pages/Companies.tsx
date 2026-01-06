import { useMemo, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { usePermissions } from '../hooks/usePermissions'
import ErrorAlert from '../components/ui/ErrorAlert'
import FilterBadge from '../components/ui/FilterBadge'
import FormInput from '../components/ui/FormInput'
import FormTextarea from '../components/ui/FormTextarea'
import Pagination from '../components/ui/Pagination'
import { SkeletonTable } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import { useFetch, useMutation } from '../hooks/useApi'
import { useFilters } from '../hooks/useFilters'
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut'
import { usePagination } from '../hooks/usePagination'
import { apiRequest } from '../lib/apiClient'
import { getAvatarColor, getInitials } from '../utils/string'
import { ApiListResponse, ChatworkRoom, Company, CompanyOptions } from '../types'

type CompanyFilters = {
  q: string
  category: string
  status: string
  tag: string
  ownerId: string
}

const defaultFilters: CompanyFilters = {
  q: '',
  category: '',
  status: '',
  tag: '',
  ownerId: '',
}

function Companies() {
  const { canWrite } = usePermissions()
  const [error, setError] = useState('')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showChatworkSelector, setShowChatworkSelector] = useState(false)
  const [chatworkRooms, setChatworkRooms] = useState<ChatworkRoom[]>([])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [options, setOptions] = useState<CompanyOptions>({
    categories: [],
    statuses: [],
    tags: [],
  })
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { filters, setFilters, hasActiveFilters, clearFilter, clearAllFilters } =
    useFilters(defaultFilters)
  const { pagination, setPagination, setPage, setPageSize, paginationQuery } = usePagination()

  const [form, setForm] = useState({
    name: '',
    category: '',
    status: '',
    tags: '',
    profile: '',
  })


  const queryString = useMemo(() => {
    const params = new URLSearchParams(paginationQuery)
    if (filters.q) params.set('q', filters.q)
    if (filters.category) params.set('category', filters.category)
    if (filters.status) params.set('status', filters.status)
    if (filters.tag) params.set('tag', filters.tag)
    if (filters.ownerId) params.set('ownerId', filters.ownerId)
    return params.toString()
  }, [filters, paginationQuery])

  const {
    data: companiesData,
    isLoading: isLoadingCompanies,
    refetch: refetchCompanies,
  } = useFetch<ApiListResponse<Company>>(`/api/companies?${queryString}`, {
    errorMessage: '企業一覧の取得に失敗しました',
    onStart: () => setError(''),
    onSuccess: (data) => {
      setPagination((prev) => ({ ...prev, ...data.pagination }))
    },
    onError: setError,
  })

  const { refetch: refetchOptions } = useFetch<CompanyOptions>('/api/companies/options', {
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
    '/api/chatwork/rooms',
    {
      enabled: showChatworkSelector,
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
  >('/api/companies', 'POST')

  const companies = companiesData?.items ?? []

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
  }

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
          await apiRequest(`/api/companies/${newCompanyId}/chatwork-rooms`, {
            method: 'POST',
            body: { roomId: selectedRoomId },
          })
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

  const handleClearFilter = (key: keyof CompanyFilters) => {
    clearFilter(key)
    setPage(1)
  }

  const handleClearAllFilters = () => {
    clearAllFilters()
    setPage(1)
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
      <form
        onSubmit={handleSearchSubmit}
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
            <input
              ref={searchInputRef}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              placeholder="企業名で検索 (/ で移動)"
              value={filters.q}
              onChange={(event) => setFilters({ ...filters, q: event.target.value })}
            />
          </div>
          <div className="relative">
            <FormInput
              placeholder="区分"
              value={filters.category}
              onChange={(event) => setFilters({ ...filters, category: event.target.value })}
              list="category-options"
            />
            <datalist id="category-options">
              {options.categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
          </div>
          <div className="relative">
            <FormInput
              placeholder="ステータス"
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
              list="status-options"
            />
            <datalist id="status-options">
              {options.statuses.map((status) => (
                <option key={status} value={status} />
              ))}
            </datalist>
          </div>
          <div className="relative">
            <FormInput
              placeholder="タグ"
              value={filters.tag}
              onChange={(event) => setFilters({ ...filters, tag: event.target.value })}
              list="tag-filter-options"
            />
            <datalist id="tag-filter-options">
              {options.tags.map((tag) => (
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
            <span className="text-xs text-slate-500">絞り込み中:</span>
            {filters.q && (
              <FilterBadge label={`検索: ${filters.q}`} onRemove={() => handleClearFilter('q')} />
            )}
            {filters.category && (
              <FilterBadge
                label={`区分: ${filters.category}`}
                onRemove={() => handleClearFilter('category')}
              />
            )}
            {filters.status && (
              <FilterBadge
                label={`ステータス: ${filters.status}`}
                onRemove={() => handleClearFilter('status')}
              />
            )}
            {filters.tag && (
              <FilterBadge
                label={`タグ: ${filters.tag}`}
                onRemove={() => handleClearFilter('tag')}
              />
            )}
            {filters.ownerId && (
              <FilterBadge
                label={`担当者: ${filters.ownerId}`}
                onRemove={() => handleClearFilter('ownerId')}
              />
            )}
            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs text-rose-600 hover:text-rose-700"
            >
              すべてクリア
            </button>
          </div>
        )}
      </form>

      {/* Create Form (Collapsible) */}
      {canWrite && showCreateForm && (
        <div className="animate-fade-up rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">企業を追加</h3>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowChatworkSelector(!showChatworkSelector)}
                className="rounded-full bg-indigo-50 px-3 py-1 text-xs text-indigo-600 transition-colors hover:bg-indigo-100"
              >
                {showChatworkSelector ? '手動入力に戻る' : 'Chatworkから選択'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
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
              {isLoadingRooms ? (
                <div className="py-4 text-sm text-slate-500">Chatworkルームを読み込み中...</div>
              ) : chatworkRooms.length === 0 ? (
                <div className="py-4 text-sm text-slate-500">
                  Chatworkルームが見つかりませんでした。管理者がルーム同期を実行してください。
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-slate-200 p-3">
                  {chatworkRooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => handleRoomSelect(room)}
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
            <form onSubmit={handleCreate} className="space-y-4">
              {selectedRoomId && (
                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
                  Chatworkルームから選択中: {form.name} (Room ID: {selectedRoomId})
                </div>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <FormInput
                  placeholder="企業名（必須）"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
                <div className="relative">
                  <FormInput
                    placeholder="区分"
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                    list="form-category-options"
                  />
                  <datalist id="form-category-options">
                    {options.categories.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>
                <div className="relative">
                  <FormInput
                    placeholder="ステータス"
                    value={form.status}
                    onChange={(event) => setForm({ ...form, status: event.target.value })}
                    list="form-status-options"
                  />
                  <datalist id="form-status-options">
                    {options.statuses.map((status) => (
                      <option key={status} value={status} />
                    ))}
                  </datalist>
                </div>
                <div className="relative">
                  <FormInput
                    placeholder="タグ（カンマ区切り: VIP, 休眠）"
                    value={form.tags}
                    onChange={(event) => setForm({ ...form, tags: event.target.value })}
                    list="form-tag-options"
                  />
                  <datalist id="form-tag-options">
                    {options.tags.map((tag) => (
                      <option key={tag} value={tag} />
                    ))}
                  </datalist>
                </div>
                <FormTextarea
                  containerClassName="md:col-span-2"
                  className="min-h-[88px]"
                  placeholder="プロフィールメモ"
                  value={form.profile}
                  onChange={(event) => setForm({ ...form, profile: event.target.value })}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-full px-6 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
                >
                  追加
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Readonly Notice */}
      {!canWrite && (
        <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
          閲覧専用ロールのため、企業の追加・編集はできません。
        </div>
      )}

      {/* Error */}
      <ErrorAlert message={error} onClose={() => setError('')} />

      {/* Table */}
      {isLoadingCompanies ? (
        <SkeletonTable rows={5} columns={5} />
      ) : (
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
                      <p className="text-slate-500">企業がまだ登録されていません</p>
                      {canWrite && (
                        <button
                          onClick={() => setShowCreateForm(true)}
                          className="mt-2 text-sm text-sky-600 hover:text-sky-700"
                        >
                          最初の企業を追加する
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
      )}

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
