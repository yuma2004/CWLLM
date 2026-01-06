import { forwardRef } from 'react'

type FormTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  hint?: string
  containerClassName?: string
}

const BASE_CLASS =
  'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400'

const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, hint, className, containerClassName, id, ...props }, ref) => {
    const textareaClassName = [BASE_CLASS, className].filter(Boolean).join(' ')
    const textareaId = id ?? (label ? `form-textarea-${label}` : undefined)

    return (
      <div className={containerClassName}>
        {label && (
          <label htmlFor={textareaId} className="mb-1 block text-xs font-medium text-slate-600">
            {label}
          </label>
        )}
        <textarea ref={ref} id={textareaId} className={textareaClassName} {...props} />
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
    )
  }
)

FormTextarea.displayName = 'FormTextarea'

export default FormTextarea
