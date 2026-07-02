# アクセス解析(GoatCounter)

全ページに [GoatCounter](https://www.goatcounter.com/) の計測タグを入れてあります。無料・広告なし・Cookie不使用のため、同意バナーなしで使えます。

## 有効化する手順(1回だけ・約3分)

1. https://www.goatcounter.com/signup を開く
2. **Code** に `midnight-will` と入力して登録する(ここが重要。タグは `https://midnight-will.goatcounter.com/count` に送信するよう設定済み)
3. 登録が終わった時点で計測が始まる。ダッシュボードは https://midnight-will.goatcounter.com/

`midnight-will` が取得できなかった場合は、別のコードで登録し、全HTMLの
`data-goatcounter="https://midnight-will.goatcounter.com/count"` を新しいコードに一括置換する。

## 計測しているもの

- 全ページのページビュー(ゲーム本体 `index.html` と `public/` 配下の全販売ページ)
- BOOTH商品ページへのクリック(`purchase.html` のリンクに `data-goatcounter-click="booth-product"` を付与済み。ダッシュボードでは `booth-product` というイベントとして表示される)

## 毎週見るべき数字(3つだけ)

1. **ゲーム本体の訪問数** — 集客装置が機能しているか。noteやXで記事を出した週に伸びるかを確認する
2. **purchase.html の訪問数 ÷ ゲーム本体の訪問数** — クリア後導線の通過率。ここが0なら販売ページの改良に意味はない
3. **booth-product イベント数** — 購入直前まで到達した人数。BOOTH側の閲覧数・販売数と突き合わせる

数字が取れて初めて「ページを直す/記事を増やす/商品を変える」の判断ができる。感覚での改良はここで終わりにする。
