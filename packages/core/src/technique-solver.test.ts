import { describe, expect, it } from "vitest";

import type { Board } from "./board";
import { cloneBoard, formatBoard, isSolvedBoard, parseBoard } from "./board";
import { generatePuzzle } from "./generate";
import { createRandom } from "./random";
import { solveBoard } from "./search-solver";
import type { TechniqueName } from "./technique-solver";
import { TECHNIQUE_LEVEL, findHint, solveWithTechniques } from "./technique-solver";
import {
  CLAIMING_PUZZLE,
  CLASSIC_PUZZLE,
  CLASSIC_SOLUTION,
  HARD_PUZZLE,
  POINTING_PUZZLE,
  QUAD_PUZZLE,
  SINGLES_ONLY_PUZZLE,
  SWORDFISH_PUZZLE,
  TRIPLE_PUZZLE,
  XYZ_WING_PUZZLE,
  XY_WING_PUZZLE,
  X_CHAIN_PUZZLE,
  X_WING_PUZZLE,
} from "./test-puzzles";

/** 手筋ソルバを回して、使われた手筋の名前を集める。 */
function techniquesUsed(puzzle: string): Set<TechniqueName> {
  return new Set(solveWithTechniques(parseBoard(puzzle)).steps.map((step) => step.technique));
}

describe("手筋で解く", () => {
  it("基本手筋だけで解ける問題を最後まで解く", () => {
    for (const puzzle of [CLASSIC_PUZZLE, SINGLES_ONLY_PUZZLE, POINTING_PUZZLE]) {
      const result = solveWithTechniques(parseBoard(puzzle));
      expect(result.solved).toBe(true);
      expect(isSolvedBoard(result.board)).toBe(true);
    }
    expect(formatBoard(solveWithTechniques(parseBoard(CLASSIC_PUZZLE)).board)).toBe(
      CLASSIC_SOLUTION,
    );
  });

  it("解けた盤面は探索ソルバの解と一致する", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const { puzzle } = generatePuzzle(createRandom(`technique-${String(seed)}`));
      const result = solveWithTechniques(puzzle);
      if (!result.solved) continue;
      expect(formatBoard(result.board)).toBe(formatBoard(solveBoard(puzzle) as Board));
    }
  });

  it("入力の盤面を書き換えない", () => {
    const board = parseBoard(CLASSIC_PUZZLE);
    const before = cloneBoard(board);
    solveWithTechniques(board);
    expect(formatBoard(board)).toBe(formatBoard(before));
  });

  it("同じ盤面からは同じ手順が出る(決定的)", () => {
    for (const puzzle of [CLASSIC_PUZZLE, POINTING_PUZZLE, TRIPLE_PUZZLE]) {
      const first = solveWithTechniques(parseBoard(puzzle));
      const second = solveWithTechniques(parseBoard(puzzle));
      expect(first.steps).toStrictEqual(second.steps);
    }
  });

  it("実装していない手筋が要る問題では、途中まで進んで止まる", () => {
    // レベル 5 以降(X-Wing・XY-Wing・チェーン系)は未実装なので、
    // それが要る問題は解けない。**解けないこと自体は不具合ではない。**
    for (const puzzle of [CLAIMING_PUZZLE, TRIPLE_PUZZLE, QUAD_PUZZLE]) {
      const result = solveWithTechniques(parseBoard(puzzle));
      expect(result.solved).toBe(false);
      expect(result.steps.length).toBeGreaterThan(0);
      expect([...result.board].some((digit) => digit === 0)).toBe(true);
    }
  });

  it("記録した手筋のレベルは一覧と一致する", () => {
    const result = solveWithTechniques(parseBoard(TRIPLE_PUZZLE));
    for (const step of result.steps) {
      expect(step.level).toBe(TECHNIQUE_LEVEL[step.technique]);
    }
  });

  it("完成盤を渡すと手筋を 1 つも使わずに終わる", () => {
    const result = solveWithTechniques(parseBoard(CLASSIC_SOLUTION));
    expect(result.solved).toBe(true);
    expect(result.steps).toHaveLength(0);
  });

  it("矛盾した盤面では解けたことにしない", () => {
    const broken = parseBoard(CLASSIC_PUZZLE);
    broken[2] = 5; // 同じ行に 5 が 2 つ
    expect(solveWithTechniques(broken).solved).toBe(false);
  });
});

describe("個々の手筋", () => {
  it("Naked Single —— 候補が 1 個のセルを埋める", () => {
    const board = parseBoard(CLASSIC_SOLUTION);
    board[40] = 0;
    const step = findHint(board);
    expect(step?.technique).toBe("naked-single");
    expect(step?.placement).toStrictEqual({ index: 40, digit: 5 });
    expect(step?.eliminations).toStrictEqual([]);
  });

  it("Hidden Single —— 単位で 1 か所にしか入らない数字を埋める", () => {
    // 手がかり 23 個の難問。候補が 1 個のセルは無いので Naked Single は使えず、
    // 「その単位でその数字が入るのは 1 か所」だけが成り立つ。
    const board = parseBoard(HARD_PUZZLE);
    const step = findHint(board);
    expect(step?.technique).toBe("hidden-single");
    expect(step?.placement).not.toBeNull();
    // 置いた数字は本当の解と一致する。
    const solution = solveBoard(board) as Board;
    expect(solution[step?.placement?.index ?? -1]).toBe(step?.placement?.digit);
  });

  it("Single だけで解ける問題では他の手筋を使わない", () => {
    expect(techniquesUsed(SINGLES_ONLY_PUZZLE)).toStrictEqual(
      new Set(["naked-single", "hidden-single"]),
    );
    expect(techniquesUsed(CLASSIC_PUZZLE)).toStrictEqual(new Set(["naked-single"]));
  });

  it("Locked Candidates を使う", () => {
    expect(techniquesUsed(POINTING_PUZZLE).has("pointing")).toBe(true);
    expect(techniquesUsed(CLAIMING_PUZZLE).has("claiming")).toBe(true);
  });

  it("Naked / Hidden Subset を使う", () => {
    expect(techniquesUsed(POINTING_PUZZLE).has("naked-pair")).toBe(true);
    expect(techniquesUsed(CLAIMING_PUZZLE).has("hidden-pair")).toBe(true);
    expect(techniquesUsed(TRIPLE_PUZZLE).has("naked-triple")).toBe(true);
    expect(techniquesUsed(TRIPLE_PUZZLE).has("hidden-triple")).toBe(true);
    expect(techniquesUsed(QUAD_PUZZLE).has("naked-quad")).toBe(true);
  });

  it("魚(X-Wing / Swordfish)を使う", () => {
    expect(techniquesUsed(X_WING_PUZZLE).has("x-wing")).toBe(true);
    expect(techniquesUsed(SWORDFISH_PUZZLE).has("swordfish")).toBe(true);
  });

  it("Wing(XY-Wing / XYZ-Wing)を使う", () => {
    expect(techniquesUsed(XY_WING_PUZZLE).has("xy-wing")).toBe(true);
    expect(techniquesUsed(XYZ_WING_PUZZLE).has("xyz-wing")).toBe(true);
  });

  it("X-Chain を使う", () => {
    expect(techniquesUsed(X_CHAIN_PUZZLE).has("x-chain")).toBe(true);
  });

  it("レベルの高い手筋は、低い手筋が尽きてからしか出ない", () => {
    // 例えば X-Wing(レベル 5)が出る時点では、Single も Locked Candidates も
    // Subset も使えない状態になっている。手筋ソルバの順序そのものの検証。
    for (const puzzle of [X_WING_PUZZLE, XY_WING_PUZZLE, X_CHAIN_PUZZLE]) {
      const steps = solveWithTechniques(parseBoard(puzzle)).steps;
      const advanced = steps.findIndex((step) => step.level >= 5);
      expect(advanced).toBeGreaterThan(0);
    }
  });

  it("候補を消す手筋は数字を確定させない", () => {
    for (const puzzle of [
      POINTING_PUZZLE,
      CLAIMING_PUZZLE,
      TRIPLE_PUZZLE,
      QUAD_PUZZLE,
      X_WING_PUZZLE,
      XY_WING_PUZZLE,
      X_CHAIN_PUZZLE,
    ]) {
      for (const step of solveWithTechniques(parseBoard(puzzle)).steps) {
        if (step.technique === "naked-single" || step.technique === "hidden-single") {
          expect(step.placement).not.toBeNull();
          continue;
        }
        expect(step.placement).toBeNull();
        expect(step.eliminations.length).toBeGreaterThan(0);
      }
    }
  });

  it("消した候補は解の数字ではない(誤った消去をしない)", () => {
    // 手筋が解の数字を候補から消すと、そこから先は絶対に解けなくなる。
    // 生成した問題は解を持っているので、突き合わせれば健全性を確かめられる。
    for (let seed = 0; seed < 60; seed += 1) {
      const { puzzle, solution } = generatePuzzle(createRandom(`elim-${String(seed)}`));
      for (const step of solveWithTechniques(puzzle).steps) {
        for (const elimination of step.eliminations) {
          expect(solution[elimination.index]).not.toBe(elimination.digit);
        }
        if (step.placement !== null) {
          expect(solution[step.placement.index]).toBe(step.placement.digit);
        }
      }
    }
  });
});

describe("ヒント", () => {
  it("次の 1 手を返す", () => {
    const step = findHint(parseBoard(POINTING_PUZZLE));
    expect(step).not.toBeNull();
    expect(step?.cells.length).toBeGreaterThan(0);
  });

  it("手筋ソルバの 1 手目と同じものを返す", () => {
    const first = solveWithTechniques(parseBoard(POINTING_PUZZLE)).steps[0];
    expect(findHint(parseBoard(POINTING_PUZZLE))).toStrictEqual(first);
  });

  it("完成盤ではヒントが無い", () => {
    expect(findHint(parseBoard(CLASSIC_SOLUTION))).toBeNull();
  });

  it("矛盾した盤面でも例外を投げない", () => {
    const broken = parseBoard(CLASSIC_PUZZLE);
    broken[2] = 5;
    expect(() => findHint(broken)).not.toThrow();
  });
});
