import { useState } from 'react'
import { type Location, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { toErrorMessage } from '../utils/errorState'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location } | null)?.from

  const formatLoginError = (err: unknown) => {
    const message = toErrorMessage(err, 'ログインに失敗しました')
    const normalized = message.toLowerCase()
    if (
      normalized.includes('invalid') ||
      normalized.includes('unauthorized') ||
      normalized.includes('認証') ||
      normalized.includes('資格') ||
      normalized.includes('password')
    ) {
      return 'メールアドレスまたはパスワードが正しくありません。'
    }
    return message
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email, password)
      const nextPath = from?.pathname
        ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
        : '/'
      navigate(nextPath)
    } catch (err) {
      setError(formatLoginError(err))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border border-slate-700/40" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 size-80 rounded-full border border-slate-700/30" aria-hidden="true" />
      <div className="pointer-events-none absolute left-1/2 top-24 h-40 w-72 -translate-x-1/2 rounded-full border border-slate-800/40" aria-hidden="true" />
      <div className="relative mx-4 w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-xs font-semibold text-slate-400">CW管理システム</p>
          <h1 className="mt-2 text-2xl font-semibold text-white">ログイン</h1>
          <p className="mt-2 text-sm text-slate-400">アカウント情報を入力してください。</p>
        </div>

        <div className="rounded-2xl border border-slate-700/50 bg-slate-900/50 p-8 backdrop-blur">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div
                className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400"
                role="alert"
                aria-live="polite"
              >
                <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-300">
                  メールアドレス
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-white placeholder-slate-500 focus-visible:border-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-300">
                  パスワード
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-3 text-sm text-white placeholder-slate-500 focus-visible:border-sky-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              isLoading={isLoading}
              loadingLabel="ログイン中…"
              className="w-full focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              ログイン
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
