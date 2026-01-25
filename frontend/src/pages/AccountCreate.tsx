import { useMemo, useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import EmptyState from '../components/ui/EmptyState'
import ErrorAlert from '../components/ui/ErrorAlert'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import { SkeletonTable } from '../components/ui/Skeleton'
import Toast from '../components/ui/Toast'
import { useFetch, useMutation } from '../hooks/useApi'
import { useToast } from '../hooks/useToast'
import { apiRoutes } from '../lib/apiRoutes'
import { formatDate } from '../utils/date'
import { toErrorMessage } from '../utils/errorState'
import type { User } from '../types'
import { useAuth } from '../contexts/AuthContext'

type CreateUserPayload = {
  email: string
  name: string
  password: string
  role: string
}

const ROLE_OPTIONS = [
  { value: 'admin', label: '管理者' },
  { value: 'employee', label: '一般社員' },
] as const

function AccountCreate() {
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'employee' })
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const { toast, showToast, clearToast } = useToast()
  const { user: currentUser } = useAuth()
  const {
    data: usersData,
    error: usersError,
    isLoading: isUsersLoading,
    refetch: refetchUsers,
  } = useFetch<{ users: User[] }>(apiRoutes.users.list())

  const { mutate: createUser, isLoading } = useMutation<{ user: { id: string } }, CreateUserPayload>(
    apiRoutes.users.create(),
    'POST'
  )

  const passwordChecks = {
    length: form.password.length >= 8,
    letter: /[a-zA-Z]/.test(form.password),
    number: /\d/.test(form.password),
  }
  const strengthScore = Object.values(passwordChecks).filter(Boolean).length
  const strengthLabel =
    strengthScore <= 1 ? '弱い' : strengthScore === 2 ? '普通' : '強い'
  const strengthClass =
    strengthScore <= 1
      ? 'text-rose-600'
      : strengthScore === 2
        ? 'text-amber-600'
        : 'text-emerald-600'
  const isPasswordMismatch = passwordConfirm.length > 0 && form.password !== passwordConfirm

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!form.email.trim()) {
      setError('メールアドレスを入力してください')
      return
    }
    if (!form.name.trim()) {
      setError('名前を入力してください')
      return
    }
    if (!form.password) {
      setError('パスワードを入力してください')
      return
    }
    if (form.password.length < 8) {
      setError('パスワードは8文字以上で入力してください')
      return
    }
    if (form.password !== passwordConfirm) {
      setError('パスワードが一致しません')
      return
    }

    try {
      await createUser(
        {
          email: form.email.trim(),
          name: form.name.trim(),
          password: form.password,
          role: form.role,
        },
        { errorMessage: 'アカウントの作成に失敗しました' }
      )
      showToast('アカウントを作成しました', 'success')
      setForm((prev) => ({ ...prev, email: '', name: '', password: '' }))
      setPasswordConfirm('')
      await refetchUsers(undefined, { ignoreCache: true })
    } catch (err) {
      setError(toErrorMessage(err, 'アカウントの作成に失敗しました'))
    }
  }

  const users = usersData?.users ?? []
  const mergedUsers = useMemo(() => {
    if (!currentUser) return users
    const exists = users.some(
      (userItem) => userItem.id === currentUser.id || userItem.email === currentUser.email
    )
    if (exists) return users
    return [
      {
        id: currentUser.id,
        email: currentUser.email,
        name: null,
        role: currentUser.role,
      },
      ...users,
    ]
  }, [currentUser, users])

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase text-slate-400">アカウント</p>
        <h2 className="text-3xl font-bold text-slate-900">アカウント作成</h2>
        <p className="mt-1 text-sm text-slate-500">
          管理者が新しいユーザーアカウントを追加できます。
        </p>
      </div>

      <Card className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              label="メールアドレス（必須）"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="user@example.com"
              disabled={isLoading}
              required
            />
            <FormInput
              label="名前（必須）"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="山田 太郎"
              disabled={isLoading}
              required
            />
            <FormInput
              label="パスワード（必須）"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="8文字以上"
              disabled={isLoading}
              required
            />
            <FormInput
              label="パスワード（確認）"
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              placeholder="もう一度入力"
              disabled={isLoading}
              required
            />
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <div className="flex items-center justify-between">
              <span>パスワード強度</span>
              <span className={strengthClass}>{strengthLabel}</span>
            </div>
            <div className="mt-2 grid gap-1 text-[11px]">
              <span className={passwordChecks.length ? 'text-emerald-600' : 'text-slate-500'}>
                8文字以上
              </span>
              <span className={passwordChecks.letter ? 'text-emerald-600' : 'text-slate-500'}>
                英字を含む
              </span>
              <span className={passwordChecks.number ? 'text-emerald-600' : 'text-slate-500'}>
                数字を含む
              </span>
              {isPasswordMismatch && (
                <span className="text-rose-600">確認用パスワードが一致していません</span>
              )}
            </div>
          </div>
          <FormSelect
            label="権限"
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            disabled={isLoading}
            hint="管理者は全機能、一般社員は設定以外の操作が可能です。"
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </FormSelect>

          {error && <ErrorAlert message={error} onClose={() => setError('')} />}

          <div className="flex justify-end">
            <Button type="submit" isLoading={isLoading} loadingLabel="作成中...">
              アカウントを作成
            </Button>
          </div>
        </form>
      </Card>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">登録済みアカウント</h3>
            <p className="text-xs text-slate-500">作成済みのアカウントを確認できます。</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void refetchUsers(undefined, { ignoreCache: true })}
            disabled={isUsersLoading}
          >
            更新
          </Button>
        </div>
        {usersError && <ErrorAlert message={usersError} />}
        {isUsersLoading ? (
          <SkeletonTable rows={4} columns={4} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-notion-border bg-notion-bg shadow-sm">
            <table className="min-w-full divide-y divide-notion-border text-sm text-notion-text-secondary">
              <thead className="bg-notion-bg-secondary text-left text-xs font-semibold uppercase whitespace-nowrap text-notion-text-tertiary">
                <tr>
                  <th className="px-4 py-3">メールアドレス</th>
                  <th className="px-4 py-3">名前</th>
                  <th className="px-4 py-3">権限</th>
                  <th className="px-4 py-3">作成日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-notion-border bg-notion-bg">
                {mergedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center">
                      <EmptyState
                        message="アカウントがまだありません"
                        description="作成するとここに一覧が表示されます。"
                      />
                    </td>
                  </tr>
                ) : (
                  mergedUsers.map((user) => {
                    const isCurrentUser =
                      currentUser &&
                      (user.id === currentUser.id || user.email === currentUser.email)
                    return (
                      <tr key={user.id} className="hover:bg-notion-bg-hover">
                        <td className="px-4 py-3 font-medium text-notion-text">
                          <div className="flex flex-wrap items-center gap-2">
                            <span>{user.email}</span>
                            {isCurrentUser && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                ログイン中
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">{user.name || '-'}</td>
                        <td className="px-4 py-3">
                          {user.role === 'admin' ? '管理者' : '一般社員'}
                        </td>
                        <td className="px-4 py-3 text-notion-text-tertiary">
                          {formatDate(user.createdAt)}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant === 'error' ? 'error' : toast.variant === 'success' ? 'success' : 'info'}
          onClose={clearToast}
          className="fixed bottom-6 right-6 z-50 safe-area-bottom"
        />
      )}
    </div>
  )
}

export default AccountCreate
