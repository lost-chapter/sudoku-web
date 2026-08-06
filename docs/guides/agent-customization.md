# エージェント向けカスタマイズの配置

このプロジェクトでは、永続的なプロジェクト規約と、繰り返し使う作業手順を分けて管理する。

| 目的 | 配置 | 扱い |
|------|------|------|
| Codex と Claude Code に共通するプロジェクト規約 | `AGENTS.md` | Git 管理下の正本 |
| Claude Code の互換入口 | `CLAUDE.md` | `@AGENTS.md` を参照する薄い入口 |
| プロジェクトスキルの正本 | `.claude/skills/` | Git 管理下。スキルの追加・変更はここで行う |
| Codex のプロジェクトスキル入口 | `.agents/skills` | `.claude/skills` への相対シンボリックリンク |
| Claude Code の端末固有設定 | `.claude/settings.local.json` | Git 管理外。端末または worktree ごとに用意する |

## スキルの同期方針

Codex はリポジトリの `.agents/skills` をプロジェクトスキルの探索先として使う。
既存の Claude Code 向けスキルを複製すると、片方だけ更新されるため、
このプロジェクトでは `.claude/skills` を正本にして、次の相対シンボリックリンクで共有する。

```text
.agents/skills -> ../.claude/skills
```

このリンクは Git 管理下に置く。相対リンクなので、リポジトリをクローンした場所や
Git worktree の場所が変わっても、各作業ディレクトリ内の正本を参照できる。

## 確認

プロジェクトのルートで次を実行する。

```bash
test -L .agents/skills
test "$(readlink .agents/skills)" = "../.claude/skills"
find -L .agents/skills -mindepth 2 -maxdepth 2 -name SKILL.md -print | sort
```

最後のコマンドに、`.claude/skills/` と同じ 5 個の `SKILL.md` が表示されればよい。

リンクが無い新しい作業ディレクトリでは、既存の実体を上書きしないよう確認してから作成する。

```bash
if [ -L .agents/skills ]; then
  test "$(readlink .agents/skills)" = "../.claude/skills"
elif [ ! -e .agents/skills ]; then
  mkdir -p .agents
  ln -s ../.claude/skills .agents/skills
else
  printf '%s\n' '.agents/skills に既存の実体があるため、自動で置き換えない' >&2
  exit 1
fi
```

## スキルを追加・変更するとき

1. `.claude/skills/<skill-name>/SKILL.md` を正本として追加または変更する
2. [スキル命名規則](skill-naming-guidelines.md) を確認する
3. [スキル一覧](../reference/skills-catalog.md) の表を更新する
4. 上記の確認コマンドで Codex 側からも見えることを確かめる

`.agents/skills` 側へファイルをコピーしたり、同じ名前の別スキルを作ったりしない。
`.codex/` はこのプロジェクトでは不要であり、Codex の設定が必要になったときだけ別途追加する。
