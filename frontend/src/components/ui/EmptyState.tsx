import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type EmptyStateProps = {
  message: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
  className?: string
} & Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className'>

const EmptyState = ({
  message,
  description,
  icon,
  action,
  className,
  ...rest
}: EmptyStateProps) => {
  return (
    <div
      {...rest}
      className={cn(
        'flex flex-col items-center gap-2 text-center text-notion-text-secondary',
        className
      )}
    >
      {icon}
      <p className="text-sm font-medium text-notion-text">{message}</p>
      {description && <p className="text-xs text-notion-text-tertiary">{description}</p>}
      {action}
    </div>
  )
}

export default EmptyState
