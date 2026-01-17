import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

type LoadingStateProps = ComponentProps<'div'> & {
  message?: string
}

const LoadingState = ({ message = '読み込み中…', className, ...rest }: LoadingStateProps) => (
  <div className={cn('text-sm text-slate-500', className)} {...rest}>
    {message}
  </div>
)

export default LoadingState
