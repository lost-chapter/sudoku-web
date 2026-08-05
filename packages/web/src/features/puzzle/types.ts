/**
 * 問題(1 問)の表現。
 *
 * 形式は docs/api/puzzle-file-format.md の契約に従う。
 * **これは generator と web の契約なので、web の都合で変えてはいけない。**
 */

/** 難易度クラス。docs/algorithms/difficulty-rating.md の 5 段階。 */
export const DIFFICULTIES = ["easy", "normal", "hard", "expert", "extreme"] as const;

export type Difficulty = (typeof DIFFICULTIES)[number];

/**
 * 1 問。
 *
 * 盤面は 81 要素の配列で持ち、**空きマスは 0** とする
 * (ファイル上の `.` / `0` はどちらも 0 として読む)。
 */
export interface Puzzle {
  /** 手がかり。81 要素。0 は空きマス。 */
  readonly givens: readonly number[];
  /** 解。81 要素。すべて 1〜9。 */
  readonly solution: readonly number[];
  readonly difficulty: Difficulty;
  /** 同クラス内の並べ替えに使う整数。 */
  readonly score: number;
}
