import { Page } from '@playwright/test'

export async function loginAsEmployee(page: Page) {
  // Navigate to login page and fill form
  await page.goto('/login')
  await page.fill('input[type="email"], input[name="email"]', 'odawara@sun-kamiya.co.jp')
  await page.fill('input[type="password"], input[name="password"]', 'Test1234')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/employee/**', { timeout: 15000 })
}

export async function loginAsAdmin(page: Page) {
  await page.goto('http://localhost:3001/login')
  await page.fill('input[type="email"], input[name="email"]', 'odawara@sun-kamiya.co.jp')
  await page.fill('input[type="password"], input[name="password"]', 'Test1234')
  await page.click('button[type="submit"]')
  await page.waitForURL('http://localhost:3001/**', { timeout: 15000 })
}
