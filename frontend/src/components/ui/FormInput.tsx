import { forwardRef } from 'react'

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  hint?: string
  containerClassName?: string
}

const BASE_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400'

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, hint, className, containerClassName, id, ...props }, ref) => {
    const inputClassName = [BASE_CLASS, className].filter(Boolean).join(' ')
    const inputId = id ?? (label ? `form-input-${label}` : undefined)

    return (
      <div className={containerClassName}>
        {label && (
          <label htmlFor={inputId} className="mb-1 block text-xs font-medium text-slate-600">
            {label}
          </label>
        )}
        <input ref={ref} id={inputId} className={inputClassName} {...props} />
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
    )
  }
)

FormInput.displayName = 'FormInput'

export default FormInput
