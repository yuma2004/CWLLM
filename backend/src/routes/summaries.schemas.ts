import { SummaryType } from '@prisma/client'

export interface SummaryCreateBody {
  content: string
  type?: SummaryType
  periodStart: string
  periodEnd: string
  sourceLinks?: string[]
}
