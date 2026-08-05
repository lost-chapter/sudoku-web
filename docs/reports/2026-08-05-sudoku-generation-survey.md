# 数独の生成・難易度評価・ファイル形式の調査

- **目的**: 問題を大量生成して外部ファイル化する設計の根拠を集める
- **実施日**: 2026-08-05
- **対象**: 完成盤の生成 / 穴あけと一意解 / 難易度評価 / ファイル形式 / 性能
- **方法**: 公開ドキュメント・論文・実装リポジトリの調査

**設計は [盤面の生成](../algorithms/board-generation.md) /
[解法(ソルバ)](../algorithms/solver.md) /
[難易度の評価](../algorithms/difficulty-rating.md) /
[問題ファイルの形式](../api/puzzle-file-format.md) にある。この文書は根拠の記録である。**

## 1. 完成盤の生成

### 同型変換で量産してはいけない

数独の妥当性を保つ変換は次の 4 種類で、**合成すると 1 つの完成盤から
2 × 9! × 6⁸ = 1,218,998,108,160 個の同型盤ができる**。

| 変換 | 組合せ数 |
|------|---------|
| 数字の置換(リラベル) | 9! = 362,880 |
| バンド内の行入替 / スタック内の列入替 | 6⁶ |
| バンド同士の入替 / スタック同士の入替 | 6 × 6 |
| 転置 | 2 |

⚠️ **90°/180°/270° の回転と鏡映は独立の因子ではない**(転置とバンド/スタック入替の合成として
既に含まれる)。**別枠で掛けてはいけない。**

⚠️ **同型盤は「見た目が違うだけの同じパズル」である。**
論理構造が同じなので**難易度も完全に同一**になる。
完成盤の総数 6,670,903,752,021,072,936,960 に対し、
**本質的に異なる完成盤は 5,472,730,538** で、同型類あたり約 12 億個の見かけ違いがある。

**⇒ 完成盤は毎回バックトラッキングで作る。同型変換は「同じ問題を見た目だけ変えて再出題する」用途に限る。**

### 生成手法

- ランダム化バックトラッキング(定石)
- **候補数が最小の空きマスを優先**する最適化。加えて
  「上段バンドと第 1 列はバックトラッキング無しで先に埋められる」ため、
  **探索対象が 81 マスから 48 マスへ減る**(Daniel Beer)

## 2. 穴あけと一意解の保証

### 「解 2 個で打ち切る」は確立された定石

複数の独立した出典が同じ手法を挙げている。

- 解が 1 つ見つかった後も探索を続け、**探索木を尽くすか 2 つ目の解が見つかった時点で終了**する。
  これで「解なし」「一意」「複数解」の 3 状態を区別できる(Daniel Beer)
- 「2 つの解が見つかった時点でアルゴリズムを停止できる」(Li / Zhang)

### 最小手がかり数

- **17 が最小。** 「16 手がかりの数独は存在しない」を網羅探索で証明
  (McGuire, Tugemann, Civario / University College Dublin, 2012-01)。
  計算量は **700 万コア時間超**
- 既知の 17 手がかり問題は **49,158 件**(Gordon Royle のリスト、2021-07-03 時点)
- 現在発見されている**最大の minimal パズルは 40 手がかり**

⚠️ **一様ランダムに minimal パズルを取ると 24〜25 手がかり付近が圧倒的多数を占め、
17 手がかり級は極端に稀**(Berthier の推定: minimal パズル総数は約 3.1 × 10³⁷)。
**「難しい問題が欲しいなら手がかりを減らす」という発想は成り立たない。**

## 3. 難易度の評価

### 🎯 手がかり数は難易度の指標にならない

Pelánek の評価(1,700 問超・数百人のデータ、arXiv:1403.7373)による
**人間の解答時間との相関係数**。

| 指標 | Fed-Sudoku | Sudoku.org.uk |
|------|-----------|---------------|
| **手がかり数** | **0.25** | **0.27** |
| Fixedness | 0.56 | 0.61 |
| Dependency | 0.67 | 0.69 |
| Serate(Sudoku Explainer) | 0.70 | 0.86 |
| Serate LM | 0.78 | 0.86 |
| **Combined SFRD** | **0.84** | **0.95** |

**手がかり数はほぼ役に立たない。** 難易度の源は
「個々のステップの複雑さ」と「ステップ間の依存構造」の 2 つ。

### 既存の 2 方式

**Sudoku Explainer(SE)** —— **最も難しい手筋のレーティングがパズルのレーティング**になる。
スケールは 1.0〜12.7。

| Rating | 手筋(抜粋) |
|--------|-----------|
| 1.0〜1.5 | Last value / Hidden Single |
| 2.3 | Naked Single |
| 2.6 / 2.8 | Pointing / Claiming |
| 3.0〜3.4 | Naked Pair / X-Wing / Hidden Pair |
| 3.6〜4.0 | Naked Triplet / Swordfish / Hidden Triplet |
| 4.2 / 4.4 | XY-Wing / XYZ-Wing |
| 5.0〜5.4 | Naked Quad / Jellyfish / Hidden Quad |
| 6.5〜7.0 | X-chains / Y-cycles |
| 7.1〜7.5 | Forcing Chains |
| 8.8〜12.7 | Dynamic Forcing Chains 系 |

**HoDoKu** —— 各手筋に「レベル」と「スコア」を持たせ、
**全ステップのスコアを合計**する。クラスは Easy / Medium / Hard / Unfair / Extreme の 5 段階。
**パズルのレベルは最難ステップのレベルを下回らない**。
Medium はおおむね 600〜1200 点。

**SudokuWiki** —— 候補密度で重み付けし、`Log5(score) × 2` で 1〜10 に正規化。
クラスは Kids < 3 / Gentle 3〜4 / Moderate 4〜5 / Tough 5〜7 / Diabolical 7〜9 / Extreme 9+。

⚠️ **未検証が 2 点ある。**
① 候補密度の係数 `F = C / 727 × 20` の **727 は 729 の誤りの可能性**がある
(空盤の候補数は 9×81 = 729)。採用前に原典を確認すること。
② 旧方式の生スコア区切り(Kids ≤ 40 など)は**出典ページで該当箇所を確認できなかった**。

⚠️ SE のクラス区切り(Easy 1.0〜1.2 / Medium 1.5 / Hard 1.7〜2.5 /
Fiendish 2.6〜6.0 / Diabolical 6.2 以上)は**フォーラム由来**で、公式ドキュメントでは未確認。

### 探索ベースの代替指標

Daniel Beer の branch-difficulty score: **S = B × 100 + E**
(B は各分岐ノードの (分岐数 − 1)² の総和、E は空きマス数)。
バックトラック不要なら 100 未満、**300 超で難問**。

## 4. ファイル形式

### 81 文字 1 行が事実上の標準

Sudopedia の規定: 81 文字のうち数字でない文字が空きマスと解釈される。
**複数の候補文字があるときの優先順位は `0` > `.` > `X` > `*` > `_` > 半角空白**。

| 形式 | 空きマス | 構造 |
|------|---------|------|
| `.sdm` | **`0` が基準**(ドットも受理) | 1 行 1 問 |
| `.sdk` | `.` | 9 行 × 9 文字 + `#` メタデータ行(A=著者, L=難易度, N=解の数, H=手がかり数 など) |
| `.ss` | `.` | 罫線付き |
| QQwing | — | one-line / compact / readable / CSV を出し分け |

### 大規模データセットの規模感

| データセット | 規模 |
|-------------|------|
| Kaggle 1 million Sudoku games | 100 万 |
| Kaggle 4 Million Sudoku Puzzles | 400 万(手がかり数ごとに 62,500 問) |
| Kaggle 9 Million Sudoku Puzzles | 900 万(空きマスは `0`) |
| tdoku ベンチマーク | 難易度別に**ファイル分割**(17-clue 49,158 / hardest 1,106 ほか) |

Denis Berthier のリポジトリは「GitHub に対して大きすぎるため分割」と明記している。

⚠️ **Web 配信の実務(分割サイズ・圧縮率・遅延読み込み)の公開事例は見つからなかった。**
確実なのは「1 問 = 81 バイト + 改行 1 バイト」だけ。**ここは自前で実測する。**

⚠️ 既存の Web 実装(luketurner/sudoku、MrTheDerpier/Sudoku)は
**むしろ実行時生成を選んでいる**(オフライン対応が理由)。
本プロジェクトは要件で外部ファイル化が指定されているため方針が異なる。

## 5. 性能

| 出典 | 数値 |
|------|------|
| QQwing(標準版) | **1,000 問の生成に 25 秒**(= 40 問/秒)、1,000 問の解答に 1 秒 |
| QQwing(Java 版) | **毎秒 1,000 問の生成** |
| QQwing(JavaScript 版) | 「Java や C++ 版に比べて非常に遅い」(具体値なし) |
| Daniel Beer | 1 問あたり平均 **596 ms**(1.66 GHz Atom N450・200 反復の局所探索) |
| tdoku(ソルバ) | 17-clue **2.7 μs/問**、hardest 1106 でも **77.5 μs/問** |

⚠️ **JavaScript 版が「非常に遅い」と明記されている点は本プロジェクトに直接効く**
(生成器は TypeScript で書く)。**工程 2 で必ず自前で実測する。**

⚠️ 「一意解を保つ穴あけ + 手筋ベースの難易度評価」を合わせた
**1 問あたりの公開ベンチマークは見つからなかった**。

## 考察

1. **完成盤は同型変換で量産しない。** 難易度が同一になるので水増しにしかならない
2. **一意解の判定はボトルネックではない**(ソルバは μs 単位)。
   重いのは**穴あけの反復**と**手筋ベースの難易度評価**
3. **難易度は手がかり数で決めない。** SE 方式か HoDoKu 方式を採る
4. **ファイル形式は 81 文字 1 行**。難易度別の分割は既存の慣行にも合う
5. **配信の実務は前例が無いので実測で決める**

## 残課題

- SudokuWiki の係数 727 / 729 の確認(採用する場合)
- SE のクラス区切りの一次資料の確認
- **TypeScript での生成性能の実測**(工程 2)
- **パックの分割サイズと圧縮率の実測**(工程 2)

## 出典

- [Mathematics of Sudoku(Wikipedia)](https://en.wikipedia.org/wiki/Mathematics_of_Sudoku) /
  [Sudoku Garden: similar puzzles](https://sudokugarden.de/en/info/similar)
- [Daniel Beer: Sudoku](https://dlbeer.co.nz/articles/sudoku.html)
- [Li / Zhang: Sudoku Puzzles Generating: from Easy to Evil](https://zhangroup.aporc.org/images/files/Paper_3485.pdf)
- [McGuire ほか: There is no 16-Clue Sudoku (arXiv:1201.0749)](https://arxiv.org/pdf/1201.0749) /
  [UCD の発表](https://www.ucd.ie/news/2012/01JAN12/100111-There-is-no-16-clue-or-less-Sudoku-mathematician-proves.html)
- [Berthier: Unbiased Statistics of a CSP (arXiv:1111.4083)](https://arxiv.org/pdf/1111.4083)
- [Pelánek: Difficulty Rating of Sudoku Puzzles (arXiv:1403.7373)](https://arxiv.org/abs/1403.7373)
- [Sudoku Explainer のレーティング表](https://github.com/SudokuMonster/SukakuExplainer/wiki/Difficulty-ratings-in-Sudoku-Explainer-v1.2.1)
- [SudokuWiki: Grading Puzzles](https://www.sudokuwiki.org/Grading_Puzzles) /
  [Strategy Families](https://www.sudokuwiki.org/Strategy_Families)
- [HoDoKu: 難易度](https://hodoku.sourceforge.net/en/docs_cre.php)
- [Sudopedia: Sudoku Clipboard and File Formats](https://sudopedia.sudocue.net/index.php/Sudoku_Clipboard_and_File_Formats) /
  [SudoCue: file formats](https://www.sudocue.net/fileformats.php)
- [tdoku](https://github.com/t-dillon/tdoku) / [ベンチマーク](https://t-dillon.github.io/tdoku/) /
  [QQwing](https://qqwing.com/download.html)
- [Gordon Royle の 17-clue コレクション](https://sites.google.com/site/dobrichev/sudoku-puzzle-collections) /
  [Denis Berthier: Sudoku-classif](https://github.com/denis-berthier/Sudoku-classif)
