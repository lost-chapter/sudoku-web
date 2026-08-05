import { describe, expect, it } from "vitest";

import { candidateDigits } from "@sudoku/core";

import { SAMPLE_PUZZLE } from "../features/puzzle/samplePuzzle";
import { notesAt, valueAt } from "./boardState";
import {
  canRedo,
  canUndo,
  createGameState,
  gameReducer,
  type GameAction,
  type GameState,
} from "./gameState";

/**
 * 取り消しは**操作単位**である(docs/ui/screens-and-interactions.md)。
 * 選択の移動とメモモードの切替は 1 手に数えない。
 */

const initial = createGameState({ puzzle: SAMPLE_PUZZLE });
const CELL = initial.present.selected;

function run(state: GameState, ...actions: readonly GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

describe("履歴に積むもの", () => {
  it("始めた直後は取り消しもやり直しもできない", () => {
    expect(canUndo(initial)).toBe(false);
    expect(canRedo(initial)).toBe(false);
  });

  it("数字の入力は 1 手として積む", () => {
    const after = run(initial, { type: "inputDigit", digit: 4 });
    expect(after.past).toHaveLength(1);
    expect(canUndo(after)).toBe(true);
  });

  it("選択の移動は 1 手に数えない", () => {
    const after = run(
      initial,
      { type: "selectCell", index: 40 },
      { type: "moveSelection", direction: "down" },
    );
    expect(after.past).toHaveLength(0);
    expect(after.present.selected).toBe(49);
  });

  it("メモモードの切替は 1 手に数えない", () => {
    const after = run(initial, { type: "toggleNoteMode" });
    expect(after.past).toHaveLength(0);
    expect(after.present.noteMode).toBe(true);
  });

  it("何も起きない操作は積まない", () => {
    // 手がかりのセルでは入力が効かない。
    const after = run(initial, { type: "selectCell", index: 0 }, { type: "inputDigit", digit: 9 });
    expect(after.past).toHaveLength(0);
  });
});

describe("あきらめたあと", () => {
  it("取り消しもやり直しもできない", () => {
    const played = run(initial, { type: "inputDigit", digit: 4 }, { type: "undo" });
    expect(canRedo(played)).toBe(true);

    const gaveUp = run(played, { type: "giveUp" });
    expect(canUndo(gaveUp)).toBe(false);
    expect(canRedo(gaveUp)).toBe(false);
    expect(run(gaveUp, { type: "undo" }).present).toBe(gaveUp.present);
    expect(run(gaveUp, { type: "redo" }).present).toBe(gaveUp.present);
  });
});

describe("取り消しとやり直し", () => {
  it("直前の入力を戻す", () => {
    const filled = run(initial, { type: "inputDigit", digit: 4 });
    const undone = run(filled, { type: "undo" });

    expect(valueAt(undone.present, CELL)).toBe(0);
    expect(canRedo(undone)).toBe(true);
  });

  it("戻したものをやり直せる", () => {
    const redone = run(
      initial,
      { type: "inputDigit", digit: 4 },
      { type: "undo" },
      { type: "redo" },
    );
    expect(valueAt(redone.present, CELL)).toBe(4);
    expect(canRedo(redone)).toBe(false);
  });

  it("何手でも戻せる", () => {
    const filled = run(
      initial,
      { type: "inputDigit", digit: 4 },
      { type: "selectCell", index: 40 },
      { type: "inputDigit", digit: 7 },
    );
    const undone = run(filled, { type: "undo" }, { type: "undo" });

    expect(valueAt(undone.present, CELL)).toBe(0);
    expect(valueAt(undone.present, 40)).toBe(0);
    expect(canUndo(undone)).toBe(false);
  });

  it("戻しきったらそれ以上は変わらない", () => {
    const undone = run(initial, { type: "undo" });
    expect(undone).toBe(initial);
  });

  it("やり直すものが無ければ変わらない", () => {
    expect(run(initial, { type: "redo" })).toBe(initial);
  });

  it("新しい操作をしたらやり直しは捨てる", () => {
    const branched = run(
      initial,
      { type: "inputDigit", digit: 4 },
      { type: "undo" },
      { type: "inputDigit", digit: 7 },
    );
    expect(canRedo(branched)).toBe(false);
    expect(valueAt(branched.present, CELL)).toBe(7);
  });

  it("メモの 1 つ立てもそれぞれ 1 手である", () => {
    const noted = run(
      initial,
      { type: "toggleNoteMode" },
      { type: "inputDigit", digit: 1 },
      { type: "inputDigit", digit: 2 },
    );
    expect(candidateDigits(notesAt(noted.present, CELL))).toEqual([1, 2]);

    const undone = run(noted, { type: "undo" });
    expect(candidateDigits(notesAt(undone.present, CELL))).toEqual([1]);
  });

  it("確定入力で消えたメモは取り消しで戻る", () => {
    const filled = run(
      initial,
      { type: "toggleNoteMode" },
      { type: "inputDigit", digit: 1 },
      { type: "inputDigit", digit: 2 },
      { type: "toggleNoteMode" },
      { type: "inputDigit", digit: 4 },
    );
    expect(valueAt(filled.present, CELL)).toBe(4);

    const undone = run(filled, { type: "undo" });
    expect(valueAt(undone.present, CELL)).toBe(0);
    expect(candidateDigits(notesAt(undone.present, CELL))).toEqual([1, 2]);
  });

  it("遊びかけから始めたときは前回の手を取り消せない", () => {
    const entries = new Array<number>(81).fill(0);
    entries[CELL] = 4;
    const resumed = createGameState({
      puzzle: SAMPLE_PUZZLE,
      restored: { entries, notes: new Array<number>(81).fill(0) },
    });

    expect(valueAt(resumed.present, CELL)).toBe(4);
    expect(canUndo(resumed)).toBe(false);
  });

  it("取り消してもメモモードは戻さない", () => {
    // メモを立ててからモードを切って取り消す。入力先が勝手に変わらないこと。
    const state = run(
      initial,
      { type: "toggleNoteMode" },
      { type: "inputDigit", digit: 1 },
      { type: "toggleNoteMode" },
      { type: "undo" },
    );
    expect(state.present.noteMode).toBe(false);
  });
});
