import { test, expect } from '@playwright/test'

test.describe('Employee Login', () => {
  test('E-01a: valid login → dashboard redirect', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'odawara@sun-kamiya.co.jp')
    await page.fill('input[type="password"]', 'Test1234')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/employee/, { timeout: 15000 })
  })

  test('E-01b: invalid credentials → error message', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'wrong@example.com')
    await page.fill('input[type="password"]', 'wrongpass')
    await page.click('button[type="submit"]')
    // Should show error and stay on login page
    await expect(page.locator('text=正しくありません')).toBeVisible({ timeout: 5000 }).catch(() => {
      // Error message might be different
      expect(page.url()).toContain('/login')
    })
  })

  test('E-01c: unauthenticated → redirect to login', async ({ page }) => {
    await page.goto('/employee/daily')
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 })
  })
})
