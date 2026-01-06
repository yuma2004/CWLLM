type LoadingStateProps = {
  message?: string
  className?: string
}

const LoadingState = ({ message = 'Loading...', className }: LoadingStateProps) => {
  return (
    <div className={['text-sm text-slate-500', className].filter(Boolean).join(' ')}>
      {message}
    </div>
  )
}

export default LoadingState
