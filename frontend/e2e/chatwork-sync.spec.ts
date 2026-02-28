import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { resetBackendState, resetMockMode, setMockMode } from './helpers/testControl'

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@example.com'
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123'

test.describe('Chatwork同期', () => {
  test.beforeEach(async () => {
    await resetBackendState()
    await resetMockMode()
  })

  test.afterEach(async () => {
    await resetMockMode()
  })

  test('外部APIから同期したChatworkルームを一覧表示できる', async ({ page }) => {
    await loginAs(page, adminEmail, adminPassword)
    await page.getByRole('link', { name: 'Chatwork設定' }).click()
    await page.waitForURL('**/settings/chatwork')

    await page.getByTestId('chatwork-room-sync').click()

    const roomItems = page.getByTestId('chatwork-room-item')
    const jobCard = page.locator('div', { hasText: 'ジョブ: chatwork_rooms_sync' }).first()
    await expect(roomItems.first()).toBeVisible({ timeout: 20_000 })
    await expect(jobCard.getByText('完了', { exact: true })).toBeVisible({ timeout: 20_000 })
  })

  test('Chatwork API障害時に同期ジョブ失敗とエラー表示を確認できる', async ({ page }) => {
    await setMockMode({ roomsShouldFail: true })
    await loginAs(page, adminEmail, adminPassword)
    await page.getByRole('link', { name: 'Chatwork設定' }).click()
    await page.waitForURL('**/settings/chatwork')

    await page.getByTestId('chatwork-room-sync').click()

    const jobCard = page.locator('div', { hasText: 'ジョブ: chatwork_rooms_sync' }).first()
    await expect(jobCard.getByText('失敗', { exact: true })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Chatwork API error: 500')).toBeVisible({ timeout: 20_000 })
  })
})
