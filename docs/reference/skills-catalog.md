# スキル一覧

このプロジェクトで利用できるスキルの一覧。
正本は `.claude/skills/` 配下に置き、Codex の探索入口 `.agents/skills` から同じファイルを参照する。
スキルを追加・改名・削除したときは、この表を必ず更新する。
命名の規則は [スキル命名規則](../guides/skill-naming-guidelines.md) を参照。

## 一覧

| スキル名 | 開発領域 | 目的 | 配置 |
|----------|----------|------|------|
| `docs-markdown-to-html` | `docs-` | `docs/` の Markdown を、人間が読みやすい自己完結の HTML へ**決定的に**変換する(入力は書き換えない。生成物は Git 管理外)。**コードの色付けと ` ```mermaid ` の図の描画もビルド時に行う** | [.claude/skills/docs-markdown-to-html/](../../.claude/skills/docs-markdown-to-html/SKILL.md) |
| `docs-release-notes` | `docs-` | リリースノート(`docs/release-notes/<版>.md`)を書く。**コミットの一覧ではなく、遊ぶ人にとって何が変わったかへ言い換える** | [.claude/skills/docs-release-notes/](../../.claude/skills/docs-release-notes/SKILL.md) |
| `ops-branch-merge` | `ops-` | 作業ブランチを指定した統合ブランチへ fast-forward で揃える(手段として no-ff マージを行う) | [.claude/skills/ops-branch-merge/](../../.claude/skills/ops-branch-merge/SKILL.md) |
| `ops-dev-environment-setup` | `ops-` | 新しい worktree や別端末で、依存パッケージ・`.env`・Claude Code のローカル設定・開発サーバのポートを揃える | [.claude/skills/ops-dev-environment-setup/](../../.claude/skills/ops-dev-environment-setup/SKILL.md) |
| `ops-release` | `ops-` | 1 版リリースする。**git-flow のリリースブランチを `develop` から切り、`main` と `develop` の両方へ寄せ、タグを打って GitHub Pages へ出す** | [.claude/skills/ops-release/](../../.claude/skills/ops-release/SKILL.md) |

`ops-branch-merge` と `ops-dev-environment-setup` は cadapi-2 から移植し、
sudoku-web の実態に合わせて書き直した。残る 3 つは sudoku-web で新規に作成した。

| スキル | 実体 | 通しで動かしたか |
|--------|------|----------------|
| `docs-markdown-to-html` | `tools/docs-html/`(テスト 31 件が契約を守っている) | ✅ 2026-08-05 |
| `docs-release-notes` | `tools/release-notes/`(テスト 17 件。**正本が形式を満たしているかも見張る**) | ⚠️ **形式の検査だけ**(2026-08-06 に作成) |
| `ops-dev-environment-setup` | [ローカル環境の構築](../guides/local-setup.md) の実コマンド | ✅ 2026-08-05 |
| `ops-branch-merge` | Git の操作のみ | ✅ 何度も |
| `ops-release` | Git の操作 + [Pages の workflow](../../.github/workflows/pages.yml) + `tools/subpath-preview/` | 🔴 **未実行**(0.1.0 が最初になる) |

⚠️ **`ops-release` はまだ 1 度も通していない。** 最初のリリースで詰まったら、
**詰まった箇所をスキルへ書き戻すこと。** 手順書は使ってみないと穴が分からない。

**構成を変えたらスキルも書き直す。** 実測値を含むので、放置すると次の担当が
存在しないコマンドを叩くことになる。

## 配置と同期

スキルの正本は `.claude/skills/<skill-name>/SKILL.md` である。
`.agents/skills` は `.claude/skills` への相対シンボリックリンクであり、
Claude Code と Codex が同じスキルを読むための入口になっている。
**`.agents/skills` に実体を複製しない。** 追加・変更は正本側へ行う。

詳しい確認・復旧手順は [エージェント向けカスタマイズの配置](../guides/agent-customization.md) を参照する。

## ユーザーのグローバルスキルとの関係

`~/.claude/skills/`(Claude Code) や `~/.agents/skills/`(Codex) にあるグローバルスキルは、
このプロジェクトでも使える。
**同じことをするプロジェクトスキルを作らない**(どちらが最新か分からなくなる)。

| グローバルスキル | 関係 |
|-----------------|------|
| `merge-into-branch` | `ops-branch-merge` と目的が同じ。**プロジェクト内では `ops-branch-merge` を使う**(統合先の規約と管理役の制約を含むため) |
| `cleanup-worktree` | マージ済み worktree の後片付け。プロジェクト側に同等のスキルは作らない |

## スキルを追加するとき

1. [スキル命名規則](../guides/skill-naming-guidelines.md) に従って名前を決める
2. **グローバルスキルと責務が重複しないか確認する**(上記)
3. `.claude/skills/<skill-name>/SKILL.md` を作成する(`.agents/skills` へは複製しない)
4. この一覧表へ 1 行追加する(スキル名・開発領域・目的・配置)
