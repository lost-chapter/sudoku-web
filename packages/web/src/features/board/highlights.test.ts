import { describe, expect, it } from "vitest";

import { boardReducer, valueAt, type BoardAction, type BoardState } from "../../state/boardState";
import { DEFAULT_SETTINGS, type Settings } from "../settings/settings";
import { SAMPLE_PUZZLE } from "../puzzle/samplePuzzle";
import { createBoardState } from "../../state/boardState";
import { computeHighlights } from "./highlights";

const initial = createBoardState(SAMPLE_PUZZLE);

function run(state: BoardState, ...actions: readonly BoardAction[]): BoardState {
  return actions.reduce(boardReducer, state);
}

function withSettings(overrides: Partial<Settings>): Settings {
  return { ...DEFAULT_SETTINGS, ...overrides };
}

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

describe("間違いを教えない", () => {
  it("補助表示は強調 2 つだけで、矛盾も誤りも出さない", () => {
    // ⚠️ 2026-08-06 に削除した(発注者の要望)。
    // 規則に反する入力(同じ行に 5 を 2 つ)をしても、盤面には何も出ない。
    const state = run(
      initial,
      { type: "selectCell", index: initial.selected },
      { type: "inputDigit", digit: 5 },
    );

    expect(Object.keys(computeHighlights(state, DEFAULT_SETTINGS))).toEqual(["sameDigit", "units"]);
  });
});
