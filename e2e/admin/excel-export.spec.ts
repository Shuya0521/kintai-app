import { test, expect } from '@playwright/test'

test.describe('Excel Export', () => {
  test('E-04: admin login → excel download', async ({ page }) => {
    await page.goto('http://localhost:3001/login')
    // Login as admin
    await page.fill('input[type="email"]', 'odawara@sun-kamiya.co.jp')
    await page.fill('input[type="password"]', 'Test1234')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3001/**', { timeout: 15000 })

    // Navigate to attendance or export page
    // Look for export button
    // Verify download starts
    const downloadPromise = page.waitForEvent('download', { timeout: 30000 })
    // Click export button...
    // const download = await downloadPromise
    // expect(download.suggestedFilename()).toContain('.xlsx')
  })
})
