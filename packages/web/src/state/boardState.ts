import { BOARD_SIZE, CELL_COUNT, maskOfDigit, type Board } from "@sudoku/core";

import type { Puzzle } from "@sudoku/core";

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
  /** 手がかり。0 は空きマス。**遊技中は変わらない。書き換えない。** */
  readonly givens: Board;
  /** 遊技者が入れた数字。81 要素。0 は未入力。**ここだけが遊技で変わる。** */
  readonly entries: readonly number[];
  /** 解。完成の判定に使う(解が問題ファイルに入っているのでソルバは要らない)。 */
  readonly solution: Board;
  /**
   * メモ(候補)。81 要素のビットマスクで、bit n が立っていれば数字 n + 1 を控えている。
   *
   * **`core` の候補と同じ持ち方にしてある**(`maskOfDigit` / `candidateDigits` が使える)。
   * 配列で持つと 1 セルあたり最大 9 個の要素を出し入れすることになる。
   */
  readonly notes: readonly number[];
  /** メモモードか。**入力先が確定値かメモかを決める。** */
  readonly noteMode: boolean;
  /**
   * あきらめたか。**押すと解が出て、そこで終わる。**
   *
   * ⚠️ **終わった状態なので、以後は盤面が変わらない。**
   * 入力・メモ・取り消しをすべて止める(docs/ui/screens-and-interactions.md)。
   */
  readonly gaveUp: boolean;
  /** 選択中のセル。**常に 1 つで、選択が無い状態は持たない。** */
  readonly selected: CellIndex;
}

export type Direction = "up" | "down" | "left" | "right";

export type BoardAction =
  | { readonly type: "selectCell"; readonly index: CellIndex }
  | { readonly type: "moveSelection"; readonly direction: Direction }
  | {
      readonly type: "inputDigit";
      readonly digit: number;
      /**
       * **その 1 回だけメモとして入れる。**省略すると `noteMode` に従う。
       *
       * ⚠️ **モードを切り替えるのではない。**上フリックのように
       * 「いまの 1 回だけ候補を立てたい」入力のためにある(2026-08-06 に追加)。
       */
      readonly asNote?: boolean;
    }
  | { readonly type: "clearCell" }
  | { readonly type: "clearNotes" }
  | { readonly type: "toggleNoteMode" }
  | { readonly type: "giveUp" };

/** 保存から戻す入力とメモ。どちらも 81 要素。 */
export interface RestoredBoard {
  readonly entries: readonly number[];
  readonly notes: readonly number[];
}

/**
 * 問題から初期状態を作る。
 *
 * **選択は最初の空きマスに置く。** 遊技者がクリックしなくても
 * キーボードだけで遊び始められるようにするため
 * (docs/ui/screens-and-interactions.md の「キーボードだけで最初から最後まで遊べること」)。
 *
 * `restored` を渡すと遊びかけから始める。**手がかりのマスに入っている値は捨てる。**
 * パックが差し替わって手がかりが増えていても、書き換えられないマスに
 * 遊技者の入力が残らないようにするためである。
 */
export function createBoardState(puzzle: Puzzle, restored?: RestoredBoard): BoardState {
  const firstEmpty = puzzle.givens.findIndex((value) => value === 0);
  const empty = () => new Array<number>(CELL_COUNT).fill(0);

  return {
    givens: puzzle.givens,
    entries: restored ? restored.entries.map(dropOnGivens(puzzle)) : empty(),
    solution: puzzle.solution,
    notes: restored ? restored.notes.map(dropOnGivens(puzzle)) : empty(),
    noteMode: false,
    gaveUp: false,
    selected: firstEmpty === -1 ? 0 : firstEmpty,
  };
}

function dropOnGivens(puzzle: Puzzle): (value: number, index: number) => number {
  return (value, index) => (puzzle.givens[index] === 0 ? value : 0);
}

/**
 * 盤面を 1 手進める。
 *
 * **何も起きない操作では state をそのまま返す。**
 * 「手がかりのセルへの入力は何も起きない」を呼び出し側で判定させないためと、
 * React の再描画を省くためである。
 */
export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  // ⚠️ **あきらめたあとは盤面が変わらない。**選択の移動だけは許す
  // (読み上げで盤面を辿れる必要があるため)。
  if (state.gaveUp && action.type !== "selectCell" && action.type !== "moveSelection") {
    return state;
  }

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

      // **その 1 回だけの指定が優先。**無ければモードに従う。
      if (action.asNote ?? state.noteMode) {
        // 確定値が入っているセルにメモは要らない。先に確定値を消してもらう。
        if (state.entries[state.selected] !== 0) {
          return state;
        }
        // 同じ数字をもう一度でメモが落ちる(トグル)。
        return withNotes(
          state,
          state.selected,
          state.notes[state.selected] ^ maskOfDigit(action.digit),
        );
      }

      // 同じ数字をもう一度入れたら消す(トグル)。
      const next = state.entries[state.selected] === action.digit ? 0 : action.digit;
      // **確定入力を入れるとそのセルのメモは消える。**
      // 消したときは戻さない(戻すのは取り消し)。仕様は画面構成と操作仕様の「メモ」。
      return withEntry(
        next === 0 ? state : withNotes(state, state.selected, 0),
        state.selected,
        next,
      );
    }

    case "clearCell": {
      if (isGiven(state, state.selected)) {
        return state;
      }
      // **確定値と選択中セルのメモをまとめて消す。**
      return withNotes(withEntry(state, state.selected, 0), state.selected, 0);
    }

    case "clearNotes": {
      if (isGiven(state, state.selected)) {
        return state;
      }
      // **確定入力は触らず、選択中セルのメモだけを消す。**
      return withNotes(state, state.selected, 0);
    }

    case "toggleNoteMode": {
      return { ...state, noteMode: !state.noteMode };
    }

    case "giveUp": {
      // ⚠️ **メモモードも切る。**終わった盤面で「メモ 入」が残っていると、
      // 次の問題へ進んだときに入力先を取り違える。
      return { ...state, gaveUp: true, noteMode: false };
    }
  }
}

/** そのセルが手がかりか。**手がかりは書き換えられない。** */
export function isGiven(state: BoardState, index: CellIndex): boolean {
  return state.givens[index] !== 0;
}

/** そのセルに見えている数字。0 は空。 */
export function valueAt(state: BoardState, index: CellIndex): number {
  if (state.givens[index] !== 0) {
    return state.givens[index];
  }
  // ⚠️ **あきらめたら、間違って入れていたマスも解で上書きする。**
  // 「最後に正解が分かる」が目的なので、誤答を残すと果たせない。
  return state.gaveUp ? state.solution[index] : state.entries[index];
}

/**
 * あきらめて出した解か。**遊技者が自分で入れた正解とは区別する。**
 *
 * 自分で当てたマスは自分の入力のままにしておく。**そこまでは自分で解いた**ので、
 * 全部を「答え」に見せるのは事実と違う。
 */
export function isRevealed(state: BoardState, index: CellIndex): boolean {
  return (
    state.gaveUp && state.givens[index] === 0 && state.entries[index] !== state.solution[index]
  );
}

/**
 * そのセルのメモ。ビットマスクで返す。
 *
 * **数字が見えているセルのメモは出さない。** 確定値を入れた時点で消しているので
 * 通常は 0 だが、手がかりのセルと合わせてここで一度に閉じておく。
 */
export function notesAt(state: BoardState, index: CellIndex): number {
  return valueAt(state, index) === 0 ? state.notes[index] : 0;
}

/** 盤面の全セルに数字が見えているか。**正誤とは別の判定である。** */
export function isFilled(state: BoardState): boolean {
  return state.solution.every((_, index) => valueAt(state, index) !== 0);
}

/**
 * 解き終わったか。
 *
 * **解と突き合わせるだけで、ソルバは呼ばない。**
 * 解は問題ファイルに入っている(docs/api/puzzle-file-format.md「なぜ解も持つのか」)。
 *
 * ⚠️ `core` の `isComplete`(空きマスが無いか)とは別物である。
 * こちらは**解と一致しているか**を見るので、埋まっていても間違いがあれば false になる。
 */
export function matchesSolution(state: BoardState): boolean {
  return state.solution.every((value, index) => valueAt(state, index) === value);
}

/**
 * **遊技者が自分で解き終えたか。**
 *
 * ⚠️ **あきらめて出た解は「完成」ではない。**
 * あきらめると盤面は解と一致するので {@link matchesSolution} は真になる。
 * **そのまま完成の判定に使うと、諦めた遊技者に「完成しました」と言うことになる。**
 * 事実として間違っているうえに失礼である。
 */
export function isSolvedByPlayer(state: BoardState): boolean {
  return !state.gaveUp && matchesSolution(state);
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

function withNotes(state: BoardState, index: CellIndex, mask: number): BoardState {
  if (state.notes[index] === mask) {
    return state;
  }
  const notes = [...state.notes];
  notes[index] = mask;
  return { ...state, notes };
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
