# Tyrano SpriteStudio Bridge

**ティラノスクリプトV6で、SpriteStudioのアニメーションを表示する非公式プラグインです。**
フォルダーのコピーと、シナリオへの数行の追記で使えます。同梱のサンプルで、まず動作を試せます。
バージョン：**0.1.1**／作者：**さみおす**

## ダウンロード

[**利用者向けZIPをダウンロード**](https://github.com/samiosu/tyrano-spritestudio-bridge/releases/download/v0.1.1/tyrano-spritestudio-0.1.1.zip)して、解凍してください。
ZIPに入っている [はじめに.txt](はじめに.txt) でも導入手順を読めます。
[リリース情報・ソースZIP](https://github.com/samiosu/tyrano-spritestudio-bridge/releases/tag/v0.1.1) は、こちらから確認できます。
リリースの「Assets」から選ぶ場合は、`tyrano-spritestudio-0.1.1.zip` がゲームへの導入用です。

## 導入は3ステップ

### 1. フォルダーをコピーする

ゲームのフォルダーを開き、次の2つをコピーします。コピー先のフォルダーがない場合は作成してください。

| ZIPの中にあるフォルダー | ゲームのコピー先 |
| --- | --- |
| `data/others/plugin/spritestudio` | `data/others/plugin/spritestudio` |
| `data/others/spritestudio` | `data/others/spritestudio` |

`plugin` の中の `spritestudio` はプラグイン本体、もう一方の `spritestudio` はアニメーション素材です。

### 2. サンプルを貼り付ける

ゲームの **`data/scenario/first.ks`** をテキスト編集ソフトで開きます。
最初の `[s]` や `[jump]` より前に、次の6行を貼り付けて保存してください。

```tyranoscript
[plugin name="spritestudio"]
[ss_load name="sample" storage="demo/demo.ssfb"]
[ss_show name="sample" pack="demo" animation="idle" x="320" y="240"]
[layopt layer="message0" visible="true"]
青い図形が動けば導入できています。[l]
[ss_remove name="sample"]
```

### 3. セーブ・ロード用の2行を追加する

ゲームの **`data/scenario/make.ks`** を開きます。
既にある内容を残して、最後の **`[return]` の直前**に次の2行を追加してください。

```tyranoscript
[plugin name="spritestudio"]
[ss_restore]
```

`make.ks` がない場合は、ZIPの `examples/make.ks` をゲームの `data/scenario/` へコピーしてください。

## 動いたら導入完了

ゲームを起動すると、青い図形が繰り返し動きます。文章をクリックすると図形が消え、元のシナリオへ進みます。
ブラウザ版はゲームの公開URLか、ブラウザ向けプレビューで起動してください。
`index.html` をダブルクリックして直接開く方法には対応していません。

次は [使い方ガイド](docs/USAGE.md) を参照してください。
自分の素材への差し替え、動きの変更、位置・大きさの調整を、コピーして使える例で説明しています。

## 対応環境

次の動作確認は0.1.0の結果です。0.1.1では終了待ちを修正し、変更後の実行テストは行っていません。
Codexが、ティラノスクリプト **V603b** の動作をLinux環境のChromium・Firefox・WebKitで確認しました。
スマートフォン画面の模擬操作もCodexが確認しました。
Windows 11・TyranoStudio Ver6.0.0のゲーム再生機能で、配布ZIPの同梱データとSpriteStudio公式サンプルデータの実行も確認済みです（作者さみおすによる確認）。
Windows・macOSのブラウザ、スマートフォン実機、書き出したPCアプリは未確認です。
詳しい確認結果は [検証記録](docs/VALIDATION.md) にあります。

## ライセンス・サポート

作者：**さみおす**。連携コードと独自サンプルは [MIT License](LICENSE) です。
同梱ライブラリにはそれぞれの条件があります。再配布時も、プラグイン内の `licenses` フォルダーを含めてください。
SpriteStudioの利用条件と、ご自身が使う素材の権利も確認してください。
このプラグインは非公式で、各ソフトウェア提供元の認定を表すものではありません。

個別サポート・導入支援は提供しません。
GitHubの[Issue](https://github.com/samiosu/tyrano-spritestudio-bridge/issues)・
[Pull Request](https://github.com/samiosu/tyrano-spritestudio-bridge/pulls)には対応する場合があります。
返信・対応は保証しません。

## 詳しい設定・開発者向け資料

- [タグ一覧](docs/TAGS.md)：使える命令と、細かな設定
- [内部仕様・開発手順](docs/DEVELOPMENT.md)：構成、セーブ復元、制限、ビルド、配布ZIPの確認
- [検証記録](docs/VALIDATION.md)：検証した環境と動作
- [公開前の最終確認](docs/FINAL-REVIEW.md)：ライセンス・コードの静的レビューと修正内容
- [公開・配布用資料](docs/PUBLISHING.md)：配布ページの説明文と公開手順
