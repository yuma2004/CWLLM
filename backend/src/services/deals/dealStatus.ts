import { DealStatus } from '@prisma/client'

const DEAL_STATUS_TRANSITIONS: Record<DealStatus, ReadonlySet<DealStatus>> = {
  pre_contact: new Set(['contacting', 'dropped']),
  contacting: new Set(['negotiating', 'dropped', 'stopped']),
  negotiating: new Set(['agreed', 'dropped', 'stopped']),
  agreed: new Set(['preparing_publish', 'stopped']),
  preparing_publish: new Set(['publishing', 'stopped']),
  publishing: new Set(['stopped']),
  stopped: new Set(),
  dropped: new Set(),
}

export const canTransitionDealStatus = (
  from: DealStatus,
  to: DealStatus
): boolean => {
  if (from === to) return true
  return DEAL_STATUS_TRANSITIONS[from].has(to)
}

export const dealStatusLabel = (status: DealStatus): string => {
  if (status === 'pre_contact') return '打診前'
  if (status === 'contacting') return '打診中'
  if (status === 'negotiating') return '交渉中'
  if (status === 'agreed') return '合意'
  if (status === 'preparing_publish') return '掲載準備中'
  if (status === 'publishing') return '掲載中'
  if (status === 'stopped') return '停止・終了'
  return '見送り'
}
