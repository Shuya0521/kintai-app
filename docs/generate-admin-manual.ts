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

/** 本文段落 */
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
        size: 32,
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
        size: 28,
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
        size: 24,
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

/** 箇条書き項目 */
function bullet(text: string): Paragraph {
  return bodyTextMulti([tr(`・${text}`)], { indent: { left: convertMillimetersToTwip(5) } });
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
      children: [tr("管理者マニュアル", { size: 36, bold: true })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
      children: [tr("― 管理者ポータル操作ガイド ―", { size: 28 })],
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
    bodyText("第1章　システム概要"),
    bodyText("第2章　ログイン"),
    bodyText("第3章　ダッシュボード"),
    bodyText("第4章　承認管理"),
    bodyText("第5章　勤怠一覧"),
    bodyText("第6章　社員管理"),
    bodyText("第7章　残業モニタリング"),
    bodyText("第8章　マスタ管理"),
    bodyText("第9章　設定"),
    bodyText("第10章　デモアカウント一覧"),
    bodyText("付録　お問い合わせ先"),
    pageBreak(),
  ];
}

// ============================================================
// 第1章: システム概要
// ============================================================
function chapter1(): Paragraph[] {
  return [
    heading1("第1章　システム概要"),
    separator(),
    ...chapterIntro([
      "管理者ポータルの概要",
      "アクセスURL・ポート番号",
      "ロールと権限の一覧",
    ]),

    heading2("1-1　管理者ポータルとは"),
    bodyText("管理者ポータル（KINTAI Admin）は、勤怠管理システムの管理機能を提供するWebアプリケーションです。"),
    bodyText("従業員ポータル（ポート3000）とは別に、ポート3001で動作します。"),
    emptyLine(),
    bodyText("管理者ポータルでは、以下の機能を利用できます。"),
    bullet("休暇申請の承認・却下"),
    bullet("全社員の月次勤怠データの閲覧・Excel出力"),
    bullet("新規登録社員の承認、社員情報の編集、退職処理"),
    bullet("残業時間のモニタリング・36協定アラート確認"),
    bullet("祝日マスタの管理"),
    bullet("システム設定（勤務ルール・SMTP通知設定など）"),
    emptyLine(),

    heading2("1-2　アクセスURL"),
    bodyText("管理者ポータルには、以下のURLでアクセスします。"),
    emptyLine(),
    bodyTextMulti([
      tr("　URL: ", { bold: true }),
      tr("http://[サーバーIP]:3001", { bold: true }),
    ]),
    emptyLine(),
    tip("従業員ポータル（ポート3000）とは別のURLです。ブックマークしておくことをおすすめします。"),
    emptyLine(),

    heading2("1-3　ロールと権限"),
    bodyText("管理者ポータルにアクセスできるロールは以下の4つです。"),
    emptyLine(),
    makeTable(
      ["ロール", "管理画面アクセス", "承認権限", "Excel出力", "社員管理", "システム設定"],
      [
        ["システム管理者", "○", "○", "○", "○", "○"],
        ["取締役", "○", "○", "○", "○", "○"],
        ["統括部長", "○", "○", "○", "○", "×"],
        ["部長", "○", "○", "○", "○", "×"],
      ]
    ),
    emptyLine(),
    caution("課長以下のロールでは管理者ポータルにログインできません。ログインを試みるとエラーが表示されます。"),
    pageBreak(),
  ];
}

// ============================================================
// 第2章: ログイン
// ============================================================
function chapter2(): Paragraph[] {
  return [
    heading1("第2章　ログイン"),
    separator(),
    ...chapterIntro([
      "管理者ポータルへのログイン手順",
      "ログアウトの方法",
      "アカウントロックアウトについて",
    ]),

    heading2("2-1　ログイン手順"),
    step("①", "ブラウザで管理者ポータルのURL（http://[サーバーIP]:3001）にアクセスします。"),
    step("②", "ログイン画面が表示されます。"),
    step("③", "「メールアドレス」欄に、管理者権限を持つアカウントのメールアドレスを入力します。"),
    step("④", "「パスワード」欄にパスワードを入力します。"),
    step("⑤", "【ログイン】ボタンをクリックします。"),
    step("⑥", "ダッシュボード画面が表示されたら、ログイン成功です。"),
    emptyLine(),
    caution("管理画面にアクセス可能なロールは、システム管理者・取締役・統括部長・部長の4つです。それ以外のアカウントではログインできません。"),
    emptyLine(),

    heading2("2-2　ログアウト"),
    bodyText("画面右上のユーザーメニューから【ログアウト】をクリックします。"),
    emptyLine(),

    heading2("2-3　アカウントロックアウト"),
    bodyText("セキュリティのため、パスワードを連続で間違えるとアカウントがロックされます。"),
    emptyLine(),
    makeTable(
      ["失敗回数", "ロック期間"],
      [
        ["5回", "15分間ロック"],
        ["10回", "1時間ロック"],
        ["15回", "管理者による手動解除が必要"],
      ]
    ),
    emptyLine(),
    tip("ロックアウトは従業員ポータルと共通です。15回以上の失敗は、システム管理者がデータベースから手動で解除する必要があります。"),
    pageBreak(),
  ];
}

// ============================================================
// 第3章: ダッシュボード
// ============================================================
function chapter3(): Paragraph[] {
  return [
    heading1("第3章　ダッシュボード"),
    separator(),
    ...chapterIntro([
      "KPIカードの見方",
      "リアルタイムステータスの確認",
      "クイックアクション",
    ]),

    heading2("3-1　ダッシュボード画面の概要"),
    bodyText("ログイン後に最初に表示されるダッシュボード画面では、勤怠管理に必要な主要指標を一覧できます。"),
    emptyLine(),

    heading2("3-2　KPIカード"),
    bodyText("画面上部に表示される各カードには、本日の勤怠状況がリアルタイムで表示されます。"),
    emptyLine(),
    makeTable(
      ["カード名", "表示内容"],
      [
        ["本日の出勤者数", "当日出勤打刻を行った社員の人数"],
        ["在宅勤務者数", "当日在宅勤務打刻を行った社員の人数"],
        ["未承認申請数", "承認待ちとなっている休暇申請の件数"],
        ["残業警告件数", "当月の残業アラートが発生している社員数"],
      ]
    ),
    emptyLine(),

    heading2("3-3　リアルタイムステータス"),
    bodyText("全社員の本日の勤務状態（未出勤・勤務中・在宅勤務中・退勤済）が一覧で確認できます。"),
    bodyText("各ステータスの人数が色分けされたバッジで表示されます。"),
    emptyLine(),

    heading2("3-4　クイックアクション"),
    bodyText("よく使う操作へのショートカットが表示されます。"),
    emptyLine(),
    bullet("承認管理画面へ移動"),
    bullet("勤怠一覧画面へ移動"),
    bullet("社員管理画面へ移動"),
    emptyLine(),
    tip("未承認申請がある場合、バッジに件数が表示されます。こまめに確認し、72時間以内に処理してください。72時間を超えると自動エスカレーションが発生します。"),
    pageBreak(),
  ];
}

// ============================================================
// 第4章: 承認管理
// ============================================================
function chapter4(): Paragraph[] {
  return [
    heading1("第4章　承認管理"),
    separator(),
    ...chapterIntro([
      "休暇申請の一覧確認",
      "承認・却下の操作手順",
      "メール通知の仕組み",
      "エスカレーションルール",
    ]),

    heading2("4-1　承認管理画面を開く"),
    bodyText("サイドメニューから【承認管理】をクリックすると、承認管理画面が表示されます。"),
    bodyText("承認待ちの休暇申請が一覧で表示されます。"),
    emptyLine(),

    heading2("4-2　申請一覧の見方"),
    makeTable(
      ["列名", "内容"],
      [
        ["申請者", "休暇を申請した社員の氏名"],
        ["部署", "申請者の所属部署"],
        ["休暇種別", "有給休暇（全日）、午前半休、午後半休、特別休暇"],
        ["期間", "開始日〜終了日"],
        ["日数", "申請日数"],
        ["理由", "申請理由（任意入力）"],
        ["ステータス", "承認待ち・承認済み・却下"],
      ]
    ),
    emptyLine(),

    heading2("4-3　承認の手順"),
    step("①", "承認したい申請の行を確認します。"),
    step("②", "【承認】ボタンをクリックします。"),
    step("③", "確認ダイアログが表示されたら【はい】をクリックします。"),
    step("④", "申請のステータスが「承認済み」に変わります。"),
    bodyText("承認されると、申請者の有給残日数から申請日数分が自動的に消化されます。"),
    emptyLine(),

    heading2("4-4　却下の手順"),
    step("①", "却下したい申請の行を確認します。"),
    step("②", "【却下】ボタンをクリックします。"),
    step("③", "コメント入力欄が表示されます。却下理由を入力してください。"),
    step("④", "【却下する】をクリックします。"),
    emptyLine(),
    caution("却下する場合は、申請者に理由が通知されます。適切なコメントを入力してください。"),
    emptyLine(),

    heading2("4-5　メール通知"),
    bodyText("承認・却下の操作を行うと、申請者にメールで結果が通知されます。"),
    emptyLine(),
    makeTable(
      ["通知タイプ", "送信先", "タイミング"],
      [
        ["承認依頼メール", "承認者（部長以上）", "社員が休暇申請を提出した時"],
        ["承認結果メール", "申請者本人", "承認または却下の処理時"],
        ["打刻漏れアラート", "本人", "毎日22:00（バッチ処理）"],
        ["残業警告メール", "本人", "毎月1日（バッチ処理）"],
      ]
    ),
    emptyLine(),
    tip("メール通知の有効/無効は、設定画面の「通知設定」タブから通知タイプごとに切り替えできます。"),
    emptyLine(),

    heading2("4-6　エスカレーション"),
    bodyText("承認依頼が72時間以上放置された場合、自動的に上位権限者へエスカレーションされます。"),
    bodyText("エスカレーションを防ぐため、承認依頼はこまめに確認・処理してください。"),
    pageBreak(),
  ];
}

// ============================================================
// 第5章: 勤怠一覧
// ============================================================
function chapter5(): Paragraph[] {
  return [
    heading1("第5章　勤怠一覧"),
    separator(),
    ...chapterIntro([
      "全社員の月次勤怠データの閲覧",
      "部署フィルタの使い方",
      "Excel出力の手順",
    ]),

    heading2("5-1　勤怠一覧画面を開く"),
    bodyText("サイドメニューから【勤怠一覧】をクリックすると、全社員の月次勤怠データが表示されます。"),
    emptyLine(),

    heading2("5-2　表示内容"),
    bodyText("勤怠一覧では、選択した月の全社員の勤怠集計が表示されます。"),
    emptyLine(),
    makeTable(
      ["列名", "内容"],
      [
        ["社員名", "社員の氏名"],
        ["部署", "所属部署"],
        ["出勤日数", "月間出勤日数"],
        ["総実働時間", "月間合計労働時間"],
        ["残業時間", "月間合計残業時間"],
        ["有給消化日数", "月間有給消化日数"],
      ]
    ),
    emptyLine(),

    heading2("5-3　月の切り替え"),
    bodyText("画面上部の年月セレクタで、表示する月を切り替えることができます。"),
    emptyLine(),

    heading2("5-4　部署フィルタ"),
    bodyText("部署ドロップダウンを使って、特定の部署の社員のみに絞り込んで表示できます。"),
    step("①", "画面上部の「部署」ドロップダウンをクリックします。"),
    step("②", "表示したい部署を選択します。"),
    step("③", "選択した部署の社員のみが一覧に表示されます。"),
    emptyLine(),
    tip("「全部署」を選択すると、全社員の勤怠データが表示されます。"),
    emptyLine(),

    heading2("5-5　Excel出力"),
    bodyText("表示中の勤怠データをExcelファイル（.xlsx）としてダウンロードできます。"),
    emptyLine(),
    step("①", "表示したい月・部署を設定します。"),
    step("②", "【Excel出力】ボタンをクリックします。"),
    step("③", "Excelファイルが自動的にダウンロードされます。"),
    emptyLine(),
    bodyText("Excel出力には以下の情報が含まれます。"),
    bullet("社員ごとの日次勤怠データ（出勤時刻、退勤時刻、実働時間、残業時間）"),
    bullet("月次集計サマリ"),
    bullet("休暇取得状況"),
    emptyLine(),
    caution("Excel出力はシステム管理者・取締役・統括部長・部長のみ利用可能です。"),
    emptyLine(),
    tip("休憩時間はみなし60分控除方式です。退勤時に自動で60分が差し引かれた実働時間が記録されています。"),
    pageBreak(),
  ];
}

// ============================================================
// 第6章: 社員管理
// ============================================================
function chapter6(): Paragraph[] {
  return [
    heading1("第6章　社員管理"),
    separator(),
    ...chapterIntro([
      "新規登録申請の承認",
      "社員情報の編集",
      "退職処理の手順",
    ]),

    heading2("6-1　社員管理画面を開く"),
    bodyText("サイドメニューから【社員管理】をクリックすると、全社員の一覧が表示されます。"),
    emptyLine(),

    heading2("6-2　新規登録申請の承認"),
    bodyText("従業員ポータルからセルフ登録した社員は「承認待ち」のステータスになります。管理者が承認するまで、その社員はログインできません。"),
    emptyLine(),
    step("①", "社員一覧で、ステータスが「承認待ち」の社員を確認します。"),
    step("②", "該当社員の行にある【承認】ボタンをクリックします。"),
    step("③", "確認ダイアログで【はい】をクリックします。"),
    step("④", "社員のステータスが「アクティブ」に変わり、ログインが可能になります。"),
    emptyLine(),
    tip("承認時に社員の入社日が設定され、入社時有給休暇（2日）が自動付与されます。"),
    emptyLine(),

    heading2("6-3　社員情報の編集"),
    bodyText("社員の基本情報（氏名、部署、ロール等）を編集できます。"),
    emptyLine(),
    step("①", "編集したい社員の行にある【編集】ボタンをクリックします。"),
    step("②", "編集フォームが表示されます。"),
    step("③", "変更したい項目を修正します。"),
    step("④", "【保存】ボタンをクリックします。"),
    emptyLine(),
    bodyText("編集可能な項目:"),
    bullet("氏名（姓・名）"),
    bullet("部署"),
    bullet("役職（ロール）"),
    bullet("社員番号"),
    bullet("入社日"),
    bullet("勤務形態（出社・在宅・ハイブリッド）"),
    emptyLine(),
    caution("ロールを変更すると、その社員のアクセス権限が即座に変わります。慎重に操作してください。"),
    emptyLine(),

    heading2("6-4　退職処理"),
    bodyText("退職する社員のアカウントを無効化する手順です。"),
    emptyLine(),
    step("①", "該当社員の行にある【編集】ボタンをクリックします。"),
    step("②", "ステータスを「退職」に変更します。"),
    step("③", "【保存】ボタンをクリックします。"),
    emptyLine(),
    bodyText("退職処理後、その社員は従業員ポータル・管理者ポータルの両方にログインできなくなります。"),
    caution("退職処理は取り消しが可能ですが、慎重に操作してください。退職処理を行うと、その社員の全セッションが無効化されます。"),
    pageBreak(),
  ];
}

// ============================================================
// 第7章: 残業モニタリング
// ============================================================
function chapter7(): Paragraph[] {
  return [
    heading1("第7章　残業モニタリング"),
    separator(),
    ...chapterIntro([
      "残業モニタリング画面の見方",
      "36協定アラートの種類",
      "残業レベル表",
    ]),

    heading2("7-1　残業モニタリング画面を開く"),
    bodyText("サイドメニューから【残業モニタリング】をクリックすると、全社員の残業状況が表示されます。"),
    emptyLine(),

    heading2("7-2　残業レベル表"),
    bodyText("残業時間に応じて、以下の6段階のレベルが設定されています。"),
    emptyLine(),
    makeTable(
      ["レベル", "月間残業時間", "意味", "対応"],
      [
        ["ok", "36時間未満", "問題なし", "特になし"],
        ["caution", "36時間以上", "注意喚起", "所属長に通知"],
        ["warning", "45時間以上", "原則上限超過", "業務改善指導"],
        ["serious", "60時間以上", "要改善", "上位管理者に報告"],
        ["critical", "80時間以上", "産業医面談対象", "産業医面談を実施"],
        ["violation", "100時間以上", "法令違反", "即座に是正措置"],
      ]
    ),
    emptyLine(),

    heading2("7-3　36協定チェック項目"),
    bodyText("システムは以下の項目を自動的にチェックし、アラートを発生させます。"),
    emptyLine(),
    bullet("月次上限: 原則45時間/月"),
    bullet("年次上限: 360時間/年"),
    bullet("2〜6ヶ月平均: 80時間以下"),
    bullet("特別条項: 年6回まで45時間超過可能"),
    bullet("休憩時間コンプライアンス: 6時間超→45分以上、8時間超→60分以上"),
    emptyLine(),
    caution("critical（80時間以上）レベルの社員は、産業医面談の対象です。速やかに人事部と連携してください。"),
    emptyLine(),

    heading2("7-4　アラート一覧"),
    bodyText("残業アラートが発生している社員が一覧で表示されます。"),
    bodyText("レベルに応じて色分けされ、深刻度の高い順にソートされます。"),
    emptyLine(),
    tip("残業警告メールは毎月1日にバッチ処理で自動送信されます。通知設定で有効/無効を切り替えできます。"),
    pageBreak(),
  ];
}

// ============================================================
// 第8章: マスタ管理
// ============================================================
function chapter8(): Paragraph[] {
  return [
    heading1("第8章　マスタ管理"),
    separator(),
    ...chapterIntro([
      "祝日マスタの登録・編集",
    ]),

    heading2("8-1　マスタ管理画面を開く"),
    bodyText("サイドメニューから【マスタ管理】をクリックすると、マスタ管理画面が表示されます。"),
    emptyLine(),

    heading2("8-2　祝日登録"),
    bodyText("祝日マスタに登録された日付は、勤怠計算において休日として扱われます。"),
    emptyLine(),

    heading3("祝日の新規登録"),
    step("①", "【祝日追加】ボタンをクリックします。"),
    step("②", "日付を選択します。"),
    step("③", "祝日名を入力します（例: 元日、成人の日）。"),
    step("④", "【保存】をクリックします。"),
    emptyLine(),

    heading3("祝日の編集・削除"),
    bodyText("登録済みの祝日は、一覧から編集・削除が可能です。"),
    emptyLine(),
    tip("年度初めに、その年の祝日をまとめて登録しておくと便利です。"),
    caution("祝日を削除すると、該当日の勤怠計算に影響が出る場合があります。"),
    pageBreak(),
  ];
}

// ============================================================
// 第9章: 設定
// ============================================================
function chapter9(): Paragraph[] {
  return [
    heading1("第9章　設定"),
    separator(),
    ...chapterIntro([
      "基本設定（会社名・勤務時間）",
      "勤務ルール設定",
      "承認設定",
      "通知設定（SMTP・メール通知タイプ別ON/OFF・テストメール送信）",
    ]),
    caution("設定画面はシステム管理者および取締役のみアクセス可能です。統括部長・部長はアクセスできません。"),
    emptyLine(),

    heading2("9-1　設定画面を開く"),
    bodyText("サイドメニューから【設定】をクリックすると、設定画面が表示されます。"),
    bodyText("設定はタブで分かれています。"),
    emptyLine(),

    heading2("9-2　基本設定タブ"),
    bodyText("会社の基本情報を設定します。"),
    emptyLine(),
    makeTable(
      ["設定項目", "説明", "デフォルト値"],
      [
        ["会社名", "帳票等に表示される会社名", "株式会社サンプル"],
        ["始業時刻", "所定の始業時刻", "09:00"],
        ["終業時刻", "所定の終業時刻", "18:00"],
        ["所定労働時間", "1日の所定労働時間（時間）", "8"],
      ]
    ),
    emptyLine(),

    heading2("9-3　勤務ルール設定タブ"),
    bodyText("残業や勤務に関するルールを設定します。"),
    emptyLine(),
    makeTable(
      ["設定項目", "説明", "デフォルト値"],
      [
        ["残業アラート閾値", "アラートを出す残業時間（分）", "45"],
        ["月間残業上限", "月間残業の上限（時間）", "60"],
        ["年間残業上限", "年間残業の上限（時間）", "720"],
      ]
    ),
    emptyLine(),
    bodyText("休憩時間について:"),
    bodyText("本システムでは、みなし休憩控除方式（60分）を採用しています。退勤時に自動的に60分が控除されるため、休憩の打刻操作は不要です。"),
    emptyLine(),

    heading2("9-4　承認設定タブ"),
    bodyText("承認ワークフローに関する設定を行います。"),
    bullet("自動エスカレーション期限（デフォルト: 72時間）"),
    bullet("承認代理委任の有効/無効"),
    emptyLine(),

    heading2("9-5　通知設定タブ"),
    bodyText("メール通知に関する設定を行います。この設定により、システムから自動メールが送信されます。"),
    emptyLine(),

    heading3("SMTP設定"),
    bodyText("メール送信に使用するSMTPサーバーの情報を設定します。"),
    emptyLine(),
    makeTable(
      ["設定項目", "説明"],
      [
        ["SMTPホスト", "SMTPサーバーのホスト名（例: smtp.gmail.com）"],
        ["SMTPポート", "SMTPサーバーのポート番号（例: 587）"],
        ["SSL/TLS", "暗号化通信の有効/無効"],
        ["SMTPユーザー", "SMTP認証のユーザー名"],
        ["SMTPパスワード", "SMTP認証のパスワード"],
        ["送信元メールアドレス", "From欄に表示されるメールアドレス"],
        ["送信元名", "From欄に表示される名前"],
      ]
    ),
    emptyLine(),

    heading3("通知タイプ別ON/OFF"),
    bodyText("以下の4種類の通知について、個別に有効/無効を切り替えできます。"),
    emptyLine(),
    makeTable(
      ["通知タイプ", "設定キー", "説明"],
      [
        ["承認依頼メール", "notifyApprovalRequest", "休暇申請時に承認者へ通知"],
        ["承認結果メール", "notifyApprovalResult", "承認/却下時に申請者へ通知"],
        ["打刻漏れアラート", "notifyMissedStamp", "打刻漏れ検出時に本人へ通知（毎日22時）"],
        ["残業警告メール", "notifyOvertimeWarning", "残業基準超過時に本人へ通知（毎月1日）"],
      ]
    ),
    emptyLine(),
    bodyText("「メール通知」の全体スイッチをOFFにすると、全種類の通知が停止されます。"),
    emptyLine(),

    heading3("テストメール送信"),
    bodyText("SMTP設定が正しく機能しているかを確認するために、テストメールを送信できます。"),
    emptyLine(),
    step("①", "SMTP設定の各項目を入力・保存します。"),
    step("②", "【テストメール送信】ボタンをクリックします。"),
    step("③", "送信元メールアドレス宛にテストメールが送信されます。"),
    step("④", "受信を確認して、SMTP設定が正しいことを確認してください。"),
    emptyLine(),
    tip("SMTP設定が正しくない場合、テストメール送信時にエラーメッセージが表示されます。設定値を確認して再度お試しください。"),
    caution("SMTPパスワードは暗号化して保存されますが、セキュリティのため定期的に変更することをおすすめします。"),
    pageBreak(),
  ];
}

// ============================================================
// 第10章: デモアカウント一覧
// ============================================================
function chapter10(): Paragraph[] {
  return [
    heading1("第10章　デモアカウント一覧"),
    separator(),
    ...chapterIntro([
      "デモ環境で使用可能なアカウント一覧",
      "各アカウントのロールとアクセス範囲",
    ]),

    heading2("10-1　デモアカウント"),
    bodyText("デモ環境では以下のアカウントが利用可能です。"),
    bodyTextMulti([tr("パスワード: ", { bold: true }), tr("全アカウント共通 password123")]),
    emptyLine(),
    makeTable(
      ["名前", "メールアドレス", "役職", "部署"],
      [
        ["小田原 秀哉", "odawara@company.example.com", "システム管理者", "工事部"],
        ["河村 佳徳", "kawamura@company.example.com", "取締役", "管理部"],
        ["鈴木 英俊", "suzuki@company.example.com", "部長", "工事部"],
        ["河田 匡広", "kawata@company.example.com", "部長", "管理部"],
        ["串間 絵理", "kushima@company.example.com", "課長", "管理部"],
        ["笠間 成央", "kasama@company.example.com", "リーダー", "管理部"],
      ]
    ),
    emptyLine(),

    heading2("10-2　ロール別アクセス範囲"),
    emptyLine(),
    makeTable(
      ["アカウント", "従業員ポータル", "管理者ポータル", "備考"],
      [
        ["小田原（システム管理者）", "○", "○（全機能+システム設定）", "全権限"],
        ["河村（取締役）", "○", "○（全機能）", "管理画面+承認+Excel出力"],
        ["鈴木（部長）", "○", "○（承認・勤怠・Excel）", "設定以外の管理機能"],
        ["河田（部長）", "○", "○（承認・勤怠・Excel）", "設定以外の管理機能"],
        ["串間（課長）", "○", "×", "従業員ポータルのみ"],
        ["笠間（リーダー）", "○", "×", "従業員ポータルのみ"],
      ]
    ),
    emptyLine(),
    tip("管理者ポータルの動作確認には、小田原（システム管理者）アカウントでログインするとすべての機能を確認できます。"),
    pageBreak(),
  ];
}

// ============================================================
// 付録: お問い合わせ先
// ============================================================
function appendix(): Paragraph[] {
  return [
    heading1("付録　お問い合わせ先"),
    separator(),
    emptyLine(),

    heading2("システムに関するお問い合わせ"),
    bodyText("KINTAIシステムの操作方法、不具合、設定変更に関するお問い合わせは、情報システム部までご連絡ください。"),
    emptyLine(),
    bodyTextMulti([tr("　部署名: ", { bold: true }), tr("情報システム部")]),
    bodyTextMulti([tr("　メール: ", { bold: true }), tr("（社内連絡先をご確認ください）")]),
    bodyTextMulti([tr("　内線番号: ", { bold: true }), tr("（社内連絡先をご確認ください）")]),
    emptyLine(),

    heading2("勤怠制度・就業規則に関するお問い合わせ"),
    bodyText("勤怠制度、休暇制度、就業規則に関するお問い合わせは、人事部までご連絡ください。"),
    emptyLine(),
    bodyTextMulti([tr("　部署名: ", { bold: true }), tr("人事部")]),
    bodyTextMulti([tr("　メール: ", { bold: true }), tr("（社内連絡先をご確認ください）")]),
    bodyTextMulti([tr("　内線番号: ", { bold: true }), tr("（社内連絡先をご確認ください）")]),
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
      children: [tr("システムの更新により、画面や操作方法が変更される場合があります。", { size: 20, italics: true })],
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
                    text: "KINTAI 管理者マニュアル",
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
          ...chapter10(),
          ...appendix(),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = path.join(__dirname, "KINTAI_管理者マニュアル.docx");
  fs.writeFileSync(outputPath, buffer);
  console.log(`Admin manual generated: ${outputPath}`);
  console.log(`File size: ${(buffer.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error("Error generating admin manual:", err);
  process.exit(1);
});
