# 午前0時の遺言書

法律事務所を舞台にした10分完結ミステリーWebゲームの制作フォルダです。

## ファイル

- `docs/production-spec.md`: 制作仕様書
- `docs/scene-script.md`: シーン単位脚本
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

## 方針

既存ゲームのROM、画像、音楽、UI、台詞は使わず、構造だけを学んでオリジナルの短編ADVとして制作します。
