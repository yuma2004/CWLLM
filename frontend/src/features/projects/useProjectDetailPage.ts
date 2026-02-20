import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useFetch, useMutation } from '../../hooks/useApi'
import { usePermissions } from '../../hooks/usePermissions'
import { useToast } from '../../hooks/useToast'
import { apiRoutes } from '../../lib/apiRoutes'
import {
  buildProjectUpdatePayload,
  buildWholesaleCreatePayload,
  buildWholesaleUpdatePayload,
  type ProjectUpdateFormState,
  type WholesaleCreateFormState,
  type WholesaleEditFormState,
  validateProjectUpdateForm,
} from './detailPayloads'
import { formatDateInput } from '../../utils/date'
import type { Project, User, Wholesale } from '../../types'

export const useProjectDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const { canWrite } = usePermissions()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [form, setForm] = useState<WholesaleCreateFormState>({
    companyId: '',
    status: 'active',
    unitPrice: '',
    conditions: '',
    agreedDate: '',
  })
  const [formError, setFormError] = useState('')
  const [isEditingProject, setIsEditingProject] = useState(false)
  const [projectForm, setProjectForm] = useState<ProjectUpdateFormState>({
    name: '',
    status: 'active',
    unitPrice: '',
    conditions: '',
    periodStart: '',
    periodEnd: '',
    ownerId: '',
  })
  const [projectFormError, setProjectFormError] = useState('')
  const [editingWholesale, setEditingWholesale] = useState<Wholesale | null>(null)
  const [editForm, setEditForm] = useState<WholesaleEditFormState>({
    status: 'active',
    unitPrice: '',
    conditions: '',
    agreedDate: '',
  })
  const [editError, setEditError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Wholesale | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const { toast, showToast, clearToast } = useToast()

  const {
    data: projectData,
    error: projectError,
    isLoading: isLoadingProject,
    refetch: refetchProject,
  } = useFetch<{ project: Project }>(id ? apiRoutes.projects.detail(id) : null, {
    enabled: Boolean(id),
    authMode: 'bearer',
    cacheTimeMs: 10_000,
  })

  const {
    data: wholesalesData,
    error: wholesalesError,
    isLoading: isLoadingWholesales,
    refetch: refetchWholesales,
  } = useFetch<{ wholesales: Wholesale[] }>(id ? apiRoutes.projects.wholesales(id) : null, {
    enabled: Boolean(id),
    authMode: 'bearer',
    cacheTimeMs: 10_000,
  })

  const project = projectData?.project ?? null
  const wholesales = wholesalesData?.wholesales ?? []
  const isLoading = isLoadingProject || isLoadingWholesales
  const error = projectError || wholesalesError

  const refreshData = useMemo(
    () => () => {
      void refetchProject(undefined, { ignoreCache: true })
      void refetchWholesales(undefined, { ignoreCache: true })
    },
    [refetchProject, refetchWholesales]
  )

  useEffect(() => {
    if (project) {
      setProjectForm({
        name: project.name,
        status: project.status || 'active',
        unitPrice: project.unitPrice?.toString() || '',
        conditions: project.conditions || '',
        periodStart: project.periodStart ? formatDateInput(project.periodStart) : '',
        periodEnd: project.periodEnd ? formatDateInput(project.periodEnd) : '',
        ownerId: project.ownerId || '',
      })
    }
  }, [project])

  const { mutate: createWholesale, isLoading: isCreatingWholesale } = useMutation<
    { wholesale: Wholesale },
    {
      projectId: string
      companyId: string
      status: string
      unitPrice?: number
      conditions?: string
      agreedDate?: string
    }
  >(apiRoutes.wholesales.base(), 'POST')

  const { mutate: updateWholesale } = useMutation<
    { wholesale: Wholesale },
    {
      status: string
      unitPrice?: number | null
      conditions?: string | null
      agreedDate?: string | null
    }
  >(apiRoutes.wholesales.base(), 'PATCH')

  const { mutate: removeWholesale, isLoading: isDeletingWholesale } = useMutation<unknown, void>(
    apiRoutes.wholesales.base(),
    'DELETE'
  )

  const { mutate: updateProject, isLoading: isUpdatingProject } = useMutation<
    { project: Project },
    ReturnType<typeof buildProjectUpdatePayload>
  >(apiRoutes.projects.base(), 'PATCH')

  const { data: usersData } = useFetch<{ users: User[] }>(apiRoutes.users.options(), {
    authMode: 'bearer',
    cacheTimeMs: 30_000,
  })
  const userOptions = usersData?.users ?? []
  const ownerLabel = project
    ? userOptions.find((user) => user.id === project.ownerId)?.name ||
      userOptions.find((user) => user.id === project.ownerId)?.email ||
      project.owner?.name ||
      project.owner?.email ||
      project.ownerId ||
      '-'
    : '-'

  const handleCancelProjectEdit = () => {
    if (project) {
      setProjectForm({
        name: project.name,
        status: project.status || 'active',
        unitPrice: project.unitPrice?.toString() || '',
        conditions: project.conditions || '',
        periodStart: project.periodStart ? formatDateInput(project.periodStart) : '',
        periodEnd: project.periodEnd ? formatDateInput(project.periodEnd) : '',
        ownerId: project.ownerId || '',
      })
    }
    setProjectFormError('')
    setIsEditingProject(false)
  }

  const handleUpdateProject = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!id) return
    setProjectFormError('')
    if (validateProjectUpdateForm(projectForm) !== null) {
      setProjectFormError('Project name is required.')
      return
    }
    try {
      const payload = buildProjectUpdatePayload(projectForm)
      await updateProject(payload, {
        authMode: 'bearer',
        url: apiRoutes.projects.detail(id),
        errorMessage: 'Failed to update project.',
      })
      setIsEditingProject(false)
      refreshData()
      showToast('Project updated.', 'success')
    } catch (err) {
      setProjectFormError(err instanceof Error ? err.message : 'Failed to update project.')
    }
  }

  const handleCreateWholesale = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!id) return
    setFormError('')
    if (!form.companyId) {
      setFormError('Company is required.')
      return
    }
    try {
      await createWholesale(buildWholesaleCreatePayload(id, form), {
        authMode: 'bearer',
        errorMessage: 'Failed to create wholesale record.',
      })
      setForm({
        companyId: '',
        status: 'active',
        unitPrice: '',
        conditions: '',
        agreedDate: '',
      })
      setShowCreateForm(false)
      refreshData()
      showToast('Wholesale record created.', 'success')
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create wholesale record.')
    }
  }

  const openEditModal = (wholesale: Wholesale) => {
    setEditingWholesale(wholesale)
    setEditForm({
      status: wholesale.status,
      unitPrice: wholesale.unitPrice?.toString() || '',
      conditions: wholesale.conditions || '',
      agreedDate: wholesale.agreedDate ? wholesale.agreedDate.split('T')[0] : '',
    })
    setEditError('')
  }

  const handleUpdateWholesale = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingWholesale) return
    setEditError('')
    try {
      await updateWholesale(buildWholesaleUpdatePayload(editForm), {
        authMode: 'bearer',
        url: apiRoutes.wholesales.detail(editingWholesale.id),
        errorMessage: 'Failed to update wholesale record.',
      })
      setEditingWholesale(null)
      refreshData()
      showToast('Wholesale record updated.', 'success')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update wholesale record.')
    }
  }

  const handleDeleteWholesale = (wholesale: Wholesale) => {
    setDeleteError('')
    setDeleteTarget(wholesale)
  }

  const confirmDeleteWholesale = async () => {
    if (!deleteTarget) return
    setDeleteError('')
    try {
      await removeWholesale(undefined, {
        authMode: 'bearer',
        url: apiRoutes.wholesales.detail(deleteTarget.id),
        errorMessage: 'Failed to delete wholesale record.',
      })
      setDeleteTarget(null)
      refreshData()
      showToast('Wholesale record deleted.', 'success')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete wholesale record.')
    }
  }

  return {
    id,
    canWrite,
    showCreateForm,
    setShowCreateForm,
    form,
    setForm,
    formError,
    isEditingProject,
    setIsEditingProject,
    projectForm,
    setProjectForm,
    projectFormError,
    editingWholesale,
    setEditingWholesale,
    editForm,
    setEditForm,
    editError,
    deleteTarget,
    setDeleteTarget,
    deleteError,
    toast,
    clearToast,
    project,
    wholesales,
    isLoading,
    error,
    isCreatingWholesale,
    isDeletingWholesale,
    isUpdatingProject,
    userOptions,
    ownerLabel,
    handleCancelProjectEdit,
    handleUpdateProject,
    handleCreateWholesale,
    openEditModal,
    handleUpdateWholesale,
    handleDeleteWholesale,
    confirmDeleteWholesale,
  }
}
