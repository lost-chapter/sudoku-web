# 問題パック

**問題ファイルの正本はここである。** 形式は [問題ファイルの形式](../docs/api/puzzle-file-format.md)。

```
puzzles/
├── manifest.json   収録内容の索引。アプリが最初に読む
├── packs/          同梱パック(Git 管理下)
└── generated/      大量生成した追加分(Git 管理外・配信物に含めない)
```

`web` の配信物へは `tools/puzzles-sync/sync.mjs` が写す
(`pnpm dev` と `pnpm build` の前に自動で走る)。
**`packages/web/public/puzzles/` は複製なので手で編集しない。**

## ⚠️ いま入っているのは開発用の仮置きである(2026-08-05)

**`packs/easy-000.txt` の 3 問は本物ではない。**
既知の 1 問に同型変換(数字の付け替え・行帯の入れ替え・転置)を掛けて作ったもので、
**難易度も解き筋も同一**である。

[盤面の生成](../docs/algorithms/board-generation.md#-同型変換で量産してはいけない) が
禁じているのはまさにこれで、取得の経路を動かすための足場として置いてある。

**agent-b の生成器(工程 2)ができたら丸ごと差し替える。**
`manifest.json` の `generatedWith.generator` が `0.0.0-dev` になっているのが目印。
