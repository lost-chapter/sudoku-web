/**
 * 手筋ソルバ。**人間が使う手筋だけで解き進め、使った手筋を順に記録する**
 * (docs/algorithms/solver.md)。
 *
 * 探索ソルバとは役割が違う。**探索(当て推量)を使わないのが決定的な違い**である。
 * 難易度は手筋ソルバの `steps` からしか出ない(docs/algorithms/difficulty-rating.md)。
 *
 * **簡単な手筋から順に試し、進んだら最初へ戻る。**
 * 同じ盤面で複数の手筋が使えるときは**必ずレベルの低い方を選ぶ**。
 * **この順序が難易度の定義そのものなので、勝手に入れ替えない。**
 *
 * **決定的でなければならない。** 走査順に乱数を混ぜない。
 * 同じ盤面からは常に同じ `steps` が出る。
 *
 * 実装しているのはレベル 1〜4(基本手筋)まで。レベル 5 以降(X-Wing・XY-Wing・
 * チェーン系)は難易度クラスを広げる段階で足す。
 * **実装していない手筋があること自体は問題ではない。**
 * 手筋ソルバで解けない問題は、その難易度クラスに入れずに捨てる。
 */

import type { Board, Candidates } from "./board";
import {
  BOARD_SIZE,
  BOX_OF,
  CELL_COUNT,
  COLUMN_OF,
  PEERS,
  ROW_OF,
  UNITS,
  UNIT_COUNT,
  cloneBoard,
  computeCandidates,
  countCandidates,
  lowestDigit,
  maskOfDigit,
} from "./board";

/** 手筋の名前。**この一覧を増やしたらパックの `generatedWith.techniques` も変わる。** */
export type TechniqueName =
  | "naked-single"
  | "hidden-single"
  | "pointing"
  | "claiming"
  | "naked-pair"
  | "hidden-pair"
  | "naked-triple"
  | "hidden-triple"
  | "naked-quad"
  | "hidden-quad";

/**
 * 手筋のレベル(docs/algorithms/difficulty-rating.md の「手筋のレベル」)。
 *
 * **難易度クラスはこの最大値で決まる。**
 */
export const TECHNIQUE_LEVEL: Record<TechniqueName, number> = {
  "naked-single": 1,
  "hidden-single": 1,
  pointing: 2,
  claiming: 2,
  "naked-pair": 3,
  "hidden-pair": 3,
  "naked-triple": 4,
  "hidden-triple": 4,
  "naked-quad": 4,
  "hidden-quad": 4,
};

/**
 * 手筋のスコア。**同じ難易度クラスの中で問題を並べるためだけに使う。**
 *
 * ⚠️ **絶対値に意味は無い。** レベルの並びを崩さないように選んだだけの値であり、
 * Sudoku Explainer のレーティング(Naked Single = 2.3 など)を持ち込んでいない
 * (docs/algorithms/difficulty-rating.md の「参考にしたが採用しなかった方式」)。
 */
export const TECHNIQUE_SCORE: Record<TechniqueName, number> = {
  "naked-single": 1,
  "hidden-single": 2,
  pointing: 5,
  claiming: 5,
  "naked-pair": 8,
  "hidden-pair": 10,
  "naked-triple": 14,
  "hidden-triple": 16,
  "naked-quad": 20,
  "hidden-quad": 24,
};

/** 候補を消す 1 件。 */
export type Elimination = {
  readonly index: number;
  readonly digit: number;
};

/** 手筋を 1 回適用した記録。 */
export type TechniqueStep = {
  readonly technique: TechniqueName;
  readonly level: number;
  /** 根拠になったセル(昇順)。ヒントの表示に使う。 */
  readonly cells: readonly number[];
  /** 数字が確定した場合のセルと数字。候補を消すだけの手筋では `null`。 */
  readonly placement: { readonly index: number; readonly digit: number } | null;
  /** 消えた候補(昇順)。 */
  readonly eliminations: readonly Elimination[];
};

/** 手筋ソルバの結果。 */
export type TechniqueSolveResult = {
  /** 実装済みの手筋だけで解けたか。 */
  readonly solved: boolean;
  /** 進めたところまでの盤面。解けた場合は完成盤。 */
  readonly board: Board;
  /**
   * 適用した手筋の列。
   *
   * **解けなかった場合も途中までを返す。**
   * 「実装済みの手筋では解けない」ことが分かる。
   */
  readonly steps: readonly TechniqueStep[];
};

/** 手筋ソルバが進める盤面。候補は手筋で消えていくので盤面とは独立に持つ。 */
type TechniqueState = {
  readonly cells: Board;
  readonly candidates: Candidates;
  emptyCount: number;
};

function createTechniqueState(board: Board): TechniqueState {
  const cells = cloneBoard(board);
  let emptyCount = 0;
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (cells[index] === 0) emptyCount += 1;
  }
  return { cells, candidates: computeCandidates(cells), emptyCount };
}

function applyStep(state: TechniqueState, step: TechniqueStep): void {
  for (const elimination of step.eliminations) {
    state.candidates[elimination.index] &= ~maskOfDigit(elimination.digit);
  }
  if (step.placement === null) return;

  const { index, digit } = step.placement;
  state.cells[index] = digit;
  state.candidates[index] = 0;
  state.emptyCount -= 1;
  for (const peer of PEERS[index]) {
    state.candidates[peer] &= ~maskOfDigit(digit);
  }
}

function step(
  technique: TechniqueName,
  cells: number[],
  placement: { index: number; digit: number } | null,
  eliminations: Elimination[],
): TechniqueStep {
  return { technique, level: TECHNIQUE_LEVEL[technique], cells, placement, eliminations };
}

/**
 * 大きさ `size` の組み合わせを昇順に列挙する。
 *
 * `visit` が `true` を返したら打ち切る。**添字の配列は使い回す**ので、
 * `visit` の中で保持したいときは複製すること。
 */
function forEachCombination(
  poolSize: number,
  size: number,
  visit: (chosen: Uint8Array) => boolean,
): boolean {
  if (size > poolSize) return false;
  const chosen = new Uint8Array(size);
  const walk = (start: number, depth: number): boolean => {
    if (depth === size) return visit(chosen);
    for (let position = start; position <= poolSize - (size - depth); position += 1) {
      chosen[depth] = position;
      if (walk(position + 1, depth + 1)) return true;
    }
    return false;
  };
  return walk(0, 0);
}

/** 候補が 1 個だけのセルを探す。 */
function findNakedSingle(state: TechniqueState): TechniqueStep | null {
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (state.cells[index] !== 0) continue;
    const mask = state.candidates[index];
    if (countCandidates(mask) !== 1) continue;
    return step("naked-single", [index], { index, digit: lowestDigit(mask) }, []);
  }
  return null;
}

/** ある単位で 1 か所にしか入らない数字を探す。 */
function findHiddenSingle(state: TechniqueState): TechniqueStep | null {
  for (let unitIndex = 0; unitIndex < UNIT_COUNT; unitIndex += 1) {
    const unit = UNITS[unitIndex];
    for (let digit = 1; digit <= BOARD_SIZE; digit += 1) {
      const bit = maskOfDigit(digit);
      let found = -1;
      let count = 0;
      let placed = false;
      for (const cell of unit) {
        if (state.cells[cell] === digit) {
          placed = true;
          break;
        }
        if ((state.candidates[cell] & bit) === 0) continue;
        found = cell;
        count += 1;
        if (count > 1) break;
      }
      if (placed || count !== 1) continue;
      // Naked Single と同じ手なら、簡単な方(Naked Single)が先に見つかっている。
      if (countCandidates(state.candidates[found]) === 1) continue;
      return step("hidden-single", [found], { index: found, digit }, []);
    }
  }
  return null;
}

/** ある単位における、ある数字の候補セルを集める。 */
function candidateCellsOf(state: TechniqueState, unit: Uint8Array, digit: number): number[] {
  const bit = maskOfDigit(digit);
  const cells: number[] = [];
  for (const cell of unit) {
    if (state.cells[cell] !== 0) continue;
    if ((state.candidates[cell] & bit) !== 0) cells.push(cell);
  }
  return cells;
}

function eliminationsOutside(
  state: TechniqueState,
  unit: Uint8Array,
  digit: number,
  keep: readonly number[],
): Elimination[] {
  const bit = maskOfDigit(digit);
  const eliminations: Elimination[] = [];
  for (const cell of unit) {
    if (state.cells[cell] !== 0) continue;
    if (keep.includes(cell)) continue;
    if ((state.candidates[cell] & bit) === 0) continue;
    eliminations.push({ index: cell, digit });
  }
  return eliminations;
}

/**
 * Locked Candidates。
 *
 * - **Pointing** …… ブロック内のある数字の候補が 1 つの行(列)に収まるなら、
 *   その行(列)のブロック外から消せる
 * - **Claiming** …… 行(列)内のある数字の候補が 1 つのブロックに収まるなら、
 *   そのブロックの行(列)外から消せる
 */
function findLockedCandidates(state: TechniqueState): TechniqueStep | null {
  // Pointing —— ブロック(単位 18〜26)から見る。
  for (let box = 0; box < BOARD_SIZE; box += 1) {
    const boxUnit = UNITS[BOARD_SIZE * 2 + box];
    for (let digit = 1; digit <= BOARD_SIZE; digit += 1) {
      const cells = candidateCellsOf(state, boxUnit, digit);
      if (cells.length < 2) continue;

      const sameRow = cells.every((cell) => ROW_OF[cell] === ROW_OF[cells[0]]);
      const sameColumn = cells.every((cell) => COLUMN_OF[cell] === COLUMN_OF[cells[0]]);
      if (!sameRow && !sameColumn) continue;

      const lineUnit = sameRow ? UNITS[ROW_OF[cells[0]]] : UNITS[BOARD_SIZE + COLUMN_OF[cells[0]]];
      const eliminations = eliminationsOutside(state, lineUnit, digit, cells);
      if (eliminations.length === 0) continue;
      return step("pointing", cells, null, eliminations);
    }
  }

  // Claiming —— 行と列(単位 0〜17)から見る。
  for (let unitIndex = 0; unitIndex < BOARD_SIZE * 2; unitIndex += 1) {
    const lineUnit = UNITS[unitIndex];
    for (let digit = 1; digit <= BOARD_SIZE; digit += 1) {
      const cells = candidateCellsOf(state, lineUnit, digit);
      if (cells.length < 2) continue;
      if (!cells.every((cell) => BOX_OF[cell] === BOX_OF[cells[0]])) continue;

      const boxUnit = UNITS[BOARD_SIZE * 2 + BOX_OF[cells[0]]];
      const eliminations = eliminationsOutside(state, boxUnit, digit, cells);
      if (eliminations.length === 0) continue;
      return step("claiming", cells, null, eliminations);
    }
  }

  return null;
}

const NAKED_SUBSET_NAMES: Record<number, TechniqueName> = {
  2: "naked-pair",
  3: "naked-triple",
  4: "naked-quad",
};

const HIDDEN_SUBSET_NAMES: Record<number, TechniqueName> = {
  2: "hidden-pair",
  3: "hidden-triple",
  4: "hidden-quad",
};

/**
 * Naked Pair / Triple / Quad。
 *
 * ある単位の `size` 個のセルの候補の和が `size` 種類なら、
 * その数字は同じ単位の他のセルには入らない。
 */
function findNakedSubset(state: TechniqueState, size: number): TechniqueStep | null {
  let result: TechniqueStep | null = null;
  for (let unitIndex = 0; unitIndex < UNIT_COUNT; unitIndex += 1) {
    const unit = UNITS[unitIndex];
    const emptyCells: number[] = [];
    for (const cell of unit) {
      if (state.cells[cell] === 0) emptyCells.push(cell);
    }
    if (emptyCells.length <= size) continue;

    const found = forEachCombination(emptyCells.length, size, (chosen) => {
      let union = 0;
      for (const position of chosen) union |= state.candidates[emptyCells[position]];
      if (countCandidates(union) !== size) return false;

      const cells = [...chosen].map((position) => emptyCells[position]);
      const eliminations: Elimination[] = [];
      for (const cell of emptyCells) {
        if (cells.includes(cell)) continue;
        const shared = state.candidates[cell] & union;
        for (let rest = shared; rest !== 0; rest &= rest - 1) {
          eliminations.push({ index: cell, digit: lowestDigit(rest) });
        }
      }
      if (eliminations.length === 0) return false;

      result = step(NAKED_SUBSET_NAMES[size], cells, null, eliminations);
      return true;
    });
    if (found) return result;
  }
  return null;
}

/**
 * Hidden Pair / Triple / Quad。
 *
 * ある単位で `size` 種類の数字が `size` 個のセルにしか入らないなら、
 * そのセルからは他の候補を消せる。
 */
function findHiddenSubset(state: TechniqueState, size: number): TechniqueStep | null {
  let result: TechniqueStep | null = null;
  for (let unitIndex = 0; unitIndex < UNIT_COUNT; unitIndex += 1) {
    const unit = UNITS[unitIndex];
    const emptyCells: number[] = [];
    for (const cell of unit) {
      if (state.cells[cell] === 0) emptyCells.push(cell);
    }
    if (emptyCells.length <= size) continue;

    // その単位でまだ置かれていない数字と、その候補位置(単位内の並びのビット)。
    const digits: number[] = [];
    const positionsOf: number[] = [];
    for (let digit = 1; digit <= BOARD_SIZE; digit += 1) {
      const bit = maskOfDigit(digit);
      let positions = 0;
      let placed = false;
      for (let position = 0; position < emptyCells.length; position += 1) {
        if ((state.candidates[emptyCells[position]] & bit) !== 0) positions |= 1 << position;
      }
      for (const cell of unit) {
        if (state.cells[cell] === digit) placed = true;
      }
      if (placed || positions === 0) continue;
      digits.push(digit);
      positionsOf.push(positions);
    }
    if (digits.length <= size) continue;

    const found = forEachCombination(digits.length, size, (chosen) => {
      let positions = 0;
      let digitMask = 0;
      for (const position of chosen) {
        positions |= positionsOf[position];
        digitMask |= maskOfDigit(digits[position]);
      }
      if (countCandidates(positions) !== size) return false;

      const cells: number[] = [];
      const eliminations: Elimination[] = [];
      for (let position = 0; position < emptyCells.length; position += 1) {
        if ((positions & (1 << position)) === 0) continue;
        const cell = emptyCells[position];
        cells.push(cell);
        const extra = state.candidates[cell] & ~digitMask;
        for (let rest = extra; rest !== 0; rest &= rest - 1) {
          eliminations.push({ index: cell, digit: lowestDigit(rest) });
        }
      }
      if (eliminations.length === 0) return false;

      result = step(HIDDEN_SUBSET_NAMES[size], cells, null, eliminations);
      return true;
    });
    if (found) return result;
  }
  return null;
}

/**
 * 次に適用する手筋を 1 つ選ぶ。**レベルの低い順に試す。**
 *
 * 同じレベルの中では Naked を先に、小さい組を先に見る。
 * **この順序を変えると同じ問題の難易度が変わる**ので、
 * docs/algorithms/solver.md と docs/algorithms/difficulty-rating.md を
 * 同時に直さない限り触らないこと。
 */
function findNextStep(state: TechniqueState): TechniqueStep | null {
  return (
    findNakedSingle(state) ??
    findHiddenSingle(state) ??
    findLockedCandidates(state) ??
    findNakedSubset(state, 2) ??
    findHiddenSubset(state, 2) ??
    findNakedSubset(state, 3) ??
    findHiddenSubset(state, 3) ??
    findNakedSubset(state, 4) ??
    findHiddenSubset(state, 4)
  );
}

/** 候補が 1 つも無い空きセルがあるか(その盤面はもう解けない)。 */
function hasDeadCell(state: TechniqueState): boolean {
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (state.cells[index] === 0 && state.candidates[index] === 0) return true;
  }
  return false;
}

/**
 * 実装済みの手筋だけで解く。
 *
 * **解けなかった場合も途中までの `steps` を返す。**
 * 呼び出し側はそれを見て「実装済みの手筋では解けない」と分かる。
 */
export function solveWithTechniques(board: Board): TechniqueSolveResult {
  const state = createTechniqueState(board);
  const steps: TechniqueStep[] = [];

  while (state.emptyCount > 0) {
    if (hasDeadCell(state)) break;
    const next = findNextStep(state);
    if (next === null) break;
    applyStep(state, next);
    steps.push(next);
  }

  return { solved: state.emptyCount === 0, board: state.cells, steps };
}

/**
 * 遊技中のヒント 1 手を返す。解けなくなっていれば `null`。
 *
 * ⚠️ **遊技者が入力した盤面に対して回すこと。**
 * 元の問題に対して回すと、遊技者の入力(誤りを含む)と食い違う。
 */
export function findHint(board: Board): TechniqueStep | null {
  const state = createTechniqueState(board);
  if (hasDeadCell(state)) return null;
  return findNextStep(state);
}
