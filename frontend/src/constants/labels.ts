// タスクステータス
export const TASK_STATUS_OPTIONS = ['todo', 'in_progress', 'done', 'cancelled'] as const
export type TaskStatus = (typeof TASK_STATUS_OPTIONS)[number]

export const TASK_STATUS_LABELS: Record<string, string> = {
  todo: '未対応',
  in_progress: '対応中',
  done: '完了',
  cancelled: 'キャンセル',
}

// 卸ステータス
export const WHOLESALE_STATUS_OPTIONS = ['active', 'paused', 'closed'] as const
export type WholesaleStatus = (typeof WHOLESALE_STATUS_OPTIONS)[number]

export const WHOLESALE_STATUS_LABELS: Record<string, string> = {
  active: '有効',
  paused: '停止中',
  closed: '終了',
}

// ターゲットタイプ
export const TARGET_TYPE_OPTIONS = ['company', 'project', 'wholesale'] as const
export type TargetType = (typeof TARGET_TYPE_OPTIONS)[number]

export const TARGET_TYPE_LABELS: Record<string, string> = {
  company: '企業',
  project: '案件',
  wholesale: '卸',
}

// 共通ラベル
export const COMMON_LABELS = {
  // アクション
  search: '検索',
  create: '作成',
  edit: '編集',
  delete: '削除',
  cancel: 'キャンセル',
  save: '保存',
  update: '更新',
  back: '戻る',
  detail: '詳細へ',
  close: '閉じる',

  // フィルター
  allStatuses: '全てのステータス',
  filterActive: '絞り込み中:',
  clearAll: 'すべてクリア',
  clearFilter: 'クリア',

  // 表示
  registeredCount: '登録数',
  displayCount: '表示件数',
  loading: '読み込み中...',
  noData: 'データがありません',

  // フォーム
  required: '必須',
  optional: '任意',

  // 権限
  noWriteAccess: '書き込み権限がありません',
} as const

// エラーメッセージ
export const ERROR_MESSAGES = {
  networkError: 'ネットワークエラー',
  loadFailed: '読み込みに失敗しました',
  createFailed: '作成に失敗しました',
  updateFailed: '更新に失敗しました',
  deleteFailed: '削除に失敗しました',
  requiredField: 'は必須です',
} as const

// ページタイトル
export const PAGE_TITLES = {
  tasks: 'マイタスク',
  wholesales: '卸管理',
  companies: '企業管理',
  projects: '案件管理',
} as const
