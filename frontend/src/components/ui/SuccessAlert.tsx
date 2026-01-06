import type { ReactNode } from 'react'
import Alert from './Alert'

type SuccessAlertProps = {
  message?: string
  onClose?: () => void
  className?: string
  children?: ReactNode
}

const SuccessAlert = (props: SuccessAlertProps) => <Alert {...props} variant="success" />

export default SuccessAlert
