---
name: ops-release
description: sudoku-web を 1 版リリースする手順。git-flow のリリースブランチ(release/x.y.z)を develop から切り、版を上げてリリースノートを整え、main と develop の両方へ寄せてタグを打ち、GitHub Pages へ出すまで。「リリースして」「0.2.0 を出して」「リリースブランチを切って」「main に寄せてタグを打って」のような依頼で使う。版のずれ・develop への戻し忘れ・出す前の検査漏れを防ぐための定型フロー。
---

# 1 版リリースする

**このスキルの目的は、`develop` のある時点を「出してよい状態」に固めて `main` へ渡し、
その状態を `develop` にも戻し、タグを打って GitHub Pages へ出すことである。**

**リリースブランチを経由する理由は 2 つ。**

| 理由 | 何が起きるか |
|------|------------|
| **版を上げるコミットの置き場所** | `develop` へ直接入れると、出すのをやめたときに取り消しが要る |
| **固めている間も `develop` は動く** | 検査中に入った変更を巻き込まずに済む |

## 完了条件

次を**すべて**満たしたら完了。**報告の前に必ず確認する。**

```bash
git log --oneline -1 main | cat                   # リリースのマージコミットが乗っている
git tag --list 'v*' | tail -3                     # v<版> のタグがある

git diff --stat develop main                      # 🔴 空であること(中身が一致)
git log --oneline --no-merges develop..main | cat # 🔴 空であること(戻し漏れが無い)
```

🔴 **「`develop..main` が空であること」を条件にしてはいけない。**
⚠️ **`main` へ `--no-ff` でマージした時点で、そのマージコミットは必ず `develop` に無い。**
**空にはならないので、正しく終わっていても未完了に見える**
(2026-08-06 に初めて通して判明。それまでこの条件を書いていた)。

**見たいのは「戻し忘れが無いか」である。⇒ 見るものは 2 つ。**

| 何を見るか | 何が分かるか |
|-----------|------------|
| **`git diff --stat develop main`** | **中身が一致しているか。**これが空なら戻し漏れは無い |
| **`git log --no-merges develop..main`** | **`main` にしか無い実体のあるコミット。**マージコミットは数えない |

⚠️ **`main` にあって `develop` に無い実体のコミットが 1 つでもあったら未完了である。**
戻し忘れると、次のリリースで必ず競合する。

## 前提

- **版は `package.json` の `version` とリリースノートのファイル名で一致していること**
  ([リリースノートの形式](../../../docs/api/release-notes-format.md))
- **`main` / `develop` へ寄せられるのは管理役(agent-a)だけ**
  ([ブランチ戦略](../../../docs/guides/branch-strategy.md))
- ⚠️ **プッシュはユーザーの指示があるときだけ。** このスキルは**プッシュまで含む**が、
  **その 1 手前で必ず止まって確認を取る**

## 0. 出せる状態かを確かめる

🔴 **ここを飛ばさない。** `develop` が壊れたままリリースブランチを切ると、
固めたあとで作り直すことになる。

```bash
git rev-parse --abbrev-ref HEAD | cat             # いまどこにいるか
git status --short                                 # クリーンであること
git log --oneline develop -3 | cat

pnpm install
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

**未統合の作業ブランチが無いことも確かめる。**

```bash
git for-each-ref --format='%(refname:short)' refs/heads | while read b; do
  printf '%-24s %s\n' "$b" "$(git rev-list --count develop.."$b")"
done
```

⚠️ **0 でないブランチがあったら、先に統合するか、残す理由を説明できること。**

## 1. 版を決める

**semver に従う**([リリースノートの形式](../../../docs/api/release-notes-format.md) の「版の扱い」)。

```bash
node -p "require('./package.json').version"        # いまの版
ls docs/release-notes/                             # 出した版の一覧
```

| 上げるところ | いつ |
|-------------|------|
| メジャー | 保存した遊びかけが読めなくなるなど、遊ぶ人に影響が出る変更 |
| マイナー | 機能が増えたとき |
| パッチ | 修正だけのとき |

**判断に迷ったら勝手に決めず、根拠(入った変更の一覧)を出してユーザーへ確認する。**

```bash
git log --oneline <前の版のタグ>..develop | cat
```

## 2. リリースブランチを切る

```bash
git checkout develop
git checkout -b release/0.2.0                      # 版に合わせる
```

⚠️ **`release/` は「固める場所」であって「作る場所」ではない。**
ここへ入れてよいのは**版を上げるコミットとリリースノート、出す直前に見つかった修正だけ**。
新しい機能を足さない。

## 3. 版を上げてリリースノートを書く

**版は 2 か所。片方だけ直すと下の検査で落ちる。**

```bash
# 1) ルートの package.json の version
# 2) docs/release-notes/<版>.md を新規作成
```

🔴 **上げるのはルートの `package.json` だけである。**
`packages/*` と `tools/*` の `version` は**触らない**。
⚠️ **どれも `private: true` で、どこへも配布しない。**
**揃える意味が無く、揃え忘れる場所が増えるだけである。**

⚠️ **最初のリリース(0.1.0)では、この節は何もすることが無い。**
**版は最初から `0.1.0` で、リリースノートも先に書いてある。**
**「上げるコミットが無い」のが正しい状態なので、無理に作らない**
(2026-08-06 に実際に通して確かめた)。

リリースノートの書き方は
[`docs-release-notes` スキル](../docs-release-notes/SKILL.md) にある。
**読み手は遊ぶ人である。** 内部の用語を出さない。

**一致していることを確かめる。**

```bash
test "$(node -p "require('./package.json').version")" = "0.2.0" && \
  test -f docs/release-notes/0.2.0.md && echo "版は揃っている"

node tools/release-notes/build.mjs                 # 形式が通ることを確かめる
```

コミットは**関心事ごとに 2 つ**へ分ける。

```bash
git add package.json && git commit -m "版を 0.2.0 へ上げる"
git add docs/release-notes/0.2.0.md && git commit -m "0.2.0 のリリースノートを書く"
```

## 4. 出す前の検査

**手元の `pnpm test` だけでは足りない。** 🔴 **サブパスで壊れるものはここでしか見つからない。**

```bash
pnpm test
pnpm test:e2e
pnpm docs:lint

pnpm build:pages                                   # BASE_PATH を付けたビルド
pnpm preview:subpath                               # http://localhost:4321/sudoku-web/
```

⚠️ **Playwright で確かめる script を書くなら `packages/web/` の中に置く。**
**リポジトリ直下では `@playwright/test` が解決できない**(依存は web パッケージにある)。

⚠️ **`packages/web/public/` は Git 管理外である。**
問題パックもリリースノートも **`pnpm build` が毎回作り直す**ので、
`main` へマージしたあとの CI でも同じものができる。
**`main` のツリーに配信物が無くても異常ではない。**

**ブラウザで開いて実際に 1 問遊ぶ。**
**Ctrl-C で止めると、サブパスの外へ出た要求の一覧が出る。**
⚠️ **そこに何か並んでいたら本番で 404 になる。**
理由と直し方は [配信](../../../docs/guides/deployment.md) にある。

**リリースノートが画面に出ることも確かめる**(閲覧機能)。

## 5. `main` へ寄せてタグを打つ

```bash
git checkout main
git merge release/0.2.0 --no-ff --no-edit
git tag -a v0.2.0 -m "0.2.0"
```

⚠️ **タグは `main` の上で打つ。** リリースブランチの上で打つと、
そのブランチを消したときに何を指しているのか追いにくくなる。

## 6. `develop` へ戻す

🔴 **ここが最も忘れられる。** 版を上げたコミットが `develop` に無いと、
次のリリースで必ず競合する。

```bash
git checkout develop
git merge release/0.2.0 --no-ff --no-edit
```

⚠️ **`main` ではなく `release/` からマージする。**
`main` からだと、`main` にしか無いもの(過去のリリース)まで巻き込む。

⚠️ **版を上げるコミットが無い回(最初のリリース)は `Already up to date.` になる。**
**それが正しい。**`release/` が `develop` の祖先なので、戻すものが無い。

**戻ったことを確かめる。**

```bash
git diff --stat develop main                       # 空であること(中身が一致)
git log --oneline --no-merges develop..main | cat  # 空であること
```

🔴 **`git log --oneline develop..main` は空にならない。**
`main` のマージコミットが必ず残る。**上の 2 つで見ること**(完了条件を参照)。

## 7. リリースブランチを片づける

```bash
git branch -d release/0.2.0                        # -D は使わない
```

`-d` が拒否されたら **`main` と `develop` の両方へ入っていない**ということである。
**消さずに 5 と 6 をやり直す。**

## 8. プッシュ(ユーザーの指示があるときだけ)

⚠️ **ここで一度止まる。** 出すと全世界から見えるので、必ず確認を取る。

```bash
git push origin main develop --follow-tags
```

⚠️ **SSH の鍵がセッションから使えないことがある**([作業の引き継ぎ](../../../docs/guides/handover.md))。

```bash
git -c credential.helper='!gh auth git-credential' \
  push https://github.com/lost-chapter/sudoku-web.git main develop --follow-tags
```

**`main` への push で [Pages の workflow](../../../.github/workflows/pages.yml) が走る。**

```bash
gh run watch --repo lost-chapter/sudoku-web
```

## 9. 出たことを確かめる

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://lost-chapter.github.io/sudoku-web/
```

**ブラウザで開いて 1 問遊ぶ。** ⚠️ **反映まで数十秒かかる。**
変わらないときは私用ウィンドウで見る(キャッシュ)。

## 10. 文書を実態へ合わせる

- [実装の進め方と現在地](../../../docs/guides/implementation-roadmap.md) の現在地
- [進捗の一枚絵](../../../docs/assets/progress.html)

## よくある落とし穴

| 落とし穴 | どうなるか |
|---------|-----------|
| 🔴 **`develop` へ戻し忘れる** | 版を上げたコミットが `develop` に無く、次のリリースで必ず競合する |
| 🔴 **`develop..main` が空でないのを異常だと読む** | **`main` のマージコミットは必ず残る。**空になることはない。`git diff` と `--no-merges` で見る |
| 🔴 **`pnpm preview` で確かめて満足する** | あれはルートで配るので**サブパスの 404 が見つからない**。`preview:subpath` を使う |
| **版を片方だけ上げる** | `package.json` とリリースノートのファイル名が食い違う。3 の検査で止める |
| **リリースブランチで機能を足す** | 固める場所である。足したくなったら `develop` へ入れて次の版に回す |
| **`main` から `develop` へマージする** | 過去のリリースまで巻き込む。`release/` からマージする |
| **タグを打ち忘れる** | 次のリリースで「前の版から何が入ったか」が出せなくなる |
| **`git branch -D` で消す** | 寄せ漏れに気づけなくなる。`-d` が拒否されたら寄せ漏れである |
| **指示なくプッシュする** | 出すと全世界から見える。8 で必ず止まる |

## 関連ドキュメント

- [配信(GitHub Pages)](../../../docs/guides/deployment.md) — 出す仕掛けとサブパスの罠
- [リリースノートの形式](../../../docs/api/release-notes-format.md) — 版と配信物の契約
- [`docs-release-notes` スキル](../docs-release-notes/SKILL.md) — リリースノートの書き方
- [ブランチ戦略](../../../docs/guides/branch-strategy.md) — `release/` の位置づけ
- [`ops-branch-merge` スキル](../ops-branch-merge/SKILL.md) — 作業ブランチの統合(こちらは日常の統合用)
