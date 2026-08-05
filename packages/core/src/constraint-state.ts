/**
 * 探索中の盤面と制約伝播。**探索ソルバと生成の共有部品**である。
 *
 * ここを 2 つ持つと、生成で作った問題を探索ソルバが解けないという事故が起きる。
 * 公開はしない(`index.ts` から export しない)。使うのは `core` の中だけ。
 *
 * 使用済みの数字を単位ごとのビットマスクで持つので、候補は
 * 「行 | 列 | ブロック の使用済み」をビット反転するだけで求まる。
 */

import type { Board } from "./board";
import {
  ALL_CANDIDATES,
  BOARD_SIZE,
  BOX_OF,
  CELL_COUNT,
  COLUMN_OF,
  ROW_OF,
  UNIT_COUNT,
  UNITS,
  countCandidates,
  lowestDigit,
  maskOfDigit,
} from "./board";

/** 探索中の盤面。 */
export type ConstraintState = {
  readonly cells: Uint8Array;
  readonly rowMask: Uint16Array;
  readonly columnMask: Uint16Array;
  readonly boxMask: Uint16Array;
  emptyCount: number;
};

/**
 * Hidden Single を探すときの「数字 → その単位で置ける最初のセル」。
 *
 * 添字は数字 1〜9、値は「セルの添字 + 1」(0 を未設定に使うため)。
 * {@link propagate} の 1 回の呼び出しの中でしか使わない(入れ子にならない)ので、
 * 毎回確保せず使い回す。
 */
const hiddenSinglePosition = new Int16Array(BOARD_SIZE + 1);

/** そのセルに置ける数字のビットマスク。 */
export function candidateMaskAt(state: ConstraintState, index: number): number {
  const used =
    state.rowMask[ROW_OF[index]] |
    state.columnMask[COLUMN_OF[index]] |
    state.boxMask[BOX_OF[index]];
  return ALL_CANDIDATES & ~used;
}

/** 数字を置く。置けるかどうかは呼び出し側が確かめてから呼ぶ。 */
export function place(state: ConstraintState, index: number, digit: number): void {
  const bit = maskOfDigit(digit);
  state.cells[index] = digit;
  state.rowMask[ROW_OF[index]] |= bit;
  state.columnMask[COLUMN_OF[index]] |= bit;
  state.boxMask[BOX_OF[index]] |= bit;
  state.emptyCount -= 1;
}

/** 置いた数字を取り消す。 */
export function unplace(state: ConstraintState, index: number): void {
  const bit = maskOfDigit(state.cells[index]);
  state.cells[index] = 0;
  state.rowMask[ROW_OF[index]] &= ~bit;
  state.columnMask[COLUMN_OF[index]] &= ~bit;
  state.boxMask[BOX_OF[index]] &= ~bit;
  state.emptyCount += 1;
}

/** 空の状態を作る。 */
export function createEmptyState(): ConstraintState {
  return {
    cells: new Uint8Array(CELL_COUNT),
    rowMask: new Uint16Array(BOARD_SIZE),
    columnMask: new Uint16Array(BOARD_SIZE),
    boxMask: new Uint16Array(BOARD_SIZE),
    emptyCount: CELL_COUNT,
  };
}

/** 手がかりを置いた状態を作る。手がかりが規則に反していれば `null`。 */
export function createState(board: Board): ConstraintState | null {
  if (board.length !== CELL_COUNT) {
    throw new Error(`盤面の長さが ${String(CELL_COUNT)} でない`);
  }
  const state = createEmptyState();
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const digit = board[index];
    if (digit === 0) continue;
    if (digit > BOARD_SIZE) return null;
    if ((candidateMaskAt(state, index) & maskOfDigit(digit)) === 0) return null;
    place(state, index, digit);
  }
  return state;
}

/**
 * 制約伝播(Naked Single と Hidden Single)。矛盾が出たら `false`。
 *
 * **分岐する前にこれを尽くす。** 省くと探索木が桁で大きくなる。
 *
 * 置いたセルは `trail` へ積む。呼び出し側が {@link undoTrail} で巻き戻す。
 */
export function propagate(state: ConstraintState, trail: number[]): boolean {
  for (;;) {
    let progressed = false;

    // Naked Single —— 候補が 1 個のセルを埋める。
    for (let index = 0; index < CELL_COUNT; index += 1) {
      if (state.cells[index] !== 0) continue;
      const mask = candidateMaskAt(state, index);
      if (mask === 0) return false;
      if (countCandidates(mask) !== 1) continue;
      place(state, index, lowestDigit(mask));
      trail.push(index);
      progressed = true;
    }
    if (state.emptyCount === 0) return true;

    // Hidden Single —— ある単位で 1 か所にしか入らない数字を埋める。
    for (let unitIndex = 0; unitIndex < UNIT_COUNT; unitIndex += 1) {
      const unit = UNITS[unitIndex];
      let placedMask = 0;
      let onceMask = 0;
      let twiceMask = 0;
      hiddenSinglePosition.fill(0);

      for (let position = 0; position < BOARD_SIZE; position += 1) {
        const cell = unit[position];
        const digit = state.cells[cell];
        if (digit !== 0) {
          placedMask |= maskOfDigit(digit);
          continue;
        }
        const mask = candidateMaskAt(state, cell);
        twiceMask |= onceMask & mask;
        onceMask |= mask;
        for (let rest = mask; rest !== 0; rest &= rest - 1) {
          const candidate = lowestDigit(rest);
          if (hiddenSinglePosition[candidate] === 0) {
            hiddenSinglePosition[candidate] = cell + 1;
          }
        }
      }

      // この単位に足りていない数字のうち、置ける場所が 1 つも無いものがあれば矛盾。
      const missingMask = ALL_CANDIDATES & ~placedMask;
      if ((missingMask & ~onceMask) !== 0) return false;

      const singles = missingMask & onceMask & ~twiceMask;
      if (singles === 0) continue;

      // 1 つ置くと同じ単位の他の候補が古くなるので、置いたら次の単位へ移る。
      const digit = lowestDigit(singles);
      place(state, hiddenSinglePosition[digit] - 1, digit);
      trail.push(hiddenSinglePosition[digit] - 1);
      progressed = true;
      if (state.emptyCount === 0) return true;
    }

    if (!progressed) return true;
  }
}

/** `trail` に積んだ置き方を巻き戻す。 */
export function undoTrail(state: ConstraintState, trail: number[]): void {
  for (let position = trail.length - 1; position >= 0; position -= 1) {
    unplace(state, trail[position]);
  }
}

/**
 * 候補数が最小の空きセルを返す(most constrained variable)。空きが無ければ `-1`。
 *
 * 分岐の幅が最小になり、探索木が小さくなる。
 *
 * `stopAt` はそれ以下の候補数を見つけた時点で走査を打ち切る値。
 * **伝播を尽くした直後は候補が 1 個以下のセルが残っていない**ので、
 * 探索から呼ぶときは 2 を渡して残りの走査を省ける。
 */
export function findMostConstrainedCell(state: ConstraintState, stopAt = 1): number {
  let bestIndex = -1;
  let bestCount = BOARD_SIZE + 1;
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (state.cells[index] !== 0) continue;
    const count = countCandidates(candidateMaskAt(state, index));
    if (count >= bestCount) continue;
    bestIndex = index;
    bestCount = count;
    if (count <= stopAt) break;
  }
  return bestIndex;
}
