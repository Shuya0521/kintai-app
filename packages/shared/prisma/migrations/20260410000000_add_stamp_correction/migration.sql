-- CreateTable: StampCorrection（打刻修正申請テーブル）
CREATE TABLE "StampCorrection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attendanceId" TEXT NOT NULL,
    "checkInTime" DATETIME,
    "checkOutTime" DATETIME,
    "breakTotalMin" INTEGER,
    "workPlace" TEXT,
    "note" TEXT,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StampCorrection_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- AlterTable: Approval に stampCorrectionId カラムを追加
ALTER TABLE "Approval" ADD COLUMN "stampCorrectionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Approval_stampCorrectionId_key" ON "Approval"("stampCorrectionId");

-- CreateIndex
CREATE INDEX "StampCorrection_attendanceId_status_idx" ON "StampCorrection"("attendanceId", "status");
