import { useEffect, useRef, useState } from 'react'
import { type Location, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { toErrorMessage } from '../utils/errorState'

function Login() {
  const emailInputRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location } | null)?.from

  useEffect(() => {
    emailInputRef.current?.focus()
  }, [])

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

  const clearErrorIfNeeded = () => {
    if (error) {
      setError('')
    }
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      await login(email.trim(), password)
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
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto flex min-h-dvh w-full max-w-5xl items-center px-6 py-12">
        <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,_1fr)_280px]">
          <div>
            <div className="mb-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                CW Management System
              </p>
              <h1 className="mt-3 text-xl font-semibold text-slate-900">ログイン</h1>
              <p className="mt-2 text-sm text-slate-600">
                メールアドレスとパスワードを入力してください。
              </p>
            </div>

            <div className="w-full max-w-md border border-slate-200 bg-white p-7 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              <form className="space-y-4" onSubmit={handleSubmit}>
                {error && (
                  <div
                    className="flex items-center gap-2 border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700"
                    role="alert"
                    aria-live="polite"
                  >
                    <svg
                      className="size-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {error}
                  </div>
                )}

                <div className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-xs font-semibold text-slate-700"
                    >
                      メールアドレス
                    </label>
                    <input
                      ref={emailInputRef}
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="w-full border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus-visible:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/20"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => {
                        clearErrorIfNeeded()
                        setEmail(event.target.value)
                      }}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-1.5 block text-xs font-semibold text-slate-700"
                    >
                      パスワード
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        className="w-full border border-slate-300 bg-white px-3.5 py-2.5 pr-20 text-sm text-slate-900 placeholder-slate-400 focus-visible:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/20"
                        placeholder="••••••••"
                        value={password}
                        onChange={(event) => {
                          clearErrorIfNeeded()
                          setPassword(event.target.value)
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/30"
                        aria-label={showPassword ? '入力内容を隠す' : '入力内容を表示'}
                      >
                        {showPassword ? '隠す' : '表示'}
                      </button>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  isLoading={isLoading}
                  loadingLabel="ログイン中…"
                  className="mt-2 w-full"
                >
                  ログイン
                </Button>
              </form>
            </div>

            <p className="mt-4 text-[11px] text-slate-500">
              ※ システムにアクセスできない場合は管理者にお問い合わせください。
            </p>
          </div>

          <aside className="border border-slate-200 bg-white p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  お知らせ
                </p>
                <ul className="mt-3 space-y-2 text-xs text-slate-700">
                  <li>・新しい機能を段階的に公開中です。</li>
                  <li>・不具合フィードバックはログイン後に左下からお願いします。</li>
                </ul>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  開発者
                </p>
                <p className="mt-3 text-xs text-slate-700">加藤</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  システム情報
                </p>
                <div className="mt-3 space-y-2 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>環境</span>
                    <span className="text-slate-500">Render</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>更新内容</span>
                    <span className="text-right text-slate-500">タスク担当者表示の修正</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>更新日時</span>
                    <span className="text-slate-500">2026-02-03 15:23</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>バージョン</span>
                    <span className="text-slate-500">v1.4.1</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}

export default Login
