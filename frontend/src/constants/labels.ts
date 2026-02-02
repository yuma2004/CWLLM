// タスクステータス
export const TASK_STATUS_OPTIONS = ['todo', 'in_progress', 'done', 'cancelled'] as const
export type TaskStatus = (typeof TASK_STATUS_OPTIONS)[number]

export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: '未対応',
  in_progress: '対応中',
  done: '完了',
  cancelled: 'キャンセル',
}

// 案件ステータス
export const PROJECT_STATUS_OPTIONS = ['active', 'paused', 'closed'] as const
export type ProjectStatus = (typeof PROJECT_STATUS_OPTIONS)[number]

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  active: '進行中',
  paused: '一時停止',
  closed: '終了',
}

// 卸ステータス
export const WHOLESALE_STATUS_OPTIONS = ['active', 'paused', 'closed'] as const
export type WholesaleStatus = (typeof WHOLESALE_STATUS_OPTIONS)[number]

export const WHOLESALE_STATUS_LABELS: Record<string, string> = {
  active: '稼働中',
  paused: '一時停止',
  closed: '終了',
}

// ターゲットタイプ
export const TARGET_TYPE_OPTIONS = ['company', 'project', 'wholesale', 'general'] as const
export type TargetType = (typeof TARGET_TYPE_OPTIONS)[number]

export const TARGET_TYPE_LABELS: Record<string, string> = {
  company: '会社',
  project: '案件',
  wholesale: '卸',
  general: '未紐づけ',
}

// 会社カテゴリ（標準候補）
export const COMPANY_CATEGORY_DEFAULT_OPTIONS = ['商社', 'メディア', '他社ASP', 'その他'] as const

// 会社ステータス（標準候補）
export const COMPANY_STATUS_DEFAULT_OPTIONS = ['新規', '進行中', '保留', '解約', 'active'] as const
export const COMPANY_STATUS_LABELS: Record<string, string> = {
  新規: '新規',
  進行中: '進行中',
  保留: '保留',
  解約: '解約',
  active: 'active',
}

// ステータスラベル
export type StatusKind = 'task' | 'project' | 'wholesale' | 'company'

const labelFrom = (labels: Record<string, string>, value?: string, fallback = '') =>
  labels[value ?? ''] ?? (value ?? fallback)

const STATUS_LABELS: Record<StatusKind, Record<string, string>> = {
  task: TASK_STATUS_LABELS,
  project: PROJECT_STATUS_LABELS,
  wholesale: WHOLESALE_STATUS_LABELS,
  company: COMPANY_STATUS_LABELS,
}

export const statusLabel = (kind: StatusKind, value?: string, fallback = '') =>
  labelFrom(STATUS_LABELS[kind], value, fallback)

export const targetTypeLabel = (value?: string, fallback = '') =>
  labelFrom(TARGET_TYPE_LABELS, value, fallback)