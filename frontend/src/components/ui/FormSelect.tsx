import { forwardRef, useId } from 'react'
import { cn } from '../../lib/cn'

type FormSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  hint?: string
  error?: string
  containerClassName?: string
  noContainer?: boolean
}

const BASE_CLASS =
  'w-full rounded-xl border border-notion-border bg-notion-bg px-3 py-2 text-sm text-notion-text hover:border-notion-border focus-visible:border-notion-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/30 disabled:cursor-not-allowed disabled:bg-notion-bg-secondary disabled:text-notion-text-tertiary'

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  (
    {
      label,
      hint,
      error,
      className,
      containerClassName,
      id,
      noContainer,
      children,
      'aria-label': ariaLabelProp,
      'aria-describedby': ariaDescribedByProp,
      'aria-invalid': ariaInvalidProp,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const shouldHaveId = Boolean(label || error || ariaDescribedByProp)
    const selectId = id ?? (shouldHaveId ? generatedId : undefined)
    const errorId = error && selectId ? `${selectId}-error` : undefined
    const selectClassName = cn(
      BASE_CLASS,
      error && 'border-rose-300 focus-visible:border-rose-500 focus-visible:ring-rose-500/30',
      className
    )
    const ariaLabel = ariaLabelProp ?? (label ? undefined : '選択してください')
    const describedBy = [ariaDescribedByProp, errorId].filter(Boolean).join(' ') || undefined
    const ariaInvalid = ariaInvalidProp ?? Boolean(error)

    if (noContainer) {
      return (
        <select
          ref={ref}
          id={selectId}
          className={selectClassName}
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalid}
          {...props}
        >
          {children}
        </select>
      )
    }

    return (
      <div className={containerClassName}>
        {label && (
          <label htmlFor={selectId} className="mb-1 block text-xs font-medium text-notion-text-secondary">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={selectClassName}
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalid}
          {...props}
        >
          {children}
        </select>
        {error ? <p id={errorId} className="mt-1 text-xs text-rose-600">{error}</p> : null}
        {hint && <p className="mt-1 text-xs text-notion-text-tertiary">{hint}</p>}
      </div>
    )
  }
)

FormSelect.displayName = 'FormSelect'

export default FormSelect

