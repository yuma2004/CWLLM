export type ProjectCreatePayload = {
  companyId: string
  name: string
  status?: string
  unitPrice?: number
  conditions?: string
  periodStart?: string
  periodEnd?: string
  ownerId?: string
}

export type ProjectCreateFormState = {
  companyId: string
  name: string
  status: string
  unitPrice: string
  conditions: string
  periodStart: string
  periodEnd: string
  ownerId: string
}

export const validateProjectCreateForm = (form: ProjectCreateFormState) => {
  if (!form.companyId.trim() || !form.name.trim()) {
    return 'missing-company-or-name' as const
  }
  return null
}

export const buildProjectCreatePayload = (form: ProjectCreateFormState): ProjectCreatePayload => {
  const payload: ProjectCreatePayload = {
    companyId: form.companyId.trim(),
    name: form.name.trim(),
  }

  if (form.status) payload.status = form.status
  if (form.unitPrice) payload.unitPrice = Number(form.unitPrice)
  if (form.conditions.trim()) payload.conditions = form.conditions.trim()
  if (form.periodStart) payload.periodStart = form.periodStart
  if (form.periodEnd) payload.periodEnd = form.periodEnd
  if (form.ownerId) payload.ownerId = form.ownerId

  return payload
}
