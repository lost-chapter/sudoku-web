# プロジェクト概要

sudoku-web は、数独を遊べる **Web アプリケーション**。
盤面の生成・解法・難易度判定といったロジックと、それを操作する UI の両方を持つ。

**技術構成はまだ確定していない**([保留中の判断事項](docs/reference/pending-decisions.md) の 1)。
確定したら `docs/overview/project-purpose.md`(目的と対象範囲)と
`docs/architecture/system-architecture.md`(システム構成)に書き、この節からリンクする。

## ディレクトリ構成

- `docs/` — プロジェクトドキュメント一式。入口は [`docs/README.md`](docs/README.md)
- `.claude/skills/` — このプロジェクトで使うスキル。一覧は [スキル一覧](docs/reference/skills-catalog.md)

## 作業を始めるとき

**まず [実装の進め方と現在地](docs/guides/implementation-roadmap.md) を読む。**
どの工程まで終わっていて次に何をすべきかが書いてある。

**ただしロードマップの記載を鵜呑みにしない。** 更新漏れがありうるので、
[作業の引き継ぎ](docs/guides/handover.md) の「現在地を実測で確かめる」の手順で実測してから判断する。

**工程が進んだらロードマップを更新する。** 現在地・完了条件・未解決の課題を
実態に合わせること。更新しないと次のセッションで判断できなくなる。

複数のエージェントで並行して進めるときは
[並列エージェントの運用](docs/guides/parallel-agent-operations.md) を先に読む。

## ドキュメントの扱い

プロジェクトのドキュメントは原則すべて `docs/` 配下へ、カテゴリ別に配置する。
分類・命名・作成手順は [ドキュメント管理規則](docs/guides/documentation-guidelines.md) に必ず従うこと。
仕様・設計・検証などの詳細情報を追加・参照するときは、まず [`docs/README.md`](docs/README.md) の索引を確認する。

## スキルの扱い

スキルを新規作成・改名・削除するときは [スキル命名規則](docs/guides/skill-naming-guidelines.md) に従い、
[スキル一覧](docs/reference/skills-catalog.md) の表も同時に更新して実態と一致させること。

## 開発上の約束

- ユーザーとの対話・コミットメッセージ・ドキュメントは日本語で記述する
- コミットメッセージは過去のコミットに倣い、関心事ごとに分割する
- 指示がない限り Git のプッシュは行わない
- 実装を変更したら、関連するドキュメントも合わせて更新し整合性を保つ
- 判断が要ることを会話の中だけに置かない。
  [保留中の判断事項](docs/reference/pending-decisions.md) か該当する文書へ落とす
