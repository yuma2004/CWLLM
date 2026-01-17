import { cn } from '../../lib/cn'

type FilterBadgeProps = {
  label: string
  onRemove: () => void
  className?: string
}

const FilterBadge = ({ label, onRemove, className }: FilterBadgeProps) => {
  return (
    <button
      type="button"
      onClick={onRemove}
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200',
        className
      )}
    >
      {label}
      <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

export default FilterBadge
