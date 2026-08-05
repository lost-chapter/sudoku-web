# ローカル環境の構築

**クローンして 2 コマンドで動く。**

```bash
pnpm install
pnpm dev
```

worktree や別端末で足りないものを揃える手順は `ops-dev-environment-setup` スキル。

## 前提

| 項目 | 値 | 備考 |
|------|-----|------|
| Node.js | **22 以上**(実測は 24.18.0) | `package.json` の `engines` |
| pnpm | **11 系**(実測は 11.18.0) | `packageManager` で固定。`corepack enable` で入る |

## コマンド

| コマンド | 中身 |
|---------|------|
| `pnpm dev` | 開発サーバ(`@sudoku/web`)。既定は <http://localhost:5173> |
| `pnpm build` | 本番ビルド。出力は `packages/web/dist/` |
| `pnpm test` | 全パッケージのテスト(Vitest) |
| `pnpm typecheck` | 全パッケージの型チェック |
| `pnpm lint` | ESLint |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm docs:html` | `docs/` を HTML のサイトへ変換。入口は `docs-html/index.html` |

**ポートを変えるときは `PORT` を渡す。** worktree ごとに変える
([体制表](handover.md#3-いまの体制))。

```bash
PORT=5174 pnpm dev
```

## パッケージ構成

```
packages/core        盤面ロジック。DOM も Node API も使わない
packages/generator   問題を大量生成する CLI
packages/web         React + Mantine のアプリ
tools/docs-html      Markdown → HTML(管理役が持つ)
```

**パッケージ間は TypeScript のソースを直接参照する**(`exports` が `./src/index.ts` を指す)。
ビルド順を気にせず、`core` を直したら即座に `web` と `generator` へ反映される。

## 実測値(2026-08-05 時点)

**ここから乖離していたら、その差が引き継ぎで落ちたものである。**

| 項目 | 値 |
|------|-----|
| テスト | **304 件**(core 121 / generator 16 / docs-html 19 / web 148) |
| 型チェック | 4 パッケージ 0 エラー |
| Lint | 0 エラー |
| 本番ビルド | 成功(JS 345.14 KB / gzip 106.66 KB、CSS 233.55 KB / gzip 34.31 KB) |

⚠️ **CSS 232 KB は Mantine の全スタイルである。**
部品ごとの CSS が配布されているので削減はできるが、**切り替えは使う部品が固まる
工程 4 の終わり**にする([未解決の課題](implementation-roadmap.md#未解決の課題全体) の 6)。

## Git 管理外のもの

| 対象 | 単位 |
|------|------|
| `node_modules/` | worktree ごと |
| `packages/web/dist/` | ビルドのたび |
| `puzzles/generated/` | 生成のたび(シードから作り直せる) |
| `docs-html/` | `pnpm docs:html` のたび |
| `.claude/settings.local.json` | worktree ごと |
| `.claude/worktrees/` | 端末ごと |

## つまずきやすいところ

- **TypeScript は 6 系に固定している。**
  7 系は typescript-eslint がまだ対応しておらず、`pnpm lint` が起動時に落ちる。
  上げるのは対応後([未解決の課題](implementation-roadmap.md#未解決の課題全体))
- **`pnpm install` で esbuild のビルドスクリプトを許可している**
  (`pnpm-workspace.yaml` の `allowBuilds`)。拒否すると Vite と Vitest が動かない
- **ポートが衝突したら `PORT` を変える。** 複数の worktree で同時に立てると起きる
- **`docs-html/` はコミットしない。** 正本は `docs/` の `.md`
