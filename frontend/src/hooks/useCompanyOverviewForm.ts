import { useCallback, useEffect, useState } from 'react'
import { useMutation } from './useApi'
import { apiRoutes } from '../lib/apiRoutes'
import type { Company } from '../types'
import type { ToastState } from './useToast'
import { toErrorMessage } from '../utils/errorState'

export type CompanyFormState = {
  tags: string[]
  profile: string
  category: string
  status: string
  ownerIds: string[]
}

type RefetchCompany = (
  overrideInit?: RequestInit,
  options?: { ignoreCache?: boolean }
) => Promise<{ company: Company } | null>

type UseCompanyOverviewFormOptions = {
  company: Company | null
  companyId?: string
  networkErrorMessage: string
  onCompanyUpdated: (company: Company) => void
  refetchCompany: RefetchCompany
  showToast: (message: string, variant: ToastState['variant']) => void
}

const EMPTY_FORM: CompanyFormState = {
  tags: [],
  profile: '',
  category: '',
  status: '',
  ownerIds: [],
}

export const useCompanyOverviewForm = ({
  company,
  companyId,
  networkErrorMessage,
  onCompanyUpdated,
  refetchCompany,
  showToast,
}: UseCompanyOverviewFormOptions) => {
  const [companyForm, setCompanyForm] = useState<CompanyFormState>(EMPTY_FORM)
  const [tagInput, setTagInput] = useState('')
  const [companyError, setCompanyError] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const { mutate: updateCompany, isLoading: isUpdatingCompany } = useMutation<
    { company: Company },
    {
      tags?: string[]
      profile?: string | null
      category?: string | null
      status?: string
      ownerIds?: string[]
    }
  >(companyId ? apiRoutes.companies.detail(companyId) : '', 'PATCH')

  const resetCompanyForm = useCallback(
    (source?: Company | null) => {
      const nextCompany = source ?? company
      if (!nextCompany) return
      setCompanyForm({
        tags: nextCompany.tags ?? [],
        profile: nextCompany.profile || '',
        category: nextCompany.category || '',
        status: nextCompany.status || '',
        ownerIds: nextCompany.ownerIds ?? [],
      })
      setTagInput('')
    },
    [company]
  )

  useEffect(() => {
    if (!company || isEditing) return
    resetCompanyForm(company)
  }, [company, isEditing, resetCompanyForm])

  const handleUpdateCompany = useCallback(async () => {
    setCompanyError('')
    if (!companyId) return

    try {
      const data = await updateCompany(
        {
          tags: companyForm.tags,
          profile: companyForm.profile.trim() || null,
          category: companyForm.category.trim() || null,
          status: companyForm.status.trim() || undefined,
          ownerIds: companyForm.ownerIds,
        },
        { errorMessage: networkErrorMessage }
      )

      if (data?.company) {
        onCompanyUpdated(data.company)
        resetCompanyForm(data.company)
      } else {
        void refetchCompany(undefined, { ignoreCache: true })
      }

      setIsEditing(false)
      showToast('企業情報を更新しました', 'success')
    } catch (err) {
      setCompanyError(toErrorMessage(err, networkErrorMessage))
    }
  }, [
    companyForm.category,
    companyForm.ownerIds,
    companyForm.profile,
    companyForm.status,
    companyForm.tags,
    companyId,
    networkErrorMessage,
    onCompanyUpdated,
    refetchCompany,
    resetCompanyForm,
    showToast,
    updateCompany,
  ])

  const startEdit = useCallback(() => {
    resetCompanyForm()
    setIsEditing(true)
  }, [resetCompanyForm])

  const cancelEdit = useCallback(() => {
    resetCompanyForm()
    setIsEditing(false)
    setCompanyError('')
  }, [resetCompanyForm])

  return {
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
  }
}
