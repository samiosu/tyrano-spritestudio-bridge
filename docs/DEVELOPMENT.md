# 内部仕様・開発手順

プラグインを改修・検証・再配布する方向けの資料です。
ゲームへの導入は [README](../README.md)、通常の操作は [使い方ガイド](USAGE.md) を参照してください。

## 配布ファイルと依存関係

利用者向けZIPには、ビルド済みJavaScript、ライセンス、独自の図形サンプルと資料を同梱します。
実行時のCDN接続や、利用者によるnpmインストールは不要です。
ソースZIPには、それらに加えてソース、固定した依存情報、ビルドスクリプト、テストを収録します。
ティラノ本体とSpriteStudio本体は収録しません。
`package.json` の `private: true` はnpmへの公開を防ぐ設定です。GitHubリポジトリの公開・非公開には影響しません。

| 依存 | 固定したバージョン・コミット |
| --- | --- |
| SS6PlayerForWeb | `934a920553694836a3fd96bef75e84e02c63feb4` |
| PixiJS | `8.17.0` |
| FlatBuffers | `25.9.23` |

SS6PlayerForWebのソースは `vendor/ss6player` に収録しています。
各依存の著作権表示とライセンス全文は、プラグイン内の `licenses/` に含めます。
連携コードと独自サンプルのMIT Licenseは、依存ライブラリの利用条件を置き換えるものではありません。

## ソース構成

| ファイル | 役割 |
| --- | --- |
| `src/plugin.ts` | タグ登録、初期化、処理完了後のシナリオ進行、エラー通知 |
| `src/manager.ts` | 読み込み、表示、再生、待機、変形、保存・復元、キャンセル |
| `src/resource-loader.ts` | SSFBごとの参照画像の解決。別プロジェクトの同名画像を分離 |
| `src/player.ts` | モーション変更・削除時のパーツ、メッシュ、フィルターの解放 |
| `src/parameters.ts` | 名前・数値・真偽値・再生回数の検証、素材URLの解決 |
| `scripts/build.mjs` | JavaScriptのバンドル、依存ライセンスの収集、サンプル生成 |
| `scripts/demo-data.ts` | FlatBuffersとPNGから独自の図形サンプルを生成 |
| `scripts/package.mjs` | 利用者向け／ソースZIPとSHA-256ハッシュを生成 |
| `tests/browser.mjs` | ブラウザごとのV6統合テスト、導入例と入力の確認 |
| `tests/soak.mjs` | モーション変更・破棄・セーブ復元の反復、保持メモリの記録 |

プラグインは `window.TyranoSpriteStudio` を公開し、管理オブジェクトを
`kag.tmp.spritestudio_bridge` に保持します。初期化は同じkagに対して繰り返し呼べます。
同名のタグが既にある場合は、登録前に競合エラーにします。
PixiJSはバンドル内で使用し、ゲーム側の `window.PIXI` を変更しません。

## 描画・再生

使用する前景画像レイヤーごとに、ゲーム画面と同じ大きさの透明なPixiJSキャンバスを作成します。
キャンバスは入力イベントを受け取らず、同じレイヤーのプレイヤーを1つのstageに配置します。
`zindex` は、そのstage内のSpriteStudioプレイヤー間の順序です。
標準画像との前後関係は、追加順序と標準画像のCSSに依存します。

SSFBプロジェクトの読み込みはURLごとに共有し、失敗したPromiseは再試行できるように削除します。
読み込みには30秒のタイムアウトがあります。
モーション切り替え・削除では描画オブジェクトを破棄しますが、共有する画像を維持します。
`ss_clear` で表示と名前の登録を解除しても、画像キャッシュはページを閉じるまで残ります。

有限再生は最後のポーズで停止します。逆再生は指定区間の先頭ポーズで停止します。
上流プレイヤーが終了時に巻き戻るため、終了コールバックの後のmicrotaskで終端フレームを再設定します。
再生識別子を確認し、以前の再生のコールバックが新しいモーションを上書きしないようにします。
再生待ち中にスキップが有効になると、終端フレームへ進めて待機を解除します。

## セーブ・ロード

`snapsave-start` で `kag.stat.spritestudio_bridge` にJSON形式の状態を保存します。
保存対象は、素材の名前・パス、モーション、整数フレーム、残り再生回数、
再生／一時停止／停止状態、表示レイヤー、位置・大きさ・回転・透明度などです。

`load-start` で現在の表示を破棄し、ロード前の非同期処理をキャンセルします。
キャンバスのDOMだけでは描画状態が戻らないため、ロード後の `make.ks` で
`[plugin name="spritestudio"]` → `[ss_restore]` を実行し、素材とプレイヤーを再構築します。
`ss_restore` の完了までシナリオを待機させます。
SpriteStudioの状態がないセーブデータをロードした場合は、現在の表示を解除します。

タグの処理開始時にロード世代・シナリオ・実行位置を記録します。
処理終了時にそれらを確認し、ロード前の読み込みや再生待ちが、ロード先のシナリオを進めることを防ぎます。

## 制限とエラー

- `.sspj`／`.ssae` の直接読み込みは行いません。Ss6Converterで `.ssfb` に変換してください。
- 描画機能は [SS6PlayerForWeb](https://github.com/SpriteStudio/SS6PlayerForWeb/wiki) の対応範囲に従います。
- 前景画像レイヤーが対象です。`page="back"`、`[backlay]`／`[trans]` でのコピーは対象外です。
- 標準の `[freeimage]` などはプレイヤーを停止・破棄しません。削除には `[ss_remove]`／`[ss_clear]` を使用します。
- 独立したインスタンスパーツ内部の再生時刻は、完全には復元しません。
- 位置・透明度などを時間で補間する機能はありません。

引数または読み込みエラー時はシナリオを停止し、`tf.spritestudio_error` とコンソールへ理由を記録します。
デバッグメニュー有効時はティラノのエラー表示も利用します。
素材名・モーション名・現在状態は `[ss_info]` で取得できます。形式は [タグ一覧](TAGS.md#ss_info) を参照してください。

ティラノスクリプトV603bのHTTP配信環境で、Chromium 154.0.8037.57、Firefox 146.0.1、WebKit 26.0を検証しました。
いずれもLinuxで実行しています。Chromium・WebKitではスマートフォン画面の模擬操作も確認しました。
作者さみおすにより、Windows 11・TyranoStudio Ver6.0.0のゲーム再生機能で、配布ZIPの同梱データとSpriteStudio公式サンプルデータの実行も確認済みです。
WebGL対応ブラウザが必要です。`file://` でHTMLを直接開く方法は対象に含めません。
V5、Windows・macOSのブラウザ、Safari実機、スマートフォン実機、各OS向けパッケージは未検証です。
詳しい結果は [検証記録](VALIDATION.md) を参照してください。

公式Knightデータの `Setup` は1フレームですが、出力された終了フレームが60になっています。
このような区間は既定値のままでは拒否します。静止ポーズを表示する場合は `start="0" end="0"` を明示してください。
継続試験では、この指定で3種類のSetupポーズも含めて確認しています。

## ビルド

Node.js 20以上を使用してください。配布ZIPの生成にはPython 3も必要です。
Node.js 20.20.2でビルドとユニットテストが通り、既存の配布版と同一のJavaScriptを生成することを確認しました。
`.mjs` は開発用です。ゲームは `init.ks` から通常の `[loadjs]` でビルド済み `spritestudio.js` を読み込みます。

```sh
npm ci
npm run build
npm test
npm run package
```

`npm run build` は、JavaScript、ライセンス、独自サンプルを生成します。
`npm run package` の出力先は `dist/` です。ZIPから開発する場合はソースZIPを使用してください。
Windowsでの解凍時に競合する、大文字・小文字だけが異なるパスがある場合は、ZIP作成をエラーで停止します。

## ブラウザでの統合テスト

別途ダウンロードした公式ティラノV6のプロジェクトとChromiumを指定します。

```sh
TYRANO_TEST_ROOT=/path/to/tyranoscript_v603b CHROMIUM_PATH=/path/to/chromium npm run test:browser
```

SS6PlayerForWebの公式変換済みメッシュサンプルも検証する場合は、
同リポジトリの `TestData` を `SS6_TEST_DATA_ROOT` で指定してください。
これらの素材はテスト用の一時フォルダーにだけコピーし、配布物には入れません。

Firefox・WebKitも使う場合は、Playwright 1.58.2に対応するブラウザと、各ブラウザに必要なOSライブラリを用意してください。

```sh
node node_modules/playwright-core/cli.js install firefox webkit
TYRANO_TEST_ROOT=/path/to/tyranoscript_v603b TYRANO_TEST_BROWSER=firefox npm run test:browser
TYRANO_TEST_ROOT=/path/to/tyranoscript_v603b TYRANO_TEST_BROWSER=webkit npm run test:browser
TYRANO_TEST_ROOT=/path/to/tyranoscript_v603b TYRANO_TEST_DEVICE=mobile npm run test:browser
TYRANO_TEST_ROOT=/path/to/tyranoscript_v603b TYRANO_TEST_BROWSER=webkit TYRANO_TEST_DEVICE=mobile npm run test:browser
```

`TYRANO_TEST_DEVICE=mobile` は、ChromiumではPixel 7、WebKitではiPhone 13のPlaywright設定を使います。
実機ではありません。画面サイズ・タッチ入力の設定であり、OSやハードウェアを再現するものではありません。
テストは最後に横長844×390・縦長390×844へ表示領域を変更します。実機の回転イベントは対象外です。
結果と画面は `artifacts/<ブラウザ>-<desktopまたはmobile>/` に記録します。

今回のFirefoxは公式PlaywrightのUbuntu 24.04コンテナで、WebKitはLinuxのGTK版で実行しました。
どちらもXvfb上のウィンドウを使っています。仮想画面などで実行する場合は `TYRANO_TEST_HEADED=true` を指定します。
Firefoxのheadless試行ではWebGLの生成・画像確認が失敗したため、成功した条件も [検証記録](VALIDATION.md) に記載しています。

## 継続試験

同じ公式プロジェクトを使い、既定では5分間、モーション変更・削除・再表示・セーブ復元を繰り返します。
公式メッシュ素材も指定する例です。

```sh
TYRANO_TEST_ROOT=/path/to/tyranoscript_v603b SS6_TEST_DATA_ROOT=/path/to/SS6PlayerForWeb/TestData npm run test:soak
```

`TYRANO_TEST_MINUTES` で0.1〜60分の範囲に変更できます。出力先は `artifacts/soak/` です。
ChromiumのCDPでGC後のJavaScriptヒープ、DOMノード、キャンバス・プレイヤー数を約30秒ごとに記録します。
5分の結果を、GPUメモリや数時間のプレイに対する保証には使えません。
実機・スタジオ・書き出しの手動確認は [実環境の確認手順](PLATFORM-CHECKLIST.md) にあります。

## 配布ZIPの確認（任意）

`SHA256SUMS.txt` は、ZIPの破損や取り違えを確認したい場合に使う、任意のファイルです。
2つのZIPと同じフォルダーに置き、SHA-256の値を比較します。Linuxなどでは次のように確認できます。

```sh
sha256sum -c SHA256SUMS.txt
```

ZIPは同じ内容から同じバイト列を生成するため、ファイル順序、タイムスタンプ、パーミッションを固定しています。
公開・配布作業は [公開用資料](PUBLISHING.md) を参照してください。
