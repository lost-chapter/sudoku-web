import { BOARD_SIZE, CELL_COUNT, PEERS, findConflicts } from "@sudoku/core";

import { valueAt, type BoardState, type CellIndex } from "../../state/boardState";
import type { Settings } from "../settings/settings";

/**
 * 盤面に重ねる補助表示。**どのセルに何を出すか**だけを決める。
 *
 * 見た目は CSS の責務なので、ここは添字の集合を返すに留める。
 * React を通さずに検証できるよう純粋関数にしてある。
 *
 * ⚠️ **矛盾の検出は `core` の `findConflicts` を使う。**
 * 規則を web で書き直すと生成側と割れる。
 */
export interface BoardHighlights {
  /** 選択中のセルと同じ数字。 */
  readonly sameDigit: ReadonlySet<CellIndex>;
  /** 選択中のセルが属する行・列・ブロック。 */
  readonly units: ReadonlySet<CellIndex>;
  /** 数独の規則に反しているセル(重複)。**解は見ない。** */
  readonly conflicts: ReadonlySet<CellIndex>;
  /** 解と違う入力。**手がかりは対象外。** */
  readonly mistakes: ReadonlySet<CellIndex>;
}

const EMPTY: ReadonlySet<CellIndex> = new Set();

export function computeHighlights(state: BoardState, settings: Settings): BoardHighlights {
  return {
    sameDigit: settings.highlightSameDigit ? sameDigitOf(state) : EMPTY,
    units: settings.highlightUnits ? new Set(PEERS[state.selected]) : EMPTY,
    conflicts: settings.showConflicts ? new Set(findConflicts(toBoard(state))) : EMPTY,
    mistakes: settings.showMistakes ? mistakesOf(state) : EMPTY,
  };
}

/**
 * いま見えている盤面。手がかりと入力を重ねたもの。
 *
 * `core` の関数へ渡すために作る。**状態としては持たない**(入力のたびに作り直す)。
 */
export function toBoard(state: BoardState): Uint8Array {
  const board = new Uint8Array(CELL_COUNT);
  for (let index = 0; index < board.length; index += 1) {
    board[index] = valueAt(state, index);
  }
  return board;
}

/**
 * 各数字があと何個入るか。添字 0 が数字 1。
 *
 * **手がかりと入力の両方を数える。**メモは数えない。
 */
export function remainingCounts(state: BoardState): number[] {
  const remaining = new Array<number>(BOARD_SIZE).fill(BOARD_SIZE);
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const value = valueAt(state, index);
    if (value !== 0) {
      remaining[value - 1] -= 1;
    }
  }
  return remaining;
}

/** 選択中のセルが空なら何も強調しない。 */
function sameDigitOf(state: BoardState): ReadonlySet<CellIndex> {
  const digit = valueAt(state, state.selected);
  if (digit === 0) {
    return EMPTY;
  }

  const indexes = new Set<CellIndex>();
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (valueAt(state, index) === digit) {
      indexes.add(index);
    }
  }
  return indexes;
}

function mistakesOf(state: BoardState): ReadonlySet<CellIndex> {
  const indexes = new Set<CellIndex>();
  state.entries.forEach((value, index) => {
    if (value !== 0 && value !== state.solution[index]) {
      indexes.add(index);
    }
  });
  return indexes;
}
