/**
 * Excel勤怠一覧表 生成エンジン
 *
 * 既存Excelテンプレート（【原本】2026年●月）のフォーマットを再現し、
 * DBデータから勤怠一覧表を自動生成する。
 *
 * フォーマット:
 *   Row 1-4: ヘッダー（帳票名、会社名、集計対象月、集計方法）
 *   Row 5:   列ヘッダー
 *   Row 6+:  社員データ（社員番号順）
 *
 *   Col A-L (1-12): 月次集計
 *     A: 社員番号, B: 氏名, C: 出勤日数, D: 特休日数, E: 有休日数,
 *     F: 欠勤日数, G: 遅早時間, H: 交通費日数, I: 在宅勤務日数,
 *     J: 在宅手当日数, K: 休日出勤日数, L: 出勤日合計
 *   Col M (13): 氏名（日別エリア用）
 *   Col N+ (14+): 日別データ（11列/日 × 最大31日）
 *     出勤時間, 退社時間, 勤務時間, 出勤, 特休, 有休, 欠勤,
 *     遅早時間, 交通費, 在宅勤務日数, 在宅手当日数
 */

import ExcelJS from 'exceljs'

// ── 型定義 ─────────────────────────────────────────
export interface ExcelExportInput {
  year: number
  month: number
  companyName: string
  workingDays: number // 当月の所定労働日数
  employees: EmployeeExportData[]
}

export interface EmployeeExportData {
  employeeNumber: string
  name: string          // 姓 名
  // 月次集計
  workDays: number      // 出勤日数
  specialLeaveDays: number // 特休日数
  paidLeaveDays: number    // 有休日数
  absentDays: number       // 欠勤日数
  lateEarlyTime: string    // 遅早時間 (HH:MM)
  transportDays: number    // 交通費日数
  remoteDays: number       // 在宅勤務日数
  remoteAllowanceDays: number // 在宅手当日数
  holidayWorkDays: number  // 休日出勤日数
  totalDays: number        // 出勤日合計
  // 日別データ
  dailyRecords: DailyExportRecord[]
}

export interface DailyExportRecord {
  day: number              // 1-31
  checkInTime: string | null   // HH:MM or null
  checkOutTime: string | null  // HH:MM or null
  workTime: string | null      // HH:MM or null
  isWork: number           // 1 or 0
  isSpecialLeave: number   // 1 or 0
  isPaidLeave: number      // 0.5 or 1 or 0
  isAbsent: number         // 1 or 0
  lateEarlyTime: string    // HH:MM or ""
  transportDays: number    // 0 or 1
  remoteDays: number       // 0 or 0.5 or 1
  remoteAllowanceDays: number // 0 or 1
}

// ── 定数 ───────────────────────────────────────────
const COLS_PER_DAY = 11
const SUMMARY_COLS = 12  // A-L
const DAILY_START_COL = 14 // N列 = 14
const HEADER_ROWS = 5
const DATA_START_ROW = 6

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF4472C4' }, // 青系ヘッダー
}
const HEADER_FONT: Partial<ExcelJS.Font> = {
  bold: true,
  color: { argb: 'FFFFFFFF' },
  size: 10,
  name: 'Meiryo UI',
}
const DATA_FONT: Partial<ExcelJS.Font> = {
  size: 10,
  name: 'Meiryo UI',
}
const THIN_BORDER: Partial<ExcelJS.Border> = {
  style: 'thin',
  color: { argb: 'FFD0D0D0' },
}
const ALL_BORDERS: Partial<ExcelJS.Borders> = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
}

// ── ヘルパー ───────────────────────────────────────
function timeToExcelSerial(time: string | null): Date | null {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  // Excel stores time as fractional day since 1899-12-30
  const d = new Date(1899, 11, 30, h, m, 0)
  return d
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// ── メイン生成関数 ─────────────────────────────────
export async function generateAttendanceExcel(
  input: ExcelExportInput
): Promise<Buffer> {
  const { year, month, companyName, workingDays, employees } = input
  const daysInMonth = getDaysInMonth(year, month)
  const monthStr = `${year}年${month}月`
  const sheetName = monthStr

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'KINTAI勤怠管理システム'
  workbook.created = new Date()

  const ws = workbook.addWorksheet(sheetName, {
    pageSetup: {
      orientation: 'landscape',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  })

  // ── Row 1: 帳票名 ────────────────────────────────
  ws.getCell('A1').value = '帳票名'
  ws.getCell('B1').value = '勤怠一覧表'
  ws.getCell('M1').value = '勤怠一覧表'

  // ── Row 2: 会社名 + 出勤日数 ──────────────────────
  ws.getCell('A2').value = '会社名'
  ws.getCell('B2').value = companyName
  ws.getCell('F2').value = '出勤日数'
  ws.getCell('G2').value = workingDays
  ws.getCell('H2').value = '日'
  ws.getCell('M2').value = companyName

  // ── Row 3: 集計対象 ──────────────────────────────
  ws.getCell('A3').value = '集計対象'
  ws.getCell('B3').value = monthStr
  ws.getCell('M3').value = monthStr

  // ── Row 4: 集計方法 + 日付ヘッダー ─────────────────
  ws.getCell('A4').value = '集計方法'
  ws.getCell('B4').value = '【社員別・社員番号順】'
  ws.getCell('M4').value = '【社員別・社員番号順】'

  // 日付ヘッダー（各日11列にまたがる）
  for (let d = 1; d <= daysInMonth; d++) {
    const startCol = DAILY_START_COL + (d - 1) * COLS_PER_DAY
    const dateStr = `${month}/${d}`
    for (let c = 0; c < COLS_PER_DAY; c++) {
      ws.getCell(4, startCol + c).value = dateStr
    }
  }

  // ── Row 5: 列ヘッダー ────────────────────────────
  const summaryHeaders = [
    '社員番号', '氏名', '出勤日数', '特休日数', '有休日数',
    '欠勤日数', '遅早時間', '交通費日数', '在宅勤務日数',
    '在宅手当日数', '休日出勤日数', '出勤日合計',
  ]
  summaryHeaders.forEach((h, i) => {
    const cell = ws.getCell(5, i + 1)
    cell.value = h
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.border = ALL_BORDERS
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
  })

  // Col M: 氏名
  const cellM5 = ws.getCell(5, 13)
  cellM5.value = '氏名'
  cellM5.fill = HEADER_FILL
  cellM5.font = HEADER_FONT
  cellM5.border = ALL_BORDERS

  // 日別列ヘッダー
  const dailyHeaders = [
    '出勤時間', '退社時間', '勤務時間', '出勤', '特休', '有休',
    '欠勤', '遅早時間', '交通費', '在宅勤務日数', '在宅手当日数',
  ]
  for (let d = 0; d < daysInMonth; d++) {
    const startCol = DAILY_START_COL + d * COLS_PER_DAY
    dailyHeaders.forEach((h, i) => {
      const cell = ws.getCell(5, startCol + i)
      cell.value = h
      cell.fill = HEADER_FILL
      cell.font = HEADER_FONT
      cell.border = ALL_BORDERS
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    })
  }

  // ── 列幅設定 ─────────────────────────────────────
  ws.getColumn(1).width = 10  // 社員番号
  ws.getColumn(2).width = 14  // 氏名
  for (let c = 3; c <= 12; c++) ws.getColumn(c).width = 8
  ws.getColumn(13).width = 14 // 氏名(日別)
  for (let c = DAILY_START_COL; c <= DAILY_START_COL + daysInMonth * COLS_PER_DAY; c++) {
    ws.getColumn(c).width = 7
  }

  // ── 社員データ書き込み ────────────────────────────
  employees.forEach((emp, idx) => {
    const row = DATA_START_ROW + idx

    // 月次集計 (A-L)
    ws.getCell(row, 1).value = emp.employeeNumber
    ws.getCell(row, 2).value = emp.name
    ws.getCell(row, 3).value = emp.workDays
    ws.getCell(row, 4).value = emp.specialLeaveDays
    ws.getCell(row, 5).value = emp.paidLeaveDays
    ws.getCell(row, 6).value = emp.absentDays
    ws.getCell(row, 7).value = emp.lateEarlyTime || '0:00'
    ws.getCell(row, 8).value = emp.transportDays
    ws.getCell(row, 9).value = emp.remoteDays
    ws.getCell(row, 10).value = emp.remoteAllowanceDays
    ws.getCell(row, 11).value = emp.holidayWorkDays || ''
    ws.getCell(row, 12).value = emp.totalDays

    // 集計セルのスタイル
    for (let c = 1; c <= 12; c++) {
      const cell = ws.getCell(row, c)
      cell.font = DATA_FONT
      cell.border = ALL_BORDERS
      cell.alignment = { horizontal: c <= 2 ? 'left' : 'center', vertical: 'middle' }
    }

    // Col M: 氏名
    ws.getCell(row, 13).value = emp.name
    ws.getCell(row, 13).font = DATA_FONT
    ws.getCell(row, 13).border = ALL_BORDERS

    // 日別データ (N+)
    const dailyMap = new Map(emp.dailyRecords.map(r => [r.day, r]))

    for (let d = 1; d <= daysInMonth; d++) {
      const startCol = DAILY_START_COL + (d - 1) * COLS_PER_DAY
      const rec = dailyMap.get(d)

      if (rec) {
        // 出勤時間
        const checkInCell = ws.getCell(row, startCol)
        if (rec.checkInTime) {
          checkInCell.value = timeToExcelSerial(rec.checkInTime)
          checkInCell.numFmt = 'h:mm'
        }

        // 退社時間
        const checkOutCell = ws.getCell(row, startCol + 1)
        if (rec.checkOutTime) {
          checkOutCell.value = timeToExcelSerial(rec.checkOutTime)
          checkOutCell.numFmt = 'h:mm'
        }

        // 勤務時間
        const workTimeCell = ws.getCell(row, startCol + 2)
        if (rec.workTime) {
          workTimeCell.value = timeToExcelSerial(rec.workTime)
          workTimeCell.numFmt = 'h:mm'
        }

        // フラグ列
        ws.getCell(row, startCol + 3).value = rec.isWork || ''         // 出勤
        ws.getCell(row, startCol + 4).value = rec.isSpecialLeave || '' // 特休
        ws.getCell(row, startCol + 5).value = rec.isPaidLeave || ''    // 有休
        ws.getCell(row, startCol + 6).value = rec.isAbsent || ''       // 欠勤
        ws.getCell(row, startCol + 7).value = rec.lateEarlyTime || ''  // 遅早時間
        ws.getCell(row, startCol + 8).value = rec.transportDays || ''  // 交通費
        ws.getCell(row, startCol + 9).value = rec.remoteDays || ''     // 在宅勤務日数
        ws.getCell(row, startCol + 10).value = rec.remoteAllowanceDays || '' // 在宅手当日数
      }

      // 日別セルのスタイル
      for (let c = 0; c < COLS_PER_DAY; c++) {
        const cell = ws.getCell(row, startCol + c)
        cell.font = DATA_FONT
        cell.border = ALL_BORDERS
        cell.alignment = { horizontal: 'center', vertical: 'middle' }
      }
    }
  })

  // ── 行高さ設定 ────────────────────────────────────
  for (let r = 1; r <= 4; r++) ws.getRow(r).height = 18
  ws.getRow(5).height = 28
  for (let r = DATA_START_ROW; r < DATA_START_ROW + employees.length; r++) {
    ws.getRow(r).height = 20
  }

  // ── ウィンドウ枠固定（ヘッダー+社員番号・氏名を固定）────
  ws.views = [
    { state: 'frozen', xSplit: 2, ySplit: 5, topLeftCell: 'C6' },
  ]

  // ── バッファ生成 ──────────────────────────────────
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
