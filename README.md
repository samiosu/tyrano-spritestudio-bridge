# Tyrano SpriteStudio Bridge

ティラノスクリプトV6でSpriteStudioのアニメーションを再生する非公式プラグインです。
SS6PlayerForWebを使い、`.ssfb` をティラノのタグから表示・操作します。
バージョンは **0.1.0** です。

作者：**さみおす**。連携コードと独自サンプルのライセンスは **MIT** です。
個別サポート・導入支援は提供しません。
GitHubの[Issue](https://github.com/samiosu/tyrano-spritestudio-bridge/issues)・
[Pull Request](https://github.com/samiosu/tyrano-spritestudio-bridge/pulls)には対応する場合があります。
返信・対応は保証しません。

## できること

- アニメーションの読み込み、表示、モーション切り替え、有限／無限ループ
- 再生終了待ち、一時停止、再開、現在フレームでの停止
- 位置、拡大率、回転、透明度、表示／非表示、描画順の変更
- 複数プロジェクトの同時表示。同じセルマップ名やファイル名にも対応
- セーブ・ロード復元。再生待ち中にスキップを有効にすると終端へ進む

## 動作環境

ティラノスクリプト **V603b** と Chromium **154.0.8037.57** のHTTP配信環境で検証しました。
WebGL対応のブラウザが必要です。V5、Safari、Firefox、スマートフォン実機、
ティラノスタジオ／PC・スマートフォン向けパッケージでの動作確認は未実施です。
`file://` でHTMLを直接開く方法は対象に含めません。ブラウザ版はHTTPサーバーで実行してください。

PixiJS 8.17.0とSS6PlayerForWebを同梱しています。実行時のCDN接続や追加のnpmインストールは不要です。
ゲーム側の `window.PIXI` は変更しません。

## インストール

1. 配布ZIPの `data` フォルダーをゲームの `data` フォルダーへ重ねてコピーします。
2. `first.ks` の利用開始位置に `[plugin name="spritestudio"]` を追加します。
3. **既存の `make.ks` の `[return]` より前**に、次の2行を追加します。
   他のプラグインの初期化処理は残してください。

```tyranoscript
[plugin name="spritestudio"]
[ss_restore]
```

`make.ks` はロード後に呼ばれます。`[ss_restore]` は画像とプレイヤーの再構築が完了するまで
シナリオを待機させます。この2行を追加しない場合、ロード後のアニメーション復元はできません。

## まずサンプルを再生する

次のコードをシナリオに書きます。同梱の図形アニメーションが画面に表示されます。
座標はゲーム画面の左上を原点とする、SpriteStudioアニメーションの原点の位置です。

```tyranoscript
[plugin name="spritestudio"]
[ss_load name="logo" storage="demo/demo.ssfb"]
[ss_show name="logo" pack="demo" animation="idle" x="640" y="260"]
アニメーションを表示しました。[l]
[ss_play name="logo" animation="spin" loop="false" wait="true"]
1回の再生が終わりました。[l]
[ss_remove name="logo"]
```

`examples/first.ks` に複数表示・一時停止・復元を試せるサンプルがあります。
**新規のテストプロジェクト**で試してください。既存のシナリオを丸ごと置き換える必要はありません。
同梱サンプルは独自の図形素材です。SpriteStudioのキャラクターサンプルを再配布していません。

## 自分のSpriteStudioデータを使う

1. SpriteStudio 6／7で制作したプロジェクトを、SpriteStudio6-SDKの
   **Ss6Converter** で `.ssfb` に変換します。
   [公式の変換手順](https://github.com/SpriteStudio/SpriteStudio6-SDK/wiki/コンバータの使い方)を参照してください。
2. `.ssfb` と参照する画像を `data/others/spritestudio/` 以下へ配置します。
   画像はSSFB内のセルマップが参照する相対パスを保ってください。
3. `storage` にそのフォルダーからの相対パスを指定します。
4. `pack` はアニメーションパック名、`animation` はモーション名です。大文字・小文字も区別します。

```text
data/others/spritestudio/hero/
  hero.ssfb
  body.png
  effects.png
```

```tyranoscript
[ss_load name="hero" storage="hero/hero.ssfb"]
[ss_info name="hero"]
; ss_infoでtf.spritestudio_infoと開発者コンソールに名前の一覧が出ます。
[ss_show name="hero" pack="hero" animation="idle" x="640" y="500" scale="0.5"]
```

`.sspj`／`.ssae` をそのまま読み込む機能はありません。
使用できるデータ・描画機能は、同梱の[SS6PlayerForWeb](https://github.com/SpriteStudio/SS6PlayerForWeb/wiki)の対応範囲に従います。
すべてのSpriteStudio機能の再現を保証するものではありません。

## タグと注意事項

全タグ・引数は [タグリファレンス](docs/TAGS.md) にまとめています。

- `name` は半角英数字・`_`・`-` の1〜64文字です。
- `loop="true"` は無限ループです。終了待ちには `loop="false"` または正の再生回数を指定してください。
- `layer` は前景画像レイヤー番号です。`page="back"`、`[backlay]`／`[trans]`でのコピーは対象外です。
- アニメーションの削除には `[ss_remove]` または `[ss_clear]` を使ってください。
  ティラノ標準の `[freeimage]` などはプレイヤーの停止・破棄を行いません。
- レイヤー内の標準画像との前後関係は、追加する順序と標準画像のCSSに依存します。
  `zindex` は同じレイヤー内のSpriteStudioプレイヤー間の順序です。
- `[ss_clear]` は表示・名前の登録を解除します。読み込んだ画像データのキャッシュはページを閉じるまで保持します。
- 復元するのはモーション、整数フレーム、残り再生回数、再生／一時停止／停止状態、位置などです。
  インスタンスパーツ内部の独立した再生時刻は完全には復元しません。
- 読み込み・引数エラー時はシナリオを停止し、`tf.spritestudio_error` とコンソールに理由を記録します。
  デバッグメニュー有効時はティラノのエラー表示も利用します。

## ソースをビルドする

Node.js 20以上を使用してください。配布ZIPの生成にはPython 3も必要です。

```sh
npm ci
npm run build
npm test
npm run package
```

`npm run build` は配布用JavaScript、依存ライセンス、独自サンプルデータを生成します。
SS6PlayerForWebのソースはコミットを固定して `vendor/ss6player` に収録しています。

実ブラウザの統合テストには、別途ダウンロードした公式ティラノV6のプロジェクトとChromiumを指定します。
ティラノ本体はこのリポジトリと配布ZIPには含まれません。

```sh
TYRANO_TEST_ROOT=/path/to/tyranoscript_v603b CHROMIUM_PATH=/path/to/chromium npm run test:browser
```

SS6PlayerForWebの公式変換済みメッシュサンプルも検証する場合は、
同リポジトリの `TestData` を `SS6_TEST_DATA_ROOT` で指定します。
これらの素材はテスト用の一時ディレクトリにだけコピーされ、配布物には入りません。

## ライセンスと配布

連携コードと独自サンプルは [MIT License](LICENSE) です。
同梱するSS6PlayerForWeb、PixiJS、FlatBuffersなどには、それぞれのライセンスが適用されます。
`data/others/plugin/spritestudio/licenses/` の著作権表示・条件を保持してください。
SpriteStudio本体の利用条件や、使用する素材の権利は別途確認してください。

このプラグインは非公式です。SpriteStudio、CRI Middleware、ティラノの提供元による
開発・認定を表すものではありません。
公開用の説明文と配布手順は [公開資料](docs/PUBLISHING.md)、確認結果は [検証記録](docs/VALIDATION.md) を参照してください。
