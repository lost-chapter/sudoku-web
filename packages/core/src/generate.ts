/**
 * 問題の生成(docs/algorithms/board-generation.md)。
 *
 * いまあるのは 1 段目「完成盤を作る」。穴あけと難易度の評価は工程 2 の 4 と 5。
 *
 * **乱数は引数で受け取る。** `core` は乱数を内部で作らない。
 * 同じ乱数(同じシード)からは同じ完成盤ができる。
 *
 * ⚠️ **同型変換(数字の置換・行や列の入替・転置)で量産してはいけない。**
 * 見た目が違うだけの同じパズルになり、**難易度も解き筋も完全に同一**になる。
 * **完成盤は毎回バックトラッキングで作る。**
 */

import type { Board } from "./board";
import {
  ALL_CANDIDATES,
  BOARD_SIZE,
  BOX_SIZE,
  candidateDigits,
  cloneBoard,
  countCandidates,
} from "./board";
import type { ConstraintState } from "./constraint-state";
import {
  candidateMaskAt,
  createEmptyState,
  findMostConstrainedCell,
  place,
  propagate,
  undoTrail,
  unplace,
} from "./constraint-state";
import type { Random } from "./random";
import { shuffled } from "./random";

/**
 * 上段バンド(1〜3 行目)のセル。
 *
 * ここと第 1 列を先に埋めると、**探索対象が 81 マスから 48 マスへ減る**。
 */
const TOP_BAND_CELLS: number[] = [];

for (let index = 0; index < BOARD_SIZE * BOX_SIZE; index += 1) {
  TOP_BAND_CELLS.push(index);
}

/** 第 1 列のうち、上段バンドより下の 6 マス。 */
const FIRST_COLUMN_BELOW_BAND: number[] = [];

for (let row = BOX_SIZE; row < BOARD_SIZE; row += 1) {
  FIRST_COLUMN_BELOW_BAND.push(row * BOARD_SIZE);
}

/**
 * 上段バンドと第 1 列からやり直す回数の上限。
 *
 * **10,000 個の生成で 1 回もやり直しが起きなかった**(バンドと第 1 列の埋め方は
 * 必ず完成盤へ延ばせる)。
 * ここは「万一延ばせない埋め方があっても止まらない」ための保険であり、
 * **上限に達したら例外を投げる**(黙って質の違う盤面を返さない)。
 */
const MAX_ATTEMPTS = 20;

/**
 * 指定したセルだけをランダムな数字で埋める(制約伝播を使わない総当たり)。
 *
 * 伝播を使わないのは、**指定範囲の外のセルまで埋めてしまわないため**である。
 */
function fillCells(state: ConstraintState, cells: readonly number[], random: Random): boolean {
  let bestIndex = -1;
  let bestMask = 0;
  let bestCount = BOARD_SIZE + 1;
  for (const cell of cells) {
    if (state.cells[cell] !== 0) continue;
    const mask = candidateMaskAt(state, cell);
    const count = countCandidates(mask);
    if (count === 0) return false;
    if (count >= bestCount) continue;
    bestIndex = cell;
    bestMask = mask;
    bestCount = count;
  }
  if (bestIndex === -1) return true;

  for (const digit of shuffled(random, candidateDigits(bestMask))) {
    place(state, bestIndex, digit);
    if (fillCells(state, cells, random)) return true;
    unplace(state, bestIndex);
  }
  return false;
}

/**
 * 第 1 列の下 6 マスを埋める。**バックトラッキングは要らない。**
 *
 * この 6 マスが属するブロック(4 番目と 7 番目)と行はまだ空なので、
 * 列に足りない 6 個の数字をどう並べても規則に反しない。
 */
function fillFirstColumnBelowBand(state: ConstraintState, random: Random): void {
  const missing = candidateDigits(ALL_CANDIDATES & ~state.columnMask[0]);
  const digits = shuffled(random, missing);
  for (let position = 0; position < FIRST_COLUMN_BELOW_BAND.length; position += 1) {
    place(state, FIRST_COLUMN_BELOW_BAND[position], digits[position]);
  }
}

/**
 * 残りのマスをランダムな数字で埋める。
 *
 * 分岐の前に制約伝播を尽くし、候補数が最小の空きセルから分岐する
 * (探索ソルバと同じ進め方。違うのは候補を試す順を乱数で決めることだけ)。
 */
function fillRest(state: ConstraintState, random: Random): boolean {
  const trail: number[] = [];
  if (!propagate(state, trail)) {
    undoTrail(state, trail);
    return false;
  }
  if (state.emptyCount === 0) return true;

  const branchIndex = findMostConstrainedCell(state, 2);
  for (const digit of shuffled(random, candidateDigits(candidateMaskAt(state, branchIndex)))) {
    place(state, branchIndex, digit);
    if (fillRest(state, random)) return true;
    unplace(state, branchIndex);
  }

  undoTrail(state, trail);
  return false;
}

/**
 * 完成盤(81 マスすべてが埋まり規則を満たす盤面)を作る。
 *
 * **同じ乱数からは同じ完成盤ができる。** 乱数はシードから作る
 * (`createRandom`)。本質的に異なる完成盤は 54 億通りあるので枯渇の心配は無い。
 */
export function generateSolvedBoard(random: Random): Board {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const state = createEmptyState();
    if (!fillCells(state, TOP_BAND_CELLS, random)) continue;
    fillFirstColumnBelowBand(state, random);
    if (fillRest(state, random)) return cloneBoard(state.cells);
  }
  throw new Error(`完成盤を ${String(MAX_ATTEMPTS)} 回試しても作れなかった`);
}
