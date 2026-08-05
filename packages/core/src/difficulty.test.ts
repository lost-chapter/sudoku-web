import { describe, expect, it } from "vitest";

import { parseBoard } from "./board";
import { DIFFICULTIES, rateDifficulty } from "./difficulty";
import { generatePuzzle } from "./generate";
import { createRandom } from "./random";
import {
  CLAIMING_PUZZLE,
  CLASSIC_PUZZLE,
  CLASSIC_SOLUTION,
  POINTING_PUZZLE,
  QUAD_PUZZLE,
  SINGLES_ONLY_PUZZLE,
  TRIPLE_PUZZLE,
  XY_WING_PUZZLE,
  X_CHAIN_PUZZLE,
} from "./test-puzzles";

describe("難易度の評価", () => {
  it("Single だけで解ける問題は easy", () => {
    for (const puzzle of [CLASSIC_PUZZLE, SINGLES_ONLY_PUZZLE]) {
      const rating = rateDifficulty(parseBoard(puzzle));
      expect(rating.difficulty).toBe("easy");
      expect(rating.hardestLevel).toBe(1);
    }
  });

  it("Pair が要る問題は hard", () => {
    const rating = rateDifficulty(parseBoard(POINTING_PUZZLE));
    expect(rating.difficulty).toBe("hard");
    expect(rating.hardestLevel).toBe(3);
  });

  it("チェーンが要る問題は extreme", () => {
    for (const puzzle of [XY_WING_PUZZLE, X_CHAIN_PUZZLE]) {
      const rating = rateDifficulty(parseBoard(puzzle));
      expect(rating.difficulty).toBe("extreme");
      expect(rating.hardestLevel).toBe(7);
    }
  });

  it("実装済みの手筋で解けない問題は難易度を付けない", () => {
    // ⚠️「解けなかったから最難関」と分類してはいけない。
    // それは「難しい」ではなく「評価できていない」である。
    for (const puzzle of [CLAIMING_PUZZLE, TRIPLE_PUZZLE, QUAD_PUZZLE]) {
      const rating = rateDifficulty(parseBoard(puzzle));
      expect(rating.difficulty).toBeNull();
      expect(rating.hardestLevel).toBe(0);
    }
  });

  it("同じ問題を 2 回評価すると同じ結果になる(性質 4)", () => {
    for (const puzzle of [CLASSIC_PUZZLE, POINTING_PUZZLE, TRIPLE_PUZZLE]) {
      const first = rateDifficulty(parseBoard(puzzle));
      const second = rateDifficulty(parseBoard(puzzle));
      expect(first.difficulty).toBe(second.difficulty);
      expect(first.hardestLevel).toBe(second.hardestLevel);
      expect(first.score).toBe(second.score);
      expect(first.steps).toStrictEqual(second.steps);
    }
  });

  it("生成した問題の評価も安定している(性質 4)", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const { puzzle } = generatePuzzle(createRandom(`rate-${String(seed)}`));
      expect(rateDifficulty(puzzle).difficulty).toBe(rateDifficulty(puzzle).difficulty);
      expect(rateDifficulty(puzzle).score).toBe(rateDifficulty(puzzle).score);
    }
  });

  it("スコアは手筋を使うほど増える", () => {
    const easy = rateDifficulty(parseBoard(CLASSIC_PUZZLE));
    expect(easy.score).toBeGreaterThan(0);
    expect(easy.score).toBe(easy.steps.length); // Naked Single だけなので 1 手 1 点
  });

  it("完成盤は手筋を使わずに解けたものとして扱う", () => {
    const rating = rateDifficulty(parseBoard(CLASSIC_SOLUTION));
    expect(rating.difficulty).toBe("easy");
    expect(rating.score).toBe(0);
    expect(rating.steps).toHaveLength(0);
  });

  it("難易度クラスはやさしい順に並んでいる", () => {
    expect(DIFFICULTIES).toStrictEqual(["easy", "normal", "hard", "expert", "extreme"]);
  });

  it("難易度が付いた問題は手筋だけで最後まで解けている", () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const { puzzle, solution } = generatePuzzle(createRandom(`solved-${String(seed)}`));
      const rating = rateDifficulty(puzzle);
      if (rating.difficulty === null) continue;
      // 手筋で確定させた数字はすべて解と一致する。
      for (const step of rating.steps) {
        if (step.placement === null) continue;
        expect(solution[step.placement.index]).toBe(step.placement.digit);
      }
    }
  });
});
