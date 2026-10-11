# Tyrano SpriteStudio Bridge v0.1.0

ティラノスクリプトV6で、SpriteStudioのアニメーションを表示する非公式プラグインです。
同梱の青い図形を動かして、すぐに使い始められます。

## ダウンロード

[**利用者向けZIPをダウンロード**](https://github.com/samiosu/tyrano-spritestudio-bridge/raw/main/releases/v0.1.0/tyrano-spritestudio-0.1.0.zip)

上のリンクからZIPを保存し、解凍してください。
最初に「**はじめに.txt**」を開くと、コピー先と貼り付ける行が分かります。

Windowsで解凍時にライセンス文書が重複する問題を修正しました。
以前のZIPを使っている場合は、再ダウンロードして新しいフォルダーへ解凍してください。

## 導入は3ステップ

1. プラグイン本体とサンプル素材のフォルダーを、ゲームへコピーする。
2. `first.ks` に、説明書の6行のサンプルを貼り付ける。
3. `make.ks` に、セーブ・ロード用の2行を追加する。

[導入手順を読む](https://github.com/samiosu/tyrano-spritestudio-bridge/blob/main/README.md)
／[自分の素材や、位置・大きさの変更](https://github.com/samiosu/tyrano-spritestudio-bridge/blob/main/docs/USAGE.md)

繰り返し再生、動きの切り替え、一時停止、位置・大きさの変更、複数表示、セーブ・ロードに対応します。
自分の素材を使う場合は、SpriteStudioの制作データを公式のSs6Converterで再生用の `.ssfb` に変換してください。

## 対応環境・作者・サポート

Codexが、ティラノスクリプト **V603b** の動作をLinux環境のChromium・Firefox・WebKitで確認しました。
スマートフォン画面の模擬操作もCodexが確認しました。
Windows 11・TyranoStudio Ver6.0.0のゲーム再生機能で、配布ZIPの同梱データとSpriteStudio公式サンプルデータの実行も確認済みです（作者さみおすによる確認）。
Windows・macOSのブラウザ、スマートフォン実機、書き出したPCアプリは未確認です。

作者：**さみおす**。連携コードと独自サンプルは **MIT License** です。
同梱ライブラリにはそれぞれの条件があります。再配布時もプラグイン内の `licenses` フォルダーを含めてください。
個別サポート・導入支援は提供しません。
GitHubのIssue・Pull Requestには対応する場合があります。返信・対応は保証しません。

<details>
<summary>開発者向け：ソース・内部仕様・確認用ファイル</summary>

- [ソースZIP](https://github.com/samiosu/tyrano-spritestudio-bridge/raw/main/releases/v0.1.0/tyrano-spritestudio-0.1.0-source.zip)
- [内部仕様・開発手順](https://github.com/samiosu/tyrano-spritestudio-bridge/blob/main/docs/DEVELOPMENT.md)
- [タグ一覧](https://github.com/samiosu/tyrano-spritestudio-bridge/blob/main/docs/TAGS.md)
- [検証記録](https://github.com/samiosu/tyrano-spritestudio-bridge/blob/main/docs/VALIDATION.md)
- [SHA-256ハッシュ（ZIPの破損・取り違えを確認したい場合のみ）](https://github.com/samiosu/tyrano-spritestudio-bridge/blob/main/releases/v0.1.0/SHA256SUMS.txt)

ソースZIPはリンクから直接保存できます。ハッシュの確認は任意です。

</details>
