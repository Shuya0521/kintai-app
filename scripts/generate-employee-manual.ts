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
  NumberFormat,
  convertInchesToTwip,
  ShadingType,
  PageBreak,
} from "docx";
import * as fs from "fs";
import * as path from "path";
// ── Paths ──
const ROOT = path.resolve(__dirname, "..");
const SCREENSHOTS_DIR = path.join(ROOT, "docs", "screenshots");
const OUTPUT_PATH = path.join(ROOT, "docs", "KINTAI_従業員マニュアル_iPhone.docx");

// ── Helper functions ──

function heading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 200 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 32, // 16pt
        font: "游ゴシック",
        color: "1A5276",
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
        size: 28, // 14pt
        font: "游ゴシック",
        color: "2471A3",
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
        size: 22, // 11pt
        font: "游ゴシック",
      }),
    ],
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
        color: "2471A3",
      }),
      new TextRun({
        text,
        size: 22,
        font: "游ゴシック",
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

function screenshotCaption(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 100, after: 60 },
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: `\u2193 ${text}`,
        size: 20,
        font: "游ゴシック",
        italics: true,
        color: "666666",
      }),
    ],
  });
}

function addScreenshot(filename: string): Paragraph {
  const imgPath = path.join(SCREENSHOTS_DIR, filename);
  const imgBuffer = fs.readFileSync(imgPath);

  // Read PNG dimensions from IHDR chunk (bytes 16-23)
  let origW = 400;
  let origH = 800;
  if (imgBuffer.length > 24 && imgBuffer[1] === 0x50 && imgBuffer[2] === 0x4e && imgBuffer[3] === 0x47) {
    origW = imgBuffer.readUInt32BE(16);
    origH = imgBuffer.readUInt32BE(20);
  }

  // Target width: 200pt = 200 * 9525 EMU (for docx ImageRun)
  // Actually docx uses EMU internally but ImageRun accepts pixels.
  // We set width to ~267px (200pt) and scale height proportionally.
  const targetWidthPx = 267;
  const scale = targetWidthPx / origW;
  const targetHeightPx = Math.round(origH * scale);

  return new Paragraph({
    spacing: { before: 100, after: 200 },
    alignment: AlignmentType.CENTER,
    children: [
      new ImageRun({
        data: imgBuffer,
        transformation: {
          width: targetWidthPx,
          height: targetHeightPx,
        },
        type: "png",
      }),
    ],
  });
}

function separatorLine(): Paragraph {
  return new Paragraph({
    spacing: { before: 100, after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 3, color: "CCCCCC" },
    },
    children: [new TextRun({ text: "" })],
  });
}

function pageBreak(): Paragraph {
  return new Paragraph({
    children: [new PageBreak()],
  });
}

function emptyLine(): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: "", size: 22, font: "游ゴシック" })],
  });
}

function faqItem(q: string, a: string): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 200, after: 60, line: 360 },
      indent: { left: convertInchesToTwip(0.2) },
      children: [
        new TextRun({
          text: `Q. ${q}`,
          size: 22,
          font: "游ゴシック",
          bold: true,
          color: "1A5276",
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120, line: 360 },
      indent: { left: convertInchesToTwip(0.4) },
      children: [
        new TextRun({
          text: `A. ${a}`,
          size: 22,
          font: "游ゴシック",
        }),
      ],
    }),
  ];
}

// ── Title page ──
function titlePage(): Paragraph[] {
  return [
    emptyLine(),
    emptyLine(),
    emptyLine(),
    emptyLine(),
    emptyLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: "勤怠アプリ",
          size: 48, // 24pt
          font: "游ゴシック",
          bold: true,
          color: "1A5276",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [
        new TextRun({
          text: "従業員用 iPhone マニュアル",
          size: 36, // 18pt
          font: "游ゴシック",
          bold: true,
          color: "2471A3",
        }),
      ],
    }),
    emptyLine(),
    emptyLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "2026年3月 作成",
          size: 24,
          font: "游ゴシック",
          color: "666666",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "第1.0版",
          size: 24,
          font: "游ゴシック",
          color: "666666",
        }),
      ],
    }),
    pageBreak(),
  ];
}

// ── Section builders ──

function sectionIntro(): Paragraph[] {
  return [
    heading1("1. はじめに"),
    separatorLine(),
    bodyText(
      "このマニュアルは、勤怠アプリの使い方をiPhoneでお使いの従業員の皆さまに向けて説明したものです。"
    ),
    bodyText(
      "毎日の出勤・退勤の打刻、勤怠履歴の確認、休暇の申請などの操作方法をわかりやすく解説しています。"
    ),
    emptyLine(),
    boldBodyText("このマニュアルでできること:"),
    bulletItem("iPhoneのホーム画面にアプリを追加する"),
    bulletItem("アカウントの新規登録・ログインをする"),
    bulletItem("出勤・退勤・休憩の打刻をする"),
    bulletItem("日々の勤怠記録や月間の集計を確認する"),
    bulletItem("有給休暇などの申請をする"),
    emptyLine(),
    cautionBlock(
      "操作でわからないことがあれば、管理者または総務部にお問い合わせください。"
    ),
    pageBreak(),
  ];
}

function sectionInstall(): Paragraph[] {
  return [
    heading1("2. アプリのインストール"),
    separatorLine(),
    bodyText(
      "勤怠アプリはWebアプリです。App Storeからのダウンロードは不要で、Safariからホーム画面に追加するだけで使えます。"
    ),
    emptyLine(),
    heading2("ホーム画面への追加手順"),
    numberedStep("①", "iPhoneの「Safari」を開きます。"),
    numberedStep(
      "②",
      "管理者から案内されたURLを入力して、勤怠アプリの画面を開きます。"
    ),
    numberedStep(
      "③",
      "画面の下にある「共有ボタン」（□に↑のマーク）をタップします。"
    ),
    numberedStep(
      "④",
      "メニューの中から「ホーム画面に追加」をタップします。"
    ),
    numberedStep(
      "⑤",
      "名前はそのままで右上の「追加」をタップします。"
    ),
    numberedStep(
      "⑥",
      "ホーム画面にアプリのアイコンが追加されます。次回からはこのアイコンをタップして開けます。"
    ),
    emptyLine(),
    cautionBlock(
      "Safari以外のブラウザ（Chrome等）では「ホーム画面に追加」ができません。必ずSafariをお使いください。"
    ),
    pageBreak(),
  ];
}

function sectionRegister(): Paragraph[] {
  return [
    heading1("3. 新規登録"),
    separatorLine(),
    bodyText(
      "はじめて勤怠アプリを使うときは、アカウントの新規登録が必要です。"
    ),
    emptyLine(),
    heading2("登録手順"),
    numberedStep("①", "アプリを開くとログイン画面が表示されます。"),
    numberedStep(
      "②",
      "画面の下にある「新規登録はこちら」のリンクをタップします。"
    ),
    numberedStep(
      "③",
      "新規登録画面が表示されます。"
    ),
    screenshotCaption("この画面が表示されます（新規登録画面）"),
    addScreenshot("app_07_register.png"),
    numberedStep("④", "「名前」に自分の氏名を入力します。"),
    numberedStep(
      "⑤",
      "「メールアドレス」に会社のメールアドレスを入力します。"
    ),
    numberedStep("⑥", "「パスワード」に好きなパスワードを入力します。"),
    numberedStep(
      "⑦",
      "入力が終わったら「登録」ボタンをタップします。"
    ),
    numberedStep(
      "⑧",
      "登録が完了すると自動でログインされ、打刻画面が表示されます。"
    ),
    emptyLine(),
    cautionBlock(
      "パスワードは8文字以上で設定してください。忘れないようにメモしておきましょう。"
    ),
    pageBreak(),
  ];
}

function sectionLogin(): Paragraph[] {
  return [
    heading1("4. ログイン"),
    separatorLine(),
    bodyText(
      "登録済みのアカウントでアプリにログインする方法です。"
    ),
    emptyLine(),
    heading2("ログイン手順"),
    numberedStep("①", "ホーム画面から勤怠アプリのアイコンをタップして開きます。"),
    numberedStep(
      "②",
      "ログイン画面が表示されます。"
    ),
    screenshotCaption("この画面が表示されます（ログイン画面）"),
    addScreenshot("app_01_login.png"),
    numberedStep(
      "③",
      "「メールアドレス」に登録したメールアドレスを入力します。"
    ),
    numberedStep("④", "「パスワード」に登録したパスワードを入力します。"),
    numberedStep("⑤", "「ログイン」ボタンをタップします。"),
    numberedStep(
      "⑥",
      "ログインに成功すると、打刻画面（メイン画面）が表示されます。"
    ),
    emptyLine(),
    cautionBlock(
      "パスワードを忘れた場合は、管理者にパスワードのリセットを依頼してください。"
    ),
    pageBreak(),
  ];
}

function sectionStamp(): Paragraph[] {
  return [
    heading1("5. 打刻"),
    separatorLine(),
    bodyText(
      "毎日の出勤・退勤・休憩開始・休憩終了の打刻を行う画面です。ログイン後のメイン画面がこの打刻画面になります。"
    ),
    emptyLine(),
    heading2("打刻画面の見かた"),
    screenshotCaption("この画面が表示されます（打刻画面）"),
    addScreenshot("app_02_stamp.png"),
    bodyText(
      "画面の中央に大きなボタンが表示されます。その日の状態に応じて、ボタンの表示が変わります。"
    ),
    emptyLine(),
    heading2("出勤するとき"),
    numberedStep("①", "打刻画面を開きます。"),
    numberedStep("②", "「出勤」ボタンをタップします。"),
    numberedStep(
      "③",
      "出勤の打刻が完了し、画面が切り替わります。"
    ),
    screenshotCaption("出勤打刻後はこの画面になります"),
    addScreenshot("app_03_after_checkin.png"),
    emptyLine(),
    heading2("退勤するとき"),
    numberedStep("①", "打刻画面を開きます。"),
    numberedStep("②", "「退勤」ボタンをタップします。"),
    numberedStep(
      "③",
      "退勤の打刻が完了します。お疲れさまでした。"
    ),
    emptyLine(),
    heading2("休憩するとき"),
    numberedStep(
      "①",
      "休憩を始めるときは「休憩開始」ボタンをタップします。"
    ),
    numberedStep(
      "②",
      "休憩を終えるときは「休憩終了」ボタンをタップします。"
    ),
    emptyLine(),
    cautionBlock(
      "打刻を忘れた場合は、管理者に連絡して修正を依頼してください。自分で過去の打刻を変更することはできません。"
    ),
    cautionBlock(
      "現在の時刻で打刻されます。後から時間を変えることはできませんのでご注意ください。"
    ),
    pageBreak(),
  ];
}

function sectionDaily(): Paragraph[] {
  return [
    heading1("6. 日次一覧"),
    separatorLine(),
    bodyText(
      "日々の出勤・退勤の記録を一覧で確認できる画面です。"
    ),
    emptyLine(),
    heading2("日次一覧の確認方法"),
    numberedStep(
      "①",
      "画面の下にあるメニューから「日次」をタップします。"
    ),
    numberedStep(
      "②",
      "日次一覧の画面が表示されます。"
    ),
    screenshotCaption("この画面が表示されます（日次一覧）"),
    addScreenshot("app_04_daily.png"),
    emptyLine(),
    heading2("日次一覧で確認できること"),
    bulletItem("日付ごとの出勤時刻と退勤時刻"),
    bulletItem("休憩時間"),
    bulletItem("勤務時間の合計"),
    bulletItem("打刻の状態（正常・未打刻など）"),
    emptyLine(),
    bodyText(
      "表示する期間を変えたい場合は、画面上部の「＜」「＞」ボタンで前後の月に移動できます。"
    ),
    emptyLine(),
    cautionBlock(
      "打刻漏れがあると「未打刻」と表示されます。気づいたら早めに管理者にご連絡ください。"
    ),
    pageBreak(),
  ];
}

function sectionMonthly(): Paragraph[] {
  return [
    heading1("7. 月次サマリ"),
    separatorLine(),
    bodyText(
      "1か月分の勤怠を集計した画面です。勤務日数や合計勤務時間などをまとめて確認できます。"
    ),
    emptyLine(),
    heading2("月次サマリの確認方法"),
    numberedStep(
      "①",
      "画面の下にあるメニューから「月次」をタップします。"
    ),
    numberedStep(
      "②",
      "月次サマリの画面が表示されます。"
    ),
    screenshotCaption("この画面が表示されます（月次サマリ）"),
    addScreenshot("app_05_monthly.png"),
    emptyLine(),
    heading2("月次サマリで確認できること"),
    bulletItem("その月の勤務日数"),
    bulletItem("合計勤務時間"),
    bulletItem("残業時間"),
    bulletItem("有給休暇の取得日数"),
    emptyLine(),
    bodyText(
      "月を切り替える場合は、画面上部の「＜」「＞」ボタンで前後の月に移動できます。"
    ),
    pageBreak(),
  ];
}

function sectionRequests(): Paragraph[] {
  return [
    heading1("8. 休暇申請"),
    separatorLine(),
    bodyText(
      "有給休暇やその他の休暇を申請するための画面です。"
    ),
    emptyLine(),
    heading2("休暇の申請手順"),
    numberedStep(
      "①",
      "画面の下にあるメニューから「申請」をタップします。"
    ),
    numberedStep(
      "②",
      "休暇申請の画面が表示されます。"
    ),
    screenshotCaption("この画面が表示されます（休暇申請画面）"),
    addScreenshot("app_06_requests.png"),
    numberedStep(
      "③",
      "「休暇の種類」を選びます（有給休暇、半休など）。"
    ),
    numberedStep("④", "「日付」で休みたい日を選びます。"),
    numberedStep(
      "⑤",
      "「理由」に休暇の理由を入力します（任意の場合もあります）。"
    ),
    numberedStep("⑥", "内容を確認して「申請」ボタンをタップします。"),
    numberedStep(
      "⑦",
      "申請が送信され、管理者の承認を待ちます。"
    ),
    emptyLine(),
    heading2("申請状況の確認"),
    bodyText(
      "申請の一覧画面で、各申請の「承認待ち」「承認済み」「却下」の状態を確認できます。"
    ),
    emptyLine(),
    cautionBlock(
      "休暇の申請は、できるだけ早め（前日まで）に行ってください。"
    ),
    cautionBlock(
      "申請後に予定が変わった場合は、管理者に直接ご連絡ください。"
    ),
    pageBreak(),
  ];
}

function sectionFAQ(): Paragraph[] {
  return [
    heading1("9. よくあるご質問（FAQ）"),
    separatorLine(),
    ...faqItem(
      "パスワードを忘れてログインできません。",
      "管理者に連絡して、パスワードのリセットを依頼してください。"
    ),
    ...faqItem(
      "打刻を忘れてしまいました。どうすればよいですか？",
      "管理者に連絡して、打刻の修正を依頼してください。自分で過去の打刻を変更することはできません。"
    ),
    ...faqItem(
      "アプリが開けません（画面が真っ白になります）。",
      "まずiPhoneの再起動をお試しください。それでも改善しない場合は、Safariのキャッシュをクリアしてから再度アクセスしてください。（設定 → Safari → 履歴とWebサイトデータを消去）"
    ),
    ...faqItem(
      "出勤ボタンを間違えてタップしてしまいました。",
      "一度タップした打刻は取り消せません。管理者に連絡して修正を依頼してください。"
    ),
    ...faqItem(
      "休暇申請のステータスが「承認待ち」のまま変わりません。",
      "管理者がまだ確認していない状態です。急ぎの場合は、管理者に直接確認をお願いしてください。"
    ),
    ...faqItem(
      "ホーム画面のアイコンが消えてしまいました。",
      "Safariで勤怠アプリのURLを開き、もう一度「ホーム画面に追加」の手順を行ってください。データは消えていませんのでご安心ください。"
    ),
    ...faqItem(
      "退勤の打刻をせずに帰ってしまいました。",
      "翌日、管理者に連絡して退勤時刻の修正を依頼してください。"
    ),
    ...faqItem(
      "月次サマリの数字がおかしいように見えます。",
      "打刻漏れや修正中のデータがあると集計が正しく表示されない場合があります。日次一覧で打刻漏れがないか確認してください。"
    ),
    emptyLine(),
    separatorLine(),
    emptyLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "ご不明な点は管理者または総務部までお気軽にお問い合わせください。",
          size: 22,
          font: "游ゴシック",
          color: "666666",
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [
        new TextRun({
          text: "--- マニュアル おわり ---",
          size: 20,
          font: "游ゴシック",
          color: "999999",
        }),
      ],
    }),
  ];
}

// ── Build document ──
async function main() {
  console.log("従業員マニュアルを生成中...");

  const doc = new Document({
    creator: "勤怠アプリ管理チーム",
    title: "勤怠アプリ 従業員用 iPhone マニュアル",
    description: "従業員向けiPhone操作マニュアル",
    styles: {
      default: {
        document: {
          run: {
            font: "游ゴシック",
            size: 22,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(0.8),
            },
            size: {
              width: convertInchesToTwip(8.27), // A4
              height: convertInchesToTwip(11.69),
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
                    text: "勤怠アプリ 従業員マニュアル（iPhone）",
                    size: 16,
                    font: "游ゴシック",
                    color: "999999",
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
                    color: "999999",
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          ...titlePage(),
          ...sectionIntro(),
          ...sectionInstall(),
          ...sectionRegister(),
          ...sectionLogin(),
          ...sectionStamp(),
          ...sectionDaily(),
          ...sectionMonthly(),
          ...sectionRequests(),
          ...sectionFAQ(),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  // Ensure output directory exists
  const outDir = path.dirname(OUTPUT_PATH);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_PATH, buffer);
  console.log(`マニュアルを出力しました: ${OUTPUT_PATH}`);
  console.log(`ファイルサイズ: ${(buffer.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("エラーが発生しました:", err);
  process.exit(1);
});
