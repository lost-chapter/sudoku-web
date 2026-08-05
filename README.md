# sudoku-web

数独を遊べる Web アプリケーション。**問題は事前に生成して同梱してあるので、サーバは要らない。**

## できること

| | |
|---|---|
| 難易度 | **5 段階**(やさしい / ふつう / むずかしい / 難問 / 最難関)。同梱は**各 1,000 問** |
| 入力 | 数字・メモ(候補)・取り消し / やり直し |
| 補助表示 | 同じ数字の強調・行 / 列 / ブロックの強調・矛盾の表示・残り数・誤りの即時指摘。**すべて設定で切れる** |
| 進行の保存 | 遊びかけを端末に残し、次に開いたとき「続きから」で再開できる |
| テーマ | ライト / ダーク。既定は端末の設定に従う |

**キーボードだけで最初から最後まで遊べる。** 矢印キーで選択、`1`〜`9` で入力、
`Backspace` で消去、`Space` でメモの切り替え、`Ctrl/⌘ + Z` で取り消し。
盤面は Tab の対象を 1 つに抑えてあるので、81 マスを Tab で辿らされることはない。

## 遊ぶ

Node 22 以上と pnpm 11 系が要る。詳しくは [ローカル環境の構築](docs/guides/local-setup.md)。

```bash
pnpm install
pnpm dev
```

問題を作り直したいときは `packages/generator` の CLI を使う
([盤面の生成](docs/algorithms/board-generation.md))。

## リポジトリの歩き方

```
packages/core       盤面ロジック(生成側と遊技側で共有する。DOM も Node API も使わない)
packages/generator  問題を大量生成する CLI
packages/web        画面(React + TypeScript)
puzzles/            同梱の問題パック
docs/               設計・仕様・調査
```

| 知りたいこと | 読むもの |
|-------------|---------|
| ドキュメントの索引 | [docs/README.md](docs/README.md) |
| 開発の前提と約束 | [AGENTS.md](AGENTS.md) |
| 次に何をすべきか | [実装の進め方と現在地](docs/guides/implementation-roadmap.md) |
| なぜその作りなのか | [システム構成](docs/architecture/system-architecture.md) と [decisions/](docs/decisions/) |
| 画面と操作の仕様 | [画面構成と操作仕様](docs/ui/screens-and-interactions.md) |
| 問題ファイルの形式 | [問題ファイルの形式](docs/api/puzzle-file-format.md)(生成側と遊技側の契約) |
