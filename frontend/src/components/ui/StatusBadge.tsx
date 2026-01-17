import {
  COMPANY_STATUS_DEFAULT_OPTIONS,
  PROJECT_STATUS_LABELS,
  TASK_STATUS_LABELS,
  WHOLESALE_STATUS_LABELS,
  statusLabel,
  type StatusKind,
} from '../../constants/labels'
import { cn } from '../../lib/cn'

interface StatusBadgeProps {
  status?: string
  size?: 'sm' | 'md'
  kind?: StatusKind
}

type StatusColors = { bg: string; text: string; dot: string }

const activeColors: StatusColors = {
  bg: 'bg-emerald-50',
  text: 'text-emerald-700',
  dot: 'bg-emerald-500',
}

const pendingColors: StatusColors = {
  bg: 'bg-amber-50',
  text: 'text-amber-700',
  dot: 'bg-amber-500',
}

const inactiveColors: StatusColors = {
  bg: 'bg-slate-100',
  text: 'text-slate-500',
  dot: 'bg-slate-400',
}

const todoColors: StatusColors = { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' }
const cancelledColors: StatusColors = { bg: 'bg-rose-50', text: 'text-rose-700', dot: 'bg-rose-500' }

const defaultColors: StatusColors = { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }

const taskStatusColors: Record<string, StatusColors> = {
  todo: todoColors,
  in_progress: pendingColors,
  done: inactiveColors,
  cancelled: cancelledColors,
}

const projectStatusColors: Record<string, StatusColors> = {
  active: activeColors,
  paused: pendingColors,
  closed: inactiveColors,
}

const wholesaleStatusColors: Record<string, StatusColors> = {
  active: activeColors,
  paused: pendingColors,
  closed: inactiveColors,
}

const companyStatusColors: Record<string, StatusColors> = {
  [COMPANY_STATUS_DEFAULT_OPTIONS[0]]: pendingColors,
  [COMPANY_STATUS_DEFAULT_OPTIONS[1]]: activeColors,
  [COMPANY_STATUS_DEFAULT_OPTIONS[2]]: pendingColors,
  [COMPANY_STATUS_DEFAULT_OPTIONS[3]]: inactiveColors,
  [COMPANY_STATUS_DEFAULT_OPTIONS[4]]: activeColors,
}

const labelColorsFor = (labels: Record<string, string>, colors: Record<string, StatusColors>) =>
  Object.fromEntries(Object.entries(labels).map(([key, label]) => [label, colors[key] ?? defaultColors]))

const statusColors: Record<string, StatusColors> = {
  ...taskStatusColors,
  ...projectStatusColors,
  ...wholesaleStatusColors,
  ...labelColorsFor(TASK_STATUS_LABELS, taskStatusColors),
  ...labelColorsFor(PROJECT_STATUS_LABELS, projectStatusColors),
  ...labelColorsFor(WHOLESALE_STATUS_LABELS, wholesaleStatusColors),
  ...companyStatusColors,
}

export default function StatusBadge({ status, size = 'md', kind }: StatusBadgeProps) {
  const normalizedStatus = status ?? ''
  const colors =
    statusColors[normalizedStatus] ||
    statusColors[normalizedStatus.toLowerCase()] ||
    defaultColors
  const label = kind ? statusLabel(kind, normalizedStatus) : normalizedStatus

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-xs'

  const dotSize = size === 'sm' ? 'size-1.5' : 'size-2'

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        colors.bg,
        colors.text,
        sizeClasses
      )}
    >
      <span className={cn(dotSize, 'rounded-full', colors.dot)} />
      {label}
    </span>
  )
}
