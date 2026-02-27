import { useEffect, useMemo, useRef, useState } from 'react'
import { usePermissions } from '../../hooks/usePermissions'
import { useFetch, useMutation } from '../../hooks/useApi'
import { useToast } from '../../hooks/useToast'
import { createSearchShortcut, useKeyboardShortcut } from '../../hooks/useKeyboardShortcut'
import { useListPage } from '../../hooks/useListPage'
import type { Project, ProjectsFilters, User } from '../../types'
import { apiRoutes } from '../../lib/apiRoutes'
import {
  buildProjectCreatePayload,
  type ProjectCreateFormState,
  type ProjectCreatePayload,
  validateProjectCreateForm,
} from './form'

const defaultFilters: ProjectsFilters = {
  q: '',
  status: '',
  companyId: '',
  ownerId: '',
}

const createInitialForm = (): ProjectCreateFormState => ({
  companyId: '',
  name: '',
  status: 'active',
  unitPrice: '',
  conditions: '',
  periodStart: '',
  periodEnd: '',
  ownerId: '',
})

export const useProjectsPage = () => {
  const { canWrite } = usePermissions()
  const searchInputRef = useRef<HTMLInputElement>(null)
  const createNameRef = useRef<HTMLInputElement>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const { toast, showToast, clearToast } = useToast()
  const [form, setForm] = useState<ProjectCreateFormState>(createInitialForm)

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
    data: projectsData,
    error,
    setError,
    isLoading: isLoadingProjects,
    refetch: refetchProjects,
  } = useListPage<ProjectsFilters, Record<string, string>, Project>({
    urlSync: { pathname: '/projects', defaultFilters },
    buildUrl: apiRoutes.projects.list,
    debounce: {
      key: 'q',
      delayMs: 300,
      transform: (value) => (typeof value === 'string' ? value.trim() : value),
    },
    fetchOptions: {
      authMode: 'bearer',
      errorMessage: '案件一覧の取得に失敗しました。',
    },
  })

  const { data: usersData } = useFetch<{ users: User[] }>(apiRoutes.users.options(), {
    authMode: 'bearer',
    cacheTimeMs: 30_000,
  })
  const userOptions = usersData?.users ?? []
  const projects = projectsData?.items ?? []

  const { mutate: createProject, isLoading: isCreating } = useMutation<
    { project: Project },
    ProjectCreatePayload
  >(apiRoutes.projects.base(), 'POST')

  const { mutate: updateProjectOwner, isLoading: isUpdatingOwner } = useMutation<
    { project: Project },
    { ownerId?: string | null }
  >(apiRoutes.projects.base(), 'PATCH')

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

  useEffect(() => {
    if (!showCreateForm) return
    const frameId = window.requestAnimationFrame(() => {
      createNameRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [showCreateForm])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    if (validateProjectCreateForm(form) !== null) {
      setError('企業と案件名は必須です。')
      return
    }
    try {
      const payload = buildProjectCreatePayload(form)
      await createProject(payload, {
        authMode: 'bearer',
        errorMessage: '案件の作成に失敗しました。',
      })
      setForm(createInitialForm())
      setShowCreateForm(false)
      void refetchProjects(undefined, { ignoreCache: true })
      showToast('案件を作成しました。', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました。')
    }
  }

  const handleOwnerChange = async (projectId: string, ownerId: string) => {
    if (!canWrite) return
    setError('')
    const nextOwnerId = ownerId || null
    try {
      await updateProjectOwner(
        { ownerId: nextOwnerId },
        {
          authMode: 'bearer',
          url: apiRoutes.projects.detail(projectId),
          errorMessage: '担当者の更新に失敗しました。',
        }
      )
      void refetchProjects(undefined, { ignoreCache: true })
      showToast('担当者を更新しました。', 'success')
    } catch (err) {
      setError(err instanceof Error ? err.message : '担当者の更新に失敗しました。')
    }
  }

  const getCompanyName = (companyId: string) => {
    const project = projects.find((p) => p.companyId === companyId)
    return project?.company?.name ?? companyId
  }

  const getOwnerName = (ownerId: string) => {
    const user = userOptions.find((u) => u.id === ownerId)
    return user?.name || user?.email || ownerId
  }

  return {
    canWrite,
    searchInputRef,
    createNameRef,
    showCreateForm,
    setShowCreateForm,
    toast,
    clearToast,
    form,
    setForm,
    filters,
    setFilters,
    hasActiveFilters,
    clearFilter,
    clearAllFilters,
    pagination,
    setPage,
    setPageSize,
    handleSearchSubmit,
    projects,
    error,
    setError,
    isLoadingProjects,
    userOptions,
    isCreating,
    isUpdatingOwner,
    handleCreate,
    handleOwnerChange,
    getCompanyName,
    getOwnerName,
  }
}
