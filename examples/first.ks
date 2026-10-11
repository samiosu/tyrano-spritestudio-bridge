; 同梱の青い図形を動かす、短いサンプルです。
; 新規のテストプロジェクトで、data/scenario/first.ks に貼り付けてください。
; セーブ・ロードには、はじめに.txt の make.ks への追記も必要です。
[plugin name="spritestudio"]
[ss_load name="sample" storage="demo/demo.ssfb"]
[ss_show name="sample" pack="demo" animation="idle" x="320" y="240"]
[layopt layer="message0" visible="true"]
青い図形が動けば導入できています。[l]
[cm]
[ss_play name="sample" animation="spin" loop="false" wait="true"]
1回の動きが終わりました。クリックすると図形を消します。[l]
[ss_remove name="sample"]
[cm]
サンプルは終了です。[s]
