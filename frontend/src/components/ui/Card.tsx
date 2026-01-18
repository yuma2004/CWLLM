import { cn } from '../../lib/cn'

type CardProps = {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}

const Card = ({ title, description, children, className }: CardProps) => (
  <div
    className={cn('rounded-xl border border-slate-200 bg-white p-5 shadow-sm', className)}
  >
    {(title || description) && (
      <div className="mb-3 space-y-1">
        {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
    )}
    {children}
  </div>
)

export default Card
