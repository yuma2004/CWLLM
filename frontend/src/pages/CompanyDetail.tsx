import { useMemo, useRef } from 'react'
import { Link, useParams } from 'react-router-dom'
import CompanyContactsSection from '../components/companies/CompanyContactsSection'
import CompanyOverviewTab from '../components/companies/CompanyOverviewTab'
import CompanyProjectsTab from '../components/companies/CompanyProjectsTab'
import CompanySummariesTab from '../components/companies/CompanySummariesTab'
import CompanyTasksSection from '../components/companies/CompanyTasksSection'
import CompanyTimelineTab from '../components/companies/CompanyTimelineTab'
import CompanyWholesalesTab from '../components/companies/CompanyWholesalesTab'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ErrorAlert from '../components/ui/ErrorAlert'
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
import type { User } from '../types'
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
  const { canWrite } = usePermissions()
  const { toast, showToast, clearToast } = useToast()
  const labelInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

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
    wholesales,
    wholesalesError,
    isLoadingWholesales,
    summaries,
    summariesError,
    isLoadingSummaries,
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

  return (
    <div className="flex h-[calc(100dvh-6rem)] min-h-0 flex-col gap-4 overflow-hidden sm:h-[calc(100dvh-4rem)]">
      <nav className="text-xs text-slate-400">
        <Link to="/companies" className="hover:text-slate-600">
          企業一覧
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-500">{company.name}</span>
      </nav>
      {/* Simple Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase text-slate-400">企業</p>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900">{company.name}</h2>
            <StatusBadge status={company.status} kind="company" />
          </div>
        </div>
        <div className="flex items-center gap-2">
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

      <div className="grid flex-1 min-h-0 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 min-h-0">
          {/* Main Tabs Container */}
          <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <Tabs
              tabs={tabs}
              defaultTab="overview"
              syncWithHash
              className="flex h-full min-h-0 flex-col"
              contentClassName="min-h-0 flex-1 overflow-auto pr-1"
            >
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
        <aside className="lg:col-span-1 min-h-0">
          <div className="h-full min-h-0 overflow-auto pr-1">
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















