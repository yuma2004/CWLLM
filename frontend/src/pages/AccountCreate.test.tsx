import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import AccountCreate from './AccountCreate'
import { AuthProvider } from '../contexts/AuthContext'
import { clearAuthToken, setAuthToken } from '../lib/authToken'
import { server } from '../test/msw/server'
import { createUser } from '../test/msw/factory'

type CreateUserRequestBody = {
  email?: string
  name?: string
  password?: string
  role?: string
}

const toStringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const parseCreateUserRequestBody = async (request: Request): Promise<CreateUserRequestBody> => {
  const rawBody = await request.json().catch(() => null)
  if (typeof rawBody !== 'object' || rawBody === null) return {}
  return {
    email: toStringOrUndefined(Reflect.get(rawBody, 'email')),
    name: toStringOrUndefined(Reflect.get(rawBody, 'name')),
    password: toStringOrUndefined(Reflect.get(rawBody, 'password')),
    role: toStringOrUndefined(Reflect.get(rawBody, 'role')),
  }
}

const renderAccountCreatePage = () =>
  render(
    <MemoryRouter initialEntries={['/settings/accounts']}>
      <AuthProvider>
        <AccountCreate />
      </AuthProvider>
    </MemoryRouter>
  )

describe('アカウント作成ページ', () => {
  beforeEach(() => {
    setAuthToken('test-token')
  })

  afterEach(() => {
    clearAuthToken()
  })

  it('必要項目を入力して送信すると新しいアカウントが一覧に表示される', async () => {
    // Arrange
    const user = userEvent.setup()
    const users = [
      createUser({
        id: 'user-existing-1',
        email: 'existing@example.com',
        name: '既存ユーザー',
        role: 'employee',
      }),
    ]
    server.use(
      http.get('/api/users', () => HttpResponse.json({ users })),
      http.post('/api/users', async ({ request }) => {
        const requestBody = await parseCreateUserRequestBody(request)
        const createdUser = createUser({
          id: `user-${users.length + 1}`,
          email: requestBody.email ?? 'created@example.com',
          name: requestBody.name ?? '作成ユーザー',
          role: requestBody.role ?? 'employee',
        })
        users.push(createdUser)
        return HttpResponse.json({ user: { id: createdUser.id } }, { status: 201 })
      })
    )
    renderAccountCreatePage()

    // Act
    await screen.findByRole('heading', { name: 'アカウント作成' })
    await user.type(screen.getByLabelText('メールアドレス'), 'new-user@example.com')
    await user.type(screen.getByLabelText('氏名'), '新規 ユーザー')
    await user.type(screen.getByLabelText('パスワード'), 'Password123')
    await user.type(screen.getByLabelText('パスワード（確認）'), 'Password123')
    await user.selectOptions(screen.getByLabelText('権限'), 'employee')
    await user.click(screen.getByRole('button', { name: 'アカウントを作成' }))

    // Assert
    expect(await screen.findByText('アカウントを作成しました。')).toBeInTheDocument()
    expect(await screen.findByText('new-user@example.com')).toBeInTheDocument()
  })

  it('確認用パスワードが一致しない場合はエラーを表示する', async () => {
    // Arrange
    const user = userEvent.setup()
    server.use(
      http.get('/api/users', () => HttpResponse.json({ users: [] }))
    )
    renderAccountCreatePage()

    // Act
    await user.type(await screen.findByLabelText('メールアドレス'), 'new-user@example.com')
    await user.type(screen.getByLabelText('氏名'), '新規 ユーザー')
    await user.type(screen.getByLabelText('パスワード'), 'Password123')
    await user.type(screen.getByLabelText('パスワード（確認）'), 'Password999')
    await user.click(screen.getByRole('button', { name: 'アカウントを作成' }))

    // Assert
    expect(await screen.findByRole('alert')).toHaveTextContent('パスワードが一致しません。')
  })
})
