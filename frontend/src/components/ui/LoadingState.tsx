import type { ComponentProps } from 'react'

type LoadingStateProps = ComponentProps<'div'> & {
  message?: string
}

const LoadingState = ({ message = '読み込み中...', className, ...rest }: LoadingStateProps) => (
  <div
    className={['text-sm text-slate-500', className].filter(Boolean).join(' ')}
    {...rest}
  >
    {message}
  </div>
)

export default LoadingState
