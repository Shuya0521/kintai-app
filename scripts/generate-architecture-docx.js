const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  TableOfContents, HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak
} = require('docx');

// ── Helpers ──────────────────────────────────────
const PAGE_W = 11906; // A4
const PAGE_H = 16838;
const MARGIN = 1440;
const CONTENT_W = PAGE_W - MARGIN * 2; // 9026

const BLUE = "1F4E79";
const LIGHT_BLUE = "D6E4F0";
const LIGHT_GRAY = "F2F2F2";
const MED_GRAY = "E0E0E0";
const WHITE = "FFFFFF";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: BLUE, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: WHITE, font: "Meiryo UI", size: 18 })] })]
  });
}

function cell(text, width, opts = {}) {
  const { bold, center, fill, mono } = opts;
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, bold: !!bold, font: mono ? "Consolas" : "Meiryo UI", size: 18 })]
    })]
  });
}

function makeTable(headers, rows, colWidths) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((h, i) => headerCell(h, colWidths[i])) }),
      ...rows.map((row, ri) => new TableRow({
        children: row.map((c, ci) => {
          if (typeof c === 'object') return cell(c.text, colWidths[ci], c);
          return cell(c, colWidths[ci], { fill: ri % 2 === 1 ? LIGHT_GRAY : undefined });
        })
      }))
    ]
  });
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 400, after: 200 }, children: [new TextRun({ text, font: "Meiryo UI" })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 150 }, children: [new TextRun({ text, font: "Meiryo UI" })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 }, children: [new TextRun({ text, font: "Meiryo UI" })] });
}
function p(text, opts = {}) {
  const runs = [];
  // Simple bold marker support: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (part.startsWith('**') && part.endsWith('**')) {
      runs.push(new TextRun({ text: part.slice(2, -2), bold: true, font: opts.mono ? "Consolas" : "Meiryo UI", size: 20 }));
    } else {
      runs.push(new TextRun({ text: part, font: opts.mono ? "Consolas" : "Meiryo UI", size: 20 }));
    }
  }
  return new Paragraph({ spacing: { after: 120 }, children: runs });
}
function codeBlock(lines) {
  return lines.map(line => new Paragraph({
    spacing: { after: 0 },
    shading: { fill: "F5F5F5", type: ShadingType.CLEAR },
    indent: { left: 200 },
    children: [new TextRun({ text: line || " ", font: "Consolas", size: 16 })]
  }));
}
function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, font: "Meiryo UI", size: 20 })]
  });
}
function spacer() {
  return new Paragraph({ spacing: { after: 80 }, children: [] });
}

// ── Document Build ──────────────────────────────
async function main() {
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Meiryo UI", size: 20 } }
      },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 32, bold: true, font: "Meiryo UI", color: BLUE },
          paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0,
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BLUE, space: 4 } } } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 26, bold: true, font: "Meiryo UI", color: "2E75B6" },
          paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 22, bold: true, font: "Meiryo UI", color: "404040" },
          paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
      ]
    },
    numbering: {
      config: [{
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
      }, {
        reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }]
      }]
    },
    sections: [
      // ── Cover Page ──
      {
        properties: {
          page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } }
        },
        children: [
          spacer(), spacer(), spacer(), spacer(), spacer(), spacer(), spacer(), spacer(),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 100 },
            children: [new TextRun({ text: "SYSTEM ARCHITECTURE DOCUMENT", font: "Meiryo UI", size: 22, color: "888888" })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 3, color: BLUE, space: 20 } },
            children: [new TextRun({ text: "勤怠管理システム", font: "Meiryo UI", size: 52, bold: true, color: BLUE })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 600 },
            children: [new TextRun({ text: "システム設計書", font: "Meiryo UI", size: 36, color: "555555" })] }),
          spacer(), spacer(), spacer(),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
            children: [new TextRun({ text: "最終更新日: 2026-03-13", font: "Meiryo UI", size: 22, color: "666666" })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
            children: [new TextRun({ text: "管理者: 小田原 秀哉（システム管理者）", font: "Meiryo UI", size: 22, color: "666666" })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
            children: [new TextRun({ text: "プロジェクト名: kintai-monorepo", font: "Meiryo UI", size: 22, color: "666666" })] }),
        ]
      },
      // ── TOC ──
      {
        properties: {
          page: { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN } }
        },
        headers: {
          default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "勤怠管理システム - システム設計書", font: "Meiryo UI", size: 16, color: "999999", italics: true })] })] })
        },
        footers: {
          default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: "Meiryo UI", size: 18 })] })] })
        },
        children: [
          h1("目次"),
          new TableOfContents("目次", { hyperlink: true, headingStyleRange: "1-3" }),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 1. システム概要 ──
          h1("1. システム概要"),
          p("本システムは、日本の労働基準法・36協定に準拠した**勤怠管理Webアプリケーション**です。"),
          p("従業員ポータル（打刻・申請）と管理者ポータル（承認・集計・エクスポート）の2つのアプリで構成されています。"),
          spacer(),
          ...codeBlock([
            "+-----------------------------------------------------------+",
            "|                   勤怠管理システム                          |",
            "|                                                           |",
            "|  +------------------+    +----------------------+         |",
            "|  |  従業員ポータル    |    |  管理者ポータル        |         |",
            "|  |  (kintai-app)    |    |  (kintai-admin)      |         |",
            "|  |  :3000           |    |  :3001               |         |",
            "|  +--------+---------+    +----------+-----------+         |",
            "|           |                         |                     |",
            "|           +--------+----------------+                     |",
            "|                    v                                      |",
            "|          +-----------------+                              |",
            "|          |  @kintai/shared  |                              |",
            "|          |  (共通ライブラリ)  |                              |",
            "|          +--------+--------+                              |",
            "|                   v                                       |",
            "|          +-----------------+                              |",
            "|          |  SQLite (Prisma) |                              |",
            "|          |  C:/temp/kintai/ |                              |",
            "|          +-----------------+                              |",
            "+-----------------------------------------------------------+",
          ]),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 2. 技術スタック ──
          h1("2. 技術スタック"),
          makeTable(
            ["区分", "技術", "バージョン", "用途"],
            [
              ["フレームワーク", "Next.js", "16.1.6", "フルスタック React フレームワーク"],
              ["UI", "React", "19.2.3", "コンポーネント UI"],
              ["スタイル", "Tailwind CSS", "v4", "ユーティリティファースト CSS"],
              ["言語", "TypeScript", "^5", "型安全な JavaScript"],
              ["ORM", "Prisma", "5.22.0", "データベースアクセス"],
              ["DB", "SQLite", "-", "開発用DB（PostgreSQL切替可能）"],
              ["認証", "jsonwebtoken", "^9.0.3", "JWT トークン認証"],
              ["暗号化", "bcryptjs", "^3.0.3", "パスワードハッシュ"],
              ["バリデーション", "Zod", "^3.23.8", "ランタイムスキーマ検証"],
              ["定期処理", "node-cron", "^4.2.1", "バッチジョブスケジューラ"],
              ["Excel", "exceljs", "^4.4.0", "帳票エクスポート"],
              ["テスト", "Vitest + Playwright", "-", "単体テスト + E2E テスト"],
              ["パッケージ管理", "npm workspaces", "-", "モノレポ構成"],
            ],
            [2000, 2200, 1500, 3326]
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 3. ディレクトリ構成 ──
          h1("3. ディレクトリ構成"),
          ...codeBlock([
            "勤怠ｱﾌﾟﾘ/",
            "├── apps/",
            "│   ├── kintai-app/              # 従業員ポータル（:3000）",
            "│   │   ├── app/",
            "│   │   │   ├── api/             # バックエンド API ルート",
            "│   │   │   │   ├── auth/        # 認証系",
            "│   │   │   │   ├── attendance/  # 打刻・勤怠取得",
            "│   │   │   │   ├── approvals/   # 承認一覧",
            "│   │   │   │   ├── requests/    # 休暇申請",
            "│   │   │   │   ├── users/       # ユーザー情報",
            "│   │   │   │   └── settings/    # 設定取得",
            "│   │   │   ├── login/           # ログイン画面",
            "│   │   │   ├── register/        # セルフ登録画面",
            "│   │   │   ├── stamp/           # 打刻画面",
            "│   │   │   └── employee/        # 従業員メイン画面",
            "│   │   │       ├── stamp/       # 打刻操作",
            "│   │   │       ├── daily/       # 日次勤怠",
            "│   │   │       ├── monthly/     # 月次サマリ",
            "│   │   │       └── requests/    # 休暇申請",
            "│   │   ├── components/          # React コンポーネント",
            "│   │   ├── lib/                 # ユーティリティ",
            "│   │   └── scripts/seed.ts      # 初期データ投入",
            "│   │",
            "│   └── kintai-admin/            # 管理者ポータル（:3001）",
            "│       ├── app/api/             # 管理系 API",
            "│       ├── app/attendance/      # 勤怠一覧画面",
            "│       ├── app/approvals/       # 承認管理画面",
            "│       ├── app/members/         # 社員管理画面",
            "│       ├── app/overtime/        # 残業モニタリング",
            "│       ├── app/settings/        # システム設定",
            "│       └── lib/cron/init.ts     # バッチジョブ定義",
            "│",
            "├── packages/shared/             # 共通ライブラリ",
            "│   ├── prisma/schema.prisma     # DB スキーマ定義",
            "│   └── src/",
            "│       ├── constants.ts         # ロール・部署・定数",
            "│       ├── types.ts             # TypeScript 型定義",
            "│       ├── validators.ts        # Zod バリデーション",
            "│       ├── auth/               # 認証ロジック",
            "│       ├── services/           # ビジネスロジック",
            "│       └── audit/logger.ts     # 監査ログ",
            "│",
            "├── docs/                        # ドキュメント",
            "├── e2e/                         # E2E テスト",
            "└── package.json                 # モノレポルート",
          ]),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 4. アーキテクチャ図 ──
          h1("4. アーキテクチャ図"),
          h2("4.1 リクエストフロー"),
          ...codeBlock([
            "[ブラウザ] --HTTP--> [Next.js App Router]",
            "                          |",
            "                          +-- /app/page.tsx        <- SSR ページ",
            "                          +-- /app/api/**/route.ts <- API ルート",
            "                                    |",
            "                               +----+----+",
            "                               v         v",
            "                         [認証チェック]  [Zod検証]",
            "                               |         |",
            "                               +----+----+",
            "                                    v",
            "                            [@kintai/shared]",
            "                            | services/ | <- ビジネスロジック",
            "                            | auth/     | <- 認証・認可",
            "                            | audit/    | <- 監査ログ",
            "                                    v",
            "                             [Prisma Client]",
            "                                    v",
            "                             [SQLite DB]",
          ]),
          spacer(),
          h2("4.2 認証フロー"),
          ...codeBlock([
            "[ログイン] -> [メールアドレス + パスワード送信]",
            "    |",
            "    v",
            "[bcrypt でパスワード照合] --失敗--> [失敗カウント++]",
            "    |                                    |",
            "   成功                           5回 -> 15分ロック",
            "    |                            10回 -> 1時間ロック",
            "    v                            15回 -> 管理者手動解除",
            "[JWT アクセストークン生成（15分）]",
            "[JWT リフレッシュトークン生成（7日）]",
            "    |",
            "    v",
            "[HTTP-only Cookie にセット]",
            "    |",
            "    v",
            "[以降: Cookie から自動送信 -> verifyToken() -> ロール判定]",
          ]),
          spacer(),
          h2("4.3 承認ワークフロー"),
          ...codeBlock([
            "[従業員: 休暇申請]",
            "    v",
            "[LeaveRequest 作成（status: pending）]",
            "    v",
            "[Approval レコード作成]",
            "    v",
            "[承認者（部長以上）が管理画面で確認]",
            "    |-- 承認 -> 有給残日数から消化 -> status: approved",
            "    |-- 却下 -> コメント付き通知 -> status: rejected",
            "    +-- 72時間放置 -> エスカレーション -> 上位権限者へ",
          ]),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 5. データベース設計 ──
          h1("5. データベース設計"),
          h2("5.1 ER図（主要テーブル）"),
          ...codeBlock([
            "+-------------+    +----------------+    +-------------+",
            "|    User     |    |  Attendance    |    | LeaveRequest|",
            "+-------------+    +----------------+    +-------------+",
            "| id (PK)     |<-+ | id (PK)        |    | id (PK)     |",
            "| email (UQ)  |  | | userId (FK)    |-+  | userId (FK) |-+",
            "| employeeNo  |  | | date           | |  | type        | |",
            "| passwordHash|  | | checkInTime    | |  | startDate   | |",
            "| lastName    |  | | checkOutTime   | |  | endDate     | |",
            "| firstName   |  | | breakTotalMin  | |  | days        | |",
            "| role        |  | | workMin        | |  | status      | |",
            "| department  |  | | overtimeMin    | |  +-------------+ |",
            "| hireDate    |  | +----------------+ |                  |",
            "| status      |  |  UQ(userId,date)   |  +-------------+ |",
            "+-------------+  |                    |  |  Approval   | |",
            "      ^          | +----------------+ |  +-------------+ |",
            "      |          | | OvertimeRecord | |  | requesterId |-+",
            "      |          | +----------------+ |  | approverId  |-+",
            "      |          | | userId (FK)    |-+  | type        | |",
            "      |          | | year, month    |    | status      | |",
            "      |          | | totalOvertimeM |    +-------------+ |",
            "      |          | +----------------+                    |",
            "      |          |                     +----------------+|",
            "      |          | +----------------+  |  Session       ||",
            "      |          +-| PaidLeaveGrant |  +----------------+|",
            "      |            +----------------+  | userId (FK)    |+",
            "      +------------| userId (FK)    |  | tokenFamily   |",
            "                   | grantedDays    |  | deviceInfo    |",
            "                   | usedDays       |  +----------------+",
            "                   | expiresAt      |",
            "                   +----------------+  +----------------+",
            "                                       |  AuditLog     |",
            "                                       +----------------+",
            "                                       | userId, action |",
            "                                       | targetType/Id  |",
            "                                       +----------------+",
          ]),
          spacer(),
          h2("5.2 全テーブル一覧"),
          makeTable(
            ["テーブル名", "用途", "主要カラム"],
            [
              [{ text: "User", bold: true }, "ユーザーマスタ", "email, role, department, status"],
              [{ text: "Attendance", bold: true }, "日次打刻記録", "userId, date, checkIn/Out, workMin"],
              [{ text: "LeaveRequest", bold: true }, "休暇申請", "userId, type, startDate, endDate, status"],
              [{ text: "Approval", bold: true }, "承認ワークフロー", "requesterId, approverId, type, status"],
              [{ text: "OvertimeRecord", bold: true }, "月次残業集計", "userId, year, month, totalOvertimeMin"],
              [{ text: "PaidLeaveGrant", bold: true }, "有給付与記録", "userId, grantDate, grantedDays, expiresAt"],
              [{ text: "Session", bold: true }, "ログインセッション", "userId, tokenFamily, deviceInfo"],
              [{ text: "RefreshToken", bold: true }, "トークン管理", "tokenFamily, isRevoked"],
              [{ text: "PasswordHistory", bold: true }, "パスワード変更履歴", "userId, passwordHash"],
              [{ text: "ApprovalDelegation", bold: true }, "承認代理委任", "delegatorId, delegateId, startDate"],
              [{ text: "MissedStampAlert", bold: true }, "打刻漏れアラート", "userId, date, type"],
              [{ text: "Holiday", bold: true }, "祝日マスタ", "date, name, year"],
              [{ text: "AuditLog", bold: true }, "監査ログ", "userId, action, targetType, detail"],
              [{ text: "Setting", bold: true }, "システム設定", "key, value"],
            ],
            [2200, 2200, 4626]
          ),
          spacer(),
          h2("5.3 主要インデックス"),
          ...codeBlock([
            "CREATE INDEX idx_user_dept_role      ON User(department, role);",
            "CREATE UNIQUE INDEX idx_att_user_date ON Attendance(userId, date);",
            "CREATE INDEX idx_leave_user_status    ON LeaveRequest(userId, status);",
            "CREATE INDEX idx_approval_approver    ON Approval(approverId, status);",
            "CREATE INDEX idx_audit_user           ON AuditLog(userId);",
            "CREATE INDEX idx_audit_created        ON AuditLog(createdAt);",
          ]),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 6. 認証・認可設計 ──
          h1("6. 認証・認可設計"),
          h2("6.1 ロール階層（昇順）"),
          ...codeBlock([
            "社員 -> リーダー -> 主査 -> 主事 -> 所長代理 -> 課長 -> 所長 -> 参事 -> 部長 -> 統括部長 -> 取締役 -> システム管理者"
          ]),
          spacer(),
          h2("6.2 権限マトリクス"),
          makeTable(
            ["権限", "システム管理者", "取締役", "統括部長", "部長", "課長以下"],
            [
              ["打刻（自分）",     {text:"○",center:true}, {text:"○",center:true}, {text:"○",center:true}, {text:"○",center:true}, {text:"○",center:true}],
              ["休暇申請",        {text:"○",center:true}, {text:"○",center:true}, {text:"○",center:true}, {text:"○",center:true}, {text:"○",center:true}],
              ["管理画面アクセス", {text:"○",center:true}, {text:"○",center:true}, {text:"○",center:true}, {text:"○",center:true}, {text:"×",center:true}],
              ["承認権限",        {text:"○",center:true}, {text:"○",center:true}, {text:"○",center:true}, {text:"○",center:true}, {text:"×",center:true}],
              ["Excel出力",      {text:"○",center:true}, {text:"○",center:true}, {text:"○",center:true}, {text:"○",center:true}, {text:"×",center:true}],
              ["社員管理",        {text:"○",center:true}, {text:"○",center:true}, {text:"○",center:true}, {text:"○",center:true}, {text:"×",center:true}],
              ["システム設定",    {text:"○",center:true}, {text:"○",center:true}, {text:"×",center:true}, {text:"×",center:true}, {text:"×",center:true}],
            ],
            [1800, 1500, 1500, 1500, 1500, 1226]
          ),
          spacer(),
          p("**管理画面アクセス（ADMIN_ROLES）:** システム管理者・取締役・統括部長・部長"),
          p("**承認・Excel出力（APPROVER/EXPORT_ROLES）:** ADMIN_ROLESと同じ"),
          p("**システム設定:** システム管理者・取締役のみ"),
          spacer(),
          h2("6.3 JWT トークン仕様"),
          makeTable(
            ["項目", "値"],
            [
              ["アクセストークン有効期限", "15分"],
              ["リフレッシュトークン有効期限", "7日"],
              ["最大同時セッション数", "3"],
              ["トークン格納場所", "HTTP-only Cookie (kintai_token)"],
              ["署名アルゴリズム", "HS256"],
            ],
            [4000, 5026]
          ),
          spacer(),
          h2("6.4 アカウントロックアウト"),
          makeTable(
            ["失敗回数", "ロック期間"],
            [
              ["5回", "15分"],
              ["10回", "1時間"],
              ["15回", "管理者による手動解除"],
            ],
            [4000, 5026]
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 7. API一覧 ──
          h1("7. API一覧"),
          h2("7.1 従業員ポータル API（:3000）"),
          makeTable(
            ["エンドポイント", "メソッド", "認証", "説明"],
            [
              [{text:"/api/auth/login",mono:true}, "POST", {text:"×",center:true}, "ログイン（JWT発行）"],
              [{text:"/api/auth/logout",mono:true}, "POST", {text:"○",center:true}, "ログアウト"],
              [{text:"/api/auth/me",mono:true}, "GET", {text:"○",center:true}, "現在のユーザー情報取得"],
              [{text:"/api/auth/register",mono:true}, "POST", {text:"×",center:true}, "セルフ登録（承認待ち）"],
              [{text:"/api/auth/quicklogin",mono:true}, "POST", {text:"×",center:true}, "デモ用クイックログイン"],
              [{text:"/api/attendance",mono:true}, "GET", {text:"○",center:true}, "自分の勤怠記録取得"],
              [{text:"/api/attendance",mono:true}, "POST", {text:"○",center:true}, "打刻操作"],
              [{text:"/api/approvals",mono:true}, "GET", {text:"○",center:true}, "自分宛の承認依頼一覧"],
              [{text:"/api/requests",mono:true}, "GET", {text:"○",center:true}, "自分の休暇申請一覧"],
              [{text:"/api/requests",mono:true}, "POST", {text:"○",center:true}, "休暇申請作成"],
              [{text:"/api/users",mono:true}, "GET", {text:"○",center:true}, "ユーザー一覧取得"],
              [{text:"/api/users",mono:true}, "PATCH", {text:"○",center:true}, "プロフィール更新"],
              [{text:"/api/settings",mono:true}, "GET", {text:"○",center:true}, "システム設定取得"],
            ],
            [3000, 1000, 700, 4326]
          ),
          spacer(),
          h2("7.2 管理者ポータル API（:3001）"),
          makeTable(
            ["エンドポイント", "メソッド", "認証", "説明"],
            [
              [{text:"/api/auth/login",mono:true}, "POST", {text:"×",center:true}, "管理者ログイン"],
              [{text:"/api/auth/logout",mono:true}, "POST", {text:"○",center:true}, "管理者ログアウト"],
              [{text:"/api/auth/me",mono:true}, "GET", {text:"○",center:true}, "管理者ユーザー情報"],
              [{text:"/api/approvals",mono:true}, "GET", {text:"○",center:true}, "全承認一覧"],
              [{text:"/api/approvals",mono:true}, "POST", {text:"○",center:true}, "承認・却下処理"],
              [{text:"/api/attendance",mono:true}, "GET", {text:"○",center:true}, "全社員の月次勤怠集計"],
              [{text:"/api/excel/export",mono:true}, "POST", {text:"○",center:true}, "Excel エクスポート"],
              [{text:"/api/users",mono:true}, "GET", {text:"○",center:true}, "社員管理一覧"],
              [{text:"/api/users",mono:true}, "PATCH", {text:"○",center:true}, "社員情報更新"],
              [{text:"/api/users/approve",mono:true}, "POST", {text:"○",center:true}, "登録申請の承認"],
              [{text:"/api/admin",mono:true}, "GET/POST", {text:"○",center:true}, "管理者専用操作"],
              [{text:"/api/settings",mono:true}, "GET", {text:"○",center:true}, "システム設定取得"],
              [{text:"/api/settings",mono:true}, "PATCH", {text:"○",center:true}, "システム設定変更"],
            ],
            [3000, 1000, 700, 4326]
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 8. フロントエンド画面構成 ──
          h1("8. フロントエンド画面構成"),
          h2("8.1 従業員ポータル画面（:3000）"),
          makeTable(
            ["パス", "画面名", "説明"],
            [
              [{text:"/login",mono:true}, "ログイン", "メール + パスワード入力"],
              [{text:"/register",mono:true}, "セルフ登録", "新規ユーザー登録"],
              [{text:"/",mono:true}, "ホーム", "ダッシュボード"],
              [{text:"/stamp",mono:true}, "打刻", "時計 + 出勤/在宅/退勤ボタン"],
              [{text:"/employee/stamp",mono:true}, "打刻操作", "詳細打刻画面"],
              [{text:"/employee/daily",mono:true}, "日次勤怠", "日次勤怠一覧"],
              [{text:"/employee/monthly",mono:true}, "月次サマリ", "月次統計・サマリ"],
              [{text:"/employee/requests",mono:true}, "休暇申請", "休暇申請作成・一覧"],
            ],
            [3000, 1800, 4226]
          ),
          spacer(),
          h2("8.2 管理者ポータル画面（:3001）"),
          makeTable(
            ["パス", "画面名", "説明"],
            [
              [{text:"/login",mono:true}, "管理者ログイン", "管理者認証"],
              [{text:"/",mono:true}, "ダッシュボード", "KPI表示"],
              [{text:"/attendance",mono:true}, "勤怠一覧", "月次勤怠（全社員）"],
              [{text:"/approvals",mono:true}, "承認管理", "休暇承認処理"],
              [{text:"/members",mono:true}, "社員管理", "登録・編集・退職処理"],
              [{text:"/master",mono:true}, "マスタ管理", "祝日・設定"],
              [{text:"/overtime",mono:true}, "残業モニタリング", "36協定アラート"],
              [{text:"/settings",mono:true}, "システム設定", "各種設定変更"],
            ],
            [3000, 2200, 3826]
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 9. ビジネスロジック ──
          h1("9. ビジネスロジック"),
          h2("9.1 有給休暇管理"),
          p("**ファイル:** packages/shared/src/services/leave.service.ts"),
          spacer(),
          h3("法定付与日数テーブル（労働基準法準拠）"),
          makeTable(
            ["勤続年数", "付与日数"],
            [
              ["0.5年", "10日"], ["1.5年", "11日"], ["2.5年", "12日"],
              ["3.5年", "14日"], ["4.5年", "16日"], ["5.5年", "18日"],
              ["6.5年以上", "20日"],
            ],
            [4500, 4526]
          ),
          spacer(),
          h3("消化ルール"),
          bullet("FIFO方式 - 古い付与分から優先消化"),
          bullet("2年で失効 - 付与日から2年経過で自動失効"),
          bullet("年5日取得義務 - アラートレベル: ok / yellow / orange / red"),
          bullet("半休対応 - 午前半休(0.5日)・午後半休(0.5日)"),
          spacer(),
          h2("9.2 残業管理・36協定チェック"),
          p("**ファイル:** packages/shared/src/services/overtime.service.ts"),
          spacer(),
          h3("監視レベル"),
          makeTable(
            ["レベル", "条件", "対応"],
            [
              [{text:"ok",mono:true}, "36h未満/月", "問題なし"],
              [{text:"caution",mono:true}, "36h以上/月", "注意喚起"],
              [{text:"warning",mono:true}, "45h以上/月", "原則上限超過"],
              [{text:"serious",mono:true}, "60h以上/月", "要改善"],
              [{text:"critical",mono:true,bold:true}, "80h以上/月", {text:"産業医面談対象",bold:true}],
              [{text:"violation",mono:true,bold:true}, "100h以上/月", {text:"法令違反",bold:true}],
            ],
            [2000, 3000, 4026]
          ),
          spacer(),
          h3("チェック項目"),
          new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "月次上限（原則45時間）", font: "Meiryo UI", size: 20 })] }),
          new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "年次上限（360時間）", font: "Meiryo UI", size: 20 })] }),
          new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "2〜6ヶ月平均（80時間以下）", font: "Meiryo UI", size: 20 })] }),
          new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "特別条項（年6回まで45h超可）", font: "Meiryo UI", size: 20 })] }),
          new Paragraph({ numbering: { reference: "numbers", level: 0 }, children: [new TextRun({ text: "休憩時間コンプライアンス（6h超→45分、8h超→60分）", font: "Meiryo UI", size: 20 })] }),
          spacer(),
          h2("9.3 監査ログ"),
          p("**ファイル:** packages/shared/src/audit/logger.ts"),
          p("**記録対象アクション:**"),
          ...codeBlock([
            "login, logout, login_failed,",
            "stamp_in, stamp_out, stamp_break,",
            "approve, reject,",
            "create, update, delete,",
            "password_change, export, settings_change",
          ]),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 10. バッチ処理 ──
          h1("10. バッチ処理・定期ジョブ"),
          p("**ファイル:** apps/kintai-admin/lib/cron/init.ts"),
          spacer(),
          makeTable(
            ["スケジュール", "ジョブ名", "処理内容"],
            [
              ["毎日 00:05", "有給自動付与", "入社日ベースで年次有給休暇を自動付与"],
              ["毎日 00:10", "有給失効処理", "2年経過した有給休暇を自動失効"],
              ["平日 22:00", "打刻漏れチェック", "退勤打刻忘れ・打刻なしをアラート"],
              ["毎時", "承認エスカレーション", "72時間以上放置された承認を上位者へ"],
              ["毎月1日 01:00", "残業月次集計", "前月の残業時間を確定・記録"],
            ],
            [2000, 2500, 4526]
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 11. 環境設定 ──
          h1("11. 環境設定・バックエンド構成"),
          h2("11.1 環境変数"),
          p("各アプリおよび shared パッケージに .env ファイルが必要です。"),
          spacer(),
          ...codeBlock([
            "# データベース接続先",
            'DATABASE_URL="file:C:/temp/kintai/dev.db"',
            "",
            "# JWT 秘密鍵（本番環境では必ず変更すること）",
            'JWT_SECRET="kintai-app-secret-key-change-in-production-2024"',
          ]),
          spacer(),
          p("**設置場所:**"),
          bullet("apps/kintai-app/.env"),
          bullet("apps/kintai-admin/.env"),
          bullet("packages/shared/.env"),
          spacer(),
          p("**本番環境移行時の注意:**"),
          bullet("JWT_SECRET は必ずランダムな文字列に変更"),
          bullet("DATABASE_URL は PostgreSQL 等の本番 DB に変更"),
          bullet(".env ファイルはリポジトリにコミットしない"),
          spacer(),
          h2("11.2 Prisma 設定"),
          p("**ファイル:** packages/shared/prisma/schema.prisma"),
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
          p("**DB ファイル格納場所:** C:/temp/kintai/dev.db"),
          spacer(),
          h2("11.3 システム設定（Setting テーブル）"),
          makeTable(
            ["キー", "デフォルト値", "説明"],
            [
              [{text:"companyName",mono:true}, "株式会社サンプル", "会社名"],
              [{text:"businessHoursStart",mono:true}, "09:00", "始業時刻"],
              [{text:"businessHoursEnd",mono:true}, "18:00", "終業時刻"],
              [{text:"standardWorkHours",mono:true}, "8", "所定労働時間"],
              [{text:"overtimeThreshold",mono:true}, "45", "残業アラート閾値（分）"],
              [{text:"monthlyLimit",mono:true}, "60", "月間残業上限（時間）"],
              [{text:"yearlyLimit",mono:true}, "720", "年間残業上限（時間）"],
            ],
            [3000, 2500, 3526]
          ),
          spacer(),
          h2("11.4 ポート設定"),
          makeTable(
            ["アプリ", "ポート", "用途"],
            [
              ["kintai-app", "3000", "従業員ポータル"],
              ["kintai-admin", "3001", "管理者ポータル"],
            ],
            [3000, 2000, 4026]
          ),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 12. デモアカウント ──
          h1("12. デモアカウント一覧"),
          p("**パスワード:** 全アカウント共通 password123"),
          spacer(),
          makeTable(
            ["名前", "メールアドレス", "役職", "部署", "権限"],
            [
              ["河村 佳徳", "kawamura@company.example.com", "取締役", "管理部", "管理画面+全権限"],
              ["鈴木 英俊", "suzuki@company.example.com", "部長", "工事部", "管理画面+承認+Excel"],
              ["河田 匡広", "kawata@company.example.com", "部長", "管理部", "管理画面+承認+Excel"],
              ["串間 絵理", "kushima@company.example.com", "課長", "管理部", "一般"],
              ["笠間 成央", "kasama@company.example.com", "リーダー", "管理部", "一般"],
              [{text:"小田原 秀哉",bold:true}, "odawara@company.example.com", {text:"システム管理者",bold:true}, "工事部", {text:"全権限",bold:true}],
            ],
            [1500, 3200, 1500, 1000, 1826]
          ),
          spacer(),
          h2("ロール別アクセス範囲"),
          ...codeBlock([
            "小田原（システム管理者） -> 従業員 + 管理者ポータル（全機能 + システム設定）",
            "河村（取締役）          -> 従業員 + 管理者ポータル（全機能）",
            "鈴木（部長）            -> 従業員 + 管理者ポータル（承認・勤怠管理・Excel出力）",
            "河田（部長）            -> 従業員 + 管理者ポータル（承認・勤怠管理・Excel出力）",
            "串間（課長）            -> 従業員ポータルのみ",
            "笠間（リーダー）         -> 従業員ポータルのみ",
          ]),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 13. 開発・運用コマンド ──
          h1("13. 開発・運用コマンド"),
          h2("13.1 基本コマンド"),
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
          spacer(),
          h2("13.2 データベース操作"),
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
          spacer(),
          h2("13.3 テスト"),
          ...codeBlock([
            "npm run test          # 全テスト実行",
            "npm run test:unit     # 単体テスト（shared）",
            "npm run test:watch    # ウォッチモード",
            "npm run test:coverage # カバレッジ",
            "npm run test:e2e      # E2E テスト",
            "npm run test:e2e:ui   # E2E（UI付き）",
          ]),
          spacer(),
          h2("13.4 トラブルシュート"),
          ...codeBlock([
            "# DB リセット + 再シード",
            "cd packages/shared && npx prisma migrate reset --force",
            "",
            "# Prisma クライアント再生成",
            "cd packages/shared && npx prisma generate",
            "",
            "# node_modules 再インストール",
            "rm -rf node_modules && npm install",
          ]),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 14. セキュリティ設計 ──
          h1("14. セキュリティ設計"),
          h2("14.1 認証セキュリティ"),
          makeTable(
            ["項目", "実装"],
            [
              ["パスワードハッシュ", "bcryptjs（ソルトラウンド: 12）"],
              ["パスワード強度", "最低8文字、英字+数字必須"],
              ["トークン格納", "HTTP-only Cookie（XSS防御）"],
              ["セッション制限", "ユーザーあたり最大3セッション"],
              ["トークンローテーション", "tokenFamily によるリプレイ攻撃防御"],
              ["アカウントロック", "段階的ロックアウト（5/10/15回）"],
            ],
            [3500, 5526]
          ),
          spacer(),
          h2("14.2 監査証跡"),
          bullet("全ログイン/ログアウトを記録"),
          bullet("打刻操作は全件ログ"),
          bullet("承認・却下はコメント付きで記録"),
          bullet("設定変更は変更前後を記録"),
          bullet("IP アドレス・デバイス情報を保持"),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 15. 今後の拡張ポイント ──
          h1("15. 今後の拡張ポイント"),
          h2("データベース移行"),
          bullet("SQLite -> PostgreSQL: schema.prisma の provider を変更するだけ"),
          bullet("接続文字列を .env で切り替え"),
          spacer(),
          h2("機能拡張候補"),
          bullet("メール通知（承認依頼・アラート）"),
          bullet("Slack/Teams 連携"),
          bullet("打刻 GPS 位置記録"),
          bullet("シフト管理機能"),
          bullet("給与計算連携（CSV出力）"),
          bullet("PWA オフライン対応"),
          bullet("Docker コンテナ化・CI/CD パイプライン"),
          spacer(),
          h2("インフラ"),
          bullet("Docker Compose による開発環境標準化"),
          bullet("Vercel / AWS デプロイ設定"),
          bullet("GitHub Actions CI/CD"),
          new Paragraph({ children: [new PageBreak()] }),

          // ── 付録 ──
          h1("付録: 主要ファイル早見表"),
          p("変更したい内容に応じて、以下のファイルを参照してください。"),
          spacer(),
          makeTable(
            ["変更したい内容", "ファイルパス"],
            [
              ["ロール・部署の追加変更", {text:"packages/shared/src/constants.ts",mono:true}],
              ["DB テーブル変更", {text:"packages/shared/prisma/schema.prisma",mono:true}],
              ["バリデーションルール", {text:"packages/shared/src/validators.ts",mono:true}],
              ["型定義", {text:"packages/shared/src/types.ts",mono:true}],
              ["認証ロジック", {text:"packages/shared/src/auth/",mono:true}],
              ["有給計算ロジック", {text:"packages/shared/src/services/leave.service.ts",mono:true}],
              ["残業チェックロジック", {text:"packages/shared/src/services/overtime.service.ts",mono:true}],
              ["監査ログ", {text:"packages/shared/src/audit/logger.ts",mono:true}],
              ["バッチジョブ", {text:"apps/kintai-admin/lib/cron/init.ts",mono:true}],
              ["デモデータ", {text:"apps/kintai-app/scripts/seed.ts",mono:true}],
              ["従業員画面", {text:"apps/kintai-app/app/",mono:true}],
              ["管理者画面", {text:"apps/kintai-admin/app/",mono:true}],
              ["環境変数", {text:"各 .env ファイル",mono:true}],
            ],
            [3500, 5526]
          ),
          spacer(), spacer(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 400 },
            border: { top: { style: BorderStyle.SINGLE, size: 2, color: BLUE, space: 10 } },
            children: [new TextRun({ text: "本ドキュメントは担当者変更時の引き継ぎ資料として作成されました。", font: "Meiryo UI", size: 20, italics: true, color: "666666" })]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "システムの全体像を把握し、安全に開発・運用を継続するための参考としてください。", font: "Meiryo UI", size: 20, italics: true, color: "666666" })]
          }),
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const outPath = "C:/Users/小田原秀哉/Desktop/勤怠ｱﾌﾟﾘ/docs/SYSTEM_ARCHITECTURE.docx";
  fs.writeFileSync(outPath, buffer);
  console.log("Created: " + outPath);
  console.log("Size: " + (buffer.length / 1024).toFixed(1) + " KB");
}

main().catch(e => { console.error(e); process.exit(1); });
