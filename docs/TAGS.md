# タグリファレンス

通常の導入と操作例は [README](../README.md) と [使い方ガイド](USAGE.md) を参照してください。
この資料は、細かな設定やタグごとの仕様を確認する方向けです。

すべてのタグは `[plugin name="spritestudio"]` の読み込み後に使用します。
`storage` の基準フォルダーは `data/others/spritestudio/` です。
`name` は半角英数字・`_`・`-` の1〜64文字です。

| タグ | 動作 | 必須引数 |
| --- | --- | --- |
| `ss_load` | SSFBと参照画像を読み込む。完了まで待つ | `name`, `storage` |
| `ss_show` | 読み込んだデータを表示し、再生を始める | `name`, `pack`, `animation` |
| `ss_play` | 表示中のモーションを先頭から再生する | `name` |
| `ss_wait` | 現在の有限再生が終わるまで待つ | `name` |
| `ss_set` | 表示位置・大きさなどを即時変更する | `name` |
| `ss_pause` | 現在フレームで一時停止する | `name` |
| `ss_resume` | 一時停止を解除する | `name` |
| `ss_stop` | 現在フレームで停止する | `name` |
| `ss_remove` | プレイヤーを削除する。読み込んだデータは残す | `name` |
| `ss_clear` | すべての表示と名前の登録を解除する | なし |
| `ss_restore` | セーブデータから復元する。make.ks用 | なし |
| `ss_info` | pack・animationの一覧と再生状態を取得する | `name` |

## ss_load

`name` にシナリオ内で素材を識別する名前、`storage` にSSFBの相対パスを指定します。
画像は、SSFB内のセルマップが参照する相対パスを保って配置してください。
同じ名前のプレイヤーを表示中に読み直す場合は、先に `[ss_remove]` で削除します。

```tyranoscript
[ss_load name="hero" storage="hero/hero.ssfb"]
```

## ss_show

| 引数 | 初期値 | 説明 |
| --- | --- | --- |
| `name` | 必須 | ss_loadで登録した名前 |
| `pack` | 必須 | アニメーションパック名 |
| `animation` | 必須 | モーション名 |
| `layer` | `0` | 前景画像レイヤー番号 |
| `x`, `y` | `0`, `0` | アニメーション原点の画面座標。右・下が正 |
| `scale` | `1` | 両軸の拡大率 |
| `scale_x`, `scale_y` | `scale`の値 | 軸ごとの拡大率。負数で反転 |
| `rotation` | `0` | 度単位。正数は時計回り |
| `opacity` | `255` | 透明度。0〜255 |
| `visible` | `true` | 表示するかどうか |
| `zindex` | `0` | 同レイヤーのSpriteStudioプレイヤー間の描画順。大きいほど手前 |
| `loop` | `true` | true＝無限、false＝1回、正の整数＝その回数 |
| `speed` | `1` | 再生速度の倍率。負数で逆再生。0は不可 |
| `start`, `end` | 元データの設定 | 再生区間のフレーム番号。両端を含む |
| `wait` | `false` | trueなら有限再生終了までシナリオを待機 |

同じ `name` の表示が存在する場合は置き換えます。ロードしたデータはそのまま使います。
終端に到達した有限再生は、最後のポーズを表示した状態で停止します。
逆再生では `start` 側のポーズで停止します。

```tyranoscript
[ss_show name="hero" pack="hero" animation="idle" layer="0" x="640" y="500" scale="0.5"]
```

## ss_play と ss_wait

`ss_play` は `pack`, `animation`, `loop`, `speed`, `start`, `end`, `wait` を受け取ります。
`pack`／`animation` の省略時は現在のモーションを使います。
`loop` と `speed` の初期値は毎回 `true` と `1` です。前回の再生設定を引き継ぎません。
停止済みモーションの再開にも `ss_play` を使用してください。

```tyranoscript
[ss_play name="hero" animation="attack" loop="false" wait="true"]
攻撃モーションが終わりました。[l]
```

```tyranoscript
[ss_play name="hero" animation="attack" loop="3" wait="false"]
; 別の演出を挟むこともできます。
[ss_wait name="hero"]
```

無限ループに対する終了待ちはエラーになります。
待機中にティラノのスキップが有効になった場合は、再生を終端へ進めて待機を解除します。
待機中にセーブデータをロードした場合、古い再生の完了通知はロード先のシナリオを進めません。

## ss_set

`x`, `y`, `scale`, `scale_x`, `scale_y`, `rotation`, `opacity`, `visible`, `zindex` を受け取ります。
省略した値は変更しません。`scale` と軸ごとの値を同時に指定すると、軸ごとの値が優先されます。
位置や透明度の補間アニメーションは初版の対象外です。

```tyranoscript
[ss_set name="hero" x="460" opacity="180"]
[ss_set name="hero" visible="false"]
[ss_set name="hero" visible="true" scale_x="-0.5"]
```

## ss_info

`tf.spritestudio_info` に以下の形式のオブジェクトを入れ、コンソールにも表示します。
`instance` は未表示の場合 `null` です。

```js
{
  name: "hero",
  storage: "hero/hero.ssfb",
  packs: [{
    name: "hero",
    animations: [{ name: "idle", fps: 30, start: 0, end: 59 }]
  }],
  instance: { /* 座標、現在フレーム、再生状態など */ }
}
```

## エラー

理由は `tf.spritestudio_error` に文字列で入り、コンソールへ出力されます。
無効な設定のまま進行しないよう、エラー時はシナリオを停止します。
原因を修正してプレビューを再起動してください。
ロードには30秒のタイムアウトがあります。

保存・復元、キャンセル、描画、キャッシュなどの内部仕様は [開発者向け資料](DEVELOPMENT.md) を参照してください。
