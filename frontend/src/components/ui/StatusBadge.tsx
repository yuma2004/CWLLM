interface StatusBadgeProps {
  status: string
  size?: 'sm' | 'md'
}

const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
  // Active statuses
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  アクティブ: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  稼働中: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  有効: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },

  // Pending/In Progress statuses
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  検討中: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  進行中: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  paused: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  停止中: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  対応中: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },

  // Inactive/Done statuses
  inactive: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
  休眠: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
  完了: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
  done: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
  closed: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },
  終了: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' },

  // Lead/New statuses
  lead: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  見込み: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  新規: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  todo: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  未対応: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },

  // Cancelled/Error statuses
  cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  キャンセル: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
  中止: { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' },
}

const defaultColors = { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const colors = statusColors[status] || statusColors[status.toLowerCase()] || defaultColors

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-xs'

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${colors.bg} ${colors.text} ${sizeClasses}`}
    >
      <span className={`${dotSize} rounded-full ${colors.dot}`} />
      {status}
    </span>
  )
}
