import { describe, expect, it } from "vitest";

import {
  ALL_CANDIDATES,
  BOARD_SIZE,
  BOX_OF,
  CELL_COUNT,
  COLUMN_OF,
  PEERS,
  ROW_OF,
  UNIT_COUNT,
  UNITS,
  UNITS_OF,
  boardsEqual,
  candidateDigits,
  cellIndex,
  cloneBoard,
  computeCandidates,
  countCandidates,
  createEmptyBoard,
  findConflicts,
  formatBoard,
  isComplete,
  isSolvedBoard,
  isValidBoard,
  isValidPlacement,
  lowestDigit,
  maskOfDigit,
  parseBoard,
  tryParseBoard,
} from "./board";
import { CLASSIC_PUZZLE, CLASSIC_SOLUTION } from "./test-puzzles";

describe("添字表", () => {
  it("行・列・ブロックを添字から引ける", () => {
    expect(ROW_OF[0]).toBe(0);
    expect(COLUMN_OF[0]).toBe(0);
    expect(BOX_OF[0]).toBe(0);

    // 添字 30 = 行 3 列 3 → 中央のブロック(4)
    expect(ROW_OF[30]).toBe(3);
    expect(COLUMN_OF[30]).toBe(3);
    expect(BOX_OF[30]).toBe(4);

    expect(ROW_OF[80]).toBe(8);
    expect(COLUMN_OF[80]).toBe(8);
    expect(BOX_OF[80]).toBe(8);
  });

  it("cellIndex は行と列から添字を返す", () => {
    expect(cellIndex(0, 0)).toBe(0);
    expect(cellIndex(3, 3)).toBe(30);
    expect(cellIndex(8, 8)).toBe(80);
  });

  it("単位は 27 個あり、それぞれ相異なる 9 セルを持つ", () => {
    expect(UNITS).toHaveLength(UNIT_COUNT);
    for (const unit of UNITS) {
      expect(unit).toHaveLength(BOARD_SIZE);
      expect(new Set(unit).size).toBe(BOARD_SIZE);
    }
  });

  it("各セルはちょうど 3 つの単位(行・列・ブロック)に属する", () => {
    for (let index = 0; index < CELL_COUNT; index += 1) {
      const units = UNITS_OF[index];
      expect(units).toHaveLength(3);
      for (const unitIndex of units) {
        expect([...UNITS[unitIndex]]).toContain(index);
      }
    }
  });

  it("相手のセルは自分を含まない 20 個で、昇順である", () => {
    for (let index = 0; index < CELL_COUNT; index += 1) {
      const peers = PEERS[index];
      expect(peers).toHaveLength(20);
      expect([...peers]).not.toContain(index);
      expect([...peers]).toStrictEqual([...peers].sort((a, b) => a - b));
    }
  });

  it("相手のセルは行・列・ブロックのいずれかを共有する", () => {
    for (const peer of PEERS[30]) {
      const shared =
        ROW_OF[peer] === ROW_OF[30] ||
        COLUMN_OF[peer] === COLUMN_OF[30] ||
        BOX_OF[peer] === BOX_OF[30];
      expect(shared).toBe(true);
    }
  });
});

describe("候補のビットマスク", () => {
  it("数字とビットが対応する", () => {
    expect(maskOfDigit(1)).toBe(0b0_0000_0001);
    expect(maskOfDigit(9)).toBe(0b1_0000_0000);
    expect(ALL_CANDIDATES).toBe(0b1_1111_1111);
  });

  it("立っているビットの数を数える", () => {
    expect(countCandidates(0)).toBe(0);
    expect(countCandidates(maskOfDigit(5))).toBe(1);
    expect(countCandidates(ALL_CANDIDATES)).toBe(BOARD_SIZE);
  });

  it("最小の数字を取り出せる", () => {
    expect(lowestDigit(0)).toBe(0);
    expect(lowestDigit(maskOfDigit(7))).toBe(7);
    expect(lowestDigit(maskOfDigit(3) | maskOfDigit(8))).toBe(3);
  });

  it("立っている数字を昇順で列挙できる", () => {
    const mask = maskOfDigit(9) | maskOfDigit(2) | maskOfDigit(5);
    expect(candidateDigits(mask)).toStrictEqual([2, 5, 9]);
    expect(candidateDigits(0)).toStrictEqual([]);
  });
});

describe("文字列との相互変換", () => {
  it("81 文字を読める", () => {
    const board = parseBoard(CLASSIC_PUZZLE);
    expect(board).toHaveLength(CELL_COUNT);
    expect(board[0]).toBe(5);
    expect(board[2]).toBe(0);
  });

  it("空きマスは . と 0 のどちらでも読める", () => {
    const withDots = parseBoard(".".repeat(CELL_COUNT));
    const withZeros = parseBoard("0".repeat(CELL_COUNT));
    expect(boardsEqual(withDots, withZeros)).toBe(true);
  });

  it("書き出しは空きマスを . に統一する", () => {
    expect(formatBoard(parseBoard("0".repeat(CELL_COUNT)))).toBe(".".repeat(CELL_COUNT));
    expect(formatBoard(parseBoard(CLASSIC_PUZZLE))).toBe(CLASSIC_PUZZLE);
  });

  it("読めない文字列は null を返す", () => {
    expect(tryParseBoard("")).toBeNull();
    expect(tryParseBoard(CLASSIC_PUZZLE.slice(0, 80))).toBeNull();
    expect(tryParseBoard(`${CLASSIC_PUZZLE}.`)).toBeNull();
    expect(tryParseBoard("x".repeat(CELL_COUNT))).toBeNull();
    expect(tryParseBoard("-".repeat(CELL_COUNT))).toBeNull();
  });

  it("parseBoard は読めない文字列で例外を投げる", () => {
    expect(() => parseBoard("x".repeat(CELL_COUNT))).toThrow();
  });
});

describe("盤面の操作", () => {
  it("空の盤面は 81 マスすべてが 0 である", () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(CELL_COUNT);
    expect([...board].every((digit) => digit === 0)).toBe(true);
  });

  it("複製は独立している", () => {
    const board = parseBoard(CLASSIC_PUZZLE);
    const copy = cloneBoard(board);
    copy[2] = 9;
    expect(board[2]).toBe(0);
    expect(boardsEqual(board, copy)).toBe(false);
  });

  it("埋まっているかを判定する", () => {
    expect(isComplete(parseBoard(CLASSIC_SOLUTION))).toBe(true);
    expect(isComplete(parseBoard(CLASSIC_PUZZLE))).toBe(false);
  });
});

describe("規則の検証", () => {
  it("重複の無い盤面では矛盾が出ない", () => {
    expect(findConflicts(parseBoard(CLASSIC_PUZZLE))).toStrictEqual([]);
    expect(isValidBoard(parseBoard(CLASSIC_PUZZLE))).toBe(true);
  });

  it("行の重複を両方のセルとして返す", () => {
    const board = createEmptyBoard();
    board[0] = 5;
    board[8] = 5;
    expect(findConflicts(board)).toStrictEqual([0, 8]);
    expect(isValidBoard(board)).toBe(false);
  });

  it("列の重複を検出する", () => {
    const board = createEmptyBoard();
    board[0] = 5;
    board[72] = 5;
    expect(findConflicts(board)).toStrictEqual([0, 72]);
  });

  it("ブロックの重複を検出する", () => {
    const board = createEmptyBoard();
    board[0] = 5;
    board[20] = 5;
    expect(findConflicts(board)).toStrictEqual([0, 20]);
  });

  it("空きマスは重複として数えない", () => {
    expect(findConflicts(createEmptyBoard())).toStrictEqual([]);
  });

  it("置けるかどうかを判定する", () => {
    const board = parseBoard(CLASSIC_PUZZLE);
    // 添字 2(行 0 列 2)。同じ行に 5 と 7、同じブロックに 6 と 9 と 8 がある。
    expect(isValidPlacement(board, 2, 5)).toBe(false);
    expect(isValidPlacement(board, 2, 4)).toBe(true);
  });
});

describe("完成盤の判定", () => {
  it("規則を満たす完成盤を受理する", () => {
    expect(isSolvedBoard(parseBoard(CLASSIC_SOLUTION))).toBe(true);
  });

  it("空きマスが残っていれば受理しない", () => {
    expect(isSolvedBoard(parseBoard(CLASSIC_PUZZLE))).toBe(false);
    const board = parseBoard(CLASSIC_SOLUTION);
    board[40] = 0;
    expect(isSolvedBoard(board)).toBe(false);
  });

  it("規則に反していれば受理しない", () => {
    const board = parseBoard(CLASSIC_SOLUTION);
    board[0] = board[1];
    expect(isSolvedBoard(board)).toBe(false);
  });

  it("長さが 81 でなければ受理しない", () => {
    expect(isSolvedBoard(new Uint8Array(80))).toBe(false);
  });
});

describe("候補の計算", () => {
  it("確定済みのセルの候補は 0 である", () => {
    const board = parseBoard(CLASSIC_PUZZLE);
    const candidates = computeCandidates(board);
    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (board[index] !== 0) expect(candidates[index]).toBe(0);
    }
  });

  it("空きセルには相手のセルに無い数字だけが立つ", () => {
    const board = parseBoard(CLASSIC_PUZZLE);
    const candidates = computeCandidates(board);
    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (board[index] !== 0) continue;
      for (const digit of candidateDigits(candidates[index])) {
        expect(isValidPlacement(board, index, digit)).toBe(true);
      }
      expect(countCandidates(candidates[index])).toBe(candidateDigits(candidates[index]).length);
    }
  });

  it("空の盤面ではすべてのセルに 9 個の候補が立つ", () => {
    const candidates = computeCandidates(createEmptyBoard());
    expect([...candidates].every((mask) => mask === ALL_CANDIDATES)).toBe(true);
  });

  it("完成盤ではどのセルにも候補が残らない", () => {
    const candidates = computeCandidates(parseBoard(CLASSIC_SOLUTION));
    expect([...candidates].every((mask) => mask === 0)).toBe(true);
  });
});
