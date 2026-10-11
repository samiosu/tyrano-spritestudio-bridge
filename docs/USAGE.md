# 使い方ガイド

導入がまだの場合は、先に [導入の3ステップ](../README.md#導入は3ステップ) を済ませてください。
ここでは、シナリオへコピーして使える例を紹介します。

## サンプルを表示する

導入時のサンプルを消したあと、表示したい場所に次を貼り付けてください。
青い図形が繰り返し動きます。

```tyranoscript
[plugin name="spritestudio"]
[ss_load name="sample" storage="demo/demo.ssfb"]
[ss_show name="sample" pack="demo" animation="idle" x="320" y="240"]
```

以降の例は、この図形を表示したあとに使います。
`name="sample"` は、操作する図形に付けた呼び名です。同じ図形を操作するときは、同じ名前を使います。
自分で名前を付ける場合は、`hero` や `hero_2` のように半角英数字で付けてください。

## 位置・大きさを変える

```tyranoscript
[ss_set name="sample" x="500" y="300" scale="0.5"]
```

| 変える場所 | 意味 |
| --- | --- |
| `x="500"` | 横の位置。数字を大きくすると右へ移動 |
| `y="300"` | 縦の位置。数字を大きくすると下へ移動 |
| `scale="0.5"` | 大きさ。`1`が元の大きさ、`0.5`が半分、`2`が2倍 |

位置の数字は、ゲーム画面の左上を基準にしています。
どの部分がその位置に来るかは、SpriteStudioで設定した原点によって変わります。

## 動きを1回だけ再生する

```tyranoscript
[ss_play name="sample" animation="spin" loop="false" wait="true"]
動きが終わったら、この文章へ進みます。[l]
```

`animation` は動きの名前です。同梱サンプルには `idle` と `spin` が入っています。
`loop="false"` は1回だけ、`wait="true"` はその動きが終わるまで文章を待つ指定です。
再生後は、最後の姿勢で止まります。

## 繰り返し再生に戻す

```tyranoscript
[ss_play name="sample" animation="idle"]
```

## 一時停止して、再開する

繰り返し再生中に使ってください。

```tyranoscript
[ss_pause name="sample"]
クリックすると再開します。[l]
[ss_resume name="sample"]
```

## 画面から消す

```tyranoscript
[ss_remove name="sample"]
```

SpriteStudioのアニメーションを消すときは、この命令を使ってください。
消したあと、同じ素材を再表示するには `[ss_show]` の行をもう一度書きます。

## 自分の素材を使う

### 1. 再生用の素材を用意する

**`.ssfb` ファイルと、その素材に使う画像**を用意してください。
SpriteStudioの制作ファイルは、公式の **Ss6Converter** で再生用の `.ssfb` に変換します。
変換の操作は [公式の変換手順](https://github.com/SpriteStudio/SpriteStudio6-SDK/wiki/コンバータの使い方) を参照してください。

素材を別の人に作ってもらう場合は、次の3つも教えてもらうと差し替えが簡単です。

| 確認するもの | このガイドの例 |
| --- | --- |
| 再生用のファイル名 | `hero.ssfb` |
| アニメーションパック名（動きのまとまりの名前） | `hero` |
| モーション名（再生したい動きの名前） | `idle` |

制作ファイルの `.sspj` や `.ssae` は、変換してから使ってください。

### 2. 素材をコピーする

ゲームの `data/others/spritestudio/` に、素材のフォルダーを追加します。
例えば、`hero` フォルダーに次のように入れます。

```text
data/others/spritestudio/hero/
  hero.ssfb
  body.png
  effects.png
```

画像が入っているフォルダーの並びとファイル名は、変換時のまま保ってください。
上の画像名は例です。ご自身の素材に付属する画像を使ってください。

### 3. 名前を差し替える

この例の `hero/hero.ssfb`、`pack="hero"`、`animation="idle"` を、ご自身の素材に合わせて変更します。
大文字・小文字も同じにしてください。

```tyranoscript
[plugin name="spritestudio"]
[ss_load name="hero" storage="hero/hero.ssfb"]
[ss_show name="hero" pack="hero" animation="idle" x="320" y="240"]
```

| 指定する場所 | 入れるもの |
| --- | --- |
| `name` | シナリオ内で操作するときの呼び名。自分で付けます |
| `storage` | `data/others/spritestudio/` から先のフォルダー名とファイル名 |
| `pack` | 素材のアニメーションパック名 |
| `animation` | 素材のモーション名 |

位置・大きさなどを変えるときは、このガイドの `name="sample"` を `name="hero"` に置き換えてください。

## うまく動かないとき

| 症状 | 確認すること |
| --- | --- |
| 同梱の青い図形が出ない | 導入手順の2つのフォルダーが、指定の場所にあるか |
| 自分の素材だけ出ない | `.ssfb` と画像がそろっているか。`storage`、`pack`、`animation` の名前が素材と一致しているか |
| 画面の外に出る・大きすぎる | `x`・`y` を小さくして位置を確認し、`scale="0.5"` などで大きさを調整 |
| セーブをロードすると消える | `make.ks` の `[return]` より前に、導入手順の2行があるか |
| 命令のところで止まる | 書き足した行が例と同じか。特に名前・数字・半角の引用符を確認し、修正後にゲームを起動し直す |

より細かな設定は [タグ一覧](TAGS.md)、内部の仕組みは [開発者向け資料](DEVELOPMENT.md) にあります。
