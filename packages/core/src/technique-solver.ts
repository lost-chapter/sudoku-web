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
 * 実装しているのは**レベル 1〜7**。
 * 1〜4 が基本手筋、5 が魚(X-Wing / Swordfish / Jellyfish)、
 * 6 が Wing(XY-Wing / XYZ-Wing)、7 が X-Chain(単一数字の彩色)である。
 *
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
  | "hidden-quad"
  | "x-wing"
  | "swordfish"
  | "jellyfish"
  | "xy-wing"
  | "xyz-wing"
  | "x-chain";

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
  "x-wing": 5,
  swordfish: 5,
  jellyfish: 5,
  "xy-wing": 6,
  "xyz-wing": 6,
  "x-chain": 7,
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
  "x-wing": 30,
  swordfish: 36,
  jellyfish: 42,
  "xy-wing": 50,
  "xyz-wing": 55,
  "x-chain": 70,
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

const FISH_NAMES: Record<number, TechniqueName> = {
  2: "x-wing",
  3: "swordfish",
  4: "jellyfish",
};

/**
 * X-Wing / Swordfish / Jellyfish(魚)。
 *
 * ある数字について、**`size` 個の行での候補位置が `size` 個の列に収まる**なら、
 * その数字はその列の**他の行**には入らない(行と列を入れ替えても成り立つ)。
 *
 * 行を土台にする場合と列を土台にする場合の 2 通りを見る。
 */
function findFish(state: TechniqueState, size: number): TechniqueStep | null {
  for (let digit = 1; digit <= BOARD_SIZE; digit += 1) {
    const bit = maskOfDigit(digit);

    for (const baseIsRow of [true, false]) {
      // 土台ごとの候補位置(9 ビット)。位置は覆う側の番号。
      const positionsOf: number[] = [];
      const baseLines: number[] = [];
      for (let line = 0; line < BOARD_SIZE; line += 1) {
        let positions = 0;
        for (let offset = 0; offset < BOARD_SIZE; offset += 1) {
          const cell = baseIsRow ? line * BOARD_SIZE + offset : offset * BOARD_SIZE + line;
          if (state.cells[cell] !== 0) continue;
          if ((state.candidates[cell] & bit) !== 0) positions |= 1 << offset;
        }
        // 1 か所だけの行は Hidden Single なので、ここでは扱わない。
        const count = countCandidates(positions);
        if (count < 2 || count > size) continue;
        baseLines.push(line);
        positionsOf.push(positions);
      }
      if (baseLines.length < size) continue;

      let result: TechniqueStep | null = null;
      const found = forEachCombination(baseLines.length, size, (chosen) => {
        let cover = 0;
        for (const position of chosen) cover |= positionsOf[position];
        if (countCandidates(cover) !== size) return false;

        const base = [...chosen].map((position) => baseLines[position]);
        const cells: number[] = [];
        for (const line of base) {
          for (let offset = 0; offset < BOARD_SIZE; offset += 1) {
            if ((cover & (1 << offset)) === 0) continue;
            const cell = baseIsRow ? line * BOARD_SIZE + offset : offset * BOARD_SIZE + line;
            if (state.cells[cell] === 0 && (state.candidates[cell] & bit) !== 0) cells.push(cell);
          }
        }

        const eliminations: Elimination[] = [];
        for (let line = 0; line < BOARD_SIZE; line += 1) {
          if (base.includes(line)) continue;
          for (let offset = 0; offset < BOARD_SIZE; offset += 1) {
            if ((cover & (1 << offset)) === 0) continue;
            const cell = baseIsRow ? line * BOARD_SIZE + offset : offset * BOARD_SIZE + line;
            if (state.cells[cell] !== 0) continue;
            if ((state.candidates[cell] & bit) === 0) continue;
            eliminations.push({ index: cell, digit });
          }
        }
        if (eliminations.length === 0) return false;

        result = step(
          FISH_NAMES[size],
          cells.sort((a, b) => a - b),
          null,
          eliminations,
        );
        return true;
      });
      if (found) return result;
    }
  }
  return null;
}

/** 2 つのセルが規則を共有するか(同じ行・列・ブロック)。自分自身は含めない。 */
function sees(a: number, b: number): boolean {
  if (a === b) return false;
  return ROW_OF[a] === ROW_OF[b] || COLUMN_OF[a] === COLUMN_OF[b] || BOX_OF[a] === BOX_OF[b];
}

/**
 * XY-Wing / XYZ-Wing。
 *
 * - **XY-Wing** …… 候補 2 個の軸 `{a,b}` と、それを見る候補 2 個の枝 `{a,c}` `{b,c}`。
 *   軸がどちらでも、枝のどちらかが `c` になるので、**両方の枝を見るセルから `c` を消せる**
 * - **XYZ-Wing** …… 軸が `{a,b,c}` の 3 候補。軸自身も `c` になりうるので、
 *   **軸と両方の枝を見るセル**からしか消せない
 */
function findWing(state: TechniqueState, withZ: boolean): TechniqueStep | null {
  const pivotSize = withZ ? 3 : 2;

  for (let pivot = 0; pivot < CELL_COUNT; pivot += 1) {
    if (state.cells[pivot] !== 0) continue;
    const pivotMask = state.candidates[pivot];
    if (countCandidates(pivotMask) !== pivotSize) continue;

    const peers = PEERS[pivot].filter(
      (cell) => state.cells[cell] === 0 && countCandidates(state.candidates[cell]) === 2,
    );

    for (let first = 0; first < peers.length; first += 1) {
      for (let second = first + 1; second < peers.length; second += 1) {
        const x = peers[first];
        const y = peers[second];
        const maskX = state.candidates[x];
        const maskY = state.candidates[y];

        // 枝どうしが共有するのはちょうど 1 つの数字(これが消える数字になる)。
        const shared = maskX & maskY;
        if (countCandidates(shared) !== 1) continue;
        const digit = lowestDigit(shared);

        if (withZ) {
          // XYZ-Wing …… 枝は軸の候補に収まり、2 つ合わせて軸と一致する。
          // 共有の数字は軸にも入っているので、軸自身も候補として残る。
          if ((maskX | maskY) !== pivotMask) continue;
        } else {
          // XY-Wing …… 共有の数字は軸に無い。
          // 枝はそれぞれ「軸と共有する 1 つ」+「共有の数字」でできていて、
          // 軸と共有する数字は 2 つの枝で異なる。
          if ((pivotMask & shared) !== 0) continue;
          const fromX = maskX & pivotMask;
          const fromY = maskY & pivotMask;
          if (countCandidates(fromX) !== 1 || countCandidates(fromY) !== 1) continue;
          if (fromX === fromY) continue;
          if (maskX !== (fromX | shared) || maskY !== (fromY | shared)) continue;
        }

        const bit = maskOfDigit(digit);
        const eliminations: Elimination[] = [];
        for (let cell = 0; cell < CELL_COUNT; cell += 1) {
          if (cell === pivot || cell === x || cell === y) continue;
          if (state.cells[cell] !== 0) continue;
          if ((state.candidates[cell] & bit) === 0) continue;
          if (!sees(cell, x) || !sees(cell, y)) continue;
          // XYZ-Wing は軸も c になりうるので、軸も見えていないと消せない。
          if (withZ && !sees(cell, pivot)) continue;
          eliminations.push({ index: cell, digit });
        }
        if (eliminations.length === 0) continue;

        return step(
          withZ ? "xyz-wing" : "xy-wing",
          [pivot, x, y].sort((a, b) => a - b),
          null,
          eliminations,
        );
      }
    }
  }
  return null;
}

/**
 * X-Chain(単一数字の彩色)。
 *
 * ある数字について、**その数字が 2 か所にしか入らない単位**を強いつながりとみなし、
 * つながった塊を 2 色に塗り分ける。同じ色は「全部入る」か「全部入らない」のどちらかになる。
 *
 * - **同じ色どうしが見え合っていたら、その色は全部入らない**(消せる)
 * - **両方の色を見ているセルには、その数字は入らない**(どちらかの色が必ず入るため)
 */
function findXChain(state: TechniqueState): TechniqueStep | null {
  for (let digit = 1; digit <= BOARD_SIZE; digit += 1) {
    const bit = maskOfDigit(digit);

    // 強いつながり。ある単位でこの数字が 2 か所にしか入らないときに張る。
    const links = new Map<number, number[]>();
    for (let unitIndex = 0; unitIndex < UNIT_COUNT; unitIndex += 1) {
      const cells = candidateCellsOf(state, UNITS[unitIndex], digit);
      if (cells.length !== 2) continue;
      for (const [from, to] of [
        [cells[0], cells[1]],
        [cells[1], cells[0]],
      ]) {
        const list = links.get(from) ?? [];
        if (!list.includes(to)) list.push(to);
        links.set(from, list);
      }
    }
    if (links.size === 0) continue;

    const colorOf = new Map<number, number>();
    for (const start of [...links.keys()].sort((a, b) => a - b)) {
      if (colorOf.has(start)) continue;

      // 塊を 2 色に塗る。始点は必ず塊の中で最小の添字なので、塗り方は決定的。
      const component: number[] = [start];
      colorOf.set(start, 0);
      for (let position = 0; position < component.length; position += 1) {
        const cell = component[position];
        const color = colorOf.get(cell) ?? 0;
        for (const next of (links.get(cell) ?? []).toSorted((a, b) => a - b)) {
          if (colorOf.has(next)) continue;
          colorOf.set(next, 1 - color);
          component.push(next);
        }
      }
      component.sort((a, b) => a - b);

      const colored = [
        component.filter((cell) => colorOf.get(cell) === 0),
        component.filter((cell) => colorOf.get(cell) === 1),
      ];

      // 同じ色どうしが見え合っていたら、その色は全部消える。
      for (const group of colored) {
        const conflict = group.some((a) => group.some((b) => a !== b && sees(a, b)));
        if (!conflict) continue;
        const eliminations = group.map((cell) => ({ index: cell, digit }));
        return step("x-chain", component, null, eliminations);
      }

      // 両方の色を見ているセルからは消せる。
      const eliminations: Elimination[] = [];
      for (let cell = 0; cell < CELL_COUNT; cell += 1) {
        if (state.cells[cell] !== 0 || component.includes(cell)) continue;
        if ((state.candidates[cell] & bit) === 0) continue;
        if (!colored[0].some((other) => sees(cell, other))) continue;
        if (!colored[1].some((other) => sees(cell, other))) continue;
        eliminations.push({ index: cell, digit });
      }
      if (eliminations.length > 0) return step("x-chain", component, null, eliminations);
    }
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
    findHiddenSubset(state, 4) ??
    findFish(state, 2) ??
    findFish(state, 3) ??
    findFish(state, 4) ??
    findWing(state, false) ??
    findWing(state, true) ??
    findXChain(state)
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
