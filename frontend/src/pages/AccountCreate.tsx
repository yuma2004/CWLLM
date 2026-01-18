import { useState } from 'react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ErrorAlert from '../components/ui/ErrorAlert'
import FormInput from '../components/ui/FormInput'
import FormSelect from '../components/ui/FormSelect'
import SuccessAlert from '../components/ui/SuccessAlert'
import { useMutation } from '../hooks/useApi'
import { apiRoutes } from '../lib/apiRoutes'
import { toErrorMessage } from '../utils/errorState'

type CreateUserPayload = {
  email: string
  password: string
  role: string
}

const ROLE_OPTIONS = [
  { value: 'admin', label: '管理者' },
  { value: 'sales', label: '営業' },
  { value: 'ops', label: 'オペレーション' },
  { value: 'readonly', label: '閲覧のみ' },
] as const

function AccountCreate() {
  const [form, setForm] = useState({ email: '', password: '', role: 'readonly' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { mutate: createUser, isLoading } = useMutation<{ user: { id: string } }, CreateUserPayload>(
    apiRoutes.users.create(),
    'POST'
  )

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!form.email.trim()) {
      setError('メールアドレスを入力してください')
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

    try {
      await createUser(
        {
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        },
        { errorMessage: 'アカウントの作成に失敗しました' }
      )
      setSuccess('アカウントを作成しました')
      setForm((prev) => ({ ...prev, email: '', password: '' }))
    } catch (err) {
      setError(toErrorMessage(err, 'アカウントの作成に失敗しました'))
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase text-slate-400">Accounts</p>
        <h2 className="text-3xl font-bold text-slate-900">アカウント作成</h2>
        <p className="mt-1 text-sm text-slate-500">
          管理者が新しいユーザーアカウントを追加できます。
        </p>
      </div>

      <Card className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              label="メールアドレス"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="user@example.com"
              disabled={isLoading}
            />
            <FormInput
              label="パスワード"
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="8文字以上"
              hint="8文字以上で入力してください"
              disabled={isLoading}
            />
          </div>
          <FormSelect
            label="権限"
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            disabled={isLoading}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </FormSelect>

          {error && <ErrorAlert message={error} onClose={() => setError('')} />}
          {success && <SuccessAlert message={success} />}

          <div className="flex justify-end">
            <Button type="submit" isLoading={isLoading} loadingLabel="作成中...">
              アカウントを作成
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default AccountCreate
