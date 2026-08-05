# 実装の進め方と現在地

**この文書が「次に何をすべきか」の入口である。**
工程が進んだら**必ずここを更新する**。更新しないと次のセッションで判断できなくなる。

## 最初に実行するコマンド(現状把握)

```bash
pwd
git rev-parse --abbrev-ref HEAD | cat
git status --short
git log --oneline -5 | cat

pnpm install
pnpm test
pnpm typecheck
pnpm lint
```

**「現在地」の数値は必ずこの実測値で書く。**

## 現在地(2026-08-05 時点)

| 項目 | 状態 |
|------|------|
| 設計 | ✅ **完了。**[システム構成](../architecture/system-architecture.md) と ADR 0001〜0003 |
| 開発基盤 | ✅ **完了。**`pnpm install` → `pnpm dev` で動く([ローカル環境の構築](local-setup.md)) |
| テスト | **107 件**(core 96 / docs-html 11)。generator と web は 0 件 |
| 型チェック / Lint | 4 パッケージ 0 エラー |
| 盤面ロジック | **工程 2 の 1〜5 まで完了**(盤面の表現・規則の検証・探索ソルバ・完成盤の生成・穴あけ・難易度評価)。**難易度付きの問題を作れる**(やさしい 4.2 ms / ふつう 15 ms / むずかしい 25 ms 相当)。6 は未着手 |
| 画面 | **骨組みのみ**(工程 3・agent-c) |
| CI | 未整備(工程 5) |
| ブランチ | `main` / `develop` / `feature/agent-a` / `cc/agent-b` / `cc/agent-c` |

**次の一手は工程 2 の 6(パックとマニフェストの書き出し)と工程 3(agent-c)。**

## 設計の骨子(工程を読む前に)

```
packages/core       盤面ロジック(DOM も Node API も使わない)
packages/generator  問題を大量生成する CLI(Node)
packages/web        React + TypeScript のアプリ
puzzles/            生成された問題パック(外部ファイル)
```

- **問題は事前に生成してファイルへ置く**([ADR 0003](../decisions/0003-external-puzzle-files.md))
- **`core` は生成側と遊技側で共有する。** ソルバを 2 つ持たない
- **`core` は乱数を外から受け取る。** 同じシードから同じ問題ができること

## 各工程の完了条件と成果物

### 工程 0: 技術構成の選定 ✅

2026-08-05 完了。[ADR 0001](../decisions/0001-project-structure.md) /
[ADR 0002](../decisions/0002-ui-library-selection.md) /
[ADR 0003](../decisions/0003-external-puzzle-files.md)。

### 工程 1: 開発基盤 ✅

2026-08-05 完了(agent-a)。

- pnpm workspaces と 3 パッケージ(`core` / `generator` / `web`)+ `tools/docs-html`
- TypeScript(`strict`)・Vite・Vitest・ESLint・Prettier
- `docs-markdown-to-html` の実装(`pnpm docs:html`)。**2 回流して出力が完全一致**を実測
- [ローカル環境の構築](local-setup.md)

**パッケージ間は TypeScript のソースを直接参照する**(`exports` が `./src/index.ts` を指す)。
ビルド順の依存が無いので、`core` を直せば即座に両側へ反映される。

### 工程 2: 盤面ロジックと生成(`core` + `generator`)🚧 agent-b

**この工程がプロジェクトの中身である。** 順序は次のとおり。

| # | 内容 | 状態 |
|---|------|------|
| # | 内容 | 状態 |
|---|------|------|
| 1 | 盤面の表現と規則の検証(重複の検出) | ✅ `packages/core/src/board.ts` |
| 2 | ソルバ(解を求める / **解の個数を 2 で打ち切って数える**) | ✅ `packages/core/src/search-solver.ts` |
| 3 | 完成盤の生成(シード注入) | ✅ `packages/core/src/generate.ts` + `random.ts` |
| 4 | 穴あけ(一意解を保つ) | ✅ `packages/core/src/generate.ts` |
| 5 | 難易度の評価(手筋ソルバ) | ✅ `packages/core/src/technique-solver.ts` + `difficulty.ts`。**レベル 1〜4 まで実装**(5 以降は未実装) |
| 6 | パックとマニフェストの書き出し・並列生成 | **次はここ。問題ファイルのパースとシリアライズもここで出す**(agent-c の暫定実装を置き換える) |

**完了条件**: [テストの方針](../verification/testing-policy.md) の「必ず守る性質」6 項目が
テストで守られ、同梱パックが生成できている。

| 性質 | 状態 |
|------|------|
| 1 生成した問題は一意解である | ✅ |
| 2 手がかりを 1 つでも消すと一意解でなくなる(極小性) | ✅ |
| 3 同じシードからは同じ問題ができる | ✅ |
| 4 難易度の判定が安定している | ✅ |
| 5 解いた結果が数独の規則を満たす | ✅ |
| 6 パックの全問が読み込める | 6 の後 |

### 工程 3: 遊べる最小の UI(`web`)🔜 agent-c

問題を 1 問読み込み、盤面を表示し、数字を入力し、完成を判定するまで**一本の経路を通す**。
補助表示・メモ・取り消しは工程 4。

**完了条件**: パックから問題を開いて最後まで解け、完成が判定される。

### 工程 4: 遊技機能の横展開

メモ・取り消し・補助表示・難易度選択・進行の保存・設定・テーマ。**1 機能ずつ閉じる。**

**完了条件**: [画面構成と操作仕様](../ui/screens-and-interactions.md) の表が
すべて実装され、キーボードだけで最初から最後まで遊べる。

### 工程 5: 本番構成

静的ホスティングへのビルドと配信、CI。

**完了条件**: 手順が `docs/guides/` にあり、CI が通っている。

## 並列化の単位と前提

**運用のルールは [並列エージェントの運用](parallel-agent-operations.md) にある。**
ここには「何を分割できるか」だけを書く。

**工程 1 は分割しない。** 全員の前提になるので 1 人で通す。

工程 2 以降の分割単位。**パッケージ境界と一致させる。**

| 系統 | 中身 | 着手の前提 |
|------|------|-----------|
| A. ソルバと生成 | `core` の 1〜4 + `generator` | 工程 1 |
| B. 難易度評価 | `core` の 5 | **A の 2(ソルバ)ができてから** |
| C. 盤面 UI | `web` の盤面・入力・状態管理 | 工程 1 と[問題ファイルの形式](../api/puzzle-file-format.md) |
| D. 問題の取得と保存 | `web` の fetch・localStorage | 同上 |

**B は A に依存する。** 手筋ソルバはソルバの土台の上に乗る。
**C と D は A の完成を待たない** —— ファイル形式が契約として決まっているので、
手書きの 1 問だけで UI を進められる。

## 未解決の課題(全体)

**調べれば分かるもの**をここへ書く。**調べても決まらないもの**は
[保留中の判断事項](../reference/pending-decisions.md) へ書く。

| # | 課題 | いつ分かるか |
|---|------|------------|
| 1 | 同梱パックを難易度ごとに何問にするか | **生成時間は判断材料にならない**(1,000 問で やさしい 4.2 秒 / ふつう 15 秒 / むずかしい 25 秒。[検証](../reports/2026-08-05-difficulty-distribution.md))。**残るはファイルサイズと配信の観点** |
| 2 | 難易度クラスのしきい値 | **分布は実測した**(やさしい 40.3% / ふつう 11.4% / むずかしい 6.8% / 評価できない 41.5%)。⚠️ **まだ閉じない。**41.5% はレベル 5 以降を実装すれば上のクラスへ移るので、移った後で見直す |
| 3 | 生成の性能(1 問あたりの所要時間) | ✅ **実測済み。**1 問 1.56 ms・毎秒 640 問(単スレッド・**難易度評価を含まない**)。[検証](../reports/2026-08-05-puzzle-generation-benchmark.md)。**難易度評価と並列化を入れたら測り直す** |
| 4 | 極小性(手がかりを 1 つ消すと一意解でなくなる)を要件にするか | ✅ **要件にしてよい。**いまの穴あけは必ず極小になり、やめても速くならない([検証](../reports/2026-08-05-puzzle-generation-benchmark.md)) |
| 5 | **TypeScript を 7 系へ上げられるか** | typescript-eslint が対応してから。いまは 6 系に固定(上げると `pnpm lint` が落ちる) |
| 6 | Mantine の CSS 231 KB を削れるか | 工程 3 以降。使う部品だけを import できているかを実測する |
| 7 | `countSolutions` に時間・ノード数の上限を付けるか | **外部由来の盤面を受け入れる段階で要る。**伝播が効かない盤面は約 2.2 秒かかる([検証](../reports/2026-08-05-search-solver-benchmark.md))。生成では踏まない形なので当面は不要 |
| 8 | **「難問」「最難関」のパックをどうするか** | ⚠️ **いまは 1 問も作れない。**レベル 5 以降(X-Wing / XY-Wing / チェーン系)が未実装のため([検証](../reports/2026-08-05-difficulty-distribution.md))。**UI は 5 クラスを出す前提**なので、手筋を足すか、当面は 3 クラスで配るかを決める必要がある |

## 関連ドキュメント

- [プロジェクトの目的と対象範囲](../overview/project-purpose.md)
- [システム構成](../architecture/system-architecture.md)
- [作業の引き継ぎ](handover.md) — 別の端末・別の担当者へ渡すとき
- [並列エージェントの運用](parallel-agent-operations.md) — 複数のエージェントで進めるとき
- [保留中の判断事項](../reference/pending-decisions.md) — 人が決める必要があるもの
- [テストの方針](../verification/testing-policy.md)
