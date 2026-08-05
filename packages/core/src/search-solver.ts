/**
 * 探索ソルバ。解を求める / 解の個数を数える(docs/algorithms/solver.md)。
 *
 * 手筋ソルバとは役割が違うので混ぜない。
 * こちらは「解けるか」を、手筋ソルバは「どう解けるか」を答える。
 * 難易度は手筋ソルバからしか出ない。
 *
 * 進め方は 3 段。
 *
 *   1. 制約伝播を尽くす(Naked Single / Hidden Single)。矛盾が出たら即座に失敗
 *   2. 候補数が最小の空きセルを選ぶ(most constrained variable)
 *   3. その候補を昇順に試して再帰する
 *
 * **分岐する前に伝播を尽くす。** 省くと探索木が桁で大きくなる。
 *
 * 探索順に乱数を混ぜない。同じ盤面からは常に同じ解が同じ順で出る。
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
  cloneBoard,
  countCandidates,
  lowestDigit,
  maskOfDigit,
} from "./board";

/**
 * 探索中の盤面。
 *
 * 使用済みの数字を単位ごとのビットマスクで持つので、候補は
 * 「行 | 列 | ブロック の使用済み」をビット反転するだけで求まる。
 */
type SearchState = {
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
 * 呼び出しの入れ子が起きない範囲でしか使わないので、毎回確保せず使い回す。
 */
const hiddenSinglePosition = new Int16Array(BOARD_SIZE + 1);

function candidateMaskAt(state: SearchState, index: number): number {
  const used =
    state.rowMask[ROW_OF[index]] |
    state.columnMask[COLUMN_OF[index]] |
    state.boxMask[BOX_OF[index]];
  return ALL_CANDIDATES & ~used;
}

function place(state: SearchState, index: number, digit: number): void {
  const bit = maskOfDigit(digit);
  state.cells[index] = digit;
  state.rowMask[ROW_OF[index]] |= bit;
  state.columnMask[COLUMN_OF[index]] |= bit;
  state.boxMask[BOX_OF[index]] |= bit;
  state.emptyCount -= 1;
}

function unplace(state: SearchState, index: number): void {
  const digit = state.cells[index];
  const bit = maskOfDigit(digit);
  state.cells[index] = 0;
  state.rowMask[ROW_OF[index]] &= ~bit;
  state.columnMask[COLUMN_OF[index]] &= ~bit;
  state.boxMask[BOX_OF[index]] &= ~bit;
  state.emptyCount += 1;
}

/** 手がかりを置いた状態を作る。手がかりが規則に反していれば `null`。 */
function createState(board: Board): SearchState | null {
  if (board.length !== CELL_COUNT) {
    throw new Error(`盤面の長さが ${String(CELL_COUNT)} でない`);
  }
  const state: SearchState = {
    cells: new Uint8Array(CELL_COUNT),
    rowMask: new Uint16Array(BOARD_SIZE),
    columnMask: new Uint16Array(BOARD_SIZE),
    boxMask: new Uint16Array(BOARD_SIZE),
    emptyCount: CELL_COUNT,
  };
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
 * 制約伝播。矛盾が出たら `false`。
 *
 * 置いたセルは `trail` へ積む。呼び出し側が {@link undoTrail} で巻き戻す。
 */
function propagate(state: SearchState, trail: number[]): boolean {
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

function undoTrail(state: SearchState, trail: number[]): void {
  for (let position = trail.length - 1; position >= 0; position -= 1) {
    unplace(state, trail[position]);
  }
}

function search(state: SearchState, limit: number, solutions: Board[]): void {
  const trail: number[] = [];
  if (!propagate(state, trail)) {
    undoTrail(state, trail);
    return;
  }
  if (state.emptyCount === 0) {
    solutions.push(cloneBoard(state.cells));
    undoTrail(state, trail);
    return;
  }

  // 候補数が最小の空きセルを選ぶ。伝播済みなので最小でも 2 個ある。
  let bestIndex = -1;
  let bestMask = 0;
  let bestCount = BOARD_SIZE + 1;
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (state.cells[index] !== 0) continue;
    const mask = candidateMaskAt(state, index);
    const count = countCandidates(mask);
    if (count >= bestCount) continue;
    bestIndex = index;
    bestMask = mask;
    bestCount = count;
    if (count === 2) break;
  }

  for (let rest = bestMask; rest !== 0; rest &= rest - 1) {
    place(state, bestIndex, lowestDigit(rest));
    search(state, limit, solutions);
    unplace(state, bestIndex);
    if (solutions.length >= limit) break;
  }

  undoTrail(state, trail);
}

/**
 * 解を最大 `limit` 個まで求める。入力の盤面は書き換えない。
 *
 * `limit` を超える解があっても探索を打ち切るので、戻り値の長さは
 * 「解がちょうどこれだけある」ではなく「これ以上ある」の意味になりうる。
 */
export function findSolutions(board: Board, limit: number): Board[] {
  if (limit < 1) return [];
  const state = createState(board);
  if (state === null) return [];
  const solutions: Board[] = [];
  search(state, limit, solutions);
  return solutions;
}

/**
 * 解の個数を `limit` で打ち切って数える(既定は 2)。
 *
 *   0 …… 解なし(矛盾している)
 *   1 …… 一意解。これだけが問題として成立する
 *   2 …… 複数解(2 個目を見つけた時点で打ち切ったので「2 以上」の意味)
 *
 * **「全部数える」必要は一度も無い。** 一意かどうかしか使わないため、
 * 上限を付けないと最悪ケースで無駄に探索し続ける。
 */
export function countSolutions(board: Board, limit = 2): number {
  return findSolutions(board, limit).length;
}

/** 解が 1 つに定まるか。生成した問題が問題として成立するかの判定。 */
export function hasUniqueSolution(board: Board): boolean {
  return countSolutions(board, 2) === 1;
}

/**
 * 解を 1 つ求める。解が無ければ `null`。入力の盤面は書き換えない。
 *
 * 複数解があるときにどれが返るかは探索順で決まる(常に同じものが返る)。
 */
export function solveBoard(board: Board): Board | null {
  return findSolutions(board, 1)[0] ?? null;
}
