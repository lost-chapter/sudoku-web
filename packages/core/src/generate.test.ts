import { describe, expect, it } from "vitest";

import type { Board } from "./board";
import { BOARD_SIZE, CELL_COUNT, cloneBoard, formatBoard, isSolvedBoard } from "./board";
import { digHoles, generatePuzzle, generateSolvedBoard } from "./generate";
import { createRandom } from "./random";
import { countSolutions } from "./search-solver";

function generate(seed: string | number): string {
  return formatBoard(generateSolvedBoard(createRandom(seed)));
}

describe("完成盤の生成", () => {
  it("規則を満たす完成盤ができる", () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const board = generateSolvedBoard(createRandom(`seed-${String(seed)}`));
      expect(isSolvedBoard(board)).toBe(true);
    }
  });

  it("同じシードからは同じ完成盤ができる", () => {
    expect(generate("easy-000")).toBe(generate("easy-000"));
    expect(generate(12345)).toBe(generate(12345));
  });

  it("違うシードからは違う完成盤ができる", () => {
    const boards = new Set<string>();
    for (let seed = 0; seed < 50; seed += 1) {
      boards.add(generate(`seed-${String(seed)}`));
    }
    expect(boards.size).toBe(50);
  });

  it("同じ乱数を続けて使うと別の完成盤が出る", () => {
    // 1 つの乱数から続けて生成しても、同じ盤面が並ばないこと。
    const random = createRandom("stream");
    const first = formatBoard(generateSolvedBoard(random));
    const second = formatBoard(generateSolvedBoard(random));
    expect(first).not.toBe(second);
  });

  it("同型変換の量産になっていない", () => {
    // 同型変換で作った盤面は「数字の対応が 1 対 1 で決まる」。
    // 30 個作って、どの 2 つもその関係になっていないことを確かめる。
    const boards = Array.from({ length: 30 }, (_, seed) => generate(`iso-${String(seed)}`));
    for (let a = 0; a < boards.length; a += 1) {
      for (let b = a + 1; b < boards.length; b += 1) {
        expect(isDigitRelabeling(boards[a], boards[b])).toBe(false);
      }
    }
  });

  it("最初のマスに 1 が偏らない", () => {
    // 「1 から順に埋める」実装へ戻したときに気づくための網。
    const counts = new Map<string, number>();
    for (let seed = 0; seed < 100; seed += 1) {
      const first = generate(`bias-${String(seed)}`)[0];
      counts.set(first, (counts.get(first) ?? 0) + 1);
    }
    expect(counts.size).toBe(BOARD_SIZE);
    for (const count of counts.values()) {
      expect(count).toBeLessThan(40);
    }
  });
});

/** 手がかりの数。 */
function countClues(board: Board): number {
  return [...board].filter((digit) => digit !== 0).length;
}

describe("穴あけ", () => {
  it("できた問題は一意解である(性質 1)", () => {
    for (let seed = 0; seed < 10; seed += 1) {
      const { puzzle } = generatePuzzle(createRandom(`dig-${String(seed)}`));
      expect(countSolutions(puzzle)).toBe(1);
    }
  });

  it("最低手がかり数を指定しても一意解を保つ", () => {
    for (let seed = 0; seed < 10; seed += 1) {
      const { puzzle } = generatePuzzle(createRandom(`minimum-clues-${String(seed)}`), {
        minimumClues: 40,
      });
      expect(countClues(puzzle)).toBeGreaterThanOrEqual(40);
      expect(countSolutions(puzzle)).toBe(1);
    }
  });

  it("手がかりを 1 つでも消すと一意解でなくなる(性質 2・極小性)", () => {
    const { puzzle } = generatePuzzle(createRandom("minimal"));
    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (puzzle[index] === 0) continue;
      const reduced = cloneBoard(puzzle);
      reduced[index] = 0;
      expect(countSolutions(reduced)).not.toBe(1);
    }
  });

  it("同じシードからは同じ問題ができる(性質 3)", () => {
    const first = generatePuzzle(createRandom("same-seed"));
    const second = generatePuzzle(createRandom("same-seed"));
    expect(formatBoard(first.puzzle)).toBe(formatBoard(second.puzzle));
    expect(formatBoard(first.solution)).toBe(formatBoard(second.solution));
  });

  it("解は完成盤のままで、手がかりはその一部である", () => {
    for (let seed = 0; seed < 5; seed += 1) {
      const { puzzle, solution } = generatePuzzle(createRandom(`subset-${String(seed)}`));
      expect(isSolvedBoard(solution)).toBe(true);
      for (let index = 0; index < CELL_COUNT; index += 1) {
        if (puzzle[index] !== 0) expect(puzzle[index]).toBe(solution[index]);
      }
    }
  });

  it("手がかりは 17 個以上残る", () => {
    // 一意解を持つ最小の手がかり数は 17(2012 年に網羅探索で証明済み)。
    // これを下回ったら一意解の判定が壊れている。
    for (let seed = 0; seed < 10; seed += 1) {
      const { puzzle } = generatePuzzle(createRandom(`clues-${String(seed)}`));
      expect(countClues(puzzle)).toBeGreaterThanOrEqual(17);
      expect(countClues(puzzle)).toBeLessThan(CELL_COUNT);
    }
  });

  it("完成盤を渡すと手がかりが減る", () => {
    const random = createRandom("dig-only");
    const solution = generateSolvedBoard(random);
    const before = cloneBoard(solution);
    const puzzle = digHoles(solution, random);
    // 入力の完成盤を書き換えない。
    expect(formatBoard(solution)).toBe(formatBoard(before));
    expect(countClues(puzzle)).toBeLessThan(CELL_COUNT);
  });
});

/** 2 つの完成盤が「数字を付け替えただけ」の関係にあるか。 */
function isDigitRelabeling(a: string, b: string): boolean {
  const mapping = new Map<string, string>();
  const used = new Set<string>();
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const from = a[index];
    const to = b[index];
    const known = mapping.get(from);
    if (known === undefined) {
      if (used.has(to)) return false;
      mapping.set(from, to);
      used.add(to);
      continue;
    }
    if (known !== to) return false;
  }
  return true;
}
