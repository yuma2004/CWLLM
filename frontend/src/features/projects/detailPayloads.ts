export type ProjectUpdateFormState = {
  name: string
  status: string
  unitPrice: string
  conditions: string
  periodStart: string
  periodEnd: string
  ownerId: string
}

export type WholesaleCreateFormState = {
  companyId: string
  status: string
  unitPrice: string
  conditions: string
  agreedDate: string
}

export type WholesaleEditFormState = {
  status: string
  unitPrice: string
  conditions: string
  agreedDate: string
}

export const validateProjectUpdateForm = (form: ProjectUpdateFormState) => {
  if (!form.name.trim()) {
    return 'missing-name' as const
  }
  return null
}

export const buildProjectUpdatePayload = (form: ProjectUpdateFormState) => ({
  name: form.name.trim(),
  status: form.status || undefined,
  unitPrice: form.unitPrice ? Number(form.unitPrice) : null,
  conditions: form.conditions.trim() || null,
  periodStart: form.periodStart || null,
  periodEnd: form.periodEnd || null,
  ownerId: form.ownerId || null,
})

export const buildWholesaleCreatePayload = (
  projectId: string,
  form: WholesaleCreateFormState
) => ({
  projectId,
  companyId: form.companyId,
  status: form.status,
  unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : undefined,
  conditions: form.conditions || undefined,
  agreedDate: form.agreedDate || undefined,
})

export const buildWholesaleUpdatePayload = (form: WholesaleEditFormState) => ({
  status: form.status,
  unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : null,
  conditions: form.conditions || null,
  agreedDate: form.agreedDate || null,
})
