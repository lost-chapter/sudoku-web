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
 * 状態と伝播は `constraint-state.ts`(生成と共有)。
 *
 * 探索順に乱数を混ぜない。同じ盤面からは常に同じ解が同じ順で出る。
 */

import type { Board } from "./board";
import { cloneBoard, lowestDigit } from "./board";
import type { ConstraintState } from "./constraint-state";
import {
  candidateMaskAt,
  createState,
  findMostConstrainedCell,
  place,
  propagate,
  undoTrail,
  unplace,
} from "./constraint-state";

function search(state: ConstraintState, limit: number, solutions: Board[]): void {
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

  // 伝播済みなので、最小の候補数でも 2 個ある。
  const branchIndex = findMostConstrainedCell(state, 2);
  const branchMask = candidateMaskAt(state, branchIndex);

  for (let rest = branchMask; rest !== 0; rest &= rest - 1) {
    place(state, branchIndex, lowestDigit(rest));
    search(state, limit, solutions);
    unplace(state, branchIndex);
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
