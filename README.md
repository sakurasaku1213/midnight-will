# 午前0時の遺言書

法律事務所を舞台にした10分完結ミステリーWebゲームです。

## プレイ

[ブラウザで遊ぶ](https://sakurasaku1213.github.io/midnight-will/)

スマホ・PC両対応です。第1話は無料公開し、制作記事・制作資料パック・追加シナリオへ展開する前提で整備しています。

## ファイル

- `docs/production-spec.md`: 制作仕様書
- `docs/scene-script.md`: シーン単位脚本
- `docs/release-kit.md`: 公開導線とBOOTH/note販売準備メモ
- `data/episode-01.json`: 実装向けシナリオデータ骨格
- `src/`: React/TypeScript製のゲーム本体

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

- `npm.cmd run build`
- デスクトップ幅でタイトル表示、証拠取得まで操作
- スマホ幅でタイトル表示、移動コマンドまで操作
- 証拠取得、会話フラグ、最終推理3問、正解エンド到達

## 公開時に設定する項目

- GitHub About: `10分で解ける法律事務所ミステリーWebゲーム`
- Website: `https://sakurasaku1213.github.io/midnight-will/`
- Topics: `react`, `typescript`, `vite`, `visual-novel`, `mystery-game`, `legal-tech`, `github-pages`
- BOOTH制作資料パック: `https://legal-desk.booth.pm/items/8294253`

## 方針

既存ゲームのROM、画像、音楽、UI、台詞は使わず、構造だけを学んでオリジナルの短編ADVとして制作します。
