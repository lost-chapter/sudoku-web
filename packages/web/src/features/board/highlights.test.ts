import { describe, expect, it } from "vitest";

import { formatBoard } from "@sudoku/core";

import { boardReducer, valueAt, type BoardAction, type BoardState } from "../../state/boardState";
import { DEFAULT_SETTINGS, type Settings } from "../settings/settings";
import { SAMPLE_PUZZLE } from "../puzzle/samplePuzzle";
import { createBoardState } from "../../state/boardState";
import { computeHighlights, remainingCounts, toBoard } from "./highlights";

const initial = createBoardState(SAMPLE_PUZZLE);

/** サンプル問題の 1 行目は `53..7....`。左上の手がかりは 5。 */
const FIRST_EMPTY = initial.selected;

function run(state: BoardState, ...actions: readonly BoardAction[]): BoardState {
  return actions.reduce(boardReducer, state);
}

function withSettings(overrides: Partial<Settings>): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

describe("toBoard", () => {
  it("手がかりと入力を重ねた盤面を作る", () => {
    const filled = run(initial, { type: "inputDigit", digit: 4 });
    const text = formatBoard(toBoard(filled));

    expect(text).toHaveLength(81);
    expect(text[0]).toBe("5");
    expect(text[FIRST_EMPTY]).toBe("4");
  });
});

describe("同じ数字の強調", () => {
  it("選択中のセルと同じ数字を集める", () => {
    // 左上(手がかり 5)を選ぶ。
    const state = run(initial, { type: "selectCell", index: 0 });
    const { sameDigit } = computeHighlights(state, DEFAULT_SETTINGS);

    expect(sameDigit.has(0)).toBe(true);
    for (const index of sameDigit) {
      expect(valueAt(state, index)).toBe(5);
    }
  });

  it("空のセルを選んでいるときは何も強調しない", () => {
    const { sameDigit } = computeHighlights(initial, DEFAULT_SETTINGS);
    expect(sameDigit.size).toBe(0);
  });

  it("設定で切れる", () => {
    const state = run(initial, { type: "selectCell", index: 0 });
    const { sameDigit } = computeHighlights(state, withSettings({ highlightSameDigit: false }));
    expect(sameDigit.size).toBe(0);
  });
});

describe("行・列・ブロックの強調", () => {
  it("選択中のセルが属する 3 方向を集める(自分は含まない)", () => {
    const state = run(initial, { type: "selectCell", index: 40 });
    const { units } = computeHighlights(state, DEFAULT_SETTINGS);

    expect(units.size).toBe(20);
    expect(units.has(40)).toBe(false);
    expect(units.has(36)).toBe(true); // 同じ行
    expect(units.has(4)).toBe(true); // 同じ列
    expect(units.has(30)).toBe(true); // 同じブロック
    expect(units.has(0)).toBe(false);
  });

  it("設定で切れる", () => {
    const { units } = computeHighlights(initial, withSettings({ highlightUnits: false }));
    expect(units.size).toBe(0);
  });
});

describe("矛盾の表示", () => {
  it("同じ行に重複が出たら両方を印にする", () => {
    // 1 行目には手がかり 5 が 1 列目にある。同じ行の空きへ 5 を入れる。
    const state = run(
      initial,
      { type: "selectCell", index: FIRST_EMPTY },
      { type: "inputDigit", digit: 5 },
    );
    const { conflicts } = computeHighlights(state, DEFAULT_SETTINGS);

    expect(conflicts.has(0)).toBe(true);
    expect(conflicts.has(FIRST_EMPTY)).toBe(true);
  });

  it("規則に反していなければ印を付けない(解と違っていても)", () => {
    // 解は 4。規則には反しない 1 を入れても矛盾ではない。
    const state = run(initial, { type: "inputDigit", digit: 1 });
    const { conflicts } = computeHighlights(state, DEFAULT_SETTINGS);
    expect(conflicts.size).toBe(0);
  });

  it("設定で切れる", () => {
    const state = run(
      initial,
      { type: "selectCell", index: FIRST_EMPTY },
      { type: "inputDigit", digit: 5 },
    );
    const { conflicts } = computeHighlights(state, withSettings({ showConflicts: false }));
    expect(conflicts.size).toBe(0);
  });
});

describe("誤りの即時指摘", () => {
  it("既定では出さない(遊びの質が変わるため)", () => {
    const state = run(initial, { type: "inputDigit", digit: 1 });
    expect(computeHighlights(state, DEFAULT_SETTINGS).mistakes.size).toBe(0);
  });

  it("入れると解と違う入力を集める", () => {
    const wrong = SAMPLE_PUZZLE.solution[FIRST_EMPTY] === 1 ? 2 : 1;
    const state = run(initial, { type: "inputDigit", digit: wrong });
    const { mistakes } = computeHighlights(state, withSettings({ showMistakes: true }));

    expect(mistakes.has(FIRST_EMPTY)).toBe(true);
  });

  it("解と同じ入力は誤りにしない", () => {
    const state = run(initial, {
      type: "inputDigit",
      digit: SAMPLE_PUZZLE.solution[FIRST_EMPTY],
    });
    const { mistakes } = computeHighlights(state, withSettings({ showMistakes: true }));
    expect(mistakes.size).toBe(0);
  });

  it("矛盾とは別物である(重複していなくても誤りは出る)", () => {
    const wrong = SAMPLE_PUZZLE.solution[FIRST_EMPTY] === 1 ? 2 : 1;
    const state = run(initial, { type: "inputDigit", digit: wrong });
    const highlights = computeHighlights(state, withSettings({ showMistakes: true }));

    expect(highlights.mistakes.size).toBe(1);
    expect(highlights.conflicts.size).toBe(0);
  });
});

describe("残り数", () => {
  it("手がかりを数えたところから始まる", () => {
    const remaining = remainingCounts(initial);
    expect(remaining).toHaveLength(9);

    const givens = [...SAMPLE_PUZZLE.givens];
    for (let digit = 1; digit <= 9; digit += 1) {
      const placed = givens.filter((value) => value === digit).length;
      expect(remaining[digit - 1]).toBe(9 - placed);
    }
  });

  it("入力すると減る", () => {
    const before = remainingCounts(initial)[3];
    const state = run(initial, { type: "inputDigit", digit: 4 });
    expect(remainingCounts(state)[3]).toBe(before - 1);
  });

  it("メモは数えない", () => {
    const state = run(initial, { type: "toggleNoteMode" }, { type: "inputDigit", digit: 4 });
    expect(remainingCounts(state)).toEqual(remainingCounts(initial));
  });
});
