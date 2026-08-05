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

## 中身(2026-08-05 に生成器で作り直した)

**開発用の仮置き(同型変換で作った 3 問)は差し替え済みである。**
いま入っているのは `@sudoku/generator` が生成した本物のパックで、
**1 問ずつ独立に作って難易度を評価してある**。

| パック | 難易度 | 問数 | サイズ |
|--------|--------|------|--------|
| `packs/easy-000.txt` | やさしい | 1,000 | 172,000 バイト |
| `packs/normal-000.txt` | ふつう | 1,000 | 174,074 バイト |
| `packs/hard-000.txt` | むずかしい | 1,000 | 172,549 バイト |
| `packs/expert-000.txt` | 難問 | 1,000 | 175,000 バイト |
| `packs/extreme-000.txt` | 最難関 | 1,000 | 176,000 バイト |

**5 クラスすべてが揃っている**(2026-08-05 にレベル 5〜7 の手筋を実装して収録)。

## 作り直しかた

```bash
pnpm --filter @sudoku/generator generate --difficulty easy,normal,hard,expert,extreme --count 1000
```

**同じ指定からは 1 バイト違わず同じファイルができる。**
パックのシードはパック名そのもの(`easy-000`)で、中身は試行番号から決まる。
**`--workers` を変えても中身は変わらない**(並列度 8 と 3 で一致することを実測済み)。

⚠️ **手筋を実装したらパックを作り直す。** 難易度の基準が変わるためである。
`manifest.json` の `generatedWith.techniques` が当時の基準を示している。
