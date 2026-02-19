import { ReactNode } from 'react'

type FormFieldWrapperProps = {
  label?: string
  fieldId?: string
  error?: string
  errorId?: string
  hint?: string
  containerClassName?: string
  noContainer?: boolean
  children: ReactNode
}

export function FormFieldWrapper({
  label,
  fieldId,
  error,
  errorId,
  hint,
  containerClassName,
  noContainer,
  children,
}: FormFieldWrapperProps) {
  if (noContainer) {
    return <>{children}</>
  }

  return (
    <div className={containerClassName}>
      {label ? (
        <label htmlFor={fieldId} className="mb-1 block text-xs font-medium text-notion-text-secondary">
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p id={errorId} className="mt-1 text-xs text-rose-600">{error}</p> : null}
      {hint ? <p className="mt-1 text-xs text-notion-text-tertiary">{hint}</p> : null}
    </div>
  )
}
