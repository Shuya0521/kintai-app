# 勤怠管理システム - システム設計書

> **最終更新日:** 2026-03-13（権限設計更新）
> **管理者:** 小田原 秀哉（システム管理者）
> **プロジェクト名:** kintai-monorepo

---

## 目次

1. [システム概要](#1-システム概要)
2. [技術スタック](#2-技術スタック)
3. [ディレクトリ構成](#3-ディレクトリ構成)
4. [アーキテクチャ図](#4-アーキテクチャ図)
5. [データベース設計](#5-データベース設計)
6. [認証・認可設計](#6-認証認可設計)
7. [API一覧](#7-api一覧)
8. [フロントエンド画面構成](#8-フロントエンド画面構成)
9. [ビジネスロジック](#9-ビジネスロジック)
10. [バッチ処理・定期ジョブ](#10-バッチ処理定期ジョブ)
11. [環境設定・バックエンド構成](#11-環境設定バックエンド構成)
12. [デモアカウント一覧](#12-デモアカウント一覧)
13. [開発・運用コマンド](#13-開発運用コマンド)
14. [セキュリティ設計](#14-セキュリティ設計)
15. [今後の拡張ポイント](#15-今後の拡張ポイント)

---

## 1. システム概要

本システムは、日本の労働基準法・36協定に準拠した**勤怠管理Webアプリケーション**です。
従業員ポータル（打刻・申請）と管理者ポータル（承認・集計・エクスポート）の2つのアプリで構成されています。

```
┌─────────────────────────────────────────────────────────┐
│                   勤怠管理システム                         │
│                                                         │
│  ┌──────────────────┐    ┌──────────────────────┐       │
│  │  従業員ポータル     │    │  管理者ポータル        │       │
│  │  (kintai-app)     │    │  (kintai-admin)      │       │
│  │  :3000            │    │  :3001               │       │
│  └────────┬─────────┘    └──────────┬───────────┘       │
│           │                         │                    │
│           └────────┬────────────────┘                    │
│                    ▼                                     │
│          ┌─────────────────┐                             │
│          │  @kintai/shared  │                             │
│          │  (共通ライブラリ)  │                             │
│          └────────┬────────┘                             │
│                   ▼                                      │
│          ┌─────────────────┐                             │
│          │  SQLite (Prisma) │                             │
│          │  C:/temp/kintai/ │                             │
│          │  dev.db          │                             │
│          └─────────────────┘                             │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 技術スタック

| 区分 | 技術 | バージョン | 用途 |
|------|------|-----------|------|
| **フレームワーク** | Next.js | 16.1.6 | フルスタック React フレームワーク |
| **UI** | React | 19.2.3 | コンポーネント UI |
| **スタイル** | Tailwind CSS | v4 | ユーティリティファースト CSS |
| **言語** | TypeScript | ^5 | 型安全な JavaScript |
| **ORM** | Prisma | 5.22.0 | データベースアクセス |
| **DB** | SQLite | - | 開発用データベース（本番は PostgreSQL に切替可能） |
| **認証** | jsonwebtoken | ^9.0.3 | JWT トークン認証 |
| **暗号化** | bcryptjs | ^3.0.3 | パスワードハッシュ |
| **バリデーション** | Zod | ^3.23.8 | ランタイムスキーマ検証 |
| **定期処理** | node-cron | ^4.2.1 | バッチジョブスケジューラ |
| **Excel** | exceljs | ^4.4.0 | 帳票エクスポート |
| **テスト** | Vitest + Playwright | - | 単体テスト + E2E テスト |
| **パッケージ管理** | npm workspaces | - | モノレポ構成 |

---

## 3. ディレクトリ構成

```
勤怠ｱﾌﾟﾘ/
├── apps/
│   ├── kintai-app/                 # 従業員ポータル（ポート 3000）
│   │   ├── app/
│   │   │   ├── api/                # バックエンド API ルート
│   │   │   │   ├── auth/           #   認証系 (login, logout, me, register, quicklogin)
│   │   │   │   ├── attendance/     #   打刻・勤怠取得
│   │   │   │   ├── approvals/      #   承認一覧
│   │   │   │   ├── requests/       #   休暇申請
│   │   │   │   ├── users/          #   ユーザー情報
│   │   │   │   └── settings/       #   設定取得
│   │   │   ├── login/              # ログイン画面
│   │   │   ├── register/           # セルフ登録画面
│   │   │   ├── stamp/              # 打刻画面（ランディング）
│   │   │   └── employee/           # 従業員メイン画面
│   │   │       ├── stamp/          #   打刻操作
│   │   │       ├── daily/          #   日次勤怠
│   │   │       ├── monthly/        #   月次サマリ
│   │   │       └── requests/       #   休暇申請
│   │   ├── components/             # React コンポーネント
│   │   ├── lib/                    # ユーティリティ（auth.ts 等）
│   │   └── scripts/
│   │       └── seed.ts             # 初期データ投入スクリプト
│   │
│   └── kintai-admin/               # 管理者ポータル（ポート 3001）
│       ├── app/
│       │   ├── api/                # 管理系 API ルート
│       │   │   ├── auth/           #   管理者認証
│       │   │   ├── approvals/      #   承認処理
│       │   │   ├── attendance/     #   全社員勤怠取得
│       │   │   ├── excel/export/   #   Excel エクスポート
│       │   │   ├── users/          #   社員管理
│       │   │   ├── admin/          #   管理者専用操作
│       │   │   └── settings/       #   システム設定
│       │   ├── login/              # 管理者ログイン画面
│       │   ├── attendance/         # 勤怠一覧画面
│       │   ├── approvals/          # 承認管理画面
│       │   ├── members/            # 社員管理画面
│       │   ├── master/             # マスタ管理画面
│       │   ├── overtime/           # 残業モニタリング画面
│       │   └── settings/           # システム設定画面
│       └── lib/
│           └── cron/init.ts        # バッチジョブ定義
│
├── packages/
│   └── shared/                     # 共通ライブラリ（@kintai/shared）
│       ├── prisma/
│       │   ├── schema.prisma       # ★ データベーススキーマ定義
│       │   └── migrations/         # マイグレーションファイル
│       └── src/
│           ├── constants.ts        # ★ ロール・部署・定数定義
│           ├── types.ts            # TypeScript 型定義
│           ├── validators.ts       # Zod バリデーションスキーマ
│           ├── formatters.ts       # 日時・表示フォーマッタ
│           ├── helpers.ts          # JSON レスポンスヘルパー
│           ├── auth/               # 認証ロジック
│           │   ├── jwt.ts          #   JWT トークン生成・検証
│           │   ├── password.ts     #   パスワードハッシュ・検証
│           │   ├── roles.ts        #   ロール判定
│           │   └── lockout.ts      #   アカウントロックアウト
│           ├── services/           # ビジネスロジック
│           │   ├── leave.service.ts    # 有給休暇管理
│           │   └── overtime.service.ts # 残業管理・36協定チェック
│           └── audit/
│               └── logger.ts       # 監査ログ記録
│
├── docs/                           # ドキュメント
├── e2e/                            # E2E テスト（Playwright）
├── scripts/                        # ユーティリティスクリプト
├── package.json                    # モノレポルート定義
└── vitest.config.ts                # テスト設定
```

---

## 4. アーキテクチャ図

### 4.1 リクエストフロー

```
[ブラウザ] ──HTTP──▶ [Next.js App Router]
                          │
                          ├── /app/page.tsx        ← SSR ページ
                          └── /app/api/**/route.ts ← API ルート
                                    │
                               ┌────┴────┐
                               ▼         ▼
                         [認証チェック]  [Zod検証]
                               │         │
                               └────┬────┘
                                    ▼
                            [@kintai/shared]
                            ┌───────────────┐
                            │ services/     │ ← ビジネスロジック
                            │ auth/         │ ← 認証・認可
                            │ audit/        │ ← 監査ログ
                            └───────┬───────┘
                                    ▼
                             [Prisma Client]
                                    │
                                    ▼
                             [SQLite DB]
```

### 4.2 認証フロー

```
[ログイン]
    │
    ▼
[メールアドレス + パスワード送信]
    │
    ▼
[bcrypt でパスワード照合] ──失敗──▶ [失敗カウント++]
    │                                    │
   成功                           5回 → 15分ロック
    │                            10回 → 1時間ロック
    ▼                            15回 → 管理者手動解除
[JWT アクセストークン生成（15分）]
[JWT リフレッシュトークン生成（7日）]
    │
    ▼
[HTTP-only Cookie にセット]
    │
    ▼
[以降のリクエスト: Cookie から自動送信]
    │
    ▼
[API Route: verifyToken() でユーザー特定]
    │
    ▼
[ロール判定 → 権限チェック]
```

### 4.3 承認ワークフロー

```
[従業員: 休暇申請]
    │
    ▼
[LeaveRequest 作成（status: pending）]
    │
    ▼
[Approval レコード作成]
    │
    ▼
[承認者（部長以上）が管理画面で確認]
    │
    ├── 承認 → 有給残日数から消化 → status: approved
    ├── 却下 → コメント付き通知 → status: rejected
    └── 72時間放置 → エスカレーション → 上位権限者へ
```

---

## 5. データベース設計

### 5.1 ER図（主要テーブル）

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│    User      │     │   Attendance     │     │ LeaveRequest │
├──────────────┤     ├──────────────────┤     ├──────────────┤
│ id (PK)      │◄──┐ │ id (PK)          │     │ id (PK)      │
│ email (UQ)   │   │ │ userId (FK)      │──┐  │ userId (FK)  │──┐
│ employeeNo   │   │ │ date             │  │  │ type         │  │
│ passwordHash │   │ │ checkInTime      │  │  │ startDate    │  │
│ lastName     │   │ │ checkOutTime     │  │  │ endDate      │  │
│ firstName    │   │ │ breakTotalMin    │  │  │ days         │  │
│ role         │   │ │ workMin          │  │  │ status       │  │
│ department   │   │ │ overtimeMin      │  │  │ reason       │  │
│ workType     │   │ │ lateMin          │  │  └──────────────┘  │
│ hireDate     │   │ │ earlyLeaveMin    │  │                    │
│ status       │   │ │ workPlace        │  │  ┌──────────────┐  │
│ paidLeaveBal │   │ │ isHolidayWork    │  │  │  Approval    │  │
└──────────────┘   │ └──────────────────┘  │  ├──────────────┤  │
       ▲           │  UNIQUE(userId, date) │  │ id (PK)      │  │
       │           │                       │  │ requesterId  │──┘
       │           │ ┌──────────────────┐  │  │ approverId   │──┐
       │           │ │ OvertimeRecord   │  │  │ type         │  │
       │           │ ├──────────────────┤  │  │ status       │  │
       │           │ │ id (PK)          │  │  │ comment      │  │
       │           │ │ userId (FK)      │──┘  │ dueAt        │  │
       │           │ │ year             │     └──────────────┘  │
       │           │ │ month            │                       │
       │           │ │ totalOvertimeMin │  ┌──────────────────┐ │
       │           │ │ warningTriggered │  │  Session         │ │
       │           │ │ limitExceeded    │  ├──────────────────┤ │
       │           │ └──────────────────┘  │ id (PK)          │ │
       │           │                       │ userId (FK)       │─┘
       │           │ ┌──────────────────┐  │ tokenFamily      │
       │           └─│ PaidLeaveGrant   │  │ deviceInfo       │
       │             ├──────────────────┤  │ lastActiveAt     │
       │             │ id (PK)          │  └──────────────────┘
       │             │ userId (FK)      │
       └─────────────│ grantDate        │  ┌──────────────────┐
                     │ grantedDays      │  │  AuditLog        │
                     │ usedDays         │  ├──────────────────┤
                     │ carriedOverDays  │  │ id (PK)          │
                     │ expiredDays      │  │ userId (FK)      │
                     │ expiresAt        │  │ action           │
                     └──────────────────┘  │ targetType       │
                                           │ targetId         │
                                           │ detail           │
                                           └──────────────────┘
```

### 5.2 全テーブル一覧

| テーブル名 | 用途 | 主要カラム |
|-----------|------|-----------|
| **User** | ユーザーマスタ | email, role, department, status, paidLeaveBalance |
| **Attendance** | 日次打刻記録 | userId, date, checkIn/Out, workMin, overtimeMin |
| **LeaveRequest** | 休暇申請 | userId, type, startDate, endDate, days, status |
| **Approval** | 承認ワークフロー | requesterId, approverId, type, status, dueAt |
| **OvertimeRecord** | 月次残業集計 | userId, year, month, totalOvertimeMin |
| **PaidLeaveGrant** | 有給付与記録 | userId, grantDate, grantedDays, usedDays, expiresAt |
| **Session** | ログインセッション | userId, tokenFamily, deviceInfo (最大3セッション/ユーザー) |
| **RefreshToken** | トークン管理 | tokenFamily, isRevoked |
| **PasswordHistory** | パスワード変更履歴 | userId, passwordHash |
| **ApprovalDelegation** | 承認代理委任 | delegatorId, delegateId, startDate, endDate |
| **MissedStampAlert** | 打刻漏れアラート | userId, date, type (no_checkout/no_record/no_break_end) |
| **Holiday** | 祝日マスタ | date, name, year |
| **AuditLog** | 監査ログ | userId, action, targetType, targetId, detail |
| **Setting** | システム設定 | key, value |

### 5.3 主要インデックス

```sql
-- パフォーマンス最適化用
CREATE INDEX idx_user_dept_role    ON User(department, role);
CREATE UNIQUE INDEX idx_att_user_date ON Attendance(userId, date);
CREATE INDEX idx_leave_user_status ON LeaveRequest(userId, status);
CREATE INDEX idx_approval_approver ON Approval(approverId, status);
CREATE INDEX idx_audit_user        ON AuditLog(userId);
CREATE INDEX idx_audit_created     ON AuditLog(createdAt);
```

---

## 6. 認証・認可設計

### 6.1 ロール階層（昇順）

```
社員 → リーダー → 主査 → 主事 → 所長代理 → 課長 → 所長 → 参事 → 部長 → 統括部長 → 取締役 → システム管理者
```

### 6.2 権限マトリクス

| 権限 | システム管理者 | 取締役 | 統括部長 | 部長 | 参事 | 所長 | 課長 | 所長代理 | 主事以下 |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 打刻（自分） | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| 休暇申請 | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ | ○ |
| 管理画面アクセス | ○ | ○ | ○ | × | × | × | × | × | × |
| 承認権限 | ○ | ○ | ○ | ○ | × | × | × | × | × |
| Excel エクスポート | ○ | ○ | ○ | ○ | × | × | × | × | × |
| 社員管理 | ○ | ○ | ○ | × | × | × | × | × | × |
| システム設定 | ○ | ○ | × | × | × | × | × | × | × |

### 6.3 JWT トークン仕様

| 項目 | 値 |
|------|-----|
| アクセストークン有効期限 | 15分 |
| リフレッシュトークン有効期限 | 7日 |
| 最大同時セッション数 | 3 |
| トークン格納場所 | HTTP-only Cookie（`kintai_token`） |
| 署名アルゴリズム | HS256 |

### 6.4 アカウントロックアウト

| 失敗回数 | ロック期間 |
|---------|----------|
| 5回 | 15分 |
| 10回 | 1時間 |
| 15回 | 管理者による手動解除 |

---

## 7. API一覧

### 7.1 従業員ポータル API（:3000）

| エンドポイント | メソッド | 認証 | 説明 |
|--------------|---------|:---:|------|
| `/api/auth/login` | POST | × | ログイン（JWT発行） |
| `/api/auth/logout` | POST | ○ | ログアウト（Cookie削除） |
| `/api/auth/me` | GET | ○ | 現在のユーザー情報取得 |
| `/api/auth/register` | POST | × | セルフ登録（承認待ち） |
| `/api/auth/quicklogin` | POST | × | デモ用クイックログイン |
| `/api/attendance` | GET | ○ | 自分の勤怠記録取得 |
| `/api/attendance` | POST | ○ | 打刻（出勤/退勤/休憩開始/休憩終了） |
| `/api/approvals` | GET | ○ | 自分宛の承認依頼一覧 |
| `/api/requests` | GET | ○ | 自分の休暇申請一覧 |
| `/api/requests` | POST | ○ | 休暇申請作成 |
| `/api/users` | GET | ○ | ユーザー一覧取得 |
| `/api/users` | PATCH | ○ | プロフィール更新 |
| `/api/settings` | GET | ○ | システム設定取得 |

### 7.2 管理者ポータル API（:3001）

| エンドポイント | メソッド | 認証 | 説明 |
|--------------|---------|:---:|------|
| `/api/auth/login` | POST | × | 管理者ログイン |
| `/api/auth/logout` | POST | ○ | 管理者ログアウト |
| `/api/auth/me` | GET | ○ | 管理者ユーザー情報 |
| `/api/approvals` | GET | ○ | 全承認一覧 |
| `/api/approvals` | POST | ○ | 承認・却下処理 |
| `/api/attendance` | GET | ○ | 全社員の月次勤怠集計 |
| `/api/excel/export` | POST | ○ | 勤怠データ Excel エクスポート |
| `/api/users` | GET | ○ | 社員管理一覧 |
| `/api/users` | PATCH | ○ | 社員情報更新 |
| `/api/users/approve` | POST | ○ | 登録申請の承認 |
| `/api/admin` | GET/POST | ○ | 管理者専用操作 |
| `/api/settings` | GET | ○ | システム設定取得 |
| `/api/settings` | PATCH | ○ | システム設定変更 |

---

## 8. フロントエンド画面構成

### 8.1 従業員ポータル画面（:3000）

```
/login          ログイン画面
/register       セルフ登録画面
/               ホーム（ダッシュボード）
/stamp          打刻画面（ランディング、時計 + 出勤/在宅/退勤ボタン）
/employee/
  ├── stamp/    打刻操作（詳細）
  ├── daily/    日次勤怠一覧
  ├── monthly/  月次サマリ・統計
  └── requests/ 休暇申請作成・一覧

[ナビゲーション（ボトムタブ）]
  打刻 | 日次一覧 | 月次サマリ | 申請 | その他
```

### 8.2 管理者ポータル画面（:3001）

```
/login          管理者ログイン画面
/               ダッシュボード（KPI表示）
/attendance     月次勤怠一覧（全社員）
/approvals      承認管理
/members        社員管理（登録・編集・退職処理）
/master         マスタ管理（祝日・設定）
/overtime       残業モニタリング・36協定アラート
/settings       システム設定
```

---

## 9. ビジネスロジック

### 9.1 有給休暇管理

**ファイル:** `packages/shared/src/services/leave.service.ts`

#### 法定付与日数テーブル（労働基準法準拠）

| 勤続年数 | 付与日数 |
|---------|---------|
| 0.5年 | 10日 |
| 1.5年 | 11日 |
| 2.5年 | 12日 |
| 3.5年 | 14日 |
| 4.5年 | 16日 |
| 5.5年 | 18日 |
| 6.5年以上 | 20日 |

#### 消化ルール
- **FIFO方式** - 古い付与分から優先消化
- **2年で失効** - 付与日から2年経過で自動失効
- **年5日取得義務** - アラートレベル: ok → yellow → orange → red
- **半休対応** - 午前半休(0.5日)・午後半休(0.5日)

### 9.2 残業管理・36協定チェック

**ファイル:** `packages/shared/src/services/overtime.service.ts`

#### 監視レベル

| レベル | 条件 | 対応 |
|-------|------|------|
| `ok` | 36h未満/月 | 問題なし |
| `caution` | 36h以上/月 | 注意喚起 |
| `warning` | 45h以上/月 | 原則上限超過 |
| `serious` | 60h以上/月 | 要改善 |
| `critical` | 80h以上/月 | **産業医面談対象** |
| `violation` | 100h以上/月 | **法令違反** |

#### チェック項目
1. 月次上限（原則45時間）
2. 年次上限（360時間）
3. 2〜6ヶ月平均（80時間以下）
4. 特別条項（年6回まで45h超可）
5. 休憩時間コンプライアンス（6h超→45分、8h超→60分）

### 9.3 監査ログ

**ファイル:** `packages/shared/src/audit/logger.ts`

#### 記録対象アクション
```
login, logout, login_failed,
stamp_in, stamp_out, stamp_break,
approve, reject,
create, update, delete,
password_change, export, settings_change
```

---

## 10. バッチ処理・定期ジョブ

**ファイル:** `apps/kintai-admin/lib/cron/init.ts`

| スケジュール | ジョブ名 | 処理内容 |
|------------|---------|---------|
| 毎日 00:05 | 有給自動付与 | 入社日ベースで年次有給休暇を自動付与 |
| 毎日 00:10 | 有給失効処理 | 2年経過した有給休暇を自動失効 |
| 平日 22:00 | 打刻漏れチェック | 退勤打刻忘れ・打刻なしをアラート |
| 毎時 | 承認エスカレーション | 72時間以上放置された承認を上位者へ |
| 毎月1日 01:00 | 残業月次集計 | 前月の残業時間を確定・記録 |

---

## 11. 環境設定・バックエンド構成

### 11.1 環境変数

各アプリおよび shared パッケージに `.env` ファイルが必要です。

```env
# データベース接続先
DATABASE_URL="file:C:/temp/kintai/dev.db"

# JWT 秘密鍵（本番環境では必ず変更すること）
JWT_SECRET="kintai-app-secret-key-change-in-production-2024"
```

**設置場所:**
- `apps/kintai-app/.env`
- `apps/kintai-admin/.env`
- `packages/shared/.env`

> **⚠️ 本番環境移行時の注意:**
> - `JWT_SECRET` は必ずランダムな文字列に変更
> - `DATABASE_URL` は PostgreSQL 等の本番 DB に変更
> - `.env` ファイルはリポジトリにコミットしない

### 11.2 Prisma 設定

**ファイル:** `packages/shared/prisma/schema.prisma`

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

**DB ファイル格納場所:** `C:/temp/kintai/dev.db`

### 11.3 システム設定（Setting テーブル）

シード実行時に投入されるデフォルト値:

| キー | デフォルト値 | 説明 |
|-----|-----------|------|
| `companyName` | 株式会社サンプル | 会社名 |
| `businessHoursStart` | 09:00 | 始業時刻 |
| `businessHoursEnd` | 18:00 | 終業時刻 |
| `standardWorkHours` | 8 | 所定労働時間 |
| `overtimeThreshold` | 45 | 残業アラート閾値（分） |
| `monthlyLimit` | 60 | 月間残業上限（時間） |
| `yearlyLimit` | 720 | 年間残業上限（時間） |

### 11.4 ポート設定

| アプリ | ポート | 用途 |
|-------|-------|------|
| kintai-app | 3000 | 従業員ポータル |
| kintai-admin | 3001 | 管理者ポータル |

### 11.5 モノレポ構成（package.json）

```json
{
  "name": "kintai-monorepo",
  "workspaces": ["packages/*", "apps/*"]
}
```

`@kintai/shared` は `"*"` で各アプリから参照。npm workspaces によりローカルリンク。

---

## 12. デモアカウント一覧

**パスワード:** 全アカウント共通 `password123`

| 名前 | メールアドレス | 役職 | 部署 | 権限 |
|------|-------------|------|------|------|
| 河村 佳徳 | kawamura@company.example.com | 取締役 | 管理部 | 管理者（管理画面+承認+Excel出力） |
| 鈴木 英俊 | suzuki@company.example.com | 部長 | 工事部 | 承認者・Excel出力 |
| 河田 匡広 | kawata@company.example.com | 部長 | 管理部 | 承認者・Excel出力 |
| 串間 絵理 | kushima@company.example.com | 課長 | 管理部 | 一般（従業員ポータルのみ） |
| 笠間 成央 | kasama@company.example.com | リーダー | 管理部 | 一般（従業員ポータルのみ） |
| 小田原 秀哉 | odawara@company.example.com | システム管理者 | 工事部 | **全権限（管理画面+承認+Excel+設定）** |

### ロール別アクセス範囲

```
河村（取締役）        → 従業員ポータル + 管理者ポータル（全機能）
鈴木（部長）          → 従業員ポータル + 承認権限 + Excel出力（管理画面アクセス不可）
河田（部長）          → 従業員ポータル + 承認権限 + Excel出力（管理画面アクセス不可）
串間（課長）          → 従業員ポータルのみ
笠間（リーダー）       → 従業員ポータルのみ
小田原（システム管理者） → 従業員ポータル + 管理者ポータル（全機能 + システム設定）
```

---

## 13. 開発・運用コマンド

### 13.1 基本コマンド

```bash
# 開発サーバー起動（両アプリ同時）
npm run dev

# 従業員ポータルのみ起動
npm run dev:app

# 管理者ポータルのみ起動
npm run dev:admin

# ビルド
npm run build
```

### 13.2 データベース操作

```bash
# マイグレーション実行
npm run db:migrate

# 初期データ投入（デモアカウント作成）
npm run db:seed

# Prisma Studio（DB GUI）
npm run db:studio

# スキーマ変更後のクライアント再生成
cd packages/shared && npx prisma generate
```

### 13.3 テスト

```bash
# 全テスト実行
npm run test

# 単体テスト（shared パッケージ）
npm run test:unit

# ウォッチモード
npm run test:watch

# カバレッジ
npm run test:coverage

# E2E テスト
npm run test:e2e

# E2E テスト（UI付き）
npm run test:e2e:ui
```

### 13.4 トラブルシュート

```bash
# DB をリセットして再シード
cd packages/shared && npx prisma migrate reset --force

# Prisma クライアント再生成
cd packages/shared && npx prisma generate

# node_modules 再インストール
rm -rf node_modules && npm install
```

---

## 14. セキュリティ設計

### 14.1 認証セキュリティ

| 項目 | 実装 |
|------|------|
| パスワードハッシュ | bcryptjs（ソルトラウンド: 12） |
| パスワード強度 | 最低8文字、英字+数字必須 |
| トークン格納 | HTTP-only Cookie（XSS防御） |
| セッション制限 | ユーザーあたり最大3セッション |
| トークンローテーション | tokenFamily によるリプレイ攻撃防御 |
| アカウントロック | 段階的ロックアウト（5/10/15回） |

### 14.2 監査証跡

- 全ログイン/ログアウトを記録
- 打刻操作は全件ログ
- 承認・却下はコメント付きで記録
- 設定変更は変更前後を記録
- IP アドレス・デバイス情報を保持

---

## 15. 今後の拡張ポイント

### データベース移行
- SQLite → PostgreSQL への移行は `schema.prisma` の `provider` を変更するだけ
- 接続文字列を `.env` で切り替え

### 機能拡張候補
- [ ] メール通知（承認依頼・アラート）
- [ ] Slack/Teams 連携
- [ ] 打刻 GPS 位置記録
- [ ] シフト管理機能
- [ ] 給与計算連携（CSV出力）
- [ ] PWA オフライン対応
- [ ] Docker コンテナ化・CI/CD パイプライン

### インフラ
- [ ] Docker Compose による開発環境標準化
- [ ] Vercel / AWS デプロイ設定
- [ ] GitHub Actions CI/CD

---

## 付録: 主要ファイル早見表

| 変更したい内容 | ファイルパス |
|--------------|------------|
| ロール・部署の追加変更 | `packages/shared/src/constants.ts` |
| DB テーブル変更 | `packages/shared/prisma/schema.prisma` |
| バリデーションルール | `packages/shared/src/validators.ts` |
| 型定義 | `packages/shared/src/types.ts` |
| 認証ロジック | `packages/shared/src/auth/` |
| 有給計算ロジック | `packages/shared/src/services/leave.service.ts` |
| 残業チェックロジック | `packages/shared/src/services/overtime.service.ts` |
| 監査ログ | `packages/shared/src/audit/logger.ts` |
| バッチジョブ | `apps/kintai-admin/lib/cron/init.ts` |
| デモデータ | `apps/kintai-app/scripts/seed.ts` |
| 従業員画面 | `apps/kintai-app/app/` |
| 管理者画面 | `apps/kintai-admin/app/` |
| 環境変数 | 各 `.env` ファイル |

---

> **本ドキュメントは担当者変更時の引き継ぎ資料として作成されました。**
> **システムの全体像を把握し、安全に開発・運用を継続するための参考としてください。**
