import { DIFFICULTIES, type Difficulty, type Manifest, type PackDescriptor } from "@sudoku/core";

/**
 * マニフェストから**どのパックを取りに行くか**を決める。
 *
 * 読み書きそのものは `core` の `puzzle-file.ts` が持つ。
 * ここにあるのは**遊技側の選び方**だけである。
 */

/** その難易度のパックだけを取り出す。**遊技者は 1 クラスしか使わない。** */
export function packsFor(manifest: Manifest, difficulty: Difficulty): readonly PackDescriptor[] {
  return manifest.packs.filter((pack) => pack.difficulty === difficulty && pack.count > 0);
}

/**
 * いま遊べる難易度。**0 件のクラスは出さない。**
 *
 * ⚠️ 実装済みの手筋によっては上のクラスが 1 問も作れない
 * (docs/algorithms/difficulty-rating.md「実装していない手筋の扱い」)。
 * **画面にクラスを固定で書くと、手筋が増えるたびに UI を直すことになる。**
 * `totals` から作れば、埋まった時点で自動的に選べるようになる。
 */
export function availableDifficulties(manifest: Manifest): readonly Difficulty[] {
  return DIFFICULTIES.filter((difficulty) => manifest.totals[difficulty] > 0);
}
