import { SummaryType } from '@prisma/client'

export interface DraftBody {
  periodStart: string
  periodEnd: string
}

export interface SummaryCreateBody {
  content: string
  type?: SummaryType
  periodStart: string
  periodEnd: string
  sourceLinks?: string[]
  model?: string
  promptVersion?: string
  sourceMessageCount?: number
  tokenUsage?: unknown
  draftId?: string
}
