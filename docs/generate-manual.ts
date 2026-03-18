import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  TabStopPosition,
  TabStopType,
  PageNumber,
  Header,
  Footer,
  BorderStyle,
  TableOfContents,
  StyleLevel,
  NumberFormat,
  PageBreak,
  Tab,
  Table,
  TableRow,
  TableCell,
  WidthType,
  TableBorders,
  ShadingType,
  VerticalAlign,
  convertMillimetersToTwip,
  LevelFormat,
  LineRuleType,
  ExternalHyperlink,
} from "docx";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// Helper functions
// ============================================================

/** 本文段落 */
function bodyText(text: string, options?: { bold?: boolean; spacing?: { after?: number; before?: number } }): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 360, ...(options?.spacing || {}) },
    children: [
      new TextRun({
        text,
        font: "游ゴシック",
        size: 22, // 11pt
        bold: options?.bold,
      }),
    ],
  });
}

/** 複数のTextRunを持つ段落 */
function bodyTextMulti(runs: TextRun[], options?: { spacing?: { after?: number; before?: number }; indent?: { left?: number } }): Paragraph {
  return new Paragraph({
    spacing: { after: 120, line: 360, ...(options?.spacing || {}) },
    indent: options?.indent,
    children: runs,
  });
}

/** テキストラン */
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

/** 見出し1（章タイトル） */
function heading1(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 240, line: 360 },
    children: [
      new TextRun({
        text,
        font: "游ゴシック",
        size: 32, // 16pt
        bold: true,
      }),
    ],
  });
}

/** 見出し2 */
function heading2(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 360, after: 200, line: 360 },
    children: [
      new TextRun({
        text,
        font: "游ゴシック",
        size: 28, // 14pt
        bold: true,
      }),
    ],
  });
}

/** 見出し3 */
function heading3(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 160, line: 360 },
    children: [
      new TextRun({
        text,
        font: "游ゴシック",
        size: 24, // 12pt
        bold: true,
      }),
    ],
  });
}

/** 区切り線 */
function separator(): Paragraph {
  return new Paragraph({
    spacing: { after: 200 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999" },
    },
    children: [],
  });
}

/** ステップ行 */
function step(num: string, text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 140, line: 360 },
    indent: { left: convertMillimetersToTwip(5) },
    children: [
      tr(`${num} `, { bold: true, size: 22 }),
      tr(text, { size: 22 }),
    ],
  });
}

/** 注意ブロック */
function caution(text: string): Paragraph {
  return bodyTextMulti([
    tr("⚠ ご注意: ", { bold: true, color: "CC0000" }),
    tr(text),
  ], { spacing: { before: 100, after: 160 } });
}

/** ワンポイントブロック */
function tip(text: string): Paragraph {
  return bodyTextMulti([
    tr("💡 ワンポイント: ", { bold: true, color: "0066CC" }),
    tr(text),
  ], { spacing: { before: 100, after: 160 } });
}

/** 「この章でわかること」ボックス */
function chapterIntro(items: string[]): Paragraph[] {
  const result: Paragraph[] = [];
  result.push(new Paragraph({
    spacing: { before: 80, after: 80, line: 360 },
    shading: { type: ShadingType.SOLID, color: "F0F4F8" },
    children: [tr("📖 この章でわかること", { bold: true, size: 22 })],
  }));
  for (const item of items) {
    result.push(new Paragraph({
      spacing: { after: 60, line: 360 },
      indent: { left: convertMillimetersToTwip(5) },
      shading: { type: ShadingType.SOLID, color: "F0F4F8" },
      children: [tr(`・${item}`, { size: 22 })],
    }));
  }
  result.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
  return result;
}

/** テーブル生成ヘルパー */
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

/** 空行 */
function emptyLine(): Paragraph {
  return new Paragraph({ spacing: { after: 120 }, children: [] });
}

/** ページブレーク */
function pageBreak(): Paragraph {
  return new Paragraph({ children: [new PageBreak()] });
}

/** Q&A形式 */
function qaBlock(q: string, a: string): Paragraph[] {
  return [
    bodyTextMulti([tr(`Q. ${q}`, { bold: true, size: 22 })], { spacing: { before: 200 } }),
    bodyTextMulti([tr(`A. ${a}`, { size: 22 })], { spacing: { after: 200 } }),
  ];
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
      children: [tr("勤怠管理アプリ", { size: 36, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [tr("「KINTAI」", { size: 52, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [tr("従業員マニュアル", { size: 36, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [tr("― iPhoneでの使い方ガイド ―", { size: 28 })],
    }),
    new Paragraph({ spacing: { after: 800 }, children: [] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [tr("株式会社サン・カミヤ", { size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [tr("2026年3月", { size: 24 })],
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
    bodyText("第1章　はじめに"),
    bodyText("第2章　iPhoneへのアプリ登録"),
    bodyText("第3章　初めてのログイン"),
    bodyText("第4章　毎日の打刻"),
    bodyText("第5章　勤怠の確認"),
    bodyText("第6章　休暇を申請する"),
    bodyText("第7章　画面の見方ガイド"),
    bodyText("第8章　こんなときどうする？（トラブルシューティング）"),
    bodyText("第9章　お問い合わせ先"),
    pageBreak(),
  ];
}

// ============================================================
// 第1章: はじめに
// ============================================================
function chapter1(): Paragraph[] {
  return [
    heading1("第1章　はじめに"),
    separator(),
    ...chapterIntro([
      "KINTAIアプリとは何か",
      "KINTAIアプリでできること",
      "このマニュアルの使い方",
    ]),
    heading2("1-1　このマニュアルについて"),
    bodyText("このマニュアルは、株式会社サン・カミヤの勤怠管理アプリ「KINTAI」をiPhoneで使うための操作説明書です。"),
    bodyText("初めてスマートフォンのアプリを使う方にもわかりやすいよう、画面の操作を1つずつ丁寧に説明しています。"),
    bodyText("操作に迷ったときは、このマニュアルの該当する章をお読みください。"),
    emptyLine(),
    heading2("1-2　KINTAIアプリでできること"),
    bodyText("KINTAIアプリでは、以下のことができます。"),
    emptyLine(),
    bodyTextMulti([tr("・出勤、退勤の打刻（タイムカードの代わり、休憩は自動60分控除）")], { indent: { left: convertMillimetersToTwip(5) } }),
    bodyTextMulti([tr("・在宅勤務の打刻")], { indent: { left: convertMillimetersToTwip(5) } }),
    bodyTextMulti([tr("・日ごと・月ごとの勤怠記録の確認")], { indent: { left: convertMillimetersToTwip(5) } }),
    bodyTextMulti([tr("・残業時間の確認")], { indent: { left: convertMillimetersToTwip(5) } }),
    bodyTextMulti([tr("・有給休暇や半休、特別休暇の申請")], { indent: { left: convertMillimetersToTwip(5) } }),
    bodyTextMulti([tr("・有給休暇の残り日数の確認")], { indent: { left: convertMillimetersToTwip(5) } }),
    emptyLine(),
    heading2("1-3　困ったときは"),
    bodyText("操作でお困りの場合は、まず「第8章 こんなときどうする？」をご確認ください。"),
    bodyText("それでも解決しない場合は、「第9章 お問い合わせ先」に記載の連絡先までご連絡ください。"),
    emptyLine(),
    tip("このマニュアルでは、「タップ」という言葉がよく出てきます。タップとは、指で画面を軽く1回触ることです。"),
    pageBreak(),
  ];
}

// ============================================================
// 第2章: iPhoneへのアプリ登録
// ============================================================
function chapter2(): Paragraph[] {
  return [
    heading1("第2章　iPhoneへのアプリ登録"),
    separator(),
    ...chapterIntro([
      "KINTAIアプリをiPhoneに登録する方法",
      "ホーム画面にアプリのアイコンを追加する方法",
      "アプリとして起動する方法",
    ]),
    bodyText("KINTAIアプリは、App Store（アプリストア）からダウンロードするアプリではありません。iPhoneに最初から入っている「Safari（サファリ）」というインターネットブラウザを使って登録します。"),
    emptyLine(),
    heading2("2-1　Safariでアプリを開く手順"),
    bodyText("まず、Safari（サファリ）でKINTAIアプリを開きます。"),
    emptyLine(),
    step("①", "iPhoneのホーム画面から「Safari」のアイコンをタップ（指で軽く触る）して開きます。Safariは青いコンパスのようなマークのアプリです。"),
    step("②", "画面の上のほうにある「アドレスバー」（インターネットのアドレスを入力する場所）をタップします。"),
    step("③", "アドレスバーに、会社から案内されたアドレス（URL）を入力します。"),
    bodyTextMulti([
      tr("　　入力するアドレス: ", { size: 22 }),
      tr("https://kintai-app-3na7.onrender.com", { bold: true, size: 22 }),
    ]),
    tip("上記のアドレスはインターネットに接続されていればいつでもアクセスできます。PCを閉じていてもスマートフォンから利用可能です。"),
    step("④", "アドレスを入力したら、キーボードの右下にある【開く】（または【Go】）をタップします。"),
    step("⑤", "KINTAIアプリのログイン画面が表示されます。「KINTAI」というロゴが画面に表示されていれば成功です。"),
    emptyLine(),
    heading2("2-2　ホーム画面にアプリを追加する方法"),
    bodyText("KINTAIアプリをiPhoneのホーム画面に追加すると、毎回アドレスを入力しなくても、アイコンをタップするだけでアプリを開けるようになります。以下の手順で登録しましょう。"),
    emptyLine(),
    step("①", "まず、前の手順（2-1）でKINTAIアプリの画面をSafariで開いた状態にしてください。"),
    step("②", "Safariの画面の一番下にあるメニューバーを確認してください。"),
    step("③", "メニューバーの中央にある「共有」ボタンをタップします。このボタンは、四角い箱の上に矢印（↑）が付いたマークです。□に↑のような形をしています。"),
    caution("「共有」ボタンが見当たらない場合は、画面を少し上にスワイプ（指で画面を下から上になぞる）すると、下のメニューバーが表示されます。"),
    step("④", "「共有」ボタンをタップすると、画面の下からメニューが出てきます。"),
    step("⑤", "出てきたメニューを上にスワイプ（指で下から上になぞる）して、メニューの下のほうにある【ホーム画面に追加】という項目を探してタップします。"),
    tip("【ホーム画面に追加】が見つからない場合は、メニューをさらに上にスワイプして探してください。アイコンの列の下にテキストのメニュー一覧があり、その中にあります。"),
    step("⑥", "「ホーム画面に追加」の画面が表示されます。名前の欄に「KINTAI」と表示されていることを確認してください。"),
    step("⑦", "名前はそのまま変更せず、画面右上の【追加】をタップします。"),
    step("⑧", "ホーム画面に「KINTAI」のアイコンが追加されました！ これで登録は完了です。"),
    emptyLine(),
    heading2("2-3　アプリとして起動する方法"),
    bodyText("ホーム画面への追加が完了したら、次回からは以下の手順でアプリを開けます。"),
    emptyLine(),
    step("①", "iPhoneのホーム画面で「KINTAI」のアイコンを探します。"),
    step("②", "「KINTAI」のアイコンをタップします。"),
    step("③", "KINTAIアプリが起動し、ログイン画面が表示されます。"),
    emptyLine(),
    tip("ホーム画面から起動すると、Safariのアドレスバーやメニューが表示されず、普通のアプリのように全画面で使えます。"),
    caution("アプリを削除してしまった場合は、もう一度「2-1」「2-2」の手順でやり直してください。データは消えませんのでご安心ください。"),
    pageBreak(),
  ];
}

// ============================================================
// 第3章: 初めてのログイン
// ============================================================
function chapter3(): Paragraph[] {
  return [
    heading1("第3章　初めてのログイン"),
    separator(),
    ...chapterIntro([
      "新規登録（アカウント作成）の手順",
      "登録後の「承認待ち」状態について",
      "ログインの手順",
      "パスワードを忘れた場合の対応",
    ]),
    heading2("3-1　新規登録の手順（初めて使う方）"),
    bodyText("KINTAIアプリを初めて使う方は、まず「新規登録」を行う必要があります。登録は3つのステップで完了します。"),
    emptyLine(),
    heading3("ステップ1: メールアドレスの入力"),
    step("①", "KINTAIアプリのログイン画面を開きます。"),
    step("②", "画面の下にある【新規登録】をタップします。"),
    step("③", "「メールアドレス」の入力欄をタップして、会社のメールアドレスを入力します。"),
    step("④", "入力が終わったら【次へ】をタップします。"),
    emptyLine(),
    heading3("ステップ2: パスワードの設定"),
    step("①", "パスワードを決めて入力します。"),
    caution("パスワードは8文字以上で、英字（アルファベット）と数字を両方含める必要があります。例: Kintai2026"),
    step("②", "確認のため、同じパスワードをもう一度入力します。"),
    step("③", "【次へ】をタップします。"),
    emptyLine(),
    heading3("ステップ3: 個人情報の入力"),
    step("①", "「氏名」の欄に、ご自身のお名前を入力します。"),
    step("②", "「部署」の欄に、所属する部署名を入力します。"),
    step("③", "「社員番号」の欄に、ご自身の社員番号を入力します。"),
    tip("社員番号がわからない場合は、人事部にお問い合わせください。"),
    step("④", "すべて入力したら【登録する】をタップします。"),
    step("⑤", "「登録が完了しました」というメッセージが表示されます。"),
    emptyLine(),
    heading2("3-2　登録後の「承認待ち」状態について"),
    bodyText("新規登録が完了すると、「承認待ち」の状態になります。"),
    bodyText("これは、管理者（上司や人事部）がお客様の登録内容を確認している状態です。"),
    bodyText("承認が完了するまでは、アプリにログインすることができません。通常、1〜2営業日で承認されます。"),
    caution("承認が完了しましたら、メールまたは上司からご連絡があります。連絡が届くまでお待ちください。"),
    emptyLine(),
    heading2("3-3　承認後のログイン手順"),
    bodyText("管理者の承認が完了したら、以下の手順でログインします。"),
    emptyLine(),
    step("①", "ホーム画面の「KINTAI」アイコンをタップしてアプリを開きます。"),
    step("②", "ログイン画面が表示されます。"),
    step("③", "「メールアドレス」の欄をタップして、登録したメールアドレスを入力します。"),
    step("④", "「パスワード」の欄をタップして、登録したパスワードを入力します。"),
    step("⑤", "「メールアドレスを記憶する」チェックボックスにチェックを入れると、次回ログイン時にメールアドレスが自動入力されます。共用の端末では、チェックを入れないことをおすすめします。"),
    step("⑥", "【ログイン】ボタンをタップします。"),
    step("⑦", "打刻画面（メインの画面）が表示されたら、ログイン成功です。"),
    emptyLine(),
    tip("「メールアドレスを記憶する」にチェックを入れておくと、毎回メールアドレスを入力する手間が省けて便利です。"),
    emptyLine(),
    heading2("3-4　パスワードを忘れた場合"),
    bodyText("パスワードを忘れてしまった場合は、情報システム部にご連絡ください。パスワードのリセット手続きをご案内いたします。"),
    tip("パスワードは、他の人に教えないようにしてください。また、メモに書いてパソコンに貼るなどの行為はお控えください。"),
    pageBreak(),
  ];
}

// ============================================================
// 第4章: 毎日の打刻
// ============================================================
function chapter4(): Paragraph[] {
  return [
    heading1("第4章　毎日の打刻"),
    separator(),
    ...chapterIntro([
      "朝の出勤打刻の方法",
      "在宅勤務の打刻の方法",
      "退勤打刻の方法",
      "休憩時間について（みなし60分控除）",
      "打刻を忘れた場合の対応",
    ]),
    bodyText("この章は、毎日使う最も大切な機能についての説明です。"),
    bodyText("出勤・退勤の打刻は、これまでのタイムカードの代わりになるものです。毎日忘れずに行いましょう。"),
    emptyLine(),
    heading2("4-1　打刻画面の見方"),
    bodyText("KINTAIアプリにログインすると、最初に「打刻画面」が表示されます。"),
    bodyText("画面には以下の情報が表示されています。"),
    emptyLine(),
    bodyTextMulti([tr("・現在の時刻（大きなデジタル時計）")], { indent: { left: convertMillimetersToTwip(5) } }),
    bodyTextMulti([tr("・今日の日付（例: 2026年3月12日 木曜日）")], { indent: { left: convertMillimetersToTwip(5) } }),
    bodyTextMulti([tr("・現在のステータス（勤務状態）")], { indent: { left: convertMillimetersToTwip(5) } }),
    bodyTextMulti([tr("・打刻ボタン")], { indent: { left: convertMillimetersToTwip(5) } }),
    bodyTextMulti([tr("・今日のログ（出勤時刻、退勤時刻、休憩時間、実働時間）")], { indent: { left: convertMillimetersToTwip(5) } }),
    emptyLine(),
    bodyText("ステータスは、現在の勤務状態を表します。"),
    emptyLine(),
    makeTable(
      ["ステータス", "意味"],
      [
        ["未出勤", "まだ出勤の打刻をしていない状態"],
        ["勤務中", "出勤の打刻をして、働いている状態"],
        ["在宅勤務中", "在宅勤務の打刻をして、自宅で働いている状態"],
        ["退勤済", "退勤の打刻をして、仕事が終わった状態"],
      ]
    ),
    emptyLine(),
    heading2("4-2　朝の出勤打刻"),
    bodyText("出社したら、まずKINTAIアプリで出勤の打刻をしましょう。"),
    emptyLine(),
    step("①", "iPhoneのホーム画面で「KINTAI」のアイコンをタップして、アプリを開きます。"),
    step("②", "打刻画面が表示されます。画面上部に現在の時刻と日付が表示されていることを確認してください。"),
    step("③", "オフィスに出社した場合は、緑色の【🏢 出勤】ボタンをタップします。"),
    step("④", "画面に「出勤打刻しました HH:MM」というメッセージが表示されます（HH:MMの部分には実際の時刻が入ります）。"),
    step("⑤", "このメッセージが表示されたら、出勤打刻は完了です。"),
    emptyLine(),
    heading2("4-3　在宅勤務の打刻"),
    bodyText("自宅で仕事をする場合は、「在宅勤務」の打刻を行います。"),
    emptyLine(),
    step("①", "KINTAIアプリを開きます。"),
    step("②", "紫色の【🏠 在宅勤務】ボタンをタップします。"),
    step("③", "「在宅勤務を開始しました」というメッセージが表示されたら完了です。"),
    emptyLine(),
    caution("出勤と在宅勤務は、どちらか一方のみタップしてください。間違えた場合は、上司にご連絡ください。"),
    emptyLine(),
    heading2("4-4　休憩時間について（みなし60分控除）"),
    bodyText("休憩時間は、退勤時に自動で60分が控除されます（みなし休憩控除方式）。"),
    bodyText("休憩の打刻操作は不要です。打刻画面に「60分（みなし）」と表示されます。"),
    emptyLine(),
    tip("休憩の打刻ボタンはありません。出勤と退勤の2つの打刻だけで大丈夫です。"),
    caution("実働時間は「退勤時刻 − 出勤時刻 − 60分（みなし休憩）」で自動計算されます。"),
    emptyLine(),
    heading2("4-5　退勤打刻"),
    bodyText("仕事が終わったら、退勤の打刻を行います。"),
    emptyLine(),
    step("①", "KINTAIアプリの打刻画面を開きます。"),
    step("②", "赤色の【🔴 退勤】ボタンをタップします。"),
    step("③", "画面に「退勤打刻しました HH:MM」というメッセージが表示されます。"),
    step("④", "ステータスが「退勤済」に変わったら、退勤打刻は完了です。"),
    emptyLine(),
    caution("退勤打刻を忘れると、勤務時間が正しく記録されません。仕事が終わったら必ず打刻してください。"),
    emptyLine(),
    heading2("4-6　打刻を忘れた場合"),
    bodyText("打刻を忘れてしまった場合は、以下の手順で対応してください。"),
    emptyLine(),
    step("①", "上司（所属長）に打刻を忘れたことを報告してください。"),
    step("②", "上司の指示に従い、管理者側で勤怠記録の修正を依頼してください。"),
    emptyLine(),
    caution("自分で過去の打刻を修正することはできません。必ず上司にご連絡ください。"),
    tip("毎日の習慣にするために、出社したらまずKINTAIアプリを開くことを心がけましょう。"),
    pageBreak(),
  ];
}

// ============================================================
// 第5章: 勤怠の確認
// ============================================================
function chapter5(): Paragraph[] {
  return [
    heading1("第5章　勤怠の確認"),
    separator(),
    ...chapterIntro([
      "日次一覧画面の見方",
      "月次サマリ画面の見方",
      "残業時間のゲージの見方",
    ]),
    heading2("5-1　日次一覧の見方"),
    bodyText("日次一覧画面では、今月の勤怠記録を日ごとに確認できます。"),
    emptyLine(),
    step("①", "サイドバー（デスクトップ）またはボトムバー（モバイル）から【📅 日次】をタップします。リンク先は /employee/daily です。"),
    step("②", "今月の勤怠記録が一覧表で表示されます。"),
    emptyLine(),
    bodyText("一覧表の各列の意味は以下のとおりです。"),
    emptyLine(),
    makeTable(
      ["列の名前", "意味"],
      [
        ["日付", "その日の日付"],
        ["場所", "出社 または 在宅"],
        ["出勤", "出勤した時刻"],
        ["退勤", "退勤した時刻"],
        ["実働", "実際に働いた時間（休憩を除く）"],
        ["残業", "残業した時間"],
        ["状態", "勤務の状態（出勤済、休暇など）"],
      ]
    ),
    emptyLine(),
    tip("記録に誤りがある場合は、上司にご連絡ください。"),
    emptyLine(),
    heading2("5-2　月次サマリの見方"),
    bodyText("月次サマリ画面では、今月の勤怠状況をまとめて確認できます。"),
    emptyLine(),
    step("①", "サイドバー（デスクトップ）またはボトムバー（モバイル）から【📊 月次】をタップします。リンク先は /employee/monthly です。"),
    step("②", "今月のサマリ（まとめ）が表示されます。"),
    emptyLine(),
    bodyText("表示される情報は以下のとおりです。"),
    emptyLine(),
    bodyTextMulti([tr("・出勤日数: 今月出勤した日の数")], { indent: { left: convertMillimetersToTwip(5) } }),
    bodyTextMulti([tr("・総実働時間: 今月の合計労働時間")], { indent: { left: convertMillimetersToTwip(5) } }),
    bodyTextMulti([tr("・残業時間: 今月の合計残業時間（ゲージ表示）")], { indent: { left: convertMillimetersToTwip(5) } }),
    bodyTextMulti([tr("・有給残日数: 残っている有給休暇の日数")], { indent: { left: convertMillimetersToTwip(5) } }),
    bodyTextMulti([tr("・有給取得進捗バー: 今年度の有給消化状況")], { indent: { left: convertMillimetersToTwip(5) } }),
    emptyLine(),
    heading2("5-3　残業時間のゲージについて"),
    bodyText("残業時間のゲージは、今月の残業時間を視覚的に表示するものです。"),
    bodyText("ゲージは段階的に色が変わり、残業時間の状況をお知らせします。"),
    emptyLine(),
    makeTable(
      ["ゲージの色", "意味"],
      [
        ["緑", "残業時間は問題のない範囲です"],
        ["黄", "残業時間がやや多くなっています。注意してください"],
        ["赤", "残業時間が多いです。上司にご相談ください"],
      ]
    ),
    emptyLine(),
    tip("残業時間を確認する習慣をつけると、働きすぎを防ぐことができます。"),
    pageBreak(),
  ];
}

// ============================================================
// 第6章: 休暇を申請する
// ============================================================
function chapter6(): Paragraph[] {
  return [
    heading1("第6章　休暇を申請する"),
    separator(),
    ...chapterIntro([
      "有給休暇の申請手順",
      "半休（午前半休・午後半休）の申請方法",
      "特別休暇の申請方法",
      "申請状況の確認方法",
      "有給残日数の確認方法",
    ]),
    heading2("6-1　休暇申請画面を開く"),
    step("①", "サイドバー（デスクトップ）またはボトムバー（モバイル）から【📋 申請】をタップします。リンク先は /employee/requests です。"),
    step("②", "休暇申請画面が表示されます。"),
    emptyLine(),
    heading2("6-2　有給休暇（1日）の申請手順"),
    bodyText("1日まるごとお休みを取る場合の手順です。"),
    emptyLine(),
    step("①", "休暇の種別で【🌴 有給休暇（全日）】をタップして選択します。"),
    step("②", "「開始日」の欄をタップして、休暇を取りたい日付を選びます。"),
    step("③", "複数日にわたる場合は、「終了日」の欄をタップして、最終日の日付を選びます。1日だけの場合は開始日と同じ日を選んでください。"),
    step("④", "「申請理由」の欄に理由を入力します（任意ですので、入力しなくても申請できます）。"),
    step("⑤", "入力内容を確認したら【申請する →】ボタンをタップします。"),
    step("⑥", "「申請が完了しました」というメッセージが表示されたら、申請は完了です。"),
    emptyLine(),
    tip("有給休暇を1日取得すると、有給残日数から1日分が消費されます。"),
    emptyLine(),
    heading2("6-3　半休（午前半休・午後半休）の申請方法"),
    bodyText("午前だけ、または午後だけお休みを取る場合の手順です。"),
    emptyLine(),
    step("①", "午前をお休みにしたい場合は【🌅 午前半休】を選択します。午後をお休みにしたい場合は【🌇 午後半休】を選択します。"),
    step("②", "「開始日」の欄をタップして、半休を取りたい日付を選びます。"),
    step("③", "必要に応じて「申請理由」を入力します。"),
    step("④", "【申請する →】ボタンをタップします。"),
    emptyLine(),
    tip("半休を取得すると、有給残日数から0.5日分が消費されます。"),
    emptyLine(),
    heading2("6-4　特別休暇の申請方法"),
    bodyText("結婚、忌引きなどの慶弔事由による特別休暇を申請する場合の手順です。"),
    emptyLine(),
    step("①", "休暇の種別で【⭐ 特別休暇】をタップして選択します。"),
    step("②", "「開始日」と「終了日」を選択します。"),
    step("③", "「申請理由」の欄に事由を入力してください（特別休暇の場合は入力をお願いします）。"),
    step("④", "【申請する →】ボタンをタップします。"),
    emptyLine(),
    caution("特別休暇の種類や日数については、就業規則をご確認ください。ご不明な場合は人事部にお問い合わせください。"),
    emptyLine(),
    heading2("6-5　申請状況の確認方法"),
    bodyText("過去に提出した休暇申請の状況を確認できます。"),
    emptyLine(),
    step("①", "休暇申請画面を下にスクロール（指で画面を下から上になぞる）します。"),
    step("②", "「申請履歴」の一覧が表示されます。"),
    step("③", "各申請の横に、ステータスが表示されています。"),
    emptyLine(),
    makeTable(
      ["ステータス", "意味"],
      [
        ["承認待ち", "上司の確認を待っている状態です"],
        ["承認済み", "上司に承認されました。休暇が確定しています"],
        ["却下", "申請が承認されませんでした。上司にご確認ください"],
      ]
    ),
    emptyLine(),
    heading2("6-6　有給残日数の確認方法"),
    bodyText("有給休暇の残り日数は、2つの方法で確認できます。"),
    emptyLine(),
    bodyTextMulti([tr("方法1: ", { bold: true }), tr("月次サマリ画面（【📊 月次】をタップ）の「有給残日数」で確認できます。")]),
    bodyTextMulti([tr("方法2: ", { bold: true }), tr("休暇申請画面（【📋 申請】をタップ）にも有給取得の進捗が表示されます。")]),
    emptyLine(),
    tip("有給休暇は計画的に取得しましょう。年度末に慌てないよう、定期的に残日数を確認することをおすすめします。"),
    pageBreak(),
  ];
}

// ============================================================
// 第7章: 画面の見方ガイド
// ============================================================
function chapter7(): Paragraph[] {
  return [
    heading1("第7章　画面の見方ガイド"),
    separator(),
    ...chapterIntro([
      "各画面のアイコン・マークの意味",
      "ステータスの色の意味",
      "ナビゲーション（サイドバー/ボトムバー）の使い方",
    ]),
    heading2("7-1　打刻ボタンの一覧"),
    emptyLine(),
    makeTable(
      ["ボタン", "色", "使うとき"],
      [
        ["🏢 出勤", "緑", "会社に出社したとき"],
        ["🏠 在宅勤務", "紫", "自宅で仕事を始めるとき"],
        ["🔴 退勤", "赤", "仕事が終わったとき"],
      ]
    ),
    emptyLine(),
    tip("休憩時間は退勤時に自動で60分が控除されます（みなし休憩控除方式）。休憩ボタンの操作は不要です。"),
    emptyLine(),
    heading2("7-2　ステータスの色の意味"),
    bodyText("アプリの中では、状態をわかりやすくするために色を使い分けています。"),
    emptyLine(),
    makeTable(
      ["色", "意味", "対応"],
      [
        ["緑", "正常・OK", "問題ありません"],
        ["黄", "注意", "確認してください"],
        ["赤", "要対応", "対応が必要です。上司に相談してください"],
      ]
    ),
    emptyLine(),
    heading2("7-3　ナビゲーション（サイドバー/ボトムバー）"),
    bodyText("KINTAIアプリはレスポンシブ対応しており、画面サイズに応じてナビゲーションの表示が切り替わります。"),
    emptyLine(),
    bodyTextMulti([tr("・デスクトップ（PC）: ", { bold: true }), tr("画面左側に「サイドバー」が常時表示されます。")]),
    bodyTextMulti([tr("・モバイル（iPhone等）: ", { bold: true }), tr("画面の一番下に「ボトムバー」が表示されます。")]),
    emptyLine(),
    bodyText("どちらのナビゲーションでも、各アイコンをタップすると同じ画面に移動できます。"),
    emptyLine(),
    makeTable(
      ["アイコン", "名前", "リンク先", "機能"],
      [
        ["⏱", "打刻", "/employee", "出勤・退勤の打刻画面"],
        ["📅", "日次", "/employee/daily", "日ごとの勤怠記録一覧"],
        ["📊", "月次", "/employee/monthly", "月の勤怠まとめ（サマリ）"],
        ["📋", "申請", "/employee/requests", "休暇の申請画面"],
      ]
    ),
    emptyLine(),
    tip("画面を切り替えるには、サイドバーまたはボトムバーのアイコンをタップするだけです。いつでも好きな画面に移動できます。"),
    heading2("7-4　休暇の種別アイコン"),
    emptyLine(),
    makeTable(
      ["アイコン", "種別", "消費日数"],
      [
        ["🌴", "有給休暇（全日）", "1日"],
        ["🌅", "午前半休", "0.5日"],
        ["🌇", "午後半休", "0.5日"],
        ["⭐", "特別休暇", "就業規則に準ずる"],
      ]
    ),
    emptyLine(),
    heading2("7-5　申請ステータスバッジ"),
    emptyLine(),
    makeTable(
      ["バッジ", "意味"],
      [
        ["承認待ち", "上司の確認を待っています"],
        ["承認済み", "承認されました"],
        ["却下", "承認されませんでした"],
      ]
    ),
    pageBreak(),
  ];
}

// ============================================================
// 第8章: トラブルシューティング
// ============================================================
function chapter8(): Paragraph[] {
  return [
    heading1("第8章　こんなときどうする？（トラブルシューティング）"),
    separator(),
    ...chapterIntro([
      "よくあるトラブルの解決方法",
      "自分で試せる対処法",
      "それでも解決しない場合の連絡先",
    ]),
    bodyText("アプリを使っていて困ったことがあったら、以下を確認してみてください。"),
    emptyLine(),
    ...qaBlock(
      "ログインできません",
      "以下の点をご確認ください。\n" +
      "　・メールアドレスが正しく入力されているか確認してください。\n" +
      "　・パスワードが正しいか確認してください（大文字・小文字の違いにご注意ください）。\n" +
      "　・新規登録後の場合、管理者の「承認」が完了しているか確認してください。\n" +
      "　・上記をすべて確認しても解決しない場合は、情報システム部にお問い合わせください。"
    ),
    ...qaBlock(
      "打刻ボタンが押せません（グレーになっている）",
      "すでにその操作が完了している可能性があります。例えば、出勤打刻がすでに完了している場合、出勤ボタンは押せません。画面上部のステータス表示をご確認ください。"
    ),
    ...qaBlock(
      "打刻を忘れてしまいました",
      "自分で過去の打刻を修正することはできません。上司（所属長）にご連絡いただき、管理者側で修正を依頼してください。"
    ),
    ...qaBlock(
      "アプリが開きません",
      "以下をお試しください。\n" +
      "　・iPhoneがインターネット（Wi-Fiまたはモバイル通信）に接続されているか確認してください。\n" +
      "　・iPhoneを再起動してから、もう一度アプリを開いてみてください。\n" +
      "　・それでも開かない場合は、Safariからアドレスを直接入力してアクセスしてみてください。"
    ),
    ...qaBlock(
      "画面が真っ白になりました",
      "以下をお試しください。\n" +
      "　・画面を下に引っ張って離す（プルダウン）と、画面が更新（リロード）されることがあります。\n" +
      "　・アプリを一度閉じて、もう一度開いてみてください。\n" +
      "　・iPhoneのSafariのキャッシュ（一時データ）をクリアしてみてください。方法: 「設定」→「Safari」→「履歴とWebサイトデータを消去」。\n" +
      "　・上記をすべて試しても解決しない場合は、情報システム部にお問い合わせください。"
    ),
    ...qaBlock(
      "パスワードを忘れてしまいました",
      "パスワードを忘れた場合は、情報システム部にご連絡ください。パスワードのリセット手続きをご案内いたします。"
    ),
    emptyLine(),
    caution("上記の方法で解決しない場合は、無理に操作を続けず、情報システム部にお問い合わせください。"),
    pageBreak(),
  ];
}

// ============================================================
// 第9章: お問い合わせ先
// ============================================================
function chapter9(): Paragraph[] {
  return [
    heading1("第9章　お問い合わせ先"),
    separator(),
    ...chapterIntro([
      "アプリに関するお問い合わせ先",
      "勤怠・休暇に関するお問い合わせ先",
    ]),
    heading2("9-1　アプリの操作・不具合に関するお問い合わせ"),
    bodyText("KINTAIアプリの操作方法やエラー・不具合に関するお問い合わせは、情報システム部までご連絡ください。"),
    emptyLine(),
    bodyTextMulti([tr("　部署名: ", { bold: true }), tr("情報システム部")]),
    bodyTextMulti([tr("　メール: ", { bold: true }), tr("（社内連絡先をご確認ください）")]),
    bodyTextMulti([tr("　内線番号: ", { bold: true }), tr("（社内連絡先をご確認ください）")]),
    emptyLine(),
    heading2("9-2　勤怠・休暇に関するお問い合わせ"),
    bodyText("勤怠の修正、休暇制度、就業規則に関するお問い合わせは、人事部までご連絡ください。"),
    emptyLine(),
    bodyTextMulti([tr("　部署名: ", { bold: true }), tr("人事部")]),
    bodyTextMulti([tr("　メール: ", { bold: true }), tr("（社内連絡先をご確認ください）")]),
    bodyTextMulti([tr("　内線番号: ", { bold: true }), tr("（社内連絡先をご確認ください）")]),
    emptyLine(),
    heading2("9-3　打刻の修正に関するお問い合わせ"),
    bodyText("打刻の修正が必要な場合は、まず上司（所属長）にご報告ください。上司の承認のもと、管理者が修正を行います。"),
    emptyLine(),
    emptyLine(),
    separator(),
    emptyLine(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [tr("このマニュアルは2026年3月時点の情報に基づいて作成されています。", { size: 20, italics: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [tr("アプリの更新により、画面や操作方法が変更される場合があります。", { size: 20, italics: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [tr("最新の情報は情報システム部にお問い合わせください。", { size: 20, italics: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 120 },
      children: [tr("株式会社サン・カミヤ", { size: 22 })],
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
          run: {
            font: "游ゴシック",
            size: 32,
            bold: true,
          },
          paragraph: {
            spacing: { before: 480, after: 240 },
          },
        },
        heading2: {
          run: {
            font: "游ゴシック",
            size: 28,
            bold: true,
          },
          paragraph: {
            spacing: { before: 360, after: 200 },
          },
        },
        heading3: {
          run: {
            font: "游ゴシック",
            size: 24,
            bold: true,
          },
          paragraph: {
            spacing: { before: 240, after: 160 },
          },
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
                    text: "KINTAI 従業員マニュアル",
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
          ...chapter1(),
          ...chapter2(),
          ...chapter3(),
          ...chapter4(),
          ...chapter5(),
          ...chapter6(),
          ...chapter7(),
          ...chapter8(),
          ...chapter9(),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, "KINTAI_従業員マニュアル_iPhone.docx");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Manual generated: ${outputPath}`);
  console.log(`File size: ${(buffer.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("Error generating manual:", err);
  process.exit(1);
});
