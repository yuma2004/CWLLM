import { forwardRef, useId } from 'react'
import { cn } from '../../lib/cn'

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  error?: string
  containerClassName?: string
  noContainer?: boolean
}

const BASE_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 hover:border-slate-300 focus-visible:border-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/30'

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
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
    const inputId = id ?? (shouldHaveId ? generatedId : undefined)
    const errorId = error && inputId ? `${inputId}-error` : undefined
    const inputClassName = cn(
      BASE_CLASS,
      error && 'border-rose-300 focus-visible:border-rose-500 focus-visible:ring-rose-500/30',
      className
    )
    const ariaLabel = ariaLabelProp ?? (label ? undefined : placeholder)
    const describedBy = [ariaDescribedByProp, errorId].filter(Boolean).join(' ') || undefined
    const ariaInvalid = ariaInvalidProp ?? Boolean(error)

    if (noContainer) {
      return (
        <input
          ref={ref}
          id={inputId}
          className={inputClassName}
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
          <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-slate-600">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={inputClassName}
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

FormInput.displayName = 'FormInput'

export default FormInput
