import { chromium, type BrowserContext, type Page } from 'playwright'
import path from 'path'
import fs from 'fs'

const SCREENSHOTS_DIR = path.resolve(__dirname, '../docs/screenshots')
const APP_URL = 'http://localhost:3000'
const ADMIN_URL = 'http://localhost:3001'

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true })

/**
 * Login by calling the API with Node.js fetch and injecting the cookie into the browser context.
 */
async function loginWithCookie(context: BrowserContext, baseUrl: string, email: string, password: string): Promise<void> {
  const resp = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  if (!resp.ok) {
    throw new Error(`Login failed (${resp.status}): ${await resp.text()}`)
  }

  // Extract token from Set-Cookie header
  const setCookie = resp.headers.get('set-cookie') || ''
  const tokenMatch = setCookie.match(/kintai_token=([^;]+)/)
  if (!tokenMatch) throw new Error('kintai_token not found in Set-Cookie')

  const url = new URL(baseUrl)
  await context.addCookies([{
    name: 'kintai_token',
    value: tokenMatch[1],
    domain: url.hostname,
    path: '/',
    httpOnly: true,
    sameSite: 'Lax' as const,
  }])

  const data = await resp.clone().json().catch(() => ({}))
  console.log(`    Login OK → cookie set (user=${data?.user?.name || '?'})`)
}

async function shot(page: Page, name: string, fullPage = false) {
  await page.screenshot({ path: path.join(SCREENSHOTS_DIR, name), fullPage })
}

async function main() {
  const browser = await chromium.launch({ headless: true })

  // ============================
  // 1. Employee App - iPhone
  // ============================
  console.log('=== 従業員用アプリ (iPhone) ===')

  const iphoneCtx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  })

  const ipage = await iphoneCtx.newPage()

  // Login screen (before login)
  console.log('  [1/8] ログイン画面')
  await ipage.goto(`${APP_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 })
  await ipage.waitForTimeout(1500)
  await shot(ipage, 'app_01_login.png')

  // Register screen (separate page)
  console.log('  [2/8] 新規登録画面')
  const regPage = await iphoneCtx.newPage()
  await regPage.goto(`${APP_URL}/register`, { waitUntil: 'networkidle', timeout: 15000 })
  await regPage.waitForTimeout(1500)
  await shot(regPage, 'app_07_register.png')
  await regPage.close()

  // Login (form fill on the same page)
  console.log('  [3/8] ログイン実行...')
  await loginWithCookie(iphoneCtx, APP_URL, 'sato@company.example.com', 'password123')

  // Stamp page (navigate on same page that has the cookie)
  console.log('  [4/8] 打刻画面')
  await ipage.goto(`${APP_URL}/stamp`, { waitUntil: 'networkidle', timeout: 15000 })
  await ipage.waitForTimeout(2000)
  console.log(`    URL: ${ipage.url()}`)
  await shot(ipage, 'app_02_stamp.png')
  await shot(ipage, 'app_02_stamp_full.png', true)

  // Check in
  console.log('  [5/8] 出勤打刻')
  try {
    const checkinBtn = ipage.locator('button').filter({ hasText: /出勤/ }).first()
    if (await checkinBtn.isVisible({ timeout: 3000 })) {
      await checkinBtn.click()
      await ipage.waitForTimeout(2000)
      await shot(ipage, 'app_03_after_checkin.png')
    }
  } catch { console.log('    (出勤ボタン非表示、スキップ)') }

  // Daily list
  console.log('  [6/8] 日次一覧')
  await ipage.goto(`${APP_URL}/employee/daily`, { waitUntil: 'networkidle', timeout: 15000 })
  await ipage.waitForTimeout(2000)
  await shot(ipage, 'app_04_daily.png')

  // Monthly summary
  console.log('  [7/8] 月次サマリ')
  await ipage.goto(`${APP_URL}/employee/monthly`, { waitUntil: 'networkidle', timeout: 15000 })
  await ipage.waitForTimeout(2000)
  await shot(ipage, 'app_05_monthly.png')
  await shot(ipage, 'app_05_monthly_full.png', true)

  // Leave requests
  console.log('  [8/8] 休暇申請')
  await ipage.goto(`${APP_URL}/employee/requests`, { waitUntil: 'networkidle', timeout: 15000 })
  await ipage.waitForTimeout(2000)
  await shot(ipage, 'app_06_requests.png')
  await shot(ipage, 'app_06_requests_full.png', true)

  await iphoneCtx.close()

  // ============================
  // 2. Employee App (Desktop)
  // ============================
  console.log('\n=== 従業員用アプリ (Desktop) ===')
  const deskCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
  const dpage = await deskCtx.newPage()
  await loginWithCookie(deskCtx, APP_URL, 'sato@company.example.com', 'password123')

  console.log('  打刻画面 (Desktop)')
  await dpage.goto(`${APP_URL}/stamp`, { waitUntil: 'networkidle', timeout: 15000 })
  await dpage.waitForTimeout(2000)
  await shot(dpage, 'app_desktop_stamp.png')

  await deskCtx.close()

  // ============================
  // 3. Admin App (Desktop)
  // ============================
  console.log('\n=== 管理者用アプリ (Desktop) ===')
  const adminCtx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 })
  const apage = await adminCtx.newPage()

  // Login screen (before login)
  console.log('  [1/9] ログイン画面')
  await apage.goto(`${ADMIN_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 })
  await apage.waitForTimeout(1500)
  await shot(apage, 'admin_01_login.png')

  // Login
  console.log('  [2/9] ログイン中...')
  await loginWithCookie(adminCtx, ADMIN_URL, 'odawara@company.example.com', 'password123')

  // Dashboard
  console.log('  [3/9] ダッシュボード')
  await apage.goto(ADMIN_URL, { waitUntil: 'networkidle', timeout: 15000 })
  await apage.waitForTimeout(2000)
  await shot(apage, 'admin_02_dashboard.png')

  // Approvals
  console.log('  [4/9] 承認管理')
  await apage.goto(`${ADMIN_URL}/approvals`, { waitUntil: 'networkidle', timeout: 15000 })
  await apage.waitForTimeout(2000)
  await shot(apage, 'admin_03_approvals.png')

  // Attendance list
  console.log('  [5/9] 勤怠一覧')
  await apage.goto(`${ADMIN_URL}/attendance`, { waitUntil: 'networkidle', timeout: 15000 })
  await apage.waitForTimeout(2000)
  await shot(apage, 'admin_04_attendance.png')

  // Members
  console.log('  [6/9] メンバー管理')
  await apage.goto(`${ADMIN_URL}/members`, { waitUntil: 'networkidle', timeout: 15000 })
  await apage.waitForTimeout(2000)
  await shot(apage, 'admin_05_members.png')

  // Overtime report
  console.log('  [7/9] 残業レポート')
  await apage.goto(`${ADMIN_URL}/overtime`, { waitUntil: 'networkidle', timeout: 15000 })
  await apage.waitForTimeout(2000)
  await shot(apage, 'admin_06_overtime.png')

  // Master management
  console.log('  [8/9] マスタ管理')
  await apage.goto(`${ADMIN_URL}/master`, { waitUntil: 'networkidle', timeout: 15000 })
  await apage.waitForTimeout(2000)
  await shot(apage, 'admin_07_master.png')

  // Settings
  console.log('  [9/9] 設定')
  await apage.goto(`${ADMIN_URL}/settings`, { waitUntil: 'networkidle', timeout: 15000 })
  await apage.waitForTimeout(2000)
  await shot(apage, 'admin_08_settings.png')

  await adminCtx.close()
  await browser.close()

  // List results
  const files = fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png'))
  console.log(`\n✅ 撮影完了: ${files.length}枚`)
  files.forEach(f => {
    const stats = fs.statSync(path.join(SCREENSHOTS_DIR, f))
    console.log(`  ${f} (${Math.round(stats.size / 1024)}KB)`)
  })
}

main().catch(e => { console.error('Error:', e); process.exit(1) })
