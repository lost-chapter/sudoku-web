import { describe, expect, it } from "vitest";

import { decodePuzzleLine } from "./puzzleLine";
import { SAMPLE_PUZZLE, SAMPLE_PUZZLE_LINE } from "./samplePuzzle";

/**
 * 問題ファイルの形式(docs/api/puzzle-file-format.md)は generator と web の契約である。
 * **読み込み側の検証**の表をそのままテストにしてある。
 */

const GIVENS = SAMPLE_PUZZLE_LINE.split(",")[0];
const SOLUTION = SAMPLE_PUZZLE_LINE.split(",")[1];

describe("decodePuzzleLine", () => {
  it("契約どおりの行を読める", () => {
    const puzzle = decodePuzzleLine(SAMPLE_PUZZLE_LINE);
    expect(puzzle).not.toBeNull();
    expect(puzzle?.difficulty).toBe("easy");
    expect(puzzle?.score).toBe(14);
    expect(puzzle?.givens).toHaveLength(81);
    expect(puzzle?.solution).toHaveLength(81);
  });

  it("空きマスは 0 として読む", () => {
    const puzzle = decodePuzzleLine(SAMPLE_PUZZLE_LINE);
    expect(puzzle?.givens[2]).toBe(0);
    expect(puzzle?.givens[0]).toBe(5);
  });

  it("書き出しは `.` だが、読み込みは `0` も空きとして受理する", () => {
    const withZeros = `${GIVENS.replaceAll(".", "0")},${SOLUTION},easy,14`;
    expect(decodePuzzleLine(withZeros)).toEqual(SAMPLE_PUZZLE);
  });

  it("前後の空白は無視する", () => {
    expect(decodePuzzleLine(`  ${SAMPLE_PUZZLE_LINE}\n`)).toEqual(SAMPLE_PUZZLE);
  });

  it.each([
    ["列が足りない", `${GIVENS},${SOLUTION},easy`],
    ["列が多い", `${GIVENS},${SOLUTION},easy,14,extra`],
    ["手がかりが 81 文字でない", `${GIVENS.slice(1)},${SOLUTION},easy,14`],
    ["解が 81 文字でない", `${GIVENS},${SOLUTION}1,easy,14`],
    ["使えない文字が混ざる", `${"x".repeat(81)},${SOLUTION},easy,14`],
    ["解に空きマスがある", `${GIVENS},${SOLUTION.replace("5", ".")},easy,14`],
    ["難易度クラスが未知", `${GIVENS},${SOLUTION},insane,14`],
    ["スコアが整数でない", `${GIVENS},${SOLUTION},easy,abc`],
  ])("壊れた行は捨てる: %s", (_name, line) => {
    expect(decodePuzzleLine(line)).toBeNull();
  });

  it("解が手がかりと食い違う行は捨てる", () => {
    // 1 文字目の手がかりは 5。解の 1 文字目を別の数字にすると矛盾する。
    const inconsistent = `${GIVENS},9${SOLUTION.slice(1)},easy,14`;
    expect(decodePuzzleLine(inconsistent)).toBeNull();
  });
});

/**
 * 開発用の問題は手書きなので、**収録前の検証にあたるものをここで掛けておく**
 * (docs/api/puzzle-file-format.md「解が本当に正しいかは読み込み時には検証しない」)。
 * 実物のパックでは生成側が担保するため、この検証はアプリの実行時には走らない。
 */
describe("開発用の問題", () => {
  it("解が数独の規則を満たす", () => {
    const solution = SAMPLE_PUZZLE.solution;
    const groups = [...rows(solution), ...columns(solution), ...blocks(solution)];
    for (const group of groups) {
      expect(new Set(group).size).toBe(9);
    }
  });
});

function rows(cells: readonly number[]): number[][] {
  return Array.from({ length: 9 }, (_, row) => cells.slice(row * 9, row * 9 + 9));
}

function columns(cells: readonly number[]): number[][] {
  return Array.from({ length: 9 }, (_, column) =>
    Array.from({ length: 9 }, (_, row) => cells[row * 9 + column]),
  );
}

function blocks(cells: readonly number[]): number[][] {
  return Array.from({ length: 9 }, (_, block) => {
    const top = Math.floor(block / 3) * 3;
    const left = (block % 3) * 3;
    return Array.from({ length: 9 }, (_, cell) => {
      const row = top + Math.floor(cell / 3);
      const column = left + (cell % 3);
      return cells[row * 9 + column];
    });
  });
}
