---
name: ops-branch-merge
description: 現在の作業ブランチ(多くは git worktree 上)を、指定した統合ブランチ(例 feature/agent-a, develop)と同一コミットへ揃える手順。作業ブランチを統合ブランチへ no-ff マージし、最後に作業ブランチを fast-forward して両者を一致させる。「develop にマージして」「feature/agent-a に取り込んで」「マージしてから ff して」「作業ブランチをマージ先の最新に合わせて」のような依頼で使う。ワークツリーの取り違えやマージ先ブランチの切替ミスを防ぐための定型フロー。
---

# 作業ブランチを指定ブランチへ ff で揃える

**このスキルの目的は、最終的に現在の作業ブランチ(`SRC`)を指定ブランチ(`DST`)へ
fast-forward で揃え、両者を同一コミットにすること。**
`SRC` → `DST` の no-ff マージは、その状態へ持っていくための手段である。

「マージして」だけの依頼でも、**揃うところまでを 1 つの流れとして扱う**。
マージだけして `SRC` が `DST` より古いまま残る状態で終わらせない。

## 完了条件

次の 2 つを満たしたら完了。**報告の前に必ず確認する。**

```bash
git rev-parse HEAD DST | cat               # 2 つのハッシュが一致する
git log --oneline SRC..DST | cat           # 空(DST にあって SRC に無いコミットが無い)
```

`SRC` を進める手段は **fast-forward だけ**。`--ff-only` が通らない状況では
勝手に通常マージへ切り替えず、状況を提示してユーザーの判断を仰ぐ。

## 前提と用語

- `SRC` = 今チェックアウト中の作業ブランチ(`git rev-parse --abbrev-ref HEAD`)
- `DST` = 揃える先の統合ブランチ(ユーザー指定。例 `feature/agent-a` / `develop`)
- このリポジトリは **複数 worktree** 構成のことがある。同じブランチは複数の worktree に
  同時チェックアウトできない点に注意(`git worktree list` で確認)。
- **`develop` へマージできるのは管理役(agent-a)だけ**
  ([並列エージェントの運用](../../../docs/guides/parallel-agent-operations.md) の「統合」)。
  作業エージェントの `DST` は `feature/agent-a` である。

## 0. 事前確認(必ず実施)

```bash
git rev-parse --abbrev-ref HEAD           # SRC を把握
git status --short                         # 作業ツリーがクリーンか(未コミットがあれば先にコミット/stash)
git worktree list | cat                    # DST が別 worktree でチェックアウトされていないか
git branch -a | cat                        # DST の存在確認(ローカルに無ければ origin/DST 等を確認)
```

- **作業ツリーがクリーンでないとブランチ切替でつまずく**。未コミットがあればユーザーに確認の上、
  コミットするか `git stash -u` する。
- `DST` が **別の worktree でチェックアウト中**なら、この worktree では切り替えられない。
  その worktree 側で作業するか、一時 worktree を作る(下記「別解」)。

## 1. 分岐関係を見て、どこから始めるかを決める

```bash
git merge-base DST SRC | cat               # 共通祖先
git log --oneline DST..SRC | cat           # SRC にあって DST に無い = 取り込む差分
git log --oneline SRC..DST | cat           # DST にあって SRC に無い = SRC が遅れている量
```

| `DST..SRC`(取り込む差分) | `SRC..DST`(SRC の遅れ) | 進め方 |
|--------------------------|------------------------|--------|
| あり | 問わず | 2 → 3 → 4(通常の流れ) |
| 空 | あり | **マージ不要。2・3 を飛ばし 4 の ff だけ**で揃える |
| 空 | 空 | 既に同一コミット。**何もしない**(その旨を報告する) |

`DST..SRC` が空 = `SRC` の変更は既に `DST` へ入っている。この状態で `--no-ff` マージを
作ろうとしても `Already up to date.` になり、マージコミットは生まれない。
**目的は「揃えること」なので、ここで終わらせず 4 を実行する。**

## 2. DST へ切り替えて no-ff マージ

`DST` はどの worktree にも無い前提。作業ツリーがクリーンなこの worktree を一時的に `DST` へ
切り替えてマージし、後で元へ戻す。**SRC → DST のマージは分岐の有無にかかわらず必ず `--no-ff` を
付ける**(fast-forward 可能な状況でも、履歴にマージノードを残すため明示的に強制する)。

```bash
git checkout DST
git merge SRC --no-ff --no-edit            # 常にマージコミット。既定メッセージ
                                           # "Merge branch 'SRC' into DST"
```

- 競合が出たら**勝手に解決せずユーザーに委ねる**(このプロジェクトの方針)。
  中断するなら `git merge --abort`。この場合 `SRC` は `DST` へ揃えられないので、
  揃っていないことを明示して報告する。
- `--no-ff` を付けないと `SRC..DST` が空(分岐なし)のときに git が黙って fast-forward してしまい、
  マージコミットが残らない。**これを避けるため必ず `--no-ff` を指定する**。
- `--no-edit` で過去の同種マージと同じ既定メッセージに揃える(履歴の一貫性)。

マージ後、`DST` の tip コミットを控えておく:

```bash
git log --oneline -3 | cat                 # 生成されたマージコミットを確認
```

## 3. 元の SRC へ戻す

```bash
git checkout SRC
```

- worktree を元のブランチ状態へ戻す(worktree list の対応を崩さないため)。
- 開発サーバが動いていればファイルが元へ戻り HMR が走るだけで実害はない。

## 4. SRC を DST へ fast-forward(このスキルの目的)

**ここまで来たら必ず実行する。** 2 を通った場合、`DST` は「`SRC` + マージコミット」なので
`SRC` は `DST` へ **fast-forward 可能**(マージコミットの第 2 親が `SRC` の旧 tip のため)。
1 の表で「ff だけ」に分岐した場合も、同じコマンドで揃う。

```bash
git merge --ff-only DST
git rev-parse HEAD DST | cat               # 2 つのハッシュが一致すれば揃った
```

- `--ff-only` が失敗するのは、`SRC` と `DST` の双方に相手に無いコミットがある(分岐した)とき。
  **通常マージやリベースへ勝手に切り替えない。** 分岐の状況(両方向の `git log --oneline`)を
  提示してユーザーの判断を仰ぐ。

## 5. 仕上げ

「完了条件」の 2 コマンドで揃ったことを確認し、次を報告する。

- マージコミットのハッシュ(作った場合)
- 取り込んだコミット
- 競合の有無
- **`SRC` と `DST` が同一コミットに揃ったこと**(揃っていない場合はその理由)
- 現在のブランチ

ユーザーの指示が無い限り **push しない**。

## 別解: DST が別 worktree でチェックアウト中 / 切り替えたくない場合

この worktree のブランチを動かさずにマージだけ済ませたいときは一時 worktree を使う:

```bash
git worktree add /tmp/merge-dst DST
git -C /tmp/merge-dst merge SRC --no-ff --no-edit
git worktree remove /tmp/merge-dst
```

その後 **4 の ff は `SRC` の worktree 側で必ず実行する**: `git merge --ff-only DST`

## よくある落とし穴

- **マージで終わってしまう**: このスキルの目的は揃えること。2 のマージだけで報告せず、
  必ず 4 まで進める。`DST..SRC` が空で「マージ不要」と判断したときも 4 は実行する。
- **worktree の取り違え**: 切替前に `git status --short` でクリーン確認。未コミットのまま
  checkout すると失敗・巻き添えが起きる。
- **DST が別 worktree にチェックアウト済み**: `git checkout DST` が拒否される。別解を使う。
- **SRC → DST のマージで `--no-ff` を忘れる**: `SRC..DST` が空(分岐なし)のときに `--no-ff` を
  付け忘れると、git が fast-forward してマージコミットが残らない。2 のコマンドは必ず
  `git merge SRC --no-ff --no-edit` にする。
- **ff できると思ったらできない**: `SRC` と `DST` の間に新規コミットが挟まると `--ff-only` が失敗。
  無理に通常マージへ切り替えず、分岐状況を提示して確認する。
- **push は指示があるまでしない**。コミットメッセージは日本語・過去の履歴に倣う。

## 関連ドキュメント

- [並列エージェントの運用](../../../docs/guides/parallel-agent-operations.md) — 統合の 2 段構成と誰が何をマージするか
- [作業の引き継ぎ](../../../docs/guides/handover.md) — 未統合・未プッシュの測り方
