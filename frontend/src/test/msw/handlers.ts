import { http, HttpResponse } from 'msw'
import { createUser } from './factory'

type LoginRequestBody = {
  email?: string
}

const isLoginRequestBody = (value: unknown): value is LoginRequestBody =>
  typeof value === 'object' &&
  value !== null &&
  (Reflect.get(value, 'email') === undefined || typeof Reflect.get(value, 'email') === 'string')

export const handlers = [
  http.get('/api/auth/me', () => {
    return HttpResponse.json({ user: createUser() })
  }),
  http.post('/api/auth/login', async ({ request }) => {
    const rawBody = await request.json().catch(() => null)
    const requestBody = isLoginRequestBody(rawBody) ? rawBody : {}
    const email = requestBody.email?.trim() || 'admin@example.com'
    return HttpResponse.json({
      token: 'test-token',
      user: createUser({ email }),
    })
  }),
  http.post('/api/auth/logout', () => {
    return HttpResponse.json({})
  }),
]
