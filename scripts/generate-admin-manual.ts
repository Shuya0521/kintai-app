import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  AlignmentType,
  HeadingLevel,
  PageNumber,
  Header,
  Footer,
  BorderStyle,
  convertInchesToTwip,
  ShadingType,
  WidthType,
  Table,
  TableRow,
  TableCell,
} from "docx";
import * as fs from "fs";
import * as path from "path";

// ── Paths ──
const ROOT = path.join("C:", "Users", "小田原秀哉", "Desktop", "勤怠ｱﾌﾟﾘ");
const SCREENSHOTS_DIR = path.join(ROOT, "docs", "screenshots");
const OUTPUT_PATH = path.join(ROOT, "docs", "KINTAI_管理者マニュアル.docx");

// ── Image helper ──
function loadImage(filename: string): Buffer {
  const p = path.join(SCREENSHOTS_DIR, filename);
  if (!fs.existsSync(p)) {
    console.warn(`WARNING: Screenshot not found: ${p}`);
    return Buffer.alloc(0);
  }
  return fs.readFileSync(p);
}

// Screenshot width ~450pt = 450*9525 EMU. Aspect ratio for 2560x1600 screenshots.
const IMG_WIDTH_PT = 450;
const IMG_HEIGHT_PT = Math.round(IMG_WIDTH_PT * (1600 / 2560)); // 281pt

function screenshotParagraph(
  filename: string,
  caption: string
): Paragraph[] {
  const data = loadImage(filename);
  if (data.length === 0) {
    return [
      new Paragraph({
        spacing: { after: 120 },
        children: [
          new TextRun({
            text: `[画像: ${filename} が見つかりません]`,
            size: 22,
            font: "游ゴシック",
            color: "CC0000",
          }),
        ],
      }),
    ];
  }
  return [
    new Paragraph({
      spacing: { before: 100, after: 60 },
      children: [
        new TextRun({
          text: caption,
          size: 20,
          font: "游ゴシック",
          color: "555555",
          italics: true,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [
        new ImageRun({
          data,
          transformation: {
            width: IMG_WIDTH_PT,
            height: IMG_HEIGHT_PT,
          },
          type: "png",
        }),
      ],
    }),
  ];
}

// ── Text helpers ──
function heading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 32,
        font: "游ゴシック",
      }),
    ],
  });
}

function heading2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 28,
        font: "游ゴシック",
      }),
    ],
  });
}

function heading3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24,
        font: "游ゴシック",
      }),
    ],
  });
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    children: [
      new TextRun({
        text,
        size: 22,
        font: "游ゴシック",
      }),
    ],
  });
}

function bodyTextRuns(runs: TextRun[]): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    children: runs,
  });
}

function boldBodyText(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 360 },
    children: [
      new TextRun({
        text,
        size: 22,
        font: "游ゴシック",
        bold: true,
      }),
    ],
  });
}

function bulletItem(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80, line: 360 },
    indent: { left: convertInchesToTwip(0.3) },
    children: [
      new TextRun({
        text: `・${text}`,
        size: 22,
        font: "游ゴシック",
      }),
    ],
  });
}

function numberedStep(num: string, text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 100, line: 360 },
    indent: { left: convertInchesToTwip(0.3) },
    children: [
      new TextRun({
        text: `${num} `,
        size: 22,
        font: "游ゴシック",
        bold: true,
      }),
      new TextRun({
        text,
        size: 22,
        font: "游ゴシック",
      }),
    ],
  });
}

function cautionBlock(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 150, after: 150, line: 360 },
    indent: { left: convertInchesToTwip(0.3) },
    shading: { type: ShadingType.SOLID, color: "FFF3CD" },
    border: {
      left: { style: BorderStyle.SINGLE, size: 6, color: "FF9800" },
    },
    children: [
      new TextRun({
        text: `\u26A0\uFE0F ご注意: ${text}`,
        size: 22,
        font: "游ゴシック",
        bold: true,
        color: "CC6600",
      }),
    ],
  });
}

function separatorLine(): Paragraph {
  return new Paragraph({
    spacing: { before: 100, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 3, color: "333333" },
    },
    children: [new TextRun({ text: "", size: 2 })],
  });
}

function emptyParagraph(): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: "", size: 22 })],
  });
}

function chapterCapabilities(items: string[]): Paragraph[] {
  const result: Paragraph[] = [];
  result.push(
    new Paragraph({
      spacing: { before: 100, after: 80, line: 360 },
      shading: { type: ShadingType.SOLID, color: "E8F5E9" },
      children: [
        new TextRun({
          text: "\uD83D\uDCCB この章でできること",
          size: 22,
          font: "游ゴシック",
          bold: true,
          color: "2E7D32",
        }),
      ],
    })
  );
  for (const item of items) {
    result.push(
      new Paragraph({
        spacing: { after: 60, line: 360 },
        indent: { left: convertInchesToTwip(0.3) },
        shading: { type: ShadingType.SOLID, color: "E8F5E9" },
        children: [
          new TextRun({
            text: `\u2705 ${item}`,
            size: 22,
            font: "游ゴシック",
            color: "2E7D32",
          }),
        ],
      })
    );
  }
  result.push(emptyParagraph());
  return result;
}

function pageBreak(): Paragraph {
  return new Paragraph({
    children: [new TextRun({ break: 1 } as any)],
    pageBreakBefore: true,
  });
}

function tocEntry(chapter: string, title: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80, line: 360 },
    children: [
      new TextRun({
        text: `${chapter}  ${title}`,
        size: 22,
        font: "游ゴシック",
      }),
    ],
  });
}

// ── Build Document ──
async function generateManual() {
  console.log("管理者マニュアルを生成中...");

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
      },
    },
    sections: [
      // ════════════════════════════════════════
      // 表紙
      // ════════════════════════════════════════
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
          },
        },
        children: [
          emptyParagraph(),
          emptyParagraph(),
          emptyParagraph(),
          emptyParagraph(),
          emptyParagraph(),
          emptyParagraph(),
          emptyParagraph(),
          emptyParagraph(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "勤怠管理システム",
                size: 40,
                font: "游ゴシック",
                bold: true,
                color: "1565C0",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "「KINTAI」",
                size: 56,
                font: "游ゴシック",
                bold: true,
                color: "1565C0",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "管理者マニュアル",
                size: 44,
                font: "游ゴシック",
                bold: true,
                color: "1565C0",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            border: {
              top: { style: BorderStyle.SINGLE, size: 3, color: "1565C0" },
              bottom: { style: BorderStyle.SINGLE, size: 3, color: "1565C0" },
            },
            children: [
              new TextRun({
                text: " ",
                size: 22,
              }),
            ],
          }),
          emptyParagraph(),
          emptyParagraph(),
          emptyParagraph(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "株式会社サン・カミヤ",
                size: 28,
                font: "游ゴシック",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({
                text: "2026年3月",
                size: 24,
                font: "游ゴシック",
              }),
            ],
          }),
          emptyParagraph(),
          emptyParagraph(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "※ 本マニュアルは管理者専用です。お取り扱いにご注意ください。",
                size: 20,
                font: "游ゴシック",
                color: "888888",
                italics: true,
              }),
            ],
          }),
        ],
      },

      // ════════════════════════════════════════
      // 目次 ＋ 本文
      // ════════════════════════════════════════
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
              right: convertInchesToTwip(1.2),
            },
            pageNumbers: { start: 1 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                border: {
                  bottom: {
                    style: BorderStyle.SINGLE,
                    size: 1,
                    color: "AAAAAA",
                  },
                },
                children: [
                  new TextRun({
                    text: "KINTAI 管理者マニュアル",
                    size: 18,
                    font: "游ゴシック",
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
                    size: 18,
                    font: "游ゴシック",
                    color: "888888",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // ── 目次 ──
          heading1("目次"),
          separatorLine(),
          emptyParagraph(),
          tocEntry("第1章", "はじめに"),
          tocEntry("第2章", "ログイン方法"),
          tocEntry("第3章", "ダッシュボード"),
          tocEntry("第4章", "休暇申請の承認"),
          tocEntry("第5章", "勤怠一覧"),
          tocEntry("第6章", "メンバー管理"),
          tocEntry("第7章", "残業レポートの確認"),
          tocEntry("第8章", "マスタ管理"),
          tocEntry("第9章", "システム設定"),
          tocEntry("第10章", "Excel出力"),
          tocEntry("第11章", "よくある質問（FAQ）"),
          tocEntry("付録", "お問い合わせ先"),

          // ════════════════════════════════════════
          // 第1章: はじめに
          // ════════════════════════════════════════
          pageBreak(),
          heading1("第1章　はじめに"),
          separatorLine(),
          ...chapterCapabilities([
            "このマニュアルの使い方を理解できます",
            "KINTAIシステムの全体像を把握できます",
            "管理者としての役割を確認できます",
          ]),

          heading2("1.1　このマニュアルについて"),
          bodyText(
            "本マニュアルは、勤怠管理システム「KINTAI」を管理者としてお使いいただくための操作説明書です。日々の承認業務やメンバー管理など、管理者が行うすべての操作について、画面の写真つきで手順を一つひとつ丁寧に説明しています。"
          ),
          bodyText(
            "操作に迷った際は、該当する章をご参照ください。各章の冒頭に「この章でできること」を記載していますので、目的の操作をすぐに見つけることができます。"
          ),
          emptyParagraph(),

          heading2("1.2　システム概要"),
          bodyText(
            "KINTAIは、株式会社サン・カミヤ専用の勤怠管理システムです。以下の2つのアプリで構成されています。"
          ),
          emptyParagraph(),
          boldBodyText("■ 従業員用アプリ（KINTAI）"),
          bodyText(
            "社員の皆さまが日々の出勤・退勤の打刻や、休暇の申請を行うためのアプリです。"
          ),
          bodyTextRuns([
            new TextRun({
              text: "アクセス先: ",
              size: 22,
              font: "游ゴシック",
            }),
            new TextRun({
              text: "http://[サーバーIP]:3000",
              size: 22,
              font: "游ゴシック",
              bold: true,
              color: "1565C0",
            }),
          ]),
          emptyParagraph(),
          boldBodyText("■ 管理者用アプリ（KINTAI管理画面）"),
          bodyText(
            "部長以上の管理者が、社員の勤怠確認・休暇承認・各種設定を行うためのアプリです。管理画面へのアクセスはシステム管理者・取締役・統括部長・部長に限定されています。本マニュアルでは、この管理者用アプリの操作方法を説明します。"
          ),
          bodyTextRuns([
            new TextRun({
              text: "アクセス先: ",
              size: 22,
              font: "游ゴシック",
            }),
            new TextRun({
              text: "http://[サーバーIP]:3001",
              size: 22,
              font: "游ゴシック",
              bold: true,
              color: "1565C0",
            }),
          ]),
          emptyParagraph(),
          cautionBlock(
            "「サーバーIP」の部分は、社内で案内されたIPアドレスに置き換えてください。不明な場合は、情報システム担当者にお問い合わせください。"
          ),
          emptyParagraph(),

          heading2("1.3　管理者の役割と責任"),
          bodyText("管理者には、以下の役割があります。"),
          bulletItem("社員から提出された休暇申請を確認し、承認または却下する"),
          bulletItem("新しく登録された社員のアカウントを承認し、有効化する"),
          bulletItem("社員の勤怠状況を確認し、必要に応じてExcelで出力する"),
          bulletItem("残業時間を確認し、36協定の上限に近い社員へ対応する"),
          bulletItem("部署や祝日などのマスタ情報を管理する"),
          bulletItem("勤務ルールや承認設定などのシステム設定を行う"),
          emptyParagraph(),
          cautionBlock(
            "管理者アカウントの情報（ID・パスワード）は、権限のない方に知られないよう、厳重に管理してください。"
          ),

          // ════════════════════════════════════════
          // 第2章: ログイン方法
          // ════════════════════════════════════════
          pageBreak(),
          heading1("第2章　ログイン方法"),
          separatorLine(),
          ...chapterCapabilities([
            "管理者アプリにログインできます",
            "パスワードを変更できます",
            "iPhoneのホーム画面にアプリを追加できます",
          ]),

          heading2("2.1　管理者アプリのURL"),
          bodyText(
            "管理者アプリには、パソコンまたはスマートフォンのWebブラウザ（Google Chrome、Safari等）からアクセスします。"
          ),
          bodyTextRuns([
            new TextRun({ text: "URL: ", size: 22, font: "游ゴシック" }),
            new TextRun({
              text: "http://[サーバーIP]:3001",
              size: 22,
              font: "游ゴシック",
              bold: true,
              color: "1565C0",
            }),
          ]),
          emptyParagraph(),
          bodyText(
            "上記URLをブラウザのアドレスバーに入力すると、ログイン画面が表示されます。"
          ),
          emptyParagraph(),

          heading2("2.2　ログイン手順"),
          bodyText(
            "以下の手順で管理者アプリにログインしてください。"
          ),
          emptyParagraph(),
          numberedStep("①", "Webブラウザ（Google ChromeやSafari）を開きます。"),
          numberedStep(
            "②",
            "画面上部のアドレスバーに「http://[サーバーIP]:3001」と入力し、Enterキー（またはスマートフォンの「開く」）を押します。"
          ),
          numberedStep(
            "③",
            "ログイン画面が表示されます。【メールアドレス】欄に、管理者用メールアドレスを入力します。"
          ),
          numberedStep(
            "④",
            "【パスワード】欄に、管理者用パスワードを入力します。"
          ),
          numberedStep(
            "⑤",
            "入力内容を確認し、【ログイン】ボタンをクリック（タップ）します。"
          ),
          numberedStep(
            "⑥",
            "ログインに成功すると、ダッシュボード画面が表示されます。"
          ),
          emptyParagraph(),
          ...screenshotParagraph(
            "admin_01_login.png",
            "\u2193 この画面が表示されます（管理者ログイン画面）"
          ),
          emptyParagraph(),
          cautionBlock(
            "パスワードを一定回数間違えると、一時的にログインできなくなる場合があります。パスワードがわからない場合は、情報システム担当者にお問い合わせください。"
          ),
          emptyParagraph(),

          heading2("2.3　パスワード変更方法"),
          bodyText(
            "セキュリティのため、初回ログイン後にパスワードを変更することを推奨します。"
          ),
          emptyParagraph(),
          numberedStep("①", "ログイン後、画面左下のアカウント名をクリックします。"),
          numberedStep("②", "表示されるメニューから【パスワード変更】を選択します。"),
          numberedStep("③", "【現在のパスワード】欄に、今使っているパスワードを入力します。"),
          numberedStep("④", "【新しいパスワード】欄に、新しいパスワードを入力します。"),
          numberedStep("⑤", "【新しいパスワード（確認）】欄に、同じ新しいパスワードをもう一度入力します。"),
          numberedStep("⑥", "【変更する】ボタンをクリックします。"),
          numberedStep("⑦", "「パスワードを変更しました」と表示されたら完了です。"),
          emptyParagraph(),
          cautionBlock(
            "パスワードは8文字以上で、他の人に推測されにくいものを設定してください。メモする場合は、厳重に保管してください。"
          ),
          emptyParagraph(),

          heading2("2.4　iPhoneのホーム画面にアプリを追加する方法"),
          bodyText(
            "KINTAIはPWA（プログレッシブウェブアプリ）に対応しています。iPhoneのホーム画面にアイコンを追加すると、通常のアプリのように素早くアクセスできます。"
          ),
          emptyParagraph(),
          numberedStep("①", "iPhoneのSafariで管理者アプリのURLを開きます。"),
          numberedStep("②", "画面下部の共有ボタン（□に↑のマーク）をタップします。"),
          numberedStep("③", "メニューを上にスクロールし、【ホーム画面に追加】をタップします。"),
          numberedStep("④", "アプリ名を確認し、右上の【追加】をタップします。"),
          numberedStep("⑤", "ホーム画面にKINTAIのアイコンが追加されます。"),
          emptyParagraph(),

          // ════════════════════════════════════════
          // 第3章: ダッシュボード
          // ════════════════════════════════════════
          pageBreak(),
          heading1("第3章　ダッシュボード"),
          separatorLine(),
          ...chapterCapabilities([
            "ダッシュボード画面の見方を理解できます",
            "表示されている各数値の意味がわかります",
            "対応が必要な項目をすぐに把握できます",
          ]),

          heading2("3.1　ダッシュボード画面の開き方"),
          bodyText(
            "ログイン後、最初に表示される画面がダッシュボードです。左側メニューの【ダッシュボード】をクリックすると、いつでもこの画面に戻ることができます。"
          ),
          emptyParagraph(),
          ...screenshotParagraph(
            "admin_02_dashboard.png",
            "\u2193 この画面が表示されます（ダッシュボード画面）"
          ),
          emptyParagraph(),

          heading2("3.2　画面の見方"),
          bodyText(
            "ダッシュボードには、勤怠管理に関する重要な情報が一目でわかるように表示されています。以下に、主な表示項目を説明します。"
          ),
          emptyParagraph(),
          boldBodyText("■ 在宅勤務"),
          bodyText(
            "本日、在宅勤務をしている社員の人数が表示されます。"
          ),
          emptyParagraph(),
          boldBodyText("■ 承認待ち"),
          bodyText(
            "承認待ちの休暇申請の件数が表示されます。数字が表示されている場合は、早めに承認・却下の処理を行ってください。"
          ),
          emptyParagraph(),
          boldBodyText("■ 残業警告"),
          bodyText(
            "36協定の基準を超える、またはそれに近い残業時間の社員がいる場合に人数が表示されます。赤色の表示は、早急な対応が必要です。"
          ),
          emptyParagraph(),
          boldBodyText("■ クイックアクション"),
          bodyText(
            "「全社員 勤怠一覧」のリンクから、勤怠一覧画面にすぐ移動できます。"
          ),
          emptyParagraph(),

          heading2("3.3　各数値の意味"),
          bodyText(
            "ダッシュボードに表示される数値は、すべてリアルタイムで更新されます。画面を開くたびに最新の状態が反映されますので、毎日の業務開始時に確認することをお勧めします。"
          ),
          emptyParagraph(),
          cautionBlock(
            "「承認待ち」に件数が表示されている場合は、社員の業務に影響しますので、できるだけ早く処理してください。"
          ),

          // ════════════════════════════════════════
          // 第4章: 休暇申請の承認
          // ════════════════════════════════════════
          pageBreak(),
          heading1("第4章　休暇申請の承認"),
          separatorLine(),
          ...chapterCapabilities([
            "社員から提出された休暇申請を確認できます",
            "申請を承認または却下できます",
            "有給休暇の残日数が自動で更新される仕組みを理解できます",
          ]),

          heading2("4.1　承認管理画面の開き方"),
          numberedStep("①", "左側メニューの【承認管理】をクリックします。"),
          numberedStep("②", "承認管理画面が表示されます。"),
          emptyParagraph(),
          ...screenshotParagraph(
            "admin_03_approvals.png",
            "\u2193 この画面が表示されます（承認管理画面）"
          ),
          emptyParagraph(),

          heading2("4.2　未処理一覧の確認"),
          bodyText(
            "承認管理画面には、未処理の申請が一覧で表示されます。申請がない場合は「未処理の申請はありません」と表示されます。"
          ),
          emptyParagraph(),
          bodyText(
            "各申請カードには以下の情報が表示されます。"
          ),
          bulletItem("申請者の氏名"),
          bulletItem("申請種別（有給休暇、慶弔休暇、打刻修正など）"),
          bulletItem("申請日・取得希望日"),
          bulletItem("申請理由"),
          emptyParagraph(),

          heading2("4.3　承認の手順"),
          bodyText(
            "休暇申請を承認する手順は以下の通りです。"
          ),
          emptyParagraph(),
          numberedStep("①", "承認管理画面で、承認したい申請カードを確認します。"),
          numberedStep("②", "申請内容（申請者名、休暇種別、取得日、理由）を確認します。"),
          numberedStep("③", "問題がなければ、カード内の【承認】ボタンをクリックします。"),
          numberedStep("④", "確認ダイアログが表示されますので、内容を再度確認して【OK】をクリックします。"),
          numberedStep("⑤", "「承認しました」と表示されたら完了です。"),
          emptyParagraph(),

          heading2("4.4　却下の手順"),
          bodyText(
            "休暇申請を却下する場合の手順は以下の通りです。"
          ),
          emptyParagraph(),
          numberedStep("①", "承認管理画面で、却下したい申請カードを確認します。"),
          numberedStep("②", "カード内の【却下】ボタンをクリックします。"),
          numberedStep("③", "却下理由の入力画面が表示されますので、理由を入力します。"),
          numberedStep("④", "【却下する】ボタンをクリックします。"),
          numberedStep("⑤", "「却下しました」と表示されたら完了です。"),
          emptyParagraph(),
          cautionBlock(
            "却下する場合は、申請者が理由を理解できるよう、具体的な却下理由を入力してください。"
          ),
          emptyParagraph(),

          heading2("4.5　有給残日数の自動計算について"),
          bodyText(
            "有給休暇の申請を承認すると、該当社員の有給休暇残日数が自動的に1日分（半日休暇の場合は0.5日分）減算されます。管理者が手動で残日数を計算・変更する必要はありません。"
          ),
          emptyParagraph(),
          cautionBlock(
            "一度承認した申請は取り消すことができません。承認前に申請内容を十分にご確認ください。誤って承認した場合は、情報システム担当者にご連絡ください。"
          ),

          // ════════════════════════════════════════
          // 第5章: 勤怠一覧
          // ════════════════════════════════════════
          pageBreak(),
          heading1("第5章　勤怠一覧"),
          separatorLine(),
          ...chapterCapabilities([
            "全社員の勤怠データを一覧で確認できます",
            "部署ごとに勤怠データを絞り込めます",
            "各社員の出勤・在宅・有休・残業などの集計を確認できます",
          ]),

          heading2("5.1　勤怠一覧画面の開き方"),
          numberedStep("①", "左側メニューの【勤怠一覧】をクリックします。"),
          numberedStep("②", "勤怠一覧画面が表示され、当月の勤怠データが表示されます。"),
          emptyParagraph(),
          ...screenshotParagraph(
            "admin_04_attendance.png",
            "\u2193 この画面が表示されます（勤怠一覧画面）"
          ),
          emptyParagraph(),

          heading2("5.2　画面の見方"),
          bodyText(
            "勤怠一覧では、社員ごとに以下の項目が表形式で表示されます。"
          ),
          emptyParagraph(),
          bulletItem("出勤: 出勤日数"),
          bulletItem("在宅: 在宅勤務日数"),
          bulletItem("有休: 有給休暇取得日数"),
          bulletItem("特休: 特別休暇取得日数"),
          bulletItem("遅早: 遅刻・早退の時間"),
          bulletItem("残業: 残業時間"),
          bulletItem("休出: 休日出勤日数"),
          bulletItem("合計: 合計勤務日数"),
          emptyParagraph(),

          heading2("5.3　部署フィルターの使い方"),
          bodyText(
            "特定の部署のデータだけを表示したい場合は、部署フィルターを使用します。"
          ),
          emptyParagraph(),
          numberedStep("①", "画面上部の【全部署】ドロップダウンをクリックします。"),
          numberedStep("②", "表示される部署一覧から、確認したい部署を選択します。"),
          numberedStep("③", "選択した部署の社員のみが一覧に表示されます。"),
          numberedStep("④", "全部署のデータに戻す場合は、【全部署】を選択します。"),
          emptyParagraph(),

          heading2("5.4　月の選択方法"),
          bodyText(
            "初期状態では当月のデータが表示されています。過去の月のデータを確認したい場合は、画面上部の月選択で【◀】ボタン（前月）や【▶】ボタン（翌月）をクリックしてください。"
          ),
          emptyParagraph(),
          bodyText(
            "画面下部には、全体の平均残業時間と残業警告の対象人数が表示されます。"
          ),
          emptyParagraph(),

          // ════════════════════════════════════════
          // 第6章: メンバー管理
          // ════════════════════════════════════════
          pageBreak(),
          heading1("第6章　メンバー管理"),
          separatorLine(),
          ...chapterCapabilities([
            "新規登録された社員を承認し有効化できます",
            "社員の部署や役割を変更できます",
            "社員のアカウント状態を確認できます",
          ]),

          heading2("6.1　メンバー管理画面の開き方"),
          numberedStep("①", "左側メニューの【メンバー】をクリックします。"),
          numberedStep("②", "メンバー管理画面が表示され、全社員の一覧が表示されます。"),
          emptyParagraph(),
          ...screenshotParagraph(
            "admin_05_members.png",
            "\u2193 この画面が表示されます（メンバー管理画面）"
          ),
          emptyParagraph(),

          heading2("6.2　画面の見方"),
          bodyText(
            "画面上部には3つのカードが表示されます。"
          ),
          bulletItem("総数: 登録されている全社員の人数"),
          bulletItem("承認待ち: 管理者の承認を待っている新規登録社員の人数"),
          bulletItem("部署数: 登録されている部署の数"),
          emptyParagraph(),
          bodyText(
            "一覧では、各社員のメールアドレス、部署、役職、ステータス、操作ボタンが表示されます。右上の【全部署】【全ステータス】ドロップダウンで、表示を絞り込むことができます。"
          ),
          emptyParagraph(),

          heading2("6.3　新規社員の承認手順"),
          bodyText(
            "従業員用アプリで新しく登録（サインアップ）した社員は、最初は「承認待ち」の状態です。管理者が承認することで、その社員のアカウントが有効になり、勤怠の打刻ができるようになります。"
          ),
          emptyParagraph(),
          numberedStep("①", "メンバー管理画面で、ステータスが「承認待ち」となっている社員を確認します。"),
          numberedStep("②", "該当する社員の行にある【編集】ボタンをクリックします。"),
          numberedStep("③", "氏名・メールアドレスなどの情報が正しいことを確認します。"),
          numberedStep("④", "ステータスを「有効」に変更します。"),
          numberedStep("⑤", "【保存】ボタンをクリックします。"),
          numberedStep("⑥", "社員のステータスが「有効」に変わり、承認完了です。"),
          emptyParagraph(),
          cautionBlock(
            "身に覚えのない登録がある場合は、不正なアカウント作成の可能性があります。承認せず、情報システム担当者にご相談ください。"
          ),
          emptyParagraph(),

          heading2("6.4　社員情報の変更方法"),
          bodyText(
            "社員の部署異動や役職変更があった場合は、以下の手順で情報を更新します。"
          ),
          emptyParagraph(),
          numberedStep("①", "メンバー管理画面で、変更したい社員の行にある【編集】ボタンをクリックします。"),
          numberedStep("②", "変更したい項目を修正します。"),
          emptyParagraph(),
          boldBodyText("変更できる項目:"),
          bulletItem("部署: 営業部、工事部、リフォーム推進部、管理部"),
          bulletItem("役職: システム管理者、取締役、統括部長、部長、課長、リーダー、社員 他"),
          emptyParagraph(),
          numberedStep("③", "変更内容を確認し、【保存】ボタンをクリックします。"),
          numberedStep("④", "「保存しました」と表示されたら完了です。"),
          emptyParagraph(),

          heading2("6.5　社員のステータスについて"),
          bodyText("社員のアカウントには、以下のステータスがあります。"),
          emptyParagraph(),
          boldBodyText("■ 承認待ち"),
          bodyText(
            "新規登録されたばかりの状態です。管理者の承認が必要です。この状態では、社員は勤怠の打刻ができません。"
          ),
          emptyParagraph(),
          boldBodyText("■ 有効"),
          bodyText(
            "管理者に承認され、正常に利用できる状態です。勤怠の打刻や休暇申請が行えます。"
          ),
          emptyParagraph(),
          boldBodyText("■ 無効"),
          bodyText(
            "退職者やアカウント停止された社員の状態です。ログインや各種操作ができなくなります。"
          ),
          emptyParagraph(),

          // ════════════════════════════════════════
          // 第7章: 残業レポートの確認
          // ════════════════════════════════════════
          pageBreak(),
          heading1("第7章　残業レポートの確認"),
          separatorLine(),
          ...chapterCapabilities([
            "社員の残業状況を確認できます",
            "36協定に関する警告レベルの意味を理解できます",
            "警告が出た場合の対応手順がわかります",
          ]),

          heading2("7.1　残業レポート画面の開き方"),
          numberedStep("①", "左側メニューの【残業レポート】をクリックします。"),
          numberedStep("②", "残業レポート画面が表示されます。"),
          emptyParagraph(),
          ...screenshotParagraph(
            "admin_06_overtime.png",
            "\u2193 この画面が表示されます（残業レポート画面）"
          ),
          emptyParagraph(),

          heading2("7.2　画面の見方"),
          bodyText(
            "残業レポートには、3つのサマリーカードと、社員ごとの残業時間ランキングが表示されます。"
          ),
          emptyParagraph(),
          boldBodyText("■ サマリーカード"),
          bulletItem("45h超過（36協定）: 月45時間を超えた社員の人数"),
          bulletItem("80h超過（面接指導）: 月80時間を超え、医師の面接指導が必要な社員の人数"),
          bulletItem("100h超過（上限）: 月100時間を超え、法定上限に違反している社員の人数"),
          emptyParagraph(),
          boldBodyText("■ 残業ランキング"),
          bodyText(
            "社員ごとの残業時間がバーグラフで表示されます。残業時間が多い順に並んでおり、バーの色で警告レベルが一目でわかります。"
          ),
          emptyParagraph(),
          bodyText(
            "画面下部には、36協定の基準値が参考情報として表示されています。"
          ),
          emptyParagraph(),

          heading2("7.3　36協定の警告レベル（詳細）"),
          bodyText(
            "KINTAIでは、36協定（さぶろくきょうてい）に基づいて、残業時間に応じた5段階の警告レベルを設けています。"
          ),
          emptyParagraph(),

          // ── 警告レベルテーブル ──
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header row
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.SOLID, color: "333333" },
                    children: [new Paragraph({ children: [new TextRun({ text: "レベル", size: 22, font: "游ゴシック", bold: true, color: "FFFFFF" })] })],
                  }),
                  new TableCell({
                    width: { size: 20, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.SOLID, color: "333333" },
                    children: [new Paragraph({ children: [new TextRun({ text: "残業時間", size: 22, font: "游ゴシック", bold: true, color: "FFFFFF" })] })],
                  }),
                  new TableCell({
                    width: { size: 15, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.SOLID, color: "333333" },
                    children: [new Paragraph({ children: [new TextRun({ text: "バーの色", size: 22, font: "游ゴシック", bold: true, color: "FFFFFF" })] })],
                  }),
                  new TableCell({
                    width: { size: 50, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.SOLID, color: "333333" },
                    children: [new Paragraph({ children: [new TextRun({ text: "意味と対応", size: 22, font: "游ゴシック", bold: true, color: "FFFFFF" })] })],
                  }),
                ],
              }),
              // Level 1: 注意
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "E8F5E9" },
                    children: [new Paragraph({ children: [new TextRun({ text: "注意", size: 22, font: "游ゴシック", bold: true, color: "2E7D32" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "E8F5E9" },
                    children: [new Paragraph({ children: [new TextRun({ text: "36時間未満", size: 22, font: "游ゴシック" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "E8F5E9" },
                    children: [new Paragraph({ children: [new TextRun({ text: "緑", size: 22, font: "游ゴシック", color: "2E7D32" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "E8F5E9" },
                    children: [new Paragraph({ children: [new TextRun({ text: "正常範囲です。特別な対応は不要です。", size: 22, font: "游ゴシック" })] })],
                  }),
                ],
              }),
              // Level 2: 警告
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFFDE7" },
                    children: [new Paragraph({ children: [new TextRun({ text: "警告", size: 22, font: "游ゴシック", bold: true, color: "F57F17" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFFDE7" },
                    children: [new Paragraph({ children: [new TextRun({ text: "36〜45時間", size: 22, font: "游ゴシック" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFFDE7" },
                    children: [new Paragraph({ children: [new TextRun({ text: "黄", size: 22, font: "游ゴシック", color: "F57F17" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFFDE7" },
                    children: [new Paragraph({ children: [new TextRun({ text: "36協定の上限に近づいています。残業時間の増加に注意してください。", size: 22, font: "游ゴシック" })] })],
                  }),
                ],
              }),
              // Level 3: 深刻（36協定超過）
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFF3E0" },
                    children: [new Paragraph({ children: [new TextRun({ text: "深刻", size: 22, font: "游ゴシック", bold: true, color: "E65100" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFF3E0" },
                    children: [new Paragraph({ children: [new TextRun({ text: "45〜80時間", size: 22, font: "游ゴシック" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFF3E0" },
                    children: [new Paragraph({ children: [new TextRun({ text: "橙", size: 22, font: "游ゴシック", color: "E65100" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFF3E0" },
                    children: [new Paragraph({ children: [new TextRun({ text: "36協定の基準（月45時間）を超過しています。所属部署の責任者に連絡し、業務の調整を行ってください。", size: 22, font: "游ゴシック" })] })],
                  }),
                ],
              }),
              // Level 4: 危険（面接指導）
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFEBEE" },
                    children: [new Paragraph({ children: [new TextRun({ text: "危険", size: 22, font: "游ゴシック", bold: true, color: "C62828" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFEBEE" },
                    children: [new Paragraph({ children: [new TextRun({ text: "80〜100時間", size: 22, font: "游ゴシック" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFEBEE" },
                    children: [new Paragraph({ children: [new TextRun({ text: "赤", size: 22, font: "游ゴシック", color: "C62828" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFEBEE" },
                    children: [new Paragraph({ children: [new TextRun({ text: "医師の面接指導が必要です。該当社員に速やかに面接指導を受けるよう案内し、人事部門にも報告してください。", size: 22, font: "游ゴシック" })] })],
                  }),
                ],
              }),
              // Level 5: 違反（法定上限超過）
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFCDD2" },
                    children: [new Paragraph({ children: [new TextRun({ text: "違反", size: 22, font: "游ゴシック", bold: true, color: "B71C1C" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFCDD2" },
                    children: [new Paragraph({ children: [new TextRun({ text: "100時間以上", size: 22, font: "游ゴシック" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFCDD2" },
                    children: [new Paragraph({ children: [new TextRun({ text: "赤（強調）", size: 22, font: "游ゴシック", color: "B71C1C" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.SOLID, color: "FFCDD2" },
                    children: [new Paragraph({ children: [new TextRun({ text: "法定上限（月100時間）を超過しています。直ちに残業を停止させ、経営層・人事部門に報告してください。法律違反となります。", size: 22, font: "游ゴシック" })] })],
                  }),
                ],
              }),
            ],
          }),
          emptyParagraph(),

          heading2("7.4　36協定とは"),
          bodyText(
            "36協定（さぶろくきょうてい）とは、労働基準法第36条に基づく労使間の協定です。法律では、原則として月45時間・年360時間を超える残業は認められていません。"
          ),
          bodyText(
            "KINTAIでは、この基準に基づいて自動的に警告を表示しています。警告が出た場合は、速やかに対応が必要です。"
          ),
          emptyParagraph(),

          heading2("7.5　対応が必要な場合の手順"),
          bodyText(
            "残業レポートに警告が表示された場合は、以下の手順で対応してください。"
          ),
          emptyParagraph(),
          boldBodyText("■ 橙色警告（45時間超過：深刻レベル）の場合"),
          numberedStep("①", "該当する社員の所属部署の部長・課長に連絡します。"),
          numberedStep("②", "残業が増えている原因を確認します。"),
          numberedStep("③", "業務の調整や人員配置の見直しを検討します。"),
          emptyParagraph(),
          boldBodyText("■ 赤色警告（80時間超過：危険レベル）の場合"),
          numberedStep("①", "該当する社員に対し、速やかに医師の面接指導を受けるよう案内します。"),
          numberedStep("②", "所属部署の責任者と連携し、業務量の削減措置を講じます。"),
          numberedStep("③", "人事部門・総務部門にも状況を報告します。"),
          emptyParagraph(),
          boldBodyText("■ 赤色強調警告（100時間超過：違反レベル）の場合"),
          numberedStep("①", "直ちに該当社員の残業を停止するよう所属部署に指示します。"),
          numberedStep("②", "医師の面接指導を最優先で実施します。"),
          numberedStep("③", "経営層および人事部門に報告し、再発防止策を協議します。"),
          emptyParagraph(),
          cautionBlock(
            "月100時間を超える残業は法律違反となります。警告を見逃さず、早期に対応してください。"
          ),

          // ════════════════════════════════════════
          // 第8章: マスタ管理
          // ════════════════════════════════════════
          pageBreak(),
          heading1("第8章　マスタ管理"),
          separatorLine(),
          ...chapterCapabilities([
            "部署の追加・編集・削除ができます",
            "マスタデータの管理方法がわかります",
          ]),

          heading2("8.1　マスタ管理画面の開き方"),
          numberedStep("①", "左側メニューの【マスタ管理】をクリックします。"),
          numberedStep("②", "マスタ管理画面が表示されます。"),
          emptyParagraph(),
          ...screenshotParagraph(
            "admin_07_master.png",
            "\u2193 この画面が表示されます（マスタ管理画面）"
          ),
          emptyParagraph(),

          heading2("8.2　部署の管理"),
          heading3("8.2.1　部署の追加"),
          numberedStep("①", "画面右上の【追加】ボタンをクリックします。"),
          numberedStep("②", "追加したい部署の名前を入力します。"),
          numberedStep("③", "【保存】ボタンをクリックします。"),
          numberedStep("④", "一覧に新しい部署が追加されたら完了です。"),
          emptyParagraph(),
          bodyText("現在登録されている部署:"),
          bulletItem("営業部"),
          bulletItem("工事部"),
          bulletItem("リフォーム推進部"),
          bulletItem("管理部"),
          emptyParagraph(),

          heading3("8.2.2　部署名の変更"),
          numberedStep("①", "変更したい部署の行にある【編集】ボタンをクリックします。"),
          numberedStep("②", "部署名を修正します。"),
          numberedStep("③", "【保存】ボタンをクリックします。"),
          emptyParagraph(),

          heading3("8.2.3　部署の削除"),
          numberedStep("①", "削除したい部署の行にある【削除】ボタンをクリックします。"),
          numberedStep("②", "確認ダイアログで【OK】をクリックします。"),
          numberedStep("③", "部署が一覧から削除されたら完了です。"),
          emptyParagraph(),
          cautionBlock(
            "社員が所属している部署を削除すると、データに影響が出る場合があります。削除前に、所属する社員を別の部署に異動させてください。"
          ),
          emptyParagraph(),

          // ════════════════════════════════════════
          // 第9章: システム設定
          // ════════════════════════════════════════
          pageBreak(),
          heading1("第9章　システム設定"),
          separatorLine(),
          ...chapterCapabilities([
            "承認設定を変更できます",
            "通知設定を確認・変更できます",
          ]),

          heading2("9.1　設定画面の開き方"),
          numberedStep("①", "左側メニューの【設定】をクリックします。"),
          numberedStep("②", "設定画面が表示されます。画面上部に2つのタブがあります。"),
          emptyParagraph(),
          ...screenshotParagraph(
            "admin_08_settings.png",
            "\u2193 この画面が表示されます（設定画面）"
          ),
          emptyParagraph(),

          bodyText("設定画面は、以下の2つのタブで構成されています。"),
          bulletItem("【承認設定】タブ"),
          bulletItem("【通知設定】タブ"),
          emptyParagraph(),

          heading2("9.2　承認設定"),
          bodyText(
            "各種申請に対する承認の要否を設定するタブです。"
          ),
          emptyParagraph(),
          numberedStep("①", "【承認設定】タブをクリックします。"),
          numberedStep("②", "以下の項目ごとに、承認を必要とするかどうかを設定できます。"),
          emptyParagraph(),
          bulletItem("有給休暇申請: 有給休暇を取得する際に管理者の承認が必要かどうか"),
          bulletItem("打刻修正申請: 出退勤の打刻時間を修正する際に管理者の承認が必要かどうか"),
          bulletItem("残業申請: 残業を行う際に事前申請と管理者の承認が必要かどうか"),
          emptyParagraph(),
          numberedStep("③", "各項目のオン/オフを切り替えます。"),
          numberedStep("④", "変更した場合は、【保存】ボタンをクリックします。"),
          emptyParagraph(),

          heading2("9.3　通知設定"),
          bodyText(
            "メール通知やリマインダーに関する設定を行うタブです。"
          ),
          emptyParagraph(),
          numberedStep("①", "【通知設定】タブをクリックします。"),
          numberedStep("②", "以下の項目を確認・変更できます。"),
          emptyParagraph(),
          bulletItem("メール通知: 申請や承認に関するメール通知のオン/オフ"),
          bulletItem("リマインダー: 未処理の申請がある場合のリマインダー通知のオン/オフ"),
          emptyParagraph(),
          numberedStep("③", "変更した場合は、【保存】ボタンをクリックします。"),
          emptyParagraph(),
          cautionBlock(
            "設定の変更は、全体の運用に影響します。変更前に、人事部門と十分にご相談ください。"
          ),

          // ════════════════════════════════════════
          // 第10章: Excel出力
          // ════════════════════════════════════════
          pageBreak(),
          heading1("第10章　Excel出力"),
          separatorLine(),
          ...chapterCapabilities([
            "勤怠データをExcelファイルとして出力できます",
            "出力されるファイルの内容がわかります",
          ]),

          heading2("10.1　Excel出力の手順"),
          bodyText(
            "勤怠データをExcelファイルとして出力する手順は以下の通りです。"
          ),
          emptyParagraph(),
          numberedStep("①", "左側メニューの【勤怠一覧】をクリックして、勤怠一覧画面を開きます。"),
          numberedStep("②", "出力したい月を選択します（画面上部の【◀】【▶】ボタンで月を変更）。"),
          numberedStep("③", "必要に応じて、部署フィルターで対象を絞り込みます。"),
          numberedStep("④", "画面右上の【Excel出力】ボタン（緑色）をクリックします。"),
          numberedStep("⑤", "Excelファイルのダウンロードが開始されます。"),
          numberedStep("⑥", "ダウンロードが完了すると、パソコンのダウンロードフォルダにファイルが保存されます。"),
          emptyParagraph(),
          ...screenshotParagraph(
            "admin_04_attendance.png",
            "\u2193 右上の緑色の【Excel出力】ボタンをクリックします"
          ),
          emptyParagraph(),

          heading2("10.2　出力されるファイルの説明"),
          bodyTextRuns([
            new TextRun({
              text: "ファイル名: ",
              size: 22,
              font: "游ゴシック",
            }),
            new TextRun({
              text: "勤怠一覧表_YYYY年MM月.xlsx",
              size: 22,
              font: "游ゴシック",
              bold: true,
            }),
          ]),
          bodyText("（例: 勤怠一覧表_2026年03月.xlsx）"),
          emptyParagraph(),
          bodyText(
            "出力されるExcelファイルには、選択した月の全勤怠データが含まれます。社員名、出勤日、出勤時刻、退勤時刻、勤務時間、残業時間などが一覧で記載されます。"
          ),
          emptyParagraph(),
          cautionBlock(
            "Excelファイルには社員の個人情報が含まれます。ファイルの取り扱いには十分ご注意ください。不要になったファイルは速やかに削除してください。"
          ),

          // ════════════════════════════════════════
          // 第11章: よくある質問（FAQ）
          // ════════════════════════════════════════
          pageBreak(),
          heading1("第11章　よくある質問（FAQ）"),
          separatorLine(),
          ...chapterCapabilities([
            "よくあるトラブルの解決方法がわかります",
            "操作に迷ったときの対処法がわかります",
          ]),

          heading2("Q1. ログインできません。どうすればよいですか？"),
          bodyText("以下の点をご確認ください。"),
          bulletItem("メールアドレスとパスワードが正しく入力されているか確認してください。大文字・小文字の違いにもご注意ください。"),
          bulletItem("Caps Lock（キャプスロック）がオンになっていないか確認してください。"),
          bulletItem("インターネットに接続されているか確認してください。"),
          bulletItem("それでもログインできない場合は、情報システム担当者にパスワードのリセットを依頼してください。"),
          emptyParagraph(),

          heading2("Q2. 誤って休暇申請を承認してしまいました。取り消せますか？"),
          bodyText(
            "申し訳ございませんが、一度承認した申請をシステム上で取り消すことはできません。誤って承認した場合は、以下の対応をお願いします。"
          ),
          numberedStep("①", "該当する社員に、誤って承認した旨を連絡します。"),
          numberedStep("②", "情報システム担当者に連絡し、データの修正を依頼します。"),
          emptyParagraph(),

          heading2("Q3. Excel出力ボタンを押しても、ファイルがダウンロードされません。"),
          bodyText("以下の点をご確認ください。"),
          bulletItem("ブラウザのポップアップブロックが有効になっていないか確認してください。有効な場合は、KINTAIのサイトを許可リストに追加してください。"),
          bulletItem("ブラウザの設定で、ダウンロードが許可されているか確認してください。"),
          bulletItem("別のブラウザ（Google Chrome推奨）で試してみてください。"),
          emptyParagraph(),

          heading2("Q4. 新しく入社した社員がシステムを使えないと言っています。"),
          bodyText(
            "新しく登録された社員は、初期状態では「承認待ち」のステータスです。管理者がメンバー管理画面で承認するまで、勤怠の打刻はできません。第6章「メンバー管理」の手順に従って、社員の承認を行ってください。"
          ),
          emptyParagraph(),

          heading2("Q5. 残業レポートに警告が出ていますが、どうすればよいですか？"),
          bodyText(
            "第7章「残業レポートの確認」に記載されている対応手順に従って、警告レベルに応じた対応を行ってください。特に赤色警告が出ている場合は、早急な対応が必要です。"
          ),
          emptyParagraph(),

          heading2("Q6. 部署を削除したいのですが、削除ボタンを押してもエラーが出ます。"),
          bodyText(
            "社員が所属している部署は、データの整合性を保つため削除できない場合があります。部署を削除する前に、所属する社員を別の部署に異動させてください。それでも削除できない場合は、情報システム担当者にご相談ください。"
          ),
          emptyParagraph(),

          heading2("Q7. 画面の表示がおかしい、レイアウトが崩れています。"),
          bodyText("以下の対処法をお試しください。"),
          numberedStep("①", "ブラウザの再読み込みボタンをクリックするか、キーボードのF5キーを押します。"),
          numberedStep("②", "ブラウザのキャッシュをクリアします（Ctrl + Shift + Delete で削除画面を開けます）。"),
          numberedStep("③", "それでも改善しない場合は、別のブラウザで試してみてください。"),
          emptyParagraph(),

          heading2("Q8. スマートフォンからでも管理画面は使えますか？"),
          bodyText(
            "はい、スマートフォンのブラウザからも管理画面にアクセスできます。画面下部にもメニューが表示されますので、パソコンと同様に操作できます。第2章「ログイン方法」の2.4に記載されている手順で、iPhoneのホーム画面にアイコンを追加すると、より便利にお使いいただけます。"
          ),
          emptyParagraph(),

          heading2("Q9. パスワードを忘れてしまいました。"),
          bodyText(
            "パスワードを忘れた場合は、ご自身でリセットすることはできません。情報システム担当者に連絡し、パスワードのリセットを依頼してください。"
          ),
          emptyParagraph(),

          heading2("Q10. 設定を変更したのに反映されません。"),
          bodyText("以下の点をご確認ください。"),
          bulletItem("変更後に【保存】ボタンをクリックしたか確認してください。"),
          bulletItem("画面を再読み込みして、変更が保存されているか確認してください。"),
          bulletItem("それでも反映されない場合は、情報システム担当者にお問い合わせください。"),
          emptyParagraph(),

          // ════════════════════════════════════════
          // 付録: お問い合わせ先
          // ════════════════════════════════════════
          pageBreak(),
          heading1("付録　お問い合わせ先"),
          separatorLine(),
          ...chapterCapabilities([
            "トラブル時の連絡先がわかります",
            "お問い合わせの際に伝えるべき情報がわかります",
          ]),

          heading2("情報システム担当者"),
          bodyText(
            "システムに関するご質問やトラブルが発生した場合は、以下の情報システム担当者までお問い合わせください。"
          ),
          emptyParagraph(),
          boldBodyText("■ 情報システム担当"),
          bodyText("\u3000担当者名: \u25CB\u25CB \u25CB\u25CB（管理部）"),
          bodyText("\u3000内線番号: \u25CB\u25CB\u25CB\u25CB"),
          bodyText("\u3000メール: \u25CB\u25CB@sun-kamiya.co.jp"),
          emptyParagraph(),

          heading2("お問い合わせの際にお伝えいただきたい情報"),
          bodyText(
            "お問い合わせの際は、以下の情報をお伝えいただくと、迅速に対応できます。"
          ),
          emptyParagraph(),
          numberedStep("①", "お名前と所属部署"),
          numberedStep("②", "発生した問題の内容（何をしようとして、何が起きたか）"),
          numberedStep("③", "問題が発生した日時"),
          numberedStep("④", "使用しているブラウザの種類（Google Chrome、Safari等）"),
          numberedStep("⑤", "エラーメッセージが表示されている場合は、その内容"),
          emptyParagraph(),
          bodyText(
            "可能であれば、エラーが表示されている画面のスクリーンショット（画面の写真）を撮っておいていただけると、原因の特定が早くなります。"
          ),
          emptyParagraph(),

          heading2("スクリーンショットの撮り方"),
          bodyText("パソコンでスクリーンショットを撮る方法は以下の通りです。"),
          emptyParagraph(),
          boldBodyText("■ Windowsの場合"),
          bodyText(
            "キーボードの【Windows】キーと【Shift】キーと【S】キーを同時に押します。画面が薄暗くなりますので、撮影したい範囲をマウスで選択します。"
          ),
          emptyParagraph(),
          boldBodyText("■ iPhoneの場合"),
          bodyText(
            "電源ボタンと音量アップボタンを同時に押します。撮影された画像は「写真」アプリに保存されます。"
          ),
          emptyParagraph(),
          emptyParagraph(),

          // ── 奥付 ──
          separatorLine(),
          emptyParagraph(),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "勤怠管理システム「KINTAI」管理者マニュアル",
                size: 22,
                font: "游ゴシック",
                bold: true,
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "2026年3月 初版",
                size: 20,
                font: "游ゴシック",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: "株式会社サン・カミヤ",
                size: 20,
                font: "游ゴシック",
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: "※ 無断転載・複製を禁じます",
                size: 18,
                font: "游ゴシック",
                color: "888888",
              }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT_PATH, buffer);
  console.log(`管理者マニュアルを生成しました: ${OUTPUT_PATH}`);
}

generateManual().catch(console.error);
