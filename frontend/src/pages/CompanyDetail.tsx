import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CompanySearchSelect } from '../components/SearchSelect'
import CompanyContactsSection from '../components/companies/CompanyContactsSection'
import CompanyOverviewTab from '../components/companies/CompanyOverviewTab'
import CompanyProjectsTab from '../components/companies/CompanyProjectsTab'
import CompanySummariesTab from '../components/companies/CompanySummariesTab'
import CompanyTasksSection from '../components/companies/CompanyTasksSection'
import CompanyTimelineTab from '../components/companies/CompanyTimelineTab'
import CompanyWholesalesTab from '../components/companies/CompanyWholesalesTab'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
import Modal from '../components/ui/Modal'
import { Skeleton, SkeletonText } from '../components/ui/Skeleton'
import StatusBadge from '../components/ui/StatusBadge'
import Tabs, { Tab } from '../components/ui/Tabs'
import Toast from '../components/ui/Toast'
import { usePermissions } from '../hooks/usePermissions'
import { useFetch, useMutation } from '../hooks/useApi'
import { useCompanyContacts } from '../hooks/useCompanyContacts'
import { useCompanyDetailData } from '../hooks/useCompanyDetailData'
import { useCompanyOverviewForm } from '../hooks/useCompanyOverviewForm'
import { useToast } from '../hooks/useToast'
import { apiRoutes } from '../lib/apiRoutes'
import { cn } from '../lib/cn'
import type { User } from '../types'
import { getAvatarColor, getInitials } from '../utils/string'
import {
  COMPANY_CATEGORY_DEFAULT_OPTIONS,
  COMPANY_STATUS_DEFAULT_OPTIONS,
} from '../constants/labels'

const NETWORK_ERROR_MESSAGE = '通信エラーが発生しました'
const CONTACT_MESSAGES = {
  requiredName: '担当者名は必須です',
  updateFailed: '担当者の更新に失敗しました',
  updateSuccess: '担当者を更新しました',
  deleteFailed: '担当者の削除に失敗しました',
  deleteSuccess: '担当者を削除しました',
  reorderFailed: '並び替えに失敗しました',
  mergeSuccess: '重複している担当者を統合しました',
  mergeFailed: '重複統合に失敗しました',
}

function CompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const { canWrite, isAdmin } = usePermissions()
  const { toast, showToast, clearToast } = useToast()
  const labelInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [isMergeOpen, setIsMergeOpen] = useState(false)
  const [mergeTargetId, setMergeTargetId] = useState('')
  const [mergeError, setMergeError] = useState('')

  const {
    company,
    setCompany,
    companyFetchError,
    isLoadingCompany,
    refetchCompany,
    messages,
    messageQuery,
    setMessageQuery,
    messageFrom,
    setMessageFrom,
    messageTo,
    setMessageTo,
    messageLabel,
    setMessageLabel,
    messageError,
    setMessageError,
    messagePagination,
    setMessagePage,
    setMessagePageSize,
    isLoadingMessages,
    refetchMessages,
    projects,
    projectsError,
    isLoadingProjects,
    refetchProjects,
    wholesales,
    wholesalesError,
    isLoadingWholesales,
    refetchWholesales,
    summaries,
    summariesError,
    isLoadingSummaries,
    refetchSummaries,
  } = useCompanyDetailData({
    companyId: id,
    networkErrorMessage: NETWORK_ERROR_MESSAGE,
  })

  const {
    companyForm,
    setCompanyForm,
    tagInput,
    setTagInput,
    companyError,
    isEditing,
    isUpdatingCompany,
    startEdit,
    cancelEdit,
    handleUpdateCompany,
  } = useCompanyOverviewForm({
    company,
    companyId: id,
    networkErrorMessage: NETWORK_ERROR_MESSAGE,
    onCompanyUpdated: setCompany,
    refetchCompany,
    showToast,
  })

  const {
    contacts,
    contactError,
    showContactForm,
    setShowContactForm,
    form,
    setForm,
    editingContactId,
    editContactForm,
    setEditContactForm,
    contactActionError,
    confirmDelete,
    setConfirmDelete,
    isDedupeConfirmOpen,
    setIsDedupeConfirmOpen,
    isDedupeWorking,
    isReorderWorking,
    isDeletingContact,
    duplicateContactGroups,
    contactsFetchError,
    isLoadingContacts,
    refetchContacts,
    handleAddContact,
    startEditContact,
    cancelEditContact,
    handleSaveContact,
    handleConfirmDeleteContact,
    moveContact,
    handleMergeDuplicates,
  } = useCompanyContacts({
    companyId: id,
    networkErrorMessage: NETWORK_ERROR_MESSAGE,
    showToast,
    messages: CONTACT_MESSAGES,
  })

  // Tab configuration
  const tabs: Tab[] = useMemo(
    () => [
      { id: 'overview', label: '概要' },
      { id: 'timeline', label: 'タイムライン', count: messagePagination.total },
      { id: 'projects', label: '案件', count: projects.length },
      { id: 'wholesales', label: '卸', count: wholesales.length },
      { id: 'summaries', label: 'サマリー', count: summaries.length },
    ],
    [messagePagination.total, projects.length, wholesales.length, summaries.length]
  )

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

  const { mutate: addLabel } = useMutation<unknown, { label: string }>(
    apiRoutes.messages.base(),
    'POST'
  )

  const { mutate: removeLabel } = useMutation<unknown, void>(apiRoutes.messages.base(), 'DELETE')

  const { mutate: mergeCompany, isLoading: isMerging } = useMutation<
    { company: { id: string } },
    { sourceCompanyId: string }
  >(apiRoutes.companies.base(), 'POST')

  const isLoading = isLoadingCompany || isLoadingContacts
  const pageError = companyFetchError || contactsFetchError

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
      setMessageError(err instanceof Error ? err.message : NETWORK_ERROR_MESSAGE)
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
      setMessageError(err instanceof Error ? err.message : NETWORK_ERROR_MESSAGE)
    }
  }

  const resetMergeState = () => {
    setMergeTargetId('')
    setMergeError('')
  }

  const handleMergeCompany = async () => {
    if (!id) return
    if (!mergeTargetId) {
      setMergeError('統合対象の企業を選択してください')
      return
    }
    if (mergeTargetId === id) {
      setMergeError('同じ企業は統合できません')
      return
    }
    setMergeError('')
    try {
      await mergeCompany(
        { sourceCompanyId: mergeTargetId },
        { url: apiRoutes.companies.merge(id), errorMessage: '企業の統合に失敗しました' }
      )
      showToast('企業を統合しました', 'success')
      setIsMergeOpen(false)
      resetMergeState()
      void refetchCompany(undefined, { ignoreCache: true })
      void refetchContacts(undefined, { ignoreCache: true })
      void refetchMessages(undefined, { ignoreCache: true })
      void refetchProjects(undefined, { ignoreCache: true })
      void refetchWholesales(undefined, { ignoreCache: true })
      void refetchSummaries(undefined, { ignoreCache: true })
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : '企業の統合に失敗しました')
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
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsMergeOpen(true)}
              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 shadow-sm hover:bg-rose-100"
            >
              企業を統合
            </button>
          )}
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
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs text-slate-500">カテゴリ</div>
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
                      isEditing={isEditing}
                      isSaving={isUpdatingCompany}
                      onStartEdit={startEdit}
                      onCancelEdit={cancelEdit}
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

                  {activeTab === 'projects' && (
                    <CompanyProjectsTab
                      projects={projects}
                      isLoading={isLoadingProjects}
                      error={projectsError}
                    />
                  )}

                  {activeTab === 'wholesales' && (
                    <CompanyWholesalesTab
                      wholesales={wholesales}
                      isLoading={isLoadingWholesales}
                      error={wholesalesError}
                    />
                  )}

                  {activeTab === 'summaries' && (
                    <CompanySummariesTab
                      summaries={summaries}
                      isLoading={isLoadingSummaries}
                      error={summariesError}
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
      <Modal
        isOpen={isMergeOpen}
        onClose={() => {
          setIsMergeOpen(false)
          resetMergeState()
        }}
        title="企業の統合"
        className="max-w-md"
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setIsMergeOpen(false)
                resetMergeState()
              }}
              className="rounded-full px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              disabled={isMerging}
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={handleMergeCompany}
              className="rounded-full bg-rose-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
              disabled={isMerging || !mergeTargetId}
            >
              {isMerging ? '統合中...' : '統合する'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            選択した企業のデータをこの企業に統合します。統合対象の企業は削除されます。
          </p>
          <CompanySearchSelect
            label="統合対象の企業"
            placeholder="統合する企業を検索…"
            value={mergeTargetId}
            onChange={(value) => {
              setMergeTargetId(value)
              if (mergeError) setMergeError('')
            }}
            disabled={isMerging}
          />
          {mergeError && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {mergeError}
            </div>
          )}
        </div>
      </Modal>
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
        title="重複している担当者を統合しますか？"
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















