import { WholesaleStatus } from '@prisma/client'

export interface WholesaleCreateBody {
  projectId: string
  companyId: string
  conditions?: string
  unitPrice?: number
  margin?: number
  status?: WholesaleStatus
  agreedDate?: string
  ownerId?: string
}

export interface WholesaleUpdateBody {
  projectId?: string
  companyId?: string
  conditions?: string | null
  unitPrice?: number | null
  margin?: number | null
  status?: WholesaleStatus
  agreedDate?: string | null
  ownerId?: string | null
}

export interface WholesaleListQuery {
  projectId?: string
  companyId?: string
  status?: string
  page?: string
  pageSize?: string
}
