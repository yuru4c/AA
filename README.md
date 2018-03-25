# aa

## 概要
アスキーアートの表示を調整します。  
(文字幅を 12pt ＭＳ Ｐゴシック に合わせることでズレを補正します。)

## 使い方
aa.js (aa.min.js) を読み込み、`processAA` をセレクターで呼び出します。  
**探索するため子孫要素は指定しないこと。**

### 例
```html
<div class="aa"><!-- アスキーアート --></div>

<script type="text/javascript" src="aa.min.js"></script>
<script type="text/javascript"> processAA('.aa'); </script>
```

## 備考
```
processAA(selectors: string, callback?: function(number)): number
processAA.abort(id: number): void
```

- 行の高さは調整しません。 
- span 要素を作成するためスタイルによっては崩れます。
- cwtable は文字幅テーブル生成、index はデバッグ用の物で必要ありません。
