Tyrano SpriteStudio Bridge v0.1.0（非公式）
ティラノスクリプトV6で、SpriteStudioのアニメーションを表示します。
作者：さみおす／ライセンス：MIT（連携コード・独自サンプル）

導入は3ステップです。配布ZIPの「はじめに.txt」でも読めます。

1. フォルダーをコピー

ZIPの次の2つのフォルダーを、ゲームの同じ場所へコピーしてください。
コピー先のフォルダーがない場合は作成します。
  data/others/plugin/spritestudio
  data/others/spritestudio

2. サンプルを貼り付け

ゲームの data/scenario/first.ks をテキスト編集ソフトで開きます。
最初の [s] や [jump] より前に、次の6行を貼り付けて保存してください。

[plugin name="spritestudio"]
[ss_load name="sample" storage="demo/demo.ssfb"]
[ss_show name="sample" pack="demo" animation="idle" x="320" y="240"]
[layopt layer="message0" visible="true"]
青い図形が動けば導入できています。[l]
[ss_remove name="sample"]

3. セーブ・ロード用の追記

ゲームの data/scenario/make.ks の内容を残し、最後の [return] の直前に次の2行を追加します。

[plugin name="spritestudio"]
[ss_restore]

make.ks がない場合は、ZIPの examples/make.ks をゲームの data/scenario/ へコピーします。

ゲームを起動して青い図形が動けば導入完了です。
ブラウザ版は公開URLか、ブラウザ向けプレビューで起動してください。
index.htmlをダブルクリックして直接開く方法には対応していません。

自分の素材は、再生用の .ssfb と、その素材に使う画像を用意してください。
差し替えや、位置・大きさの変更は、配布ZIPの docs/USAGE.md に例があります。
ブラウザでも読めます：
https://github.com/samiosu/tyrano-spritestudio-bridge/blob/main/docs/USAGE.md
詳しい設定は docs/TAGS.md、内部仕様は docs/DEVELOPMENT.md を参照してください。

Codexが、ティラノスクリプトV603bの動作をLinux環境のChromium・Firefox・WebKitで確認しました。
スマートフォン画面の模擬操作もCodexが確認しました。
Windows 11・TyranoStudio Ver6.0.0のゲーム再生機能で、配布ZIPの同梱データとSpriteStudio公式サンプルデータの実行も確認済みです（作者さみおすによる確認）。
Windows・macOSのブラウザ、スマートフォン実機、書き出したPCアプリは未確認です。

同梱ライブラリにはそれぞれの条件があります。再配布時もlicensesフォルダーを含めてください。
SpriteStudioの利用条件と、ご自身が使う素材の権利も確認してください。
このプラグインは非公式で、各ソフトウェア提供元の認定を表すものではありません。

個別サポート・導入支援は提供しません。
GitHubのIssue・Pull Requestには対応する場合があります。返信・対応は保証しません。
https://github.com/samiosu/tyrano-spritestudio-bridge
