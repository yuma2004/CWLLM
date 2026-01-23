import { forwardRef, useId } from 'react'
import { cn } from '../../lib/cn'

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
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
      className,
      containerClassName,
      id,
      noContainer,
      placeholder,
      'aria-label': ariaLabelProp,
      ...props
    },
    ref
  ) => {
    const generatedId = useId()
    const inputClassName = cn(BASE_CLASS, className)
    const inputId = id ?? (label ? generatedId : undefined)
    const ariaLabel = ariaLabelProp ?? (label ? undefined : placeholder)

    if (noContainer) {
      return (
        <input
          ref={ref}
          id={inputId}
          className={inputClassName}
          placeholder={placeholder}
          aria-label={ariaLabel}
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
          {...props}
        />
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
    )
  }
)

FormInput.displayName = 'FormInput'

export default FormInput
