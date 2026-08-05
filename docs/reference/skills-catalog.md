# スキル一覧

このプロジェクトで利用できるスキル(`.claude/skills/` 配下)の一覧。
スキルを追加・改名・削除したときは、この表を必ず更新する。
命名の規則は [スキル命名規則](../guides/skill-naming-guidelines.md) を参照。

## 一覧

| スキル名 | 開発領域 | 目的 | 配置 |
|----------|----------|------|------|
| `docs-markdown-to-html` | `docs-` | `docs/` の Markdown を、人間が読みやすい自己完結の HTML へ**決定的に**変換する(入力は書き換えない。生成物は Git 管理外)。**コードの色付けと ` ```mermaid ` の図の描画もビルド時に行う** | [.claude/skills/docs-markdown-to-html/](../../.claude/skills/docs-markdown-to-html/SKILL.md) |
| `ops-branch-merge` | `ops-` | 作業ブランチを指定した統合ブランチへ fast-forward で揃える(手段として no-ff マージを行う) | [.claude/skills/ops-branch-merge/](../../.claude/skills/ops-branch-merge/SKILL.md) |
| `ops-dev-environment-setup` | `ops-` | 新しい worktree や別端末で、依存パッケージ・`.env`・Claude Code のローカル設定・開発サーバのポートを揃える | [.claude/skills/ops-dev-environment-setup/](../../.claude/skills/ops-dev-environment-setup/SKILL.md) |

`ops-` の 2 つは cadapi-2 から移植し、sudoku-web の実態に合わせて書き直した。
`docs-markdown-to-html` は sudoku-web で新規に作成した。

**3 つとも実際に動く**(2026-08-05 の工程 1 で実装と実測を済ませた)。

| スキル | 実体 |
|--------|------|
| `docs-markdown-to-html` | `tools/docs-html/`(テスト 31 件が契約を守っている。2026-08-06 時点) |
| `ops-dev-environment-setup` | [ローカル環境の構築](../guides/local-setup.md) の実コマンド |
| `ops-branch-merge` | Git の操作のみ |

**構成を変えたらスキルも書き直す。** 実測値を含むので、放置すると次の担当が
存在しないコマンドを叩くことになる。

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
