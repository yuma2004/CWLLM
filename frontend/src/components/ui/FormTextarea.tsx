import { forwardRef, useId } from 'react'
import { cn } from '../../lib/cn'

type FormTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  error?: string
  containerClassName?: string
  noContainer?: boolean
}

const BASE_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-notion-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-notion-accent/30'

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  (
    {
      label,
      hint,
      error,
      className,
      containerClassName,
      id,
      noContainer,
      placeholder,
      'aria-label': ariaLabelProp,
      'aria-describedby': ariaDescribedByProp,
      'aria-invalid': ariaInvalidProp,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const shouldHaveId = Boolean(label || error || ariaDescribedByProp)
    const textareaId = id ?? (shouldHaveId ? generatedId : undefined)
    const errorId = error && textareaId ? `${textareaId}-error` : undefined
    const textareaClassName = cn(
      BASE_CLASS,
      error && 'border-rose-300 focus-visible:border-rose-500 focus-visible:ring-rose-500/30',
      className
    )
    const ariaLabel = ariaLabelProp ?? (label ? undefined : placeholder)
    const describedBy = [ariaDescribedByProp, errorId].filter(Boolean).join(' ') || undefined
    const ariaInvalid = ariaInvalidProp ?? Boolean(error)

    if (noContainer) {
      return (
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClassName}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalid}
          {...props}
        />
      )
    }

    return (
      <div className={containerClassName}>
        {label && (
          <label htmlFor={textareaId} className="mb-1 block text-xs font-medium text-slate-600">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={textareaClassName}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-describedby={describedBy}
          aria-invalid={ariaInvalid}
          {...props}
        />
        {error ? <p id={errorId} className="mt-1 text-xs text-rose-600">{error}</p> : null}
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
    )
  }
)

FormTextarea.displayName = 'FormTextarea'

export default FormTextarea
