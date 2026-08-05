/**
 * パック 1 個ぶんの問題を作る(docs/algorithms/board-generation.md)。
 *
 * **難易度は穴あけの後にしか分からない**ので、流れはこうなる。
 *
 *     生成 → 評価 → 目標クラスなら採用、外れたら捨てる
 *
 * **捨てる前提で数を回す。** クラスごとの採用率は
 * docs/reports/2026-08-05-difficulty-distribution.md にある
 * (やさしい 40.3% / ふつう 11.4% / むずかしい 6.8%)。
 *
 * ## 並列でも結果が変わらない作り
 *
 * **試行に通し番号を振り、番号からシードを決める。**
 *
 *     試行 i のシード = `<パックのシード>#<i>`
 *
 * こうすると、**どのワーカーがどの試行を担当しても結果は同じ**になる。
 * 採用した問題は**試行番号の昇順**に並べ、先頭から必要数だけ取る。
 * **到着順に詰めてはいけない**(並列度を変えると中身が変わってしまう)。
 */

import { createRandom, generatePuzzle, rateDifficulty } from "@sudoku/core";
import type { Difficulty, Puzzle } from "@sudoku/core";

/** 1 回の試行の結果。目標クラスに合わなければ採用しない。 */
export type Attempt = {
  /** 試行の通し番号。並べ替えに使う。 */
  readonly index: number;
  readonly puzzle: Puzzle;
};

/** 試行 1 回ぶんのシード。 */
export function attemptSeed(seed: string, index: number): string {
  return `${seed}#${String(index)}`;
}

/**
 * 試行を 1 回行う。目標クラスでなければ `null`。
 *
 * `targetDifficulty` を省くと、難易度が付いたものをすべて採用する。
 */
export function runAttempt(
  seed: string,
  index: number,
  targetDifficulty?: Difficulty,
): Attempt | null {
  const random = createRandom(attemptSeed(seed, index));
  const { puzzle, solution } = generatePuzzle(random);
  const rating = rateDifficulty(puzzle);

  // ⚠️ 難易度が付かなかった問題は捨てる。
  // 「解けなかったから最難関」は「難しい」ではなく「評価できていない」である。
  if (rating.difficulty === null) return null;
  if (targetDifficulty !== undefined && rating.difficulty !== targetDifficulty) return null;

  return {
    index,
    puzzle: {
      givens: puzzle,
      solution,
      difficulty: rating.difficulty,
      score: rating.score,
    },
  };
}

/** 試行番号 `from` から `count` 回ぶんを走らせる(ワーカーが呼ぶ単位)。 */
export function runAttemptRange(
  seed: string,
  from: number,
  count: number,
  targetDifficulty?: Difficulty,
): Attempt[] {
  const accepted: Attempt[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const attempt = runAttempt(seed, from + offset, targetDifficulty);
    if (attempt !== null) accepted.push(attempt);
  }
  return accepted;
}

/** 採用した問題を試行番号の昇順にして、先頭から `count` 問だけ取る。 */
export function takeInAttemptOrder(attempts: readonly Attempt[], count: number): Puzzle[] {
  return [...attempts]
    .sort((a, b) => a.index - b.index)
    .slice(0, count)
    .map((attempt) => attempt.puzzle);
}
