import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

type ActiveFiltersProps = {
  isActive: boolean
  children: ReactNode
  className?: string
}

const ActiveFilters = ({
  isActive,
  children,
  className,
}: ActiveFiltersProps) => {
  if (!isActive) return null

  return (
    <div
      className={cn('mt-4 flex flex-wrap items-center gap-2', className)}
    >
      {children}
    </div>
  )
}

export default ActiveFilters
