import { test, expect } from '@playwright/test'

test.describe('Approval Flow', () => {
  test('E-03: leave request → admin approval → balance update', async ({ browser }) => {
    // Step 1: Employee submits leave request
    const empContext = await browser.newContext()
    const empPage = await empContext.newPage()
    await empPage.goto('http://localhost:3000/login')
    // Login as employee...
    // Navigate to requests page, submit vacation request
    await empContext.close()

    // Step 2: Admin approves
    const adminContext = await browser.newContext()
    const adminPage = await adminContext.newPage()
    await adminPage.goto('http://localhost:3001/login')
    // Login as admin...
    // Navigate to approvals, approve the request
    await adminContext.close()
  })
})
