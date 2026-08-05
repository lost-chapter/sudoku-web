/**
 * 難易度の評価(docs/algorithms/difficulty-rating.md)。
 *
 * **難易度は「解くのに必要な手筋の難しさ」で決める。**
 *
 *   手筋ソルバで解く ──▶ steps
 *                        ↓
 *          最難の手筋のレベル ──▶ 難易度クラス
 *          steps の合計スコア ──▶ 同クラス内での並び
 *
 * 🎯 **手がかり数で難易度を決めてはいけない。**
 * 人間の解答時間との相関は 0.25〜0.27 しかない(手筋のレーティングは 0.70〜0.86)。
 *
 * **評価は決定的である。** 手筋ソルバが決定的なので、同じ問題を 2 回評価すれば
 * 必ず同じクラスになる(docs/verification/testing-policy.md の性質 4)。
 */

import type { Board } from "./board";
import type { TechniqueStep } from "./technique-solver";
import { TECHNIQUE_SCORE, solveWithTechniques } from "./technique-solver";

/**
 * 難易度クラス。**ファイル上の値は英語で固定する**
 * (docs/api/puzzle-file-format.md)。表示名は UI 側で対応付ける。
 */
export type Difficulty = "easy" | "normal" | "hard" | "expert" | "extreme";

/** 難易度クラスの一覧(やさしい順)。 */
export const DIFFICULTIES: readonly Difficulty[] = ["easy", "normal", "hard", "expert", "extreme"];

/**
 * 「解くのに要る最難レベル」→ 難易度クラス。
 *
 * ⚠️ **しきい値は暫定である。** 実際の分布を見ないと偏りが分からない
 * (docs/guides/implementation-roadmap.md の「未解決の課題」の 2)。
 */
const DIFFICULTY_OF_LEVEL: Record<number, Difficulty> = {
  1: "easy",
  2: "normal",
  3: "hard",
  4: "hard",
  5: "expert",
  6: "expert",
  7: "extreme",
};

/** 難易度の評価結果。 */
export type DifficultyRating = {
  /**
   * 難易度クラス。**実装済みの手筋で解けなかったら `null`。**
   *
   * ⚠️ **「解けなかったから最難関」と分類してはいけない。**
   * それは「難しい」ではなく「評価できていない」である。`null` の問題は収録しない。
   */
  readonly difficulty: Difficulty | null;
  /** 解くのに要った最難の手筋のレベル。解けなかったら 0。 */
  readonly hardestLevel: number;
  /** 適用した手筋のスコアの合計。同じクラスの中で並べるのに使う。 */
  readonly score: number;
  /** 適用した手筋の列(解けなかった場合は途中まで)。 */
  readonly steps: readonly TechniqueStep[];
};

/**
 * 問題の難易度を評価する。
 *
 * **クラスは最難手筋で決め、合計スコアはクラス内の順序付けにだけ使う**
 * (Sudoku Explainer 方式と HoDoKu 方式の折衷)。
 */
export function rateDifficulty(puzzle: Board): DifficultyRating {
  const result = solveWithTechniques(puzzle);

  let hardestLevel = 0;
  let score = 0;
  for (const step of result.steps) {
    if (step.level > hardestLevel) hardestLevel = step.level;
    score += TECHNIQUE_SCORE[step.technique];
  }

  if (!result.solved) {
    return { difficulty: null, hardestLevel: 0, score, steps: result.steps };
  }

  // 手筋を 1 つも使わずに解けた(= 最初から埋まっていた)場合もいちばんやさしい。
  const difficulty = DIFFICULTY_OF_LEVEL[hardestLevel] ?? "easy";
  return { difficulty, hardestLevel, score, steps: result.steps };
}
