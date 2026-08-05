import type { Board } from "@sudoku/core";

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
 * 盤面は `core` の {@link Board}(長さ 81・0 は空きマス)で持つ。
 * ファイル上の `.` と `0` はどちらも 0 になる。
 *
 * ⚠️ **中身を書き換えない。** `Board` は `Uint8Array` なので `readonly` では
 * 要素の代入を止められない(`core` も同じ規約で守っている)。
 */
export interface Puzzle {
  /** 手がかり。0 は空きマス。 */
  readonly givens: Board;
  /** 解。すべて 1〜9。 */
  readonly solution: Board;
  readonly difficulty: Difficulty;
  /** 同クラス内の並べ替えに使う整数。 */
  readonly score: number;
}
