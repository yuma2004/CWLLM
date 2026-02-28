import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { resetBackendState, resetMockMode } from './helpers/testControl'

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@example.com'
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123'
const employeeEmail = process.env.E2E_EMPLOYEE_EMAIL || 'employee@example.com'
const employeePassword = process.env.E2E_EMPLOYEE_PASSWORD || 'password123'

test.describe('認証と主要導線', () => {
  test.beforeEach(async () => {
    await resetBackendState()
    await resetMockMode()
  })

  test.afterEach(async () => {
    await resetMockMode()
  })

  test('管理者でログインしてトップ画面へ遷移できる', async ({ page }) => {
    await loginAs(page, adminEmail, adminPassword)
    await expect(page.getByRole('link', { name: '企業一覧', exact: true })).toBeVisible()
  })

  test('管理者ログイン後に主要ナビゲーションへ遷移できる', async ({ page }) => {
    await loginAs(page, adminEmail, adminPassword)

    await page.getByRole('link', { name: '企業一覧', exact: true }).click()
    await expect(page).toHaveURL(/\/companies(\?.*)?$/)

    await page.getByRole('link', { name: /^タスク一覧$/ }).click()
    await expect(page).toHaveURL(/\/tasks(\?.*)?$/)
  })

  test('一般ユーザーはChatwork設定にアクセスできない', async ({ page }) => {
    await loginAs(page, employeeEmail, employeePassword)
    await page.goto('/settings/chatwork')

    await expect(page.getByText('アクセス権限がありません')).toBeVisible()
    await expect(page.getByTestId('chatwork-room-sync')).toHaveCount(0)
  })
})
