import { describe, expect, it } from "vitest";

import type { Board } from "./board";
import {
  CELL_COUNT,
  boardsEqual,
  cloneBoard,
  createEmptyBoard,
  formatBoard,
  isSolvedBoard,
  parseBoard,
} from "./board";
import { countSolutions, findSolutions, hasUniqueSolution, solveBoard } from "./search-solver";
import {
  CLASSIC_PUZZLE,
  CLASSIC_SOLUTION,
  HARD_PUZZLE,
  MINIMAL_17_PUZZLE_A,
  MINIMAL_17_PUZZLE_B,
} from "./test-puzzles";

/** 解けることを前提に解を取り出す。解けなければテストを失敗させる。 */
function solveOrFail(text: string): Board {
  const solution = solveBoard(parseBoard(text));
  if (solution === null) throw new Error(`解けなかった: ${text}`);
  return solution;
}

/** 解が手がかりをすべて保っているか。 */
function keepsClues(puzzle: Board, solution: Board): boolean {
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (puzzle[index] !== 0 && puzzle[index] !== solution[index]) return false;
  }
  return true;
}

const UNIQUE_PUZZLES = [CLASSIC_PUZZLE, HARD_PUZZLE, MINIMAL_17_PUZZLE_A, MINIMAL_17_PUZZLE_B];

describe("解を求める", () => {
  it("手がかり 30 個の問題を解く", () => {
    expect(formatBoard(solveOrFail(CLASSIC_PUZZLE))).toBe(CLASSIC_SOLUTION);
  });

  it("解は規則を満たし、手がかりを保つ", () => {
    for (const puzzle of UNIQUE_PUZZLES) {
      const solution = solveOrFail(puzzle);
      expect(isSolvedBoard(solution)).toBe(true);
      expect(keepsClues(parseBoard(puzzle), solution)).toBe(true);
    }
  });

  it("空の盤面も解ける", () => {
    expect(isSolvedBoard(solveOrFail(".".repeat(CELL_COUNT)))).toBe(true);
  });

  it("完成盤を渡すとその盤面がそのまま返る", () => {
    expect(formatBoard(solveOrFail(CLASSIC_SOLUTION))).toBe(CLASSIC_SOLUTION);
  });

  it("矛盾した盤面は解けない", () => {
    const board = parseBoard(CLASSIC_PUZZLE);
    board[2] = 5; // 同じ行に 5 が 2 つになる
    expect(solveBoard(board)).toBeNull();
  });

  it("入力の盤面を書き換えない", () => {
    const board = parseBoard(CLASSIC_PUZZLE);
    const before = cloneBoard(board);
    solveBoard(board);
    countSolutions(board);
    expect(boardsEqual(board, before)).toBe(true);
  });

  it("同じ盤面からは同じ解が返る(決定的)", () => {
    for (const puzzle of [
      CLASSIC_PUZZLE,
      HARD_PUZZLE,
      // 解が複数ある盤面でも、返る解は毎回同じでなければならない。
      ".".repeat(CELL_COUNT),
    ]) {
      expect(formatBoard(solveOrFail(puzzle))).toBe(formatBoard(solveOrFail(puzzle)));
    }
  });
});

describe("解の個数を数える", () => {
  it("一意解の問題は 1 を返す", () => {
    for (const puzzle of UNIQUE_PUZZLES) {
      expect(countSolutions(parseBoard(puzzle))).toBe(1);
      expect(hasUniqueSolution(parseBoard(puzzle))).toBe(true);
    }
  });

  it("矛盾した盤面は 0 を返す", () => {
    const board = parseBoard(CLASSIC_PUZZLE);
    board[2] = 5;
    expect(countSolutions(board)).toBe(0);
    expect(hasUniqueSolution(board)).toBe(false);
  });

  it("空の盤面は複数解として 2 を返す", () => {
    expect(countSolutions(createEmptyBoard())).toBe(2);
    expect(hasUniqueSolution(createEmptyBoard())).toBe(false);
  });

  it("完成盤から 1 と 2 をすべて消すと複数解になる", () => {
    // 1 と 2 を入れ替えた盤面も解になるので、必ず 2 つ以上の解がある。
    const board = parseBoard(CLASSIC_SOLUTION);
    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (board[index] === 1 || board[index] === 2) board[index] = 0;
    }
    expect(countSolutions(board)).toBe(2);
  });

  it("上限で打ち切る", () => {
    expect(findSolutions(createEmptyBoard(), 1)).toHaveLength(1);
    expect(findSolutions(createEmptyBoard(), 5)).toHaveLength(5);
    expect(findSolutions(createEmptyBoard(), 0)).toHaveLength(0);
    expect(countSolutions(createEmptyBoard(), 3)).toBe(3);
  });

  it("打ち切って得た解はどれも規則を満たし、互いに異なる", () => {
    const solutions = findSolutions(createEmptyBoard(), 4);
    expect(new Set(solutions.map(formatBoard)).size).toBe(solutions.length);
    for (const solution of solutions) {
      expect(isSolvedBoard(solution)).toBe(true);
    }
  });
});
