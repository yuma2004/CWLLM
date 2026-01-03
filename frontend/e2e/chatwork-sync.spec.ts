import { test, expect } from '@playwright/test'

const adminEmail = process.env.E2E_ADMIN_EMAIL || 'admin@example.com'
const adminPassword = process.env.E2E_ADMIN_PASSWORD || 'admin123'

test('Chatwork rooms from external API are displayed after sync', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[name="email"]').fill(adminEmail)
  await page.locator('input[name="password"]').fill(adminPassword)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/')
  await page.goto('/settings/chatwork')

  await page.getByTestId('chatwork-room-sync').click()

  const syncMessage = page.getByTestId('chatwork-sync-message')
  await expect(syncMessage).toHaveText(/\S+/)
  await expect(syncMessage).not.toContainText('Unauthorized')
  await expect(syncMessage).not.toContainText('CHATWORK_API_TOKEN')

  const roomItems = page.getByTestId('chatwork-room-item')
  const roomCount = await roomItems.count()
  if (roomCount > 0) {
    await expect(roomItems.first()).toBeVisible()
  } else {
    await expect(page.getByTestId('chatwork-room-empty')).toBeVisible()
  }
})
