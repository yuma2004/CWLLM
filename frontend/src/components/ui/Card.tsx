import { cn } from '../../lib/cn'

type CardProps = {
  title?: string
  description?: string
  headerAction?: React.ReactNode
  children: React.ReactNode
  className?: string
}

const Card = ({ title, description, headerAction, children, className }: CardProps) => (
  <div
    className={cn('rounded-2xl border border-slate-200 bg-white p-5 shadow-sm', className)}
  >
    {(title || description) && (
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
          {description && <p className="text-pretty text-sm text-slate-500">{description}</p>}
        </div>
        {headerAction}
      </div>
    )}
    {children}
  </div>
)

export default Card
