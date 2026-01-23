import { forwardRef, useId } from 'react'
import { cn } from '../../lib/cn'

type FormSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  hint?: string
  containerClassName?: string
  noContainer?: boolean
}

const BASE_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm hover:border-slate-300 focus-visible:border-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30'

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      label,
      hint,
      className,
      containerClassName,
      id,
      noContainer,
      children,
      'aria-label': ariaLabelProp,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const selectClassName = cn(BASE_CLASS, className)
    const selectId = id ?? (label ? generatedId : undefined)
    const ariaLabel = ariaLabelProp ?? (label ? undefined : undefined)

    if (noContainer) {
      return (
        <select
          ref={ref}
          id={selectId}
          className={selectClassName}
          aria-label={ariaLabel}
          {...props}
        >
          {children}
        </select>
      )
    }

    return (
      <div className={containerClassName}>
        {label && (
          <label htmlFor={selectId} className="mb-1 block text-xs font-medium text-slate-600">
            {label}
          </label>
        )}
        <select ref={ref} id={selectId} className={selectClassName} aria-label={ariaLabel} {...props}>
          {children}
        </select>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
    )
  }
)

FormSelect.displayName = 'FormSelect'

export default FormSelect
