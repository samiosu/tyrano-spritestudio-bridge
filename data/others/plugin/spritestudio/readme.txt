Tyrano SpriteStudio Bridge v0.1.0（非公式）

作者：さみおす
ライセンス：MIT（連携コード・独自サンプル）
個別サポート・導入支援は提供しません。
GitHubのIssue・Pull Requestには対応する場合があります。返信・対応は保証しません。

SpriteStudioの変換済みSSFBを、ティラノスクリプトV6のタグから表示・操作します。
検証環境：V603b / Chromium 154 / HTTP配信。

導入：
1. 配布物のdataをゲームのdataへコピー。
2. first.ksで [plugin name="spritestudio"] を呼ぶ。
3. 既存make.ksの [return] の前に次の2行を追加。
   [plugin name="spritestudio"]
   [ss_restore]

素材：data/others/spritestudio/ に .ssfb と参照画像を置く。
SpriteStudioのプロジェクトはSs6ConverterでSSFBへ変換してください。

例：
[plugin name="spritestudio"]
[ss_load name="logo" storage="demo/demo.ssfb"]
[ss_show name="logo" pack="demo" animation="idle" x="640" y="260"]
[ss_play name="logo" animation="spin" loop="false" wait="true"]
[ss_remove name="logo"]

ss_load / ss_show / ss_play / ss_wait / ss_set / ss_pause / ss_resume /
ss_stop / ss_remove / ss_clear / ss_restore / ss_info が使用できます。
loop=trueは無限、loop=falseは1回、正の整数は再生回数です。
wait=trueには有限再生を指定してください。
ss_setはx,y,scale,scale_x,scale_y,rotation,opacity,visible,zindexを変更します。
opacityは0〜255、rotationは度単位です。
ss_infoはtf.spritestudio_infoとコンソールにデータを出力します。

標準のfreeimage等で削除せず、ss_removeまたはss_clearを使用してください。
backページの転写・トランジションは対象外です。
PC/スマートフォンへのパッケージ化と、その他のブラウザは未検証です。
エラー時は停止し、tf.spritestudio_errorとコンソールへ理由を出力します。

連携コードと独自サンプルはMIT。依存ライブラリには別の条件が適用されます。
licensesフォルダーの著作権表示と利用条件を保持してください。
プラグインは非公式です。各ソフトウェア提供元の認定を表すものではありません。
詳細は配布ZIPのREADME.md、docs/TAGS.md、docs/VALIDATION.mdを参照してください。
