/**
 * 和文で `**強調**` が効かない問題を直す。
 *
 * CommonMark は、区切り(`**`)が「開き」になれるか「閉じ」になれるかを
 * **前後の文字の種類**で決める(flanking 規則)。この規則は
 * **約物(句読点)を欧文の前提で扱う**ため、和文では次が強調にならない。
 *
 *     **完了(2026-08-05)。**5 クラスすべてを収録できるようになった。
 *                        ~~ 閉じの直前が「。」、直後が「5」
 *
 * 閉じになるには「直前が空白でない」かつ「直前が約物でない、または直後が
 * 空白か約物」が要る。「。」は約物で、直後の「5」は空白でも約物でもないため
 * **閉じになれず、`**` が本文にそのまま出る。**
 *
 * ⚠️ **これは markdown-it 固有の癖ではない。** GitHub(cmark-gfm)でも同じに壊れる。
 * 書き方の側の対処は [ドキュメント管理規則](../../docs/guides/documentation-guidelines.md)
 * の「和文で強調を閉じるとき」にある。
 *
 * ここでは **CommonMark へ提案されている CJK 向けの緩和**と同じ考え方で、
 * **全角文字に隣接する区切りは開きにも閉じにもなれる**ことにする。
 *
 * - 直前が全角文字 → 閉じになれる
 * - 直後が全角文字 → 開きになれる
 *
 * 既存の `markdown-it-cjk-friendly` は使えない。markdown-it 15 が
 * `lib/common/utils.mjs` の公開をやめており、v2・v3rc とも読み込みに失敗する。
 *
 * ⚠️ **`md.inline.State` の prototype を書き換えないこと。** prototype は
 * 同じプロセスの全 markdown-it で共有されるため、書き換えると
 * 「副作用は出力先だけ」の契約が壊れる。**渡された md だけを差し替える。**
 */

/**
 * 全角文字(和文の文字と約物)か。
 *
 * ⚠️ **全角空白(U+3000)は含めない。** 空白は空白として扱わないと、
 * 全角空白のあとで閉じる書き方(`**強調` + 全角空白 + `**`)まで強調にしてしまう。
 */
function isFullWidth(code) {
  if (code === undefined || code === 0x3000) return false;

  return (
    (code >= 0x1100 && code <= 0x11ff) || // ハングル字母
    (code >= 0x2e80 && code <= 0x303f) || // 部首・和文の約物(、。「」など)
    (code >= 0x3040 && code <= 0x30ff) || // ひらがな・カタカナ
    (code >= 0x3400 && code <= 0x4dbf) || // 漢字(拡張 A)
    (code >= 0x4e00 && code <= 0x9fff) || // 漢字
    (code >= 0xf900 && code <= 0xfaff) || // 互換漢字
    (code >= 0xff00 && code <= 0xff60) || // 全角の英数と約物
    (code >= 0xffe0 && code <= 0xffe6) // 全角の記号
  );
}

/**
 * 渡された markdown-it だけに、全角文字に隣接する区切りの緩和を入れる。
 *
 * @param md {import("markdown-it").default}
 */
export function applyCjkEmphasis(md) {
  const Base = md.inline.State;

  // prototype ではなくインスタンスの持ち物として差し替える。
  // markdown-it は `new this.State(...)` で組み立てるのでこれで効く。
  md.inline.State = class CjkFriendlyState extends Base {
    scanDelims(start, canSplitWord) {
      const result = super.scanDelims(start, canSplitWord);
      const before = start > 0 ? this.src.codePointAt(start - 1) : undefined;
      const after =
        start + result.length < this.posMax
          ? this.src.codePointAt(start + result.length)
          : undefined;

      if (isFullWidth(before)) result.can_close = true;
      if (isFullWidth(after)) result.can_open = true;

      return result;
    }
  };
}
