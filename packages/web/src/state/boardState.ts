import { BOARD_SIZE, CELL_COUNT } from "@sudoku/core";

import type { Puzzle } from "../features/puzzle/types";

/**
 * 盤面の状態と、その遷移。
 *
 * **React を知らない純粋な reducer として書く**
 * (docs/architecture/system-architecture.md の「状態管理は reducer に寄せる」)。
 * React へは `useReducer` でつなぐだけにしてある。理由は 2 つ。
 *
 * - **取り消し(undo)が自然に書ける。** action を積めば履歴になる
 * - **盤面の振る舞いを React 抜きでテストできる**
 *
 * ⚠️ **数独の規則(重複の検出・解法)はここに書かない。** それは `core` の責務である。
 * ここが持つのは「遊技者の操作で盤面がどう変わるか」だけ。
 */

/** セルの位置。0〜80。左上が 0 で、行優先に並ぶ。 */
export type CellIndex = number;

export interface BoardState {
  /** 手がかり。81 要素。0 は空きマス。**遊技中は変わらない。** */
  readonly givens: readonly number[];
  /** 遊技者が入れた数字。81 要素。0 は未入力。 */
  readonly entries: readonly number[];
  /** 解。完成の判定に使う(解が問題ファイルに入っているのでソルバは要らない)。 */
  readonly solution: readonly number[];
  /** 選択中のセル。**常に 1 つで、選択が無い状態は持たない。** */
  readonly selected: CellIndex;
}

export type Direction = "up" | "down" | "left" | "right";

export type BoardAction =
  | { readonly type: "selectCell"; readonly index: CellIndex }
  | { readonly type: "moveSelection"; readonly direction: Direction }
  | { readonly type: "inputDigit"; readonly digit: number }
  | { readonly type: "clearCell" };

/**
 * 問題から初期状態を作る。
 *
 * **選択は最初の空きマスに置く。** 遊技者がクリックしなくても
 * キーボードだけで遊び始められるようにするため
 * (docs/ui/screens-and-interactions.md の「キーボードだけで最初から最後まで遊べること」)。
 */
export function createBoardState(puzzle: Puzzle): BoardState {
  const firstEmpty = puzzle.givens.findIndex((value) => value === 0);
  return {
    givens: puzzle.givens,
    entries: new Array<number>(CELL_COUNT).fill(0),
    solution: puzzle.solution,
    selected: firstEmpty === -1 ? 0 : firstEmpty,
  };
}

/**
 * 盤面を 1 手進める。
 *
 * **何も起きない操作では state をそのまま返す。**
 * 「手がかりのセルへの入力は何も起きない」を呼び出し側で判定させないためと、
 * React の再描画を省くためである。
 */
export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "selectCell": {
      if (!isCellIndex(action.index) || action.index === state.selected) {
        return state;
      }
      return { ...state, selected: action.index };
    }

    case "moveSelection": {
      const moved = moveIndex(state.selected, action.direction);
      if (moved === state.selected) {
        return state;
      }
      return { ...state, selected: moved };
    }

    case "inputDigit": {
      if (!isDigit(action.digit) || isGiven(state, state.selected)) {
        return state;
      }
      // 同じ数字をもう一度入れたら消す(トグル)。
      const next = state.entries[state.selected] === action.digit ? 0 : action.digit;
      return withEntry(state, state.selected, next);
    }

    case "clearCell": {
      if (isGiven(state, state.selected)) {
        return state;
      }
      return withEntry(state, state.selected, 0);
    }
  }
}

/** そのセルが手がかりか。**手がかりは書き換えられない。** */
export function isGiven(state: BoardState, index: CellIndex): boolean {
  return state.givens[index] !== 0;
}

/** そのセルに見えている数字。0 は空。 */
export function valueAt(state: BoardState, index: CellIndex): number {
  return state.givens[index] !== 0 ? state.givens[index] : state.entries[index];
}

/**
 * 解き終わったか。
 *
 * **解と突き合わせるだけで、ソルバは呼ばない。**
 * 解は問題ファイルに入っている(docs/api/puzzle-file-format.md「なぜ解も持つのか」)。
 */
export function isComplete(state: BoardState): boolean {
  return state.solution.every((value, index) => valueAt(state, index) === value);
}

/** 行(0〜8)。 */
export function rowOf(index: CellIndex): number {
  return Math.floor(index / BOARD_SIZE);
}

/** 列(0〜8)。 */
export function columnOf(index: CellIndex): number {
  return index % BOARD_SIZE;
}

function withEntry(state: BoardState, index: CellIndex, value: number): BoardState {
  if (state.entries[index] === value) {
    return state;
  }
  const entries = [...state.entries];
  entries[index] = value;
  return { ...state, entries };
}

/** **端では止まる。**(反対側へ回り込まない: 画面構成と操作仕様の「セルの選択」) */
function moveIndex(index: CellIndex, direction: Direction): CellIndex {
  const row = rowOf(index);
  const column = columnOf(index);
  const last = BOARD_SIZE - 1;

  switch (direction) {
    case "up":
      return row === 0 ? index : index - BOARD_SIZE;
    case "down":
      return row === last ? index : index + BOARD_SIZE;
    case "left":
      return column === 0 ? index : index - 1;
    case "right":
      return column === last ? index : index + 1;
  }
}

function isCellIndex(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < CELL_COUNT;
}

function isDigit(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= BOARD_SIZE;
}
