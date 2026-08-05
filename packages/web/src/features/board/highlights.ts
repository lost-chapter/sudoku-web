import { CELL_COUNT, PEERS } from "@sudoku/core";

import { valueAt, type BoardState, type CellIndex } from "../../state/boardState";
import type { Settings } from "../settings/settings";

/**
 * 盤面に重ねる補助表示。**どのセルに何を出すか**だけを決める。
 *
 * 見た目は CSS の責務なので、ここは添字の集合を返すに留める。
 * React を通さずに検証できるよう純粋関数にしてある。
 *
 * ⚠️ **2026-08-06 に「矛盾」と「誤り」を消した**(発注者の要望)。
 * **間違いを教えない**のがこのアプリの方針である。
 * `core` の `findConflicts` は残っているが、**web からは呼ばない。**
 */
export interface BoardHighlights {
  /** 選択中のセルと同じ数字。 */
  readonly sameDigit: ReadonlySet<CellIndex>;
  /** 選択中のセルが属する行・列・ブロック。 */
  readonly units: ReadonlySet<CellIndex>;
}

const EMPTY: ReadonlySet<CellIndex> = new Set();

export function computeHighlights(state: BoardState, settings: Settings): BoardHighlights {
  return {
    sameDigit: settings.highlightSameDigit ? sameDigitOf(state) : EMPTY,
    units: settings.highlightUnits ? new Set(PEERS[state.selected]) : EMPTY,
  };
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
