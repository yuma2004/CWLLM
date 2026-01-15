import type { ReactNode } from 'react'

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
      className={['mt-4 flex flex-wrap items-center gap-2', className]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}

export default ActiveFilters
