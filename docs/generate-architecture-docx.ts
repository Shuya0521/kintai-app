import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageNumber,
  Header,
  Footer,
  BorderStyle,
  ShadingType,
  VerticalAlign,
  convertMillimetersToTwip,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
} from "docx";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// Helper functions (same pattern as generate-manual.ts)
// ============================================================

function bodyText(text: string, options?: { bold?: boolean; spacing?: { after?: number; before?: number } }): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 360, ...(options?.spacing || {}) },
    children: [
      new TextRun({
        text,
        font: "游ゴシック",
        size: 22,
        bold: options?.bold,
      }),
    ],
  });
}

function bodyTextMulti(runs: TextRun[], options?: { spacing?: { after?: number; before?: number }; indent?: { left?: number } }): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 360, ...(options?.spacing || {}) },
    indent: options?.indent,
    children: runs,
  });
}

function tr(text: string, options?: { bold?: boolean; color?: string; size?: number; italics?: boolean }): TextRun {
  return new TextRun({
    text,
    font: "游ゴシック",
    size: options?.size ?? 22,
    bold: options?.bold,
    color: options?.color,
    italics: options?.italics,
  });
}

/** モノスペーステキストラン */
function monoTr(text: string, options?: { bold?: boolean; size?: number }): TextRun {
  return new TextRun({
    text,
    font: "Consolas",
    size: options?.size ?? 18,
    bold: options?.bold,
  });
}

function heading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 240, line: 360 },
    children: [
      new TextRun({
        text,
        font: "游ゴシック",
        size: 32,
        bold: true,
      }),
    ],
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 200, line: 360 },
    children: [
      new TextRun({
        text,
        font: "游ゴシック",
        size: 28,
        bold: true,
      }),
    ],
  });
}

function heading3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 160, line: 360 },
    children: [
      new TextRun({
        text,
        font: "游ゴシック",
        size: 24,
        bold: true,
      }),
    ],
  });
}

function separator(): Paragraph {
  return new Paragraph({
    spacing: { after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999" },
    },
    children: [],
  });
}

function makeTable(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(h => new TableCell({
      shading: { type: ShadingType.SOLID, color: "2C3E50" },
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40, before: 40 },
        children: [tr(h, { bold: true, color: "FFFFFF", size: 20 })],
      })],
    })),
  });

  const dataRows = rows.map(row => new TableRow({
    children: row.map(cell => new TableCell({
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 40, before: 40 },
        children: [tr(cell, { size: 20 })],
      })],
    })),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...dataRows],
  });
}

function emptyLine(): Paragraph {
  return new Paragraph({ spacing: { after: 120 }, children: [] });
}

function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

function bullet(text: string): Paragraph {
  return bodyTextMulti([tr(`・${text}`)], { indent: { left: convertMillimetersToTwip(5) } });
}

/** コードブロック（モノスペース、背景色付き） */
function codeBlock(lines: string[]): Paragraph[] {
  return lines.map(line => new Paragraph({
    spacing: { after: 0, line: 260 },
    shading: { type: ShadingType.SOLID, color: "F5F5F5" },
    indent: { left: convertMillimetersToTwip(5) },
    children: [monoTr(line || " ")],
  }));
}

// ============================================================
// 表紙
// ============================================================
function coverPage(): Paragraph[] {
  return [
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [tr("勤怠管理システム", { size: 36, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [tr("システム設計書", { size: 52, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [tr("― SYSTEM ARCHITECTURE ―", { size: 28 })],
    }),
    new Paragraph({ spacing: { after: 600 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [tr("最終更新日: 2026年3月18日", { size: 22 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [tr("管理者: 小田原 秀哉（システム管理者）", { size: 22 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [tr("プロジェクト名: kintai-monorepo", { size: 22 })],
    }),
    pageBreak(),
  ];
}

// ============================================================
// 目次
// ============================================================
function tocPage(): Paragraph[] {
  return [
    heading1("目次"),
    separator(),
    emptyLine(),
    bodyText("1. システム概要"),
    bodyText("2. 技術スタック"),
    bodyText("3. ディレクトリ構成"),
    bodyText("4. アーキテクチャ図"),
    bodyText("5. データベース設計"),
    bodyText("6. 認証・認可設計"),
    bodyText("7. API一覧"),
    bodyText("8. フロントエンド画面構成"),
    bodyText("9. ビジネスロジック"),
    bodyText("10. バッチ処理・定期ジョブ"),
    bodyText("11. 環境設定・バックエンド構成"),
    bodyText("12. デモアカウント一覧"),
    bodyText("13. 開発・運用コマンド"),
    bodyText("14. セキュリティ設計"),
    bodyText("15. 今後の拡張ポイント"),
    bodyText("付録: 主要ファイル早見表"),
    pageBreak(),
  ];
}

// ============================================================
// 1. システム概要
// ============================================================
function section1(): Paragraph[] {
  return [
    heading1("1. システム概要"),
    separator(),
    bodyText("本システムは、日本の労働基準法・36協定に準拠した勤怠管理Webアプリケーションです。"),
    bodyText("従業員ポータル（打刻・申請）と管理者ポータル（承認・集計・エクスポート）の2つのアプリで構成されています。"),
    emptyLine(),
    ...codeBlock([
      "┌─────────────────────────────────────────────────┐",
      "│              勤怠管理システム                      │",
      "│                                                 │",
      "│  ┌──────────────┐    ┌──────────────────┐       │",
      "│  │ 従業員ポータル  │    │ 管理者ポータル    │       │",
      "│  │ (kintai-app)  │    │ (kintai-admin)   │       │",
      "│  │ :3000         │    │ :3001            │       │",
      "│  └──────┬───────┘    └────────┬─────────┘       │",
      "│         └────────┬───────────┘                  │",
      "│                  ▼                               │",
      "│        ┌─────────────────┐                       │",
      "│        │  @kintai/shared  │                       │",
      "│        │  (共通ライブラリ)  │                       │",
      "│        └────────┬────────┘                       │",
      "│                 ▼                                │",
      "│        ┌─────────────────┐                       │",
      "│        │  SQLite (Prisma) │                       │",
      "│        │  C:/temp/kintai/ │                       │",
      "│        │  dev.db          │                       │",
      "│        └─────────────────┘                       │",
      "└─────────────────────────────────────────────────┘",
    ]),
    emptyLine(),
    pageBreak(),
  ];
}

// ============================================================
// 2. 技術スタック
// ============================================================
function section2(): Paragraph[] {
  return [
    heading1("2. 技術スタック"),
    separator(),
    emptyLine(),
    makeTable(
      ["区分", "技術", "バージョン", "用途"],
      [
        ["フレームワーク", "Next.js", "16.1.6", "フルスタック React フレームワーク"],
        ["UI", "React", "19.2.3", "コンポーネント UI"],
        ["スタイル", "Tailwind CSS", "v4", "ユーティリティファースト CSS"],
        ["言語", "TypeScript", "^5", "型安全な JavaScript"],
        ["ORM", "Prisma", "5.22.0", "データベースアクセス"],
        ["DB", "SQLite", "-", "開発用データベース"],
        ["認証", "jsonwebtoken", "^9.0.3", "JWT トークン認証"],
        ["暗号化", "bcryptjs", "^3.0.3", "パスワードハッシュ"],
        ["バリデーション", "Zod", "^3.23.8", "ランタイムスキーマ検証"],
        ["定期処理", "node-cron", "^4.2.1", "バッチジョブスケジューラ"],
        ["Excel", "exceljs", "^4.4.0", "帳票エクスポート"],
        ["テスト", "Vitest + Playwright", "-", "単体テスト + E2E テスト"],
        ["パッケージ管理", "npm workspaces", "-", "モノレポ構成"],
      ]
    ),
    emptyLine(),
    pageBreak(),
  ];
}

// ============================================================
// 3. ディレクトリ構成
// ============================================================
function section3(): Paragraph[] {
  return [
    heading1("3. ディレクトリ構成"),
    separator(),
    emptyLine(),
    ...codeBlock([
      "勤怠ｱﾌﾟﾘ/",
      "├── apps/",
      "│   ├── kintai-app/             # 従業員ポータル（ポート 3000）",
      "│   │   ├── app/",
      "│   │   │   ├── api/            # バックエンド API ルート",
      "│   │   │   │   ├── auth/       #   認証系",
      "│   │   │   │   ├── attendance/ #   打刻・勤怠取得",
      "│   │   │   │   ├── approvals/  #   承認一覧",
      "│   │   │   │   ├── requests/   #   休暇申請",
      "│   │   │   │   ├── users/      #   ユーザー情報",
      "│   │   │   │   └── settings/   #   設定取得",
      "│   │   │   ├── login/          # ログイン画面",
      "│   │   │   ├── register/       # セルフ登録画面",
      "│   │   │   ├── stamp/          # 打刻画面（ランディング）",
      "│   │   │   └── employee/       # 従業員メイン画面",
      "│   │   ├── components/         # React コンポーネント",
      "│   │   ├── lib/                # ユーティリティ",
      "│   │   └── scripts/",
      "│   │       └── seed.ts         # 初期データ投入スクリプト",
      "│   │",
      "│   └── kintai-admin/           # 管理者ポータル（ポート 3001）",
      "│       ├── app/",
      "│       │   ├── api/            # 管理系 API ルート",
      "│       │   ├── login/          # 管理者ログイン画面",
      "│       │   ├── attendance/     # 勤怠一覧画面",
      "│       │   ├── approvals/      # 承認管理画面",
      "│       │   ├── members/        # 社員管理画面",
      "│       │   ├── master/         # マスタ管理画面",
      "│       │   ├── overtime/       # 残業モニタリング画面",
      "│       │   └── settings/       # システム設定画面",
      "│       └── lib/",
      "│           └── cron/init.ts    # バッチジョブ定義",
      "│",
      "├── packages/",
      "│   └── shared/                 # 共通ライブラリ（@kintai/shared）",
      "│       ├── prisma/",
      "│       │   ├── schema.prisma   # データベーススキーマ定義",
      "│       │   └── migrations/     # マイグレーションファイル",
      "│       └── src/",
      "│           ├── constants.ts    # ロール・部署・定数定義",
      "│           ├── types.ts        # TypeScript 型定義",
      "│           ├── validators.ts   # Zod バリデーションスキーマ",
      "│           ├── auth/           # 認証ロジック",
      "│           ├── services/       # ビジネスロジック",
      "│           └── audit/          # 監査ログ",
      "│",
      "├── docs/                       # ドキュメント",
      "├── e2e/                        # E2E テスト（Playwright）",
      "├── scripts/                    # ユーティリティスクリプト",
      "├── package.json                # モノレポルート定義",
      "└── vitest.config.ts            # テスト設定",
    ]),
    emptyLine(),
    pageBreak(),
  ];
}

// ============================================================
// 4. アーキテクチャ図
// ============================================================
function section4(): Paragraph[] {
  return [
    heading1("4. アーキテクチャ図"),
    separator(),

    heading2("4.1 リクエストフロー"),
    ...codeBlock([
      "[ブラウザ] ──HTTP──▶ [Next.js App Router]",
      "                          │",
      "                          ├── /app/page.tsx        ← SSR ページ",
      "                          └── /app/api/**/route.ts ← API ルート",
      "                                    │",
      "                               ┌────┴────┐",
      "                               ▼         ▼",
      "                         [認証チェック]  [Zod検証]",
      "                               │         │",
      "                               └────┬────┘",
      "                                    ▼",
      "                            [@kintai/shared]",
      "                            ┌───────────────┐",
      "                            │ services/     │ ← ビジネスロジック",
      "                            │ auth/         │ ← 認証・認可",
      "                            │ audit/        │ ← 監査ログ",
      "                            └───────┬───────┘",
      "                                    ▼",
      "                             [Prisma Client]",
      "                                    │",
      "                                    ▼",
      "                             [SQLite DB]",
    ]),
    emptyLine(),

    heading2("4.2 認証フロー"),
    ...codeBlock([
      "[ログイン]",
      "    │",
      "    ▼",
      "[メールアドレス + パスワード送信]",
      "    │",
      "    ▼",
      "[bcrypt でパスワード照合] ──失敗──▶ [失敗カウント++]",
      "    │                                    │",
      "   成功                           5回 → 15分ロック",
      "    │                            10回 → 1時間ロック",
      "    ▼                            15回 → 管理者手動解除",
      "[JWT アクセストークン生成（15分）]",
      "[JWT リフレッシュトークン生成（14日）]",
      "    │",
      "    ▼",
      "[HTTP-only Cookie にセット]",
      "    │",
      "    ▼",
      "[以降のリクエスト: Cookie から自動送信]",
      "    │",
      "    ▼",
      "[API Route: verifyToken() でユーザー特定]",
      "    │",
      "    ▼",
      "[ロール判定 → 権限チェック]",
    ]),
    emptyLine(),

    heading2("4.3 承認ワークフロー"),
    ...codeBlock([
      "[従業員: 休暇申請]",
      "    │",
      "    ▼",
      "[LeaveRequest 作成（status: pending）]",
      "    │",
      "    ▼",
      "[Approval レコード作成]",
      "    │",
      "    ▼",
      "[承認者（部長以上）が管理画面で確認]",
      "    │",
      "    ├── 承認 → 有給残日数から消化 → status: approved",
      "    ├── 却下 → コメント付き通知 → status: rejected",
      "    └── 72時間放置 → エスカレーション → 上位権限者へ",
    ]),
    emptyLine(),
    pageBreak(),
  ];
}

// ============================================================
// 5. データベース設計
// ============================================================
function section5(): Paragraph[] {
  return [
    heading1("5. データベース設計"),
    separator(),

    heading2("5.1 ER図（主要テーブル）"),
    ...codeBlock([
      "┌──────────────┐     ┌──────────────────┐     ┌──────────────┐",
      "│    User      │     │   Attendance     │     │ LeaveRequest │",
      "├──────────────┤     ├──────────────────┤     ├──────────────┤",
      "│ id (PK)      │◄──┐ │ id (PK)          │     │ id (PK)      │",
      "│ email (UQ)   │   │ │ userId (FK)      │──┐  │ userId (FK)  │──┐",
      "│ employeeNo   │   │ │ date             │  │  │ type         │  │",
      "│ passwordHash │   │ │ checkInTime      │  │  │ startDate    │  │",
      "│ lastName     │   │ │ checkOutTime     │  │  │ endDate      │  │",
      "│ firstName    │   │ │ breakTotalMin    │  │  │ days         │  │",
      "│ role         │   │ │ workMin          │  │  │ status       │  │",
      "│ department   │   │ │ overtimeMin      │  │  │ reason       │  │",
      "│ workType     │   │ │ lateMin          │  │  └──────────────┘  │",
      "│ hireDate     │   │ │ earlyLeaveMin    │  │                    │",
      "│ status       │   │ │ workPlace        │  │  ┌──────────────┐  │",
      "│ paidLeaveBal │   │ │ isHolidayWork    │  │  │  Approval    │  │",
      "└──────────────┘   │ └──────────────────┘  │  ├──────────────┤  │",
      "                   │  UNIQUE(userId, date) │  │ id (PK)      │  │",
      "                   │                       │  │ requesterId  │──┘",
      "                   │ ┌──────────────────┐  │  │ approverId   │──┐",
      "                   │ │ OvertimeRecord   │  │  │ type         │  │",
      "                   │ ├──────────────────┤  │  │ status       │  │",
      "                   │ │ id (PK)          │  │  │ comment      │  │",
      "                   │ │ userId (FK)      │──┘  │ dueAt        │  │",
      "                   │ │ year             │     └──────────────┘  │",
      "                   │ │ month            │                       │",
      "                   │ │ totalOvertimeMin │  ┌──────────────────┐ │",
      "                   │ │ warningTriggered │  │  Session         │ │",
      "                   │ │ limitExceeded    │  ├──────────────────┤ │",
      "                   │ └──────────────────┘  │ id (PK)          │ │",
      "                   │                       │ userId (FK)       │─┘",
      "                   │ ┌──────────────────┐  │ tokenFamily      │",
      "                   └─│ PaidLeaveGrant   │  │ deviceInfo       │",
      "                     ├──────────────────┤  │ lastActiveAt     │",
      "                     │ id (PK)          │  └──────────────────┘",
      "                     │ userId (FK)      │",
      "                     │ grantDate        │  ┌──────────────────┐",
      "                     │ grantedDays      │  │  AuditLog        │",
      "                     │ usedDays         │  ├──────────────────┤",
      "                     │ carriedOverDays  │  │ id (PK)          │",
      "                     │ expiredDays      │  │ userId (FK)      │",
      "                     │ expiresAt        │  │ action           │",
      "                     └──────────────────┘  │ targetType       │",
      "                                           │ targetId         │",
      "                                           │ detail           │",
      "                                           └──────────────────┘",
    ]),
    emptyLine(),

    heading2("5.2 全テーブル一覧"),
    makeTable(
      ["テーブル名", "用途", "主要カラム"],
      [
        ["User", "ユーザーマスタ", "email, role, department, status, paidLeaveBalance"],
        ["Attendance", "日次打刻記録", "userId, date, checkIn/Out, workMin, overtimeMin"],
        ["LeaveRequest", "休暇申請", "userId, type, startDate, endDate, days, status"],
        ["Approval", "承認ワークフロー", "requesterId, approverId, type, status, dueAt"],
        ["OvertimeRecord", "月次残業集計", "userId, year, month, totalOvertimeMin"],
        ["PaidLeaveGrant", "有給付与記録", "userId, grantDate, grantedDays, usedDays, expiresAt"],
        ["Session", "ログインセッション", "userId, tokenFamily, deviceInfo（最大3）"],
        ["RefreshToken", "トークン管理", "tokenFamily, isRevoked"],
        ["PasswordHistory", "パスワード変更履歴", "userId, passwordHash"],
        ["ApprovalDelegation", "承認代理委任", "delegatorId, delegateId, startDate, endDate"],
        ["MissedStampAlert", "打刻漏れアラート", "userId, date, type"],
        ["Holiday", "祝日マスタ", "date, name, year"],
        ["AuditLog", "監査ログ", "userId, action, targetType, targetId, detail"],
        ["Setting", "システム設定", "key, value"],
      ]
    ),
    emptyLine(),

    heading2("5.3 主要インデックス"),
    ...codeBlock([
      "CREATE INDEX idx_user_dept_role    ON User(department, role);",
      "CREATE UNIQUE INDEX idx_att_user_date ON Attendance(userId, date);",
      "CREATE INDEX idx_leave_user_status ON LeaveRequest(userId, status);",
      "CREATE INDEX idx_approval_approver ON Approval(approverId, status);",
      "CREATE INDEX idx_audit_user        ON AuditLog(userId);",
      "CREATE INDEX idx_audit_created     ON AuditLog(createdAt);",
    ]),
    emptyLine(),
    pageBreak(),
  ];
}

// ============================================================
// 6. 認証・認可設計
// ============================================================
function section6(): Paragraph[] {
  return [
    heading1("6. 認証・認可設計"),
    separator(),

    heading2("6.1 ロール階層（昇順）"),
    ...codeBlock([
      "社員 → リーダー → 主査 → 主事 → 所長代理 → 課長 → 所長 → 参事 → 部長 → 統括部長 → 取締役 → システム管理者",
    ]),
    emptyLine(),

    heading2("6.2 権限マトリクス"),
    makeTable(
      ["権限", "システム管理者", "取締役", "統括部長", "部長", "参事以下"],
      [
        ["打刻（自分）", "○", "○", "○", "○", "○"],
        ["休暇申請", "○", "○", "○", "○", "○"],
        ["管理画面アクセス", "○", "○", "○", "○", "×"],
        ["承認権限", "○", "○", "○", "○", "×"],
        ["Excel エクスポート", "○", "○", "○", "○", "×"],
        ["社員管理", "○", "○", "○", "○", "×"],
        ["システム設定", "○", "○", "×", "×", "×"],
      ]
    ),
    emptyLine(),

    heading2("6.3 JWT トークン仕様"),
    makeTable(
      ["項目", "値"],
      [
        ["アクセストークン有効期限", "15分"],
        ["リフレッシュトークン有効期限", "14日"],
        ["最大同時セッション数", "3"],
        ["トークン格納場所", "HTTP-only Cookie（kintai_token）"],
        ["署名アルゴリズム", "HS256"],
      ]
    ),
    emptyLine(),

    heading2("6.4 アカウントロックアウト"),
    makeTable(
      ["失敗回数", "ロック期間"],
      [
        ["5回", "15分"],
        ["10回", "1時間"],
        ["15回", "管理者による手動解除"],
      ]
    ),
    emptyLine(),
    pageBreak(),
  ];
}

// ============================================================
// 7. API一覧
// ============================================================
function section7(): Paragraph[] {
  return [
    heading1("7. API一覧"),
    separator(),

    heading2("7.1 従業員ポータル API（:3000）"),
    makeTable(
      ["エンドポイント", "メソッド", "認証", "説明"],
      [
        ["/api/auth/login", "POST", "×", "ログイン（JWT発行）"],
        ["/api/auth/logout", "POST", "○", "ログアウト（Cookie削除）"],
        ["/api/auth/me", "GET", "○", "現在のユーザー情報取得"],
        ["/api/auth/register", "POST", "×", "セルフ登録（承認待ち）"],
        ["/api/auth/quicklogin", "POST", "×", "デモ用クイックログイン"],
        ["/api/attendance", "GET", "○", "自分の勤怠記録取得"],
        ["/api/attendance", "POST", "○", "打刻（出勤/退勤）"],
        ["/api/approvals", "GET", "○", "自分宛の承認依頼一覧"],
        ["/api/requests", "GET", "○", "自分の休暇申請一覧"],
        ["/api/requests", "POST", "○", "休暇申請作成"],
        ["/api/users", "GET", "○", "ユーザー一覧取得"],
        ["/api/users", "PATCH", "○", "プロフィール更新"],
        ["/api/settings", "GET", "○", "システム設定取得"],
      ]
    ),
    emptyLine(),

    heading2("7.2 管理者ポータル API（:3001）"),
    makeTable(
      ["エンドポイント", "メソッド", "認証", "説明"],
      [
        ["/api/auth/login", "POST", "×", "管理者ログイン"],
        ["/api/auth/logout", "POST", "○", "管理者ログアウト"],
        ["/api/auth/me", "GET", "○", "管理者ユーザー情報"],
        ["/api/approvals", "GET", "○", "全承認一覧"],
        ["/api/approvals", "POST", "○", "承認・却下処理"],
        ["/api/attendance", "GET", "○", "全社員の月次勤怠集計"],
        ["/api/excel/export", "POST", "○", "勤怠データ Excel エクスポート"],
        ["/api/users", "GET", "○", "社員管理一覧"],
        ["/api/users", "PATCH", "○", "社員情報更新"],
        ["/api/users/approve", "POST", "○", "登録申請の承認"],
        ["/api/admin", "GET/POST", "○", "管理者専用操作"],
        ["/api/settings", "GET", "○", "システム設定取得"],
        ["/api/settings", "PATCH", "○", "システム設定変更"],
        ["/api/settings/test-email", "POST", "○", "テストメール送信"],
      ]
    ),
    emptyLine(),
    pageBreak(),
  ];
}

// ============================================================
// 8. フロントエンド画面構成
// ============================================================
function section8(): Paragraph[] {
  return [
    heading1("8. フロントエンド画面構成"),
    separator(),

    heading2("8.1 従業員ポータル画面（:3000）"),
    ...codeBlock([
      "/login          ログイン画面",
      "/register       セルフ登録画面",
      "/               ホーム（ダッシュボード）",
      "/stamp          打刻画面（時計 + 出勤/在宅/退勤ボタン、みなし休憩60分控除）",
      "/employee/",
      "  ├── stamp/    打刻操作（詳細）",
      "  ├── daily/    日次勤怠一覧",
      "  ├── monthly/  月次サマリ・統計",
      "  └── requests/ 休暇申請作成・一覧",
      "",
      "[ナビゲーション（ボトムタブ）]",
      "  打刻 | 日次一覧 | 月次サマリ | 申請 | その他",
    ]),
    emptyLine(),

    heading2("8.2 管理者ポータル画面（:3001）"),
    ...codeBlock([
      "/login          管理者ログイン画面",
      "/               ダッシュボード（KPI表示）",
      "/attendance     月次勤怠一覧（全社員）",
      "/approvals      承認管理",
      "/members        社員管理（登録・編集・退職処理）",
      "/master         マスタ管理（祝日・設定）",
      "/overtime       残業モニタリング・36協定アラート",
      "/settings       システム設定",
    ]),
    emptyLine(),
    pageBreak(),
  ];
}

// ============================================================
// 9. ビジネスロジック
// ============================================================
function section9(): Paragraph[] {
  return [
    heading1("9. ビジネスロジック"),
    separator(),

    heading2("9.1 有給休暇管理（就業規則 第59条準拠）"),
    bodyText("ファイル: packages/shared/src/services/leave.service.ts", { bold: true }),
    emptyLine(),

    heading3("付与日数テーブル（第59条第1項）"),
    makeTable(
      ["勤続年数", "入社時", "6ヶ月", "1年", "2年", "3年", "4年", "5年", "6年以上"],
      [
        ["付与日数", "2日", "8日", "11日", "12日", "14日", "16日", "18日", "20日"],
      ]
    ),
    emptyLine(),

    heading3("基準日・付与日（第59条第2項・第3項）"),
    makeTable(
      ["入社時期", "基準日", "付与日"],
      [
        ["1月1日〜6月30日入社", "6月30日", "7月1日"],
        ["7月1日〜12月31日入社", "12月31日", "1月1日"],
      ]
    ),
    emptyLine(),
    bullet("入社時付与: 入社日当日に2日付与"),
    bullet("みなし規定: 入社日〜最初の基準日が6ヶ月未満の場合、6ヶ月勤続とみなして付与"),
    emptyLine(),

    heading3("消化ルール"),
    bullet("FIFO方式 - 古い付与分から優先消化"),
    bullet("2年で失効 - 付与日から2年経過で自動失効"),
    bullet("年5日取得義務 - アラートレベル: ok → yellow → orange → red"),
    bullet("半休対応 - 午前半休(0.5日)・午後半休(0.5日)"),
    emptyLine(),

    heading2("9.1b みなし休憩控除"),
    bodyText("定数: DEEMED_BREAK_MIN = 60（packages/shared/src/constants.ts）", { bold: true }),
    emptyLine(),
    bodyText("休憩打刻を廃止し、退勤時にみなし60分を自動控除する方式。"),
    bullet("退勤API（action: 'out'）実行時に breakTotalMin = 60 を自動セット"),
    bullet("workMin = (退勤時刻 - 出勤時刻) - 60分"),
    bullet("休憩ボタン（break-start / break-end）は削除済み"),
    bullet("breakingステータスは廃止"),
    emptyLine(),

    heading2("9.2 残業管理・36協定チェック"),
    bodyText("ファイル: packages/shared/src/services/overtime.service.ts", { bold: true }),
    emptyLine(),

    heading3("監視レベル"),
    makeTable(
      ["レベル", "条件", "対応"],
      [
        ["ok", "36h未満/月", "問題なし"],
        ["caution", "36h以上/月", "注意喚起"],
        ["warning", "45h以上/月", "原則上限超過"],
        ["serious", "60h以上/月", "要改善"],
        ["critical", "80h以上/月", "産業医面談対象"],
        ["violation", "100h以上/月", "法令違反"],
      ]
    ),
    emptyLine(),

    heading3("チェック項目"),
    bullet("月次上限（原則45時間）"),
    bullet("年次上限（360時間）"),
    bullet("2〜6ヶ月平均（80時間以下）"),
    bullet("特別条項（年6回まで45h超可）"),
    bullet("休憩時間コンプライアンス（6h超→45分、8h超→60分）"),
    emptyLine(),

    heading2("9.3 監査ログ"),
    bodyText("ファイル: packages/shared/src/audit/logger.ts", { bold: true }),
    emptyLine(),
    bodyText("記録対象アクション:"),
    ...codeBlock([
      "login, logout, login_failed,",
      "stamp_in, stamp_out, stamp_break,",
      "approve, reject,",
      "create, update, delete,",
      "password_change, export, settings_change",
    ]),
    emptyLine(),

    heading2("9.4 メール通知"),
    bodyText("ファイル: packages/shared/src/services/email.service.ts", { bold: true }),
    emptyLine(),

    heading3("通知トリガー"),
    makeTable(
      ["トリガー", "送信先", "タイミング", "設定キー"],
      [
        ["休暇申請", "承認者", "申請時即時", "notifyApprovalRequest"],
        ["承認/却下", "申請者", "処理時即時", "notifyApprovalResult"],
        ["打刻漏れ", "本人", "バッチ（毎日22時）", "notifyMissedStamp"],
        ["残業警告", "本人", "バッチ（毎月1日）", "notifyOvertimeWarning"],
      ]
    ),
    emptyLine(),

    heading3("SMTP設定"),
    bodyText("管理画面 → 設定 → 通知設定タブで構成。Settingテーブルに以下のキーで保存:"),
    bullet("smtpHost, smtpPort, smtpSecure, smtpUser, smtpPass"),
    bullet("smtpFromAddress, smtpFromName"),
    bullet("emailNotifications（全体オン/オフ）"),
    bullet("各通知タイプ別オン/オフ"),
    emptyLine(),

    heading3("メールテンプレート"),
    bodyText("5種類のHTMLテンプレートを内蔵:"),
    bullet("承認依頼メール（approvalRequestEmail）"),
    bullet("承認結果メール（approvalResultEmail）"),
    bullet("打刻漏れアラートメール（missedStampEmail）"),
    bullet("残業警告メール（overtimeWarningEmail）"),
    bullet("テスト送信メール（testEmail）"),
    emptyLine(),
    pageBreak(),
  ];
}

// ============================================================
// 10. バッチ処理・定期ジョブ
// ============================================================
function section10(): Paragraph[] {
  return [
    heading1("10. バッチ処理・定期ジョブ"),
    separator(),
    bodyText("ファイル: apps/kintai-admin/lib/cron/init.ts", { bold: true }),
    emptyLine(),
    makeTable(
      ["スケジュール", "ジョブ名", "処理内容"],
      [
        ["毎日 00:05", "有給自動付与", "基準日方式（7/1・1/1）で年次有給休暇を自動付与 + 入社時2日付与"],
        ["毎日 00:10", "有給失効処理", "2年経過した有給休暇を自動失効"],
        ["平日 22:00", "打刻漏れチェック", "退勤打刻忘れ・打刻なしをアラート + メール通知"],
        ["毎時", "承認エスカレーション", "72時間以上放置された承認を上位者へ"],
        ["毎月1日 01:00", "残業月次集計", "前月の残業時間を確定・記録 + メール通知"],
      ]
    ),
    emptyLine(),
    pageBreak(),
  ];
}

// ============================================================
// 11. 環境設定・バックエンド構成
// ============================================================
function section11(): Paragraph[] {
  return [
    heading1("11. 環境設定・バックエンド構成"),
    separator(),

    heading2("11.1 環境変数"),
    bodyText("各アプリおよび shared パッケージに .env ファイルが必要です。"),
    emptyLine(),
    ...codeBlock([
      "# データベース接続先",
      'DATABASE_URL="file:C:/temp/kintai/dev.db"',
      "",
      "# JWT 秘密鍵（本番環境では必ず変更すること）",
      'JWT_SECRET="kintai-app-secret-key-change-in-production-2024"',
    ]),
    emptyLine(),
    bodyText("設置場所:"),
    bullet("apps/kintai-app/.env"),
    bullet("apps/kintai-admin/.env"),
    bullet("packages/shared/.env"),
    emptyLine(),

    heading2("11.2 Prisma 設定"),
    bodyText("ファイル: packages/shared/prisma/schema.prisma", { bold: true }),
    emptyLine(),
    ...codeBlock([
      "datasource db {",
      '  provider = "sqlite"',
      '  url      = env("DATABASE_URL")',
      "}",
      "",
      "generator client {",
      '  provider = "prisma-client-js"',
      "}",
    ]),
    emptyLine(),
    bodyText("DBファイル格納場所: C:/temp/kintai/dev.db"),
    emptyLine(),

    heading2("11.3 システム設定（Setting テーブル）"),
    makeTable(
      ["キー", "デフォルト値", "説明"],
      [
        ["companyName", "株式会社サンプル", "会社名"],
        ["businessHoursStart", "09:00", "始業時刻"],
        ["businessHoursEnd", "18:00", "終業時刻"],
        ["standardWorkHours", "8", "所定労働時間"],
        ["overtimeThreshold", "45", "残業アラート閾値（分）"],
        ["monthlyLimit", "60", "月間残業上限（時間）"],
        ["yearlyLimit", "720", "年間残業上限（時間）"],
      ]
    ),
    emptyLine(),

    heading2("11.4 ポート設定"),
    makeTable(
      ["アプリ", "ポート", "用途"],
      [
        ["kintai-app", "3000", "従業員ポータル"],
        ["kintai-admin", "3001", "管理者ポータル"],
      ]
    ),
    emptyLine(),

    heading2("11.5 モノレポ構成"),
    ...codeBlock([
      "{",
      '  "name": "kintai-monorepo",',
      '  "workspaces": ["packages/*", "apps/*"]',
      "}",
    ]),
    emptyLine(),
    bodyText("@kintai/shared は各アプリから npm workspaces によりローカルリンクで参照されます。"),
    pageBreak(),
  ];
}

// ============================================================
// 12. デモアカウント一覧
// ============================================================
function section12(): Paragraph[] {
  return [
    heading1("12. デモアカウント一覧"),
    separator(),
    bodyTextMulti([tr("パスワード: ", { bold: true }), tr("全アカウント共通 password123")]),
    emptyLine(),
    makeTable(
      ["名前", "メールアドレス", "役職", "部署", "権限"],
      [
        ["河村 佳徳", "kawamura@company.example.com", "取締役", "管理部", "管理者（管理画面+承認+Excel）"],
        ["鈴木 英俊", "suzuki@company.example.com", "部長", "工事部", "承認者・Excel出力"],
        ["河田 匡広", "kawata@company.example.com", "部長", "管理部", "承認者・Excel出力"],
        ["串間 絵理", "kushima@company.example.com", "課長", "管理部", "一般（従業員ポータルのみ）"],
        ["笠間 成央", "kasama@company.example.com", "リーダー", "管理部", "一般（従業員ポータルのみ）"],
        ["小田原 秀哉", "odawara@company.example.com", "システム管理者", "工事部", "全権限"],
      ]
    ),
    emptyLine(),

    heading2("ロール別アクセス範囲"),
    ...codeBlock([
      "河村（取締役）        → 従業員ポータル + 管理者ポータル（全機能）",
      "鈴木（部長）          → 従業員 + 管理者ポータル（承認・勤怠管理・Excel出力）",
      "河田（部長）          → 従業員 + 管理者ポータル（承認・勤怠管理・Excel出力）",
      "串間（課長）          → 従業員ポータルのみ",
      "笠間（リーダー）       → 従業員ポータルのみ",
      "小田原（システム管理者） → 従業員ポータル + 管理者ポータル（全機能 + システム設定）",
    ]),
    emptyLine(),
    pageBreak(),
  ];
}

// ============================================================
// 13. 開発・運用コマンド
// ============================================================
function section13(): Paragraph[] {
  return [
    heading1("13. 開発・運用コマンド"),
    separator(),

    heading2("13.1 基本コマンド"),
    ...codeBlock([
      "# 開発サーバー起動（両アプリ同時）",
      "npm run dev",
      "",
      "# 従業員ポータルのみ起動",
      "npm run dev:app",
      "",
      "# 管理者ポータルのみ起動",
      "npm run dev:admin",
      "",
      "# ビルド",
      "npm run build",
    ]),
    emptyLine(),

    heading2("13.2 データベース操作"),
    ...codeBlock([
      "# マイグレーション実行",
      "npm run db:migrate",
      "",
      "# 初期データ投入（デモアカウント作成）",
      "npm run db:seed",
      "",
      "# Prisma Studio（DB GUI）",
      "npm run db:studio",
      "",
      "# スキーマ変更後のクライアント再生成",
      "cd packages/shared && npx prisma generate",
    ]),
    emptyLine(),

    heading2("13.3 テスト"),
    ...codeBlock([
      "# 全テスト実行",
      "npm run test",
      "",
      "# 単体テスト（shared パッケージ）",
      "npm run test:unit",
      "",
      "# ウォッチモード",
      "npm run test:watch",
      "",
      "# カバレッジ",
      "npm run test:coverage",
      "",
      "# E2E テスト",
      "npm run test:e2e",
    ]),
    emptyLine(),

    heading2("13.4 トラブルシュート"),
    ...codeBlock([
      "# DB をリセットして再シード",
      "cd packages/shared && npx prisma migrate reset --force",
      "",
      "# Prisma クライアント再生成",
      "cd packages/shared && npx prisma generate",
      "",
      "# node_modules 再インストール",
      "rm -rf node_modules && npm install",
    ]),
    emptyLine(),
    pageBreak(),
  ];
}

// ============================================================
// 14. セキュリティ設計
// ============================================================
function section14(): Paragraph[] {
  return [
    heading1("14. セキュリティ設計"),
    separator(),

    heading2("14.1 認証セキュリティ"),
    makeTable(
      ["項目", "実装"],
      [
        ["パスワードハッシュ", "bcryptjs（ソルトラウンド: 12）"],
        ["パスワード強度", "最低8文字、英字+数字必須"],
        ["トークン格納", "HTTP-only Cookie（XSS防御）"],
        ["セッション制限", "ユーザーあたり最大3セッション"],
        ["トークンローテーション", "tokenFamily によるリプレイ攻撃防御"],
        ["アカウントロック", "段階的ロックアウト（5/10/15回）"],
      ]
    ),
    emptyLine(),

    heading2("14.2 監査証跡"),
    bullet("全ログイン/ログアウトを記録"),
    bullet("打刻操作は全件ログ"),
    bullet("承認・却下はコメント付きで記録"),
    bullet("設定変更は変更前後を記録"),
    bullet("IPアドレス・デバイス情報を保持"),
    emptyLine(),
    pageBreak(),
  ];
}

// ============================================================
// 15. 今後の拡張ポイント
// ============================================================
function section15(): Paragraph[] {
  return [
    heading1("15. 今後の拡張ポイント"),
    separator(),

    heading2("データベース移行"),
    bullet("SQLite → PostgreSQL への移行は schema.prisma の provider を変更するだけ"),
    bullet("接続文字列を .env で切り替え"),
    emptyLine(),

    heading2("機能拡張候補"),
    bodyTextMulti([tr("✅ メール通知（承認依頼・アラート） ― 実装済み")], { indent: { left: convertMillimetersToTwip(5) } }),
    bullet("Slack/Teams 連携"),
    bullet("打刻 GPS 位置記録"),
    bullet("シフト管理機能"),
    bullet("給与計算連携（CSV出力）"),
    bullet("PWA オフライン対応"),
    bullet("Docker コンテナ化・CI/CD パイプライン"),
    emptyLine(),

    heading2("インフラ"),
    bullet("Docker Compose による開発環境標準化"),
    bullet("Vercel / AWS デプロイ設定"),
    bullet("GitHub Actions CI/CD"),
    emptyLine(),
    pageBreak(),
  ];
}

// ============================================================
// 付録: 主要ファイル早見表
// ============================================================
function appendixSection(): Paragraph[] {
  return [
    heading1("付録: 主要ファイル早見表"),
    separator(),
    emptyLine(),
    makeTable(
      ["変更したい内容", "ファイルパス"],
      [
        ["ロール・部署の追加変更", "packages/shared/src/constants.ts"],
        ["DB テーブル変更", "packages/shared/prisma/schema.prisma"],
        ["バリデーションルール", "packages/shared/src/validators.ts"],
        ["型定義", "packages/shared/src/types.ts"],
        ["認証ロジック", "packages/shared/src/auth/"],
        ["有給計算ロジック", "packages/shared/src/services/leave.service.ts"],
        ["残業チェックロジック", "packages/shared/src/services/overtime.service.ts"],
        ["監査ログ", "packages/shared/src/audit/logger.ts"],
        ["メール通知", "packages/shared/src/services/email.service.ts"],
        ["バッチジョブ", "apps/kintai-admin/lib/cron/init.ts"],
        ["デモデータ", "apps/kintai-app/scripts/seed.ts"],
        ["従業員画面", "apps/kintai-app/app/"],
        ["管理者画面", "apps/kintai-admin/app/"],
        ["環境変数", "各 .env ファイル"],
      ]
    ),
    emptyLine(),
    emptyLine(),
    separator(),
    emptyLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [tr("本ドキュメントは担当者変更時の引き継ぎ資料として作成されました。", { size: 20, italics: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [tr("システムの全体像を把握し、安全に開発・運用を継続するための参考としてください。", { size: 20, italics: true })],
    }),
  ];
}

// ============================================================
// ドキュメント生成
// ============================================================
async function main() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: "游ゴシック",
            size: 22,
          },
          paragraph: {
            spacing: { line: 360 },
          },
        },
        heading1: {
          run: { font: "游ゴシック", size: 32, bold: true },
          paragraph: { spacing: { before: 480, after: 240 } },
        },
        heading2: {
          run: { font: "游ゴシック", size: 28, bold: true },
          paragraph: { spacing: { before: 360, after: 200 } },
        },
        heading3: {
          run: { font: "游ゴシック", size: 24, bold: true },
          paragraph: { spacing: { before: 240, after: 160 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertMillimetersToTwip(25),
              bottom: convertMillimetersToTwip(25),
              left: convertMillimetersToTwip(25),
              right: convertMillimetersToTwip(25),
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: "勤怠管理システム - システム設計書",
                    font: "游ゴシック",
                    size: 18,
                    color: "888888",
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    font: "游ゴシック",
                    size: 18,
                    color: "888888",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...coverPage(),
          ...tocPage(),
          ...section1(),
          ...section2(),
          ...section3(),
          ...section4(),
          ...section5(),
          ...section6(),
          ...section7(),
          ...section8(),
          ...section9(),
          ...section10(),
          ...section11(),
          ...section12(),
          ...section13(),
          ...section14(),
          ...section15(),
          ...appendixSection(),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, "SYSTEM_ARCHITECTURE.docx");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Architecture document generated: ${outputPath}`);
  console.log(`File size: ${(buffer.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("Error generating architecture document:", err);
  process.exit(1);
});
