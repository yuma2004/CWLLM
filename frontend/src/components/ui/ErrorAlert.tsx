import type { ReactNode } from 'react'
import Alert from './Alert'

type ErrorAlertProps = {
  message?: string
  onClose?: () => void
  className?: string
  children?: ReactNode
}

const ErrorAlert = (props: ErrorAlertProps) => <Alert {...props} variant="error" />

export default ErrorAlert
