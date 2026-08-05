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

**難問(`expert`)と最難関(`extreme`)は 0 問である。**
レベル 5 以降の手筋(X-Wing / XY-Wing / チェーン系)が未実装で、
**評価できない問題に難易度を付けない**ことにしているため
([難易度の評価](../docs/algorithms/difficulty-rating.md#実装していない手筋の扱い))。

## 作り直しかた

```bash
pnpm --filter @sudoku/generator generate --difficulty easy,normal,hard --count 1000
```

**同じ指定からは 1 バイト違わず同じファイルができる。**
パックのシードはパック名そのもの(`easy-000`)で、中身は試行番号から決まる。
**`--workers` を変えても中身は変わらない**(並列度 8 と 3 で一致することを実測済み)。

⚠️ **手筋を実装したらパックを作り直す。** 難易度の基準が変わるためである。
`manifest.json` の `generatedWith.techniques` が当時の基準を示している。
