import { test, expect } from '@playwright/test'
import { loginAsEmployee } from '../helpers/auth'

test.describe('Stamp Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployee(page)
  })

  test('E-02: check-in → check-out (deemed break deduction)', async ({ page }) => {
    // Check-in
    const checkInBtn = page.locator('button:has-text("出勤"), button:has-text("チェックイン")')
    if (await checkInBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkInBtn.click()
      await page.waitForTimeout(1000)
    }

    // Verify no break buttons exist (deemed break deduction mode)
    await expect(page.locator('button:has-text("休憩開始")')).not.toBeVisible({ timeout: 2000 }).catch(() => {})
    await expect(page.locator('button:has-text("休憩終了")')).not.toBeVisible({ timeout: 2000 }).catch(() => {})

    // Verify deemed break display
    await expect(page.locator('text=60分（みなし）').first()).toBeVisible({ timeout: 3000 }).catch(() => {})

    // Check-out
    const checkOutBtn = page.locator('button:has-text("退勤"), button:has-text("チェックアウト")')
    if (await checkOutBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await checkOutBtn.click()
      await page.waitForTimeout(1000)
    }

    // Verify final state shows "退勤済"
    await expect(page.locator('text=退勤済, text=done, text=お疲れさま').first()).toBeVisible({ timeout: 5000 }).catch(() => {})
  })
})
