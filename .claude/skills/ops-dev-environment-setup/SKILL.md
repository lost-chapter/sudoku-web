---
name: ops-dev-environment-setup
description: sudoku-web の開発環境を新しい git worktree や別の端末で使えるように揃える手順。依存パッケージ(`node_modules`)・`.env`・Claude Code のローカル設定(`.claude/settings.local.json`)はいずれも Git 管理外のため、クローン直後や新しい worktree では必ず不足する。「開発環境を整えて」「worktree で作業を始めたい」「テストを動かしたい」「開発サーバを立てたい」「別の端末で同じ環境を作りたい」のような依頼で使う。開発サーバのポート衝突が出たときの対処もここにある。
---

# 開発環境を揃える(worktree / 別端末)

**Git 管理外のものは新しい worktree やクローン直後には存在しない。**
依頼を受けたら、**何が不足しているかを先に洗い出してから**必要な分だけ用意する。

| 対象 | 単位 | 用意する方法 |
|------|------|--------------|
| 依存パッケージ(`node_modules/`) | **worktree ごと** | 下記 2 |
| `.env`(必要になったら) | **worktree ごと** | 下記 2 |
| `.claude/settings.local.json` | **worktree ごと** | 下記 3 |
| 開発サーバのポート | **worktree ごとに変える** | 下記 4 |

> **⚠️ 2026-08-05 時点で実装が無く、技術構成も未確定である**
> ([保留中の判断事項](../../../docs/reference/pending-decisions.md) の 1)。
> **下記 2 のコマンドは技術構成が決まった時点で実測して書き直すこと。**
> 手順の骨格(何が worktree ごとに要るか)は構成が変わっても効く。

## 0. 作業ディレクトリを確認する

**git worktree 上で作業していることが多い。** worktree はリポジトリごと別ディレクトリなので、
メインの作業ディレクトリで準備済みでも **worktree 側には何も無い**。

```bash
pwd
git rev-parse --show-toplevel | cat
git rev-parse --abbrev-ref HEAD | cat
git worktree list | cat
```

以降のコマンドは、必ず**今作業しているディレクトリ**で実行する。

## 1. 不足を洗い出す

```bash
ls -d node_modules .env .claude/settings.local.json 2>&1
```

**存在しないものだけを次の手順で用意する。**

## 2. 依存パッケージ(worktree ごと)

**技術構成が決まったらここへ実際のコマンドを書く。** 目安は次の 3 つ。

```bash
# cp .env.example .env      # .env を使う構成にした場合
# <パッケージマネージャ> install
# <テストコマンド> / <型チェックコマンド>   # 通ることまで確認する
```

**「入れた」で終わらせず、テストと型チェックが通るところまで確認する。**
通らない状態を引き渡すと、次の担当が自分の変更のせいだと誤認する。

## 3. Claude Code のローカル設定(worktree ごと)

`.claude/settings.local.json` は Git 管理外なので、**新しい worktree では毎回作る**。
メインの作業ディレクトリに既にあるならコピーでよい。

```bash
mkdir -p .claude
cp ../../.claude/settings.local.json .claude/settings.local.json   # パスは環境に読み替える
```

外部のディレクトリを参照する必要が出たら、`permissions.additionalDirectories` へ
**絶対パスで**登録する。

```bash
cat > .claude/settings.local.json <<'JSON'
{
  "permissions": {
    "additionalDirectories": []
  }
}
JSON
```

- **反映は次のセッションから**。今のセッションで参照できないときは、
  設定を書いたうえでユーザーへ再起動を促す

## 4. 開発サーバのポート(worktree ごとに変える)

**worktree ごとに同じポートで立てると衝突する。**
複数の worktree で同時に動かすなら、担当ごとにポートを決めて
[作業の引き継ぎ](../../../docs/guides/handover.md) の体制表へ書く。

```bash
lsof -nP -iTCP -sTCP:LISTEN | grep -E 'node|LISTEN' | head   # 何が使っているか確認する
```

**構成が決まったら、ポートの変え方(環境変数か起動引数か)をここへ書く。**

## よくある落とし穴

- **worktree にメインの準備が効いていると思い込む**: `node_modules` と
  `.claude/settings.local.json` は worktree ごとに無い。0 で作業ディレクトリを確認する
- **開発サーバのポートが衝突する**: worktree ごとに変える(4)
- **依存を入れただけで済ませる**: テストと型チェックまで通す(2)
- **`.claude/settings.local.json` がその場で効くと思う**: 反映は次のセッションから。
  書いたら Claude Code の再起動をユーザーへ促す
- **この手順が古いまま使われる**: 技術構成が決まったら**必ず実測して書き直す**。
  雛形のまま放置すると、次の担当が存在しないコマンドを叩く

## 関連ドキュメント

- [作業の引き継ぎ](../../../docs/guides/handover.md) — Git 管理外のものと現在地の測り方
- [並列エージェントの運用](../../../docs/guides/parallel-agent-operations.md) — worktree とブランチの規約
- [実装の進め方と現在地](../../../docs/guides/implementation-roadmap.md) — 工程 1(開発基盤)の完了条件
