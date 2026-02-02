import { useEffect, useMemo, useState } from 'react'
import { useFetch } from './useApi'
import { usePagination } from './usePagination'
import { usePaginationSync } from './usePaginationSync'
import { apiRoutes } from '../lib/apiRoutes'
import type {
  ApiListResponse,
  Company,
  MessageItem,
  Project,
  Summary,
  Wholesale,
} from '../types'

export type UseCompanyDetailDataOptions = {
  companyId?: string
  networkErrorMessage: string
}

export const useCompanyDetailData = ({
  companyId,
  networkErrorMessage,
}: UseCompanyDetailDataOptions) => {
  const [company, setCompany] = useState<Company | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [messageQuery, setMessageQuery] = useState('')
  const [messageFrom, setMessageFrom] = useState('')
  const [messageTo, setMessageTo] = useState('')
  const [messageLabel, setMessageLabel] = useState('')
  const [messageError, setMessageError] = useState('')

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
  } = useFetch<{ company: Company }>(
    companyId ? apiRoutes.companies.detail(companyId) : null,
    {
      enabled: Boolean(companyId),
      errorMessage: networkErrorMessage,
      onSuccess: (data) => {
        setCompany(data.company)
      },
    }
  )

  const messagesUrl = useMemo(() => {
    if (!companyId) return null
    const params = new URLSearchParams()
    params.set('page', String(messagePagination.page))
    params.set('pageSize', String(messagePagination.pageSize))
    if (messageFrom) params.set('from', messageFrom)
    if (messageTo) params.set('to', messageTo)
    if (messageLabel.trim()) params.set('label', messageLabel.trim())
    const trimmedQuery = messageQuery.trim()
    if (trimmedQuery) {
      params.set('q', trimmedQuery)
      params.set('companyId', companyId)
      return apiRoutes.messages.search(params.toString())
    }
    return apiRoutes.companies.messages(companyId, params.toString())
  }, [
    companyId,
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
      errorMessage: networkErrorMessage,
      onStart: () => setMessageError(''),
      onSuccess: (data) => {
        setMessages(data.items ?? [])
        syncMessagePagination(data)
      },
      onError: setMessageError,
    })

  const {
    data: projectsData,
    error: projectsError,
    isLoading: isLoadingProjects,
    refetch: refetchProjects,
  } = useFetch<{ projects: Project[] }>(
    companyId ? apiRoutes.companies.projects(companyId) : null,
    {
      enabled: Boolean(companyId),
      errorMessage: '案件の取得に失敗しました',
      cacheTimeMs: 30_000,
    }
  )

  const {
    data: wholesalesData,
    error: wholesalesError,
    isLoading: isLoadingWholesales,
    refetch: refetchWholesales,
  } = useFetch<{ wholesales: Wholesale[] }>(
    companyId ? apiRoutes.companies.wholesales(companyId) : null,
    {
      enabled: Boolean(companyId),
      errorMessage: '卸の取得に失敗しました',
      cacheTimeMs: 30_000,
    }
  )

  const {
    data: summariesData,
    error: summariesError,
    isLoading: isLoadingSummaries,
    refetch: refetchSummaries,
  } = useFetch<{ summaries: Summary[] }>(
    companyId ? apiRoutes.companies.summaries(companyId) : null,
    {
      enabled: Boolean(companyId),
      errorMessage: 'サマリーの取得に失敗しました',
      cacheTimeMs: 30_000,
    }
  )

  const projects = projectsData?.projects ?? []
  const wholesales = wholesalesData?.wholesales ?? []
  const summaries = summariesData?.summaries ?? []

  useEffect(() => {
    setMessagePage(1)
  }, [messageQuery, messageFrom, messageTo, messageLabel, setMessagePage])

  return {
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
  }
}
