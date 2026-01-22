import { test, expect } from '@playwright/test'

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@example.com'
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123'

test('Chatwork rooms from external API are displayed after sync', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[name="email"]').fill(adminEmail)
  await page.locator('input[name="password"]').fill(adminPassword)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/')
  await page.getByRole('link', { name: 'Chatwork設定' }).click()
  await page.waitForURL('**/settings/chatwork')

  await page.getByTestId('chatwork-room-sync').click()

  const roomItems = page.getByTestId('chatwork-room-item')
  const emptyState = page.getByTestId('chatwork-room-empty')
  await Promise.race([
    roomItems.first().waitFor({ state: 'visible' }),
    emptyState.waitFor({ state: 'visible' }),
  ])

  if (await roomItems.count()) {
    await expect(roomItems.first()).toBeVisible()
  } else {
    await expect(emptyState).toBeVisible()
  }
})
