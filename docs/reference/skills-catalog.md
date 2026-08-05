# スキル一覧

このプロジェクトで利用できるスキル(`.claude/skills/` 配下)の一覧。
スキルを追加・改名・削除したときは、この表を必ず更新する。
命名の規則は [スキル命名規則](../guides/skill-naming-guidelines.md) を参照。

## 一覧

| スキル名 | 開発領域 | 目的 | 配置 |
|----------|----------|------|------|
| `docs-markdown-to-html` | `docs-` | `docs/` の Markdown を、人間が読みやすい自己完結の HTML へ**決定的に**変換する(入力は書き換えない。生成物は Git 管理外) | [.claude/skills/docs-markdown-to-html/](../../.claude/skills/docs-markdown-to-html/SKILL.md) |
| `ops-branch-merge` | `ops-` | 作業ブランチを指定した統合ブランチへ fast-forward で揃える(手段として no-ff マージを行う) | [.claude/skills/ops-branch-merge/](../../.claude/skills/ops-branch-merge/SKILL.md) |
| `ops-dev-environment-setup` | `ops-` | 新しい worktree や別端末で、依存パッケージ・`.env`・Claude Code のローカル設定・開発サーバのポートを揃える | [.claude/skills/ops-dev-environment-setup/](../../.claude/skills/ops-dev-environment-setup/SKILL.md) |

`ops-` の 2 つは cadapi-2 から移植し、sudoku-web の実態に合わせて書き直した。
`docs-markdown-to-html` は sudoku-web で新規に作成した。

⚠️ **どちらも「走らせる先」がまだ無い。**

| スキル | 不足しているもの | 用意する工程 |
|--------|----------------|------------|
| `ops-dev-environment-setup` | 依存インストール・テストの実コマンド | 工程 1 |
| `docs-markdown-to-html` | `tools/docs-html/render.mjs` の実装 | 工程 1 |

工程 1 が終わったら、**実測して**それぞれのスキルを書き直すこと
([実装の進め方と現在地](../guides/implementation-roadmap.md))。

## ユーザーのグローバルスキルとの関係

`~/.claude/skills/` にあるスキルはこのプロジェクトでも使える。
**同じことをするプロジェクトスキルを作らない**(どちらが最新か分からなくなる)。

| グローバルスキル | 関係 |
|-----------------|------|
| `merge-into-branch` | `ops-branch-merge` と目的が同じ。**プロジェクト内では `ops-branch-merge` を使う**(統合先の規約と管理役の制約を含むため) |
| `cleanup-worktree` | マージ済み worktree の後片付け。プロジェクト側に同等のスキルは作らない |

## スキルを追加するとき

1. [スキル命名規則](../guides/skill-naming-guidelines.md) に従って名前を決める
2. **グローバルスキルと責務が重複しないか確認する**(上記)
3. `.claude/skills/<skill-name>/SKILL.md` を作成する
4. この一覧表へ 1 行追加する(スキル名・開発領域・目的・配置)
