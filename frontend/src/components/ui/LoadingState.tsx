type LoadingStateProps = {
  message?: string
  className?: string
}

const LoadingState = ({ message = '読み込み中...', className }: LoadingStateProps) => {
  return (
    <div className={['text-sm text-slate-500', className].filter(Boolean).join(' ')}>
      {message}
    </div>
  )
}

export default LoadingState
