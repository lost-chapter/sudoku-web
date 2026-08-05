import { describe, expect, it } from "vitest";

import { candidateDigits, maskOfDigit } from "@sudoku/core";

import { SAMPLE_PUZZLE } from "../features/puzzle/samplePuzzle";
import {
  boardReducer,
  createBoardState,
  isGiven,
  matchesSolution,
  notesAt,
  valueAt,
  type BoardState,
} from "./boardState";

/**
 * 盤面の遷移は React を通さずに検証する。
 * reducer が純粋であることが、このテストが書ける前提である
 * (docs/architecture/system-architecture.md「状態管理は reducer に寄せる」)。
 */

const initial = createBoardState(SAMPLE_PUZZLE);

/** サンプル問題の左上は手がかり 5 で、最初の空きマスは 2 番目のセル(0 起点で 2)。 */
const GIVEN_INDEX = 0;
const EMPTY_INDEX = initial.selected;

function select(state: BoardState, index: number): BoardState {
  return boardReducer(state, { type: "selectCell", index });
}

describe("createBoardState", () => {
  it("入力はすべて空で始まる", () => {
    expect(initial.entries).toHaveLength(81);
    expect(initial.entries.every((value) => value === 0)).toBe(true);
  });

  it("選択は最初の空きマスに置く(クリック無しで遊び始められる)", () => {
    expect(isGiven(initial, initial.selected)).toBe(false);
    const before = SAMPLE_PUZZLE.givens.slice(0, initial.selected);
    expect(before.every((value) => value !== 0)).toBe(true);
  });
});

describe("selectCell", () => {
  it("選んだセルへ移る", () => {
    expect(select(initial, 40).selected).toBe(40);
  });

  it("盤面の外は無視する", () => {
    expect(select(initial, -1)).toBe(initial);
    expect(select(initial, 81)).toBe(initial);
  });

  it("同じセルを選び直しても状態は変わらない", () => {
    expect(select(initial, initial.selected)).toBe(initial);
  });
});

describe("moveSelection", () => {
  it("上下左右に 1 つずつ動く", () => {
    const center = select(initial, 40);
    expect(boardReducer(center, { type: "moveSelection", direction: "up" }).selected).toBe(31);
    expect(boardReducer(center, { type: "moveSelection", direction: "down" }).selected).toBe(49);
    expect(boardReducer(center, { type: "moveSelection", direction: "left" }).selected).toBe(39);
    expect(boardReducer(center, { type: "moveSelection", direction: "right" }).selected).toBe(41);
  });

  it("端では止まる(反対側へ回り込まない)", () => {
    const topLeft = select(initial, 0);
    expect(boardReducer(topLeft, { type: "moveSelection", direction: "up" })).toBe(topLeft);
    expect(boardReducer(topLeft, { type: "moveSelection", direction: "left" })).toBe(topLeft);

    const bottomRight = select(initial, 80);
    expect(boardReducer(bottomRight, { type: "moveSelection", direction: "down" })).toBe(
      bottomRight,
    );
    expect(boardReducer(bottomRight, { type: "moveSelection", direction: "right" })).toBe(
      bottomRight,
    );
  });
});

describe("inputDigit", () => {
  it("空きマスへ入る", () => {
    const next = boardReducer(initial, { type: "inputDigit", digit: 4 });
    expect(valueAt(next, EMPTY_INDEX)).toBe(4);
  });

  it("手がかりのセルには何も起きない", () => {
    const onGiven = select(initial, GIVEN_INDEX);
    expect(boardReducer(onGiven, { type: "inputDigit", digit: 9 })).toBe(onGiven);
  });

  it("同じ数字をもう一度入れると消える(トグル)", () => {
    const filled = boardReducer(initial, { type: "inputDigit", digit: 4 });
    const toggled = boardReducer(filled, { type: "inputDigit", digit: 4 });
    expect(valueAt(toggled, EMPTY_INDEX)).toBe(0);
  });

  it("違う数字なら上書きする", () => {
    const filled = boardReducer(initial, { type: "inputDigit", digit: 4 });
    const overwritten = boardReducer(filled, { type: "inputDigit", digit: 7 });
    expect(valueAt(overwritten, EMPTY_INDEX)).toBe(7);
  });

  it("1〜9 以外は受け付けない", () => {
    expect(boardReducer(initial, { type: "inputDigit", digit: 0 })).toBe(initial);
    expect(boardReducer(initial, { type: "inputDigit", digit: 10 })).toBe(initial);
  });

  it("他のセルを巻き込まない", () => {
    const next = boardReducer(initial, { type: "inputDigit", digit: 4 });
    const changed = next.entries.filter((value, index) => value !== initial.entries[index]);
    expect(changed).toEqual([4]);
  });
});

describe("clearCell", () => {
  it("入力を消す", () => {
    const filled = boardReducer(initial, { type: "inputDigit", digit: 4 });
    const cleared = boardReducer(filled, { type: "clearCell" });
    expect(valueAt(cleared, EMPTY_INDEX)).toBe(0);
  });

  it("手がかりのセルには何も起きない", () => {
    const onGiven = select(initial, GIVEN_INDEX);
    expect(boardReducer(onGiven, { type: "clearCell" })).toBe(onGiven);
  });

  it("空のセルを消しても状態は変わらない", () => {
    expect(boardReducer(initial, { type: "clearCell" })).toBe(initial);
  });
});

describe("メモ", () => {
  const noteMode = boardReducer(initial, { type: "toggleNoteMode" });

  it("メモモードは切り替わる", () => {
    expect(initial.noteMode).toBe(false);
    expect(noteMode.noteMode).toBe(true);
    expect(boardReducer(noteMode, { type: "toggleNoteMode" }).noteMode).toBe(false);
  });

  it("メモモード中の数字は候補を立て、確定値は入らない", () => {
    const noted = boardReducer(noteMode, { type: "inputDigit", digit: 7 });
    expect(notesAt(noted, EMPTY_INDEX)).toBe(maskOfDigit(7));
    expect(valueAt(noted, EMPTY_INDEX)).toBe(0);
  });

  it("同じ数字をもう一度でメモが落ちる(トグル)", () => {
    const noted = boardReducer(noteMode, { type: "inputDigit", digit: 7 });
    const removed = boardReducer(noted, { type: "inputDigit", digit: 7 });
    expect(notesAt(removed, EMPTY_INDEX)).toBe(0);
  });

  it("複数の候補を立てられる", () => {
    const noted = [1, 2, 7].reduce(
      (state, digit) => boardReducer(state, { type: "inputDigit", digit }),
      noteMode,
    );
    expect(candidateDigits(notesAt(noted, EMPTY_INDEX))).toEqual([1, 2, 7]);
  });

  it("手がかりのセルにはメモを置けない", () => {
    const onGiven = boardReducer(noteMode, { type: "selectCell", index: GIVEN_INDEX });
    expect(boardReducer(onGiven, { type: "inputDigit", digit: 7 })).toBe(onGiven);
  });

  it("確定値が入っているセルにはメモを置けない", () => {
    const filled = boardReducer(initial, { type: "inputDigit", digit: 4 });
    const toNoteMode = boardReducer(filled, { type: "toggleNoteMode" });
    expect(boardReducer(toNoteMode, { type: "inputDigit", digit: 7 })).toBe(toNoteMode);
  });

  it("確定入力を入れるとそのセルのメモは消える", () => {
    const noted = [1, 2].reduce(
      (state, digit) => boardReducer(state, { type: "inputDigit", digit }),
      noteMode,
    );
    const back = boardReducer(noted, { type: "toggleNoteMode" });
    const filled = boardReducer(back, { type: "inputDigit", digit: 4 });

    expect(valueAt(filled, EMPTY_INDEX)).toBe(4);
    expect(filled.notes[EMPTY_INDEX]).toBe(0);
  });

  it("確定入力を消してもメモは戻らない", () => {
    const noted = boardReducer(noteMode, { type: "inputDigit", digit: 1 });
    const back = boardReducer(noted, { type: "toggleNoteMode" });
    const filled = boardReducer(back, { type: "inputDigit", digit: 4 });
    const cleared = boardReducer(filled, { type: "clearCell" });

    expect(valueAt(cleared, EMPTY_INDEX)).toBe(0);
    expect(notesAt(cleared, EMPTY_INDEX)).toBe(0);
  });

  it("確定値のトグル消しではメモを触らない", () => {
    // 同じ数字をもう一度押して消す経路。メモはもともと空なので状態は増えない。
    const filled = boardReducer(initial, { type: "inputDigit", digit: 4 });
    const toggled = boardReducer(filled, { type: "inputDigit", digit: 4 });
    expect(toggled.notes).toBe(initial.notes);
  });

  it("数字が見えているセルのメモは表示しない", () => {
    expect(notesAt(initial, GIVEN_INDEX)).toBe(0);
  });
});

describe("matchesSolution", () => {
  it("始めた直後は完成していない", () => {
    expect(matchesSolution(initial)).toBe(false);
  });

  it("解をすべて入れたら完成する", () => {
    const solved = SAMPLE_PUZZLE.solution.reduce<BoardState>((state, digit, index) => {
      if (isGiven(state, index)) {
        return state;
      }
      return boardReducer(select(state, index), { type: "inputDigit", digit });
    }, initial);

    expect(matchesSolution(solved)).toBe(true);
  });

  it("1 マスでも違えば完成しない", () => {
    const state = boardReducer(initial, { type: "inputDigit", digit: wrongDigitAt(EMPTY_INDEX) });
    expect(matchesSolution(state)).toBe(false);
  });
});

function wrongDigitAt(index: number): number {
  const correct = SAMPLE_PUZZLE.solution[index];
  return correct === 9 ? 1 : correct + 1;
}
