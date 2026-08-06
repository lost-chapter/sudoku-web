# ドキュメント

sudoku-web のドキュメント入口。プロジェクト内のドキュメントはすべてこの `docs/` 配下に格納する。
分類・命名・作成手順の詳細は [ドキュメント管理規則](guides/documentation-guidelines.md) に従うこと。
スキルを作成・改名するときは [スキル命名規則](guides/skill-naming-guidelines.md) に従い、[スキル一覧](reference/skills-catalog.md) を更新すること。
Claude Code と Codex の入口の同期方法は [エージェント向けカスタマイズの配置](guides/agent-customization.md) にある。

**作業を再開するときは [実装の進め方と現在地](guides/implementation-roadmap.md) から読む。**
どの工程まで終わっていて次に何をすべきか、未解決の課題が集約してある。

ドキュメントを作成するときは下記のカテゴリへ分類し、この索引の「主要ドキュメント」へ追記する。

## カテゴリ一覧

| カテゴリ | 用途 |
|----------|------|
| [overview/](overview/) | プロジェクトの目的・対象範囲・用語集・開発方針 |
| [architecture/](architecture/) | 全体アーキテクチャ・モジュール構成・状態管理・データフロー・依存関係・エラーハンドリング方針 |
| [algorithms/](algorithms/) | 数独のロジックの仕様・検討(盤面生成、解法、一意解の判定、難易度評価、ヒント、入力の検証) |
| [ui/](ui/) | 画面構成・操作仕様・入力方式・キーボード操作・アクセシビリティ・レスポンシブ方針 |
| [api/](api/) | 永続化と外部連携の仕様(サーバを持つ場合のエンドポイント、保存形式の契約、エラー形式) |
| [verification/](verification/) | 検証方法・条件・期待値(テスト設計、性能評価、合否判定基準) |
| [decisions/](decisions/) | 重要な設計判断(ADR 形式、`NNNN-<decision-title>.md`) |
| [guides/](guides/) | 開発者向け手順書(環境構築、ローカル実行、テスト、リリース) |
| [reference/](reference/) | 頻繁に参照する事実情報・一覧(用語詳細、データ形式、定数一覧、スキル一覧) |
| [reports/](reports/) | 実施済みの調査・実験・検証・ベンチマーク結果(`YYYY-MM-DD-<report-title>.md`) |
| [release-notes/](release-notes/) | **遊ぶ人へ向けた版ごとの変更点**(`<版>.md`)。⚠️ **ここだけ読み手が開発者ではない** |
| [assets/](assets/) | ドキュメントから参照する画像・図・添付データ |

## 主要ドキュメント

- [実装の進め方と現在地](guides/implementation-roadmap.md) — **次に何をすべきかの入口**。工程表と未解決の課題
- [保留中の判断事項](reference/pending-decisions.md) — **人が決める必要がある事項の一覧**。調べても決まらないものはここへ集約する
- [作業の引き継ぎ](guides/handover.md) — **別の端末・別の担当者へ渡すとき**。未プッシュのコミット・Git 管理外のもの・進行中の作業
- [並列エージェントの運用](guides/parallel-agent-operations.md) — **複数のエージェントで同時に進めるとき**。担当の立て方・触ってよいファイルの境界・統合の作法・禁止事項
- [ブランチ戦略](guides/branch-strategy.md) — **ブランチの種類・誰が何をマージできるか・いつ寄せるか**。`develop` へは直接コミットしない
- [配信(GitHub Pages)](guides/deployment.md) — **出すのは `main` だけ**。🔴 **サブパスで壊れるものの見つけ方**
- [ローカル環境の構築](guides/local-setup.md) — `pnpm install` → `pnpm dev`。コマンド一覧と実測値
- [プロジェクトの目的と対象範囲](overview/project-purpose.md) — 与えられた 5 つの要件と、作る / 作らないの線引き
- [システム構成](architecture/system-architecture.md) — 「作る側(Node)」と「遊ぶ側(ブラウザ)」を分け、`core` を共有する
- [問題ファイルの形式](api/puzzle-file-format.md) — **生成側と遊技側をつなぐ契約**。片方だけ変えない
- [リリースノートの形式](api/release-notes-format.md) — **書く側と閲覧機能をつなぐ契約**。既読の記録もここで決める
- [盤面の生成](algorithms/board-generation.md) — **同型変換で量産しない**。乱数はシードで外から注入する
- [解法(ソルバ)](algorithms/solver.md) — 探索ソルバと手筋ソルバは別物。一意解は「解 2 個で打ち切り」
- [難易度の評価](algorithms/difficulty-rating.md) — **手がかり数で難易度を決めない**(相関 0.25〜0.27)
- [画面構成と操作仕様](ui/screens-and-interactions.md) — 盤面は自前実装。キーボードだけで遊べること
- [テストの方針](verification/testing-policy.md) — 必ず守る 6 つの性質
- [ADR 0001 プロジェクト構成](decisions/0001-project-structure.md) — pnpm workspaces の 3 パッケージ
- [ADR 0002 UI ライブラリの選定](decisions/0002-ui-library-selection.md) — Mantine。**React 19.2+ が必須になる**
- [ADR 0003 問題を事前生成した外部ファイルとして持つ](decisions/0003-external-puzzle-files.md) — サーバを持たない。同梱分だけコミットする
- [ADR 0004 遊技機能の範囲を発注者の要望に合わせる](decisions/0004-feature-scope-from-client.md) — **タイマー・誤りの指摘・残り数を消す**。設定に残さない
- [ADR 0005 スマートフォンは専用レイアウトにする](decisions/0005-mobile-dedicated-layout.md) — **UA では分岐しない**(幅 × 入力装置)。振る舞いは 1 つ、見た目は 2 つ
- [ADR 0006 アイコンはライブラリを入れず自前で持つ](decisions/0006-own-svg-icons.md) — **バンドルの差は gzip 0.64 KB。決め手は `node_modules` の 140 MB**
- [調査: UI ライブラリの選定](reports/2026-08-05-ui-library-survey.md) — 5 候補の実測比較。shadcn/ui は 2026-07 に基盤が変わった
- [調査: 数独の生成・難易度評価・ファイル形式](reports/2026-08-05-sudoku-generation-survey.md) — 同型変換の罠・最小 17 手がかり・相関表・81 文字 1 行
- [検証: 探索ソルバの所要時間](reports/2026-08-05-search-solver-benchmark.md) — TypeScript の実測。**一意解の判定は生成の律速にならない**
- [検証: 問題の生成の所要時間と手がかり数の分布](reports/2026-08-05-puzzle-generation-benchmark.md) — 1 問 1.56 ms・毎秒 640 問。**手がかり数は 24〜25 に山**
- [検証: 難易度クラスの分布](reports/2026-08-05-difficulty-distribution.md) — **5 クラスすべてを収録できるようになった**。しきい値は確定
- [検討: フリック操作](reports/2026-08-06-flick-input-survey.md) —— **4 案のうち 1 案だけ試作した**。盤面は画面の端から 4px しかない
- [検証: 盤面スワイプ入力](reports/2026-08-06-board-swipe-input.md) —— **方向ガイドと iPhone風の数字ガイドで、指を離して 1 手で入力する**
- [ドキュメント管理規則](guides/documentation-guidelines.md) — ドキュメントの分類・命名・作成手順
- [スキル命名規則](guides/skill-naming-guidelines.md) — スキル名の形式と開発領域の接頭辞
- [エージェント向けカスタマイズの配置](guides/agent-customization.md) — `AGENTS.md` と Claude Code / Codex のスキル入口
- [スキル一覧](reference/skills-catalog.md) — `.claude/skills/` を正本とするスキルと目的

> **工程 0〜6 が完了している**。同梱パックは 5 クラス 5,000 問。
> **配信は GitHub Pages に決まった**(2026-08-06。当初は「やらない」としていた)。
> **いまは工程 10(画面デザイン)と工程 11(スマホのスワイプ入力)を進めている。**

## 初めて参加する開発者が読む順序

1. [overview/](overview/) — プロジェクトの目的と全体像を把握する
2. [実装の進め方と現在地](guides/implementation-roadmap.md) — 進捗と残作業をつかむ
3. [decisions/](decisions/) — 前提となる設計判断を確認する
4. [guides/](guides/) — 開発環境を構築し、ローカルで動かす
5. [algorithms/](algorithms/) / [ui/](ui/) — 担当領域の仕様を読む
6. [verification/](verification/) — 検証の考え方と合否基準を確認する

複数のエージェントで並行するなら、体制を組む前に
[並列エージェントの運用](guides/parallel-agent-operations.md) を読む。

## 進行中の検証・重要な設計判断

- 進行中の作業: [実装の進め方と現在地](guides/implementation-roadmap.md) — **工程 7(UI の作り込み)と工程 8(リリースの仕組み)**。担当の割り当ては [作業の引き継ぎ](guides/handover.md#3-いまの体制) の体制表にある
- 判断待ち: [保留中の判断事項](reference/pending-decisions.md) — **現時点で未決は無い**(工程 0 の 3 件は決着済み)
- 重要な設計判断:
  - [0001 プロジェクト構成](decisions/0001-project-structure.md)
  - [0002 UI ライブラリの選定](decisions/0002-ui-library-selection.md)
  - [0003 問題を事前生成した外部ファイルとして持つ](decisions/0003-external-puzzle-files.md)
  - [0004 遊技機能の範囲を発注者の要望に合わせる](decisions/0004-feature-scope-from-client.md)
  - [0005 スマートフォンは専用レイアウトにする](decisions/0005-mobile-dedicated-layout.md)
  - [0006 アイコンはライブラリを入れず自前で持つ](decisions/0006-own-svg-icons.md)
- 実施済みの調査・検証:
  - [UI ライブラリの選定](reports/2026-08-05-ui-library-survey.md)
  - [数独の生成・難易度評価・ファイル形式](reports/2026-08-05-sudoku-generation-survey.md)
  - [探索ソルバの所要時間](reports/2026-08-05-search-solver-benchmark.md)
  - [問題の生成の所要時間と手がかり数の分布](reports/2026-08-05-puzzle-generation-benchmark.md)
  - [難易度クラスの分布](reports/2026-08-05-difficulty-distribution.md)
  - [フリック操作の検討](reports/2026-08-06-flick-input-survey.md)
  - [盤面スワイプ入力](reports/2026-08-06-board-swipe-input.md)

## ドキュメントを追加・変更するとき

[ドキュメント管理規則](guides/documentation-guidelines.md) の「ドキュメント作成時の手順」に従い、
配置先の選択・命名・相対リンク・本 README の索引更新・リンク切れ確認を行うこと。
