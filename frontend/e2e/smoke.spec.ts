import { test, expect } from '@playwright/test'

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@example.com'
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123'

test('Login and basic navigation smoke test', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('メールアドレス').fill(adminEmail)
  await page.getByLabel('パスワード').fill(adminPassword)
  await page.getByRole('button', { name: 'ログイン' }).click()
  await page.waitForURL('**/')

  await page.getByRole('link', { name: '企業管理' }).click()
  await expect(page).toHaveURL('**/companies')

  await page.getByRole('link', { name: 'タスク管理' }).click()
  await expect(page).toHaveURL('**/tasks')
})
