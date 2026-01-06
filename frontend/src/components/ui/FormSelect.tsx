import { forwardRef } from 'react'

type FormSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  hint?: string
  containerClassName?: string
}

const BASE_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400'

const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, hint, className, containerClassName, id, children, ...props }, ref) => {
    const selectClassName = [BASE_CLASS, className].filter(Boolean).join(' ')
    const selectId = id ?? (label ? `form-select-${label}` : undefined)

    return (
      <div className={containerClassName}>
        {label && (
          <label htmlFor={selectId} className="mb-1 block text-xs font-medium text-slate-600">
            {label}
          </label>
        )}
        <select ref={ref} id={selectId} className={selectClassName} {...props}>
          {children}
        </select>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
    )
  }
)

FormSelect.displayName = 'FormSelect'

export default FormSelect
