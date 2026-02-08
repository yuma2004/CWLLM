import { isNonEmptyString, isNullableString } from '../../utils'

const validateOwnerIds = (ownerIds: unknown) => {
  if (ownerIds === undefined) return true
  if (!Array.isArray(ownerIds)) return false
  return ownerIds.every((id) => isNonEmptyString(id))
}

export const validateCompanyCreatePayload = (input: {
  name: unknown
  ownerIds?: unknown
  tags: string[] | null | undefined
}) => {
  if (!isNonEmptyString(input.name)) {
    return 'Name is required'
  }
  if (input.tags === null) {
    return 'Tags must be string array'
  }
  if (!validateOwnerIds(input.ownerIds)) {
    return 'Invalid ownerIds'
  }
  return null
}

export const validateCompanyUpdatePayload = (input: {
  name?: unknown
  category?: unknown
  profile?: unknown
  status?: unknown
  ownerIds?: unknown
  tags: string[] | null | undefined
}) => {
  if (input.name !== undefined && !isNonEmptyString(input.name)) {
    return 'Name is required'
  }
  if (!isNullableString(input.category) || !isNullableString(input.profile)) {
    return 'Invalid payload'
  }
  if (input.status !== undefined && !isNonEmptyString(input.status)) {
    return 'Status is required'
  }
  if (!validateOwnerIds(input.ownerIds)) {
    return 'Invalid ownerIds'
  }
  if (input.tags === null) {
    return 'Tags must be string array'
  }
  return null
}
