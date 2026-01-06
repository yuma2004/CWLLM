import type { ReactNode } from 'react'

type EmptyStateProps = {
  message: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
}

const EmptyState = ({ message, description, icon, action, className }: EmptyStateProps) => {
  return (
    <div
      className={[
        'flex flex-col items-center gap-2 text-center text-slate-500',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon}
      <p className="text-sm font-medium text-slate-600">{message}</p>
      {description && <p className="text-xs text-slate-400">{description}</p>}
      {action}
    </div>
  )
}

export default EmptyState
