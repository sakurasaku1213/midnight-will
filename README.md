# 午前0時の遺言書

法律事務所を舞台にした10分完結ミステリーWebゲームです。

## プレイ

[ブラウザで遊ぶ](https://sakurasaku1213.github.io/midnight-will/)

スマホ・PC両対応です。第1話「午前0時の遺言書」と第2話「消えた準備書面」を無料公開し、制作記事・制作資料パック・追加シナリオへ展開する前提で整備しています。

第2話へ直接リンクする場合: `https://sakurasaku1213.github.io/midnight-will/?ep=episode_02`

## ファイル

- `docs/production-spec.md`: 制作仕様書
- `docs/scene-script.md`: シーン単位脚本
- `docs/release-kit.md`: 公開導線とBOOTH/note販売準備メモ
- `docs/analytics.md`: アクセス解析(GoatCounter)の有効化手順と見るべき数字
- `data/episode-01.json`: 第1話シナリオデータ
- `data/episode-02.json`: 第2話シナリオデータ
- `src/`: React/TypeScript製のゲーム本体(マルチエピソード対応)

## 起動

```powershell
npm.cmd install
npm.cmd run dev
```

ローカルURL:

```text
http://127.0.0.1:5173/
```

## 確認済み

- `npm.cmd run build`(型チェック込み)
- 第1話・第2話ともタイトル表示、エピソード切替、証拠取得、会話フラグ、自動イベント、最終推理3問、正解・不正解の両エンド
- スマホ幅(390px)でレイアウト崩れなし
- 自動テスト: `npm run preview` を起動した状態で `npm run test:smoke`(Playwrightで第2話をオープニングからクリアまで通しプレイ)

## 公開時に設定する項目

- GitHub About: `10分で解ける法律事務所ミステリーWebゲーム`
- Website: `https://sakurasaku1213.github.io/midnight-will/`
- Topics: `react`, `typescript`, `vite`, `visual-novel`, `mystery-game`, `legal-tech`, `github-pages`
- 制作資料パック購入案内: `https://sakurasaku1213.github.io/midnight-will/purchase.html`
- アクセス解析: 登録済み。ダッシュボードは https://sakurasaku.goatcounter.com/ (詳細は `docs/analytics.md`)

## 方針

既存ゲームのROM、画像、音楽、UI、台詞は使わず、構造だけを学んでオリジナルの短編ADVとして制作します。
