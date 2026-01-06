type BadgeVariant = 'default' | 'info' | 'success' | 'warning'

type BadgeProps = {
  label: string
  variant?: BadgeVariant
  className?: string
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-600',
  info: 'bg-sky-50 text-sky-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
}

const Badge = ({ label, variant = 'default', className }: BadgeProps) => (
  <span
    className={[
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
      VARIANT_CLASSES[variant],
      className,
    ]
      .filter(Boolean)
      .join(' ')}
  >
    {label}
  </span>
)

export default Badge
