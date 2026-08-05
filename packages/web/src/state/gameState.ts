import type { Puzzle } from "@sudoku/core";

import {
  boardReducer,
  createBoardState,
  type BoardAction,
  type BoardState,
  type RestoredBoard,
} from "./boardState";

/**
 * 取り消し(undo)とやり直し(redo)。
 *
 * **盤面の reducer をそのまま包む。**盤面側は履歴を知らないので、
 * 遷移の規則を 2 か所に持たずに済む
 * (docs/architecture/system-architecture.md「状態管理は reducer に寄せる」)。
 *
 * ⚠️ **取り消しは操作単位である**(docs/ui/screens-and-interactions.md)。
 * 数字 1 つの入力・メモの 1 つ立てがそれぞれ 1 手になる。
 * **選択の移動とメモモードの切替は 1 手に数えない。**
 * 盤面が変わっていないので、取り消しても遊技者には何も起きたように見えない。
 */
export interface GameState {
  readonly present: BoardState;
  /** 古い順。末尾が直前の状態。 */
  readonly past: readonly BoardState[];
  /** 取り消した状態。新しい操作をすると捨てる。 */
  readonly future: readonly BoardState[];
}

export type GameAction = BoardAction | { readonly type: "undo" } | { readonly type: "redo" };

export interface GameInit {
  readonly puzzle: Puzzle;
  /** 遊びかけから始めるとき。**履歴は空で始まる**(前回の手は取り消せない)。 */
  readonly restored?: RestoredBoard;
}

export function createGameState({ puzzle, restored }: GameInit): GameState {
  return { present: createBoardState(puzzle, restored), past: [], future: [] };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === "undo") {
    const previous = state.present.gaveUp ? undefined : state.past.at(-1);
    if (!previous) {
      return state;
    }
    return {
      present: keepMode(previous, state.present),
      past: state.past.slice(0, -1),
      future: [...state.future, state.present],
    };
  }

  if (action.type === "redo") {
    const next = state.present.gaveUp ? undefined : state.future.at(-1);
    if (!next) {
      return state;
    }
    return {
      present: keepMode(next, state.present),
      past: [...state.past, state.present],
      future: state.future.slice(0, -1),
    };
  }

  const present = boardReducer(state.present, action);
  if (present === state.present) {
    return state;
  }

  // 盤面が変わらない操作(選択・メモモード)は履歴へ積まない。
  if (!changesBoard(state.present, present)) {
    return { ...state, present };
  }

  // **新しい操作をしたらやり直しは捨てる。** 枝分かれした履歴は持たない。
  return { present, past: [...state.past, state.present], future: [] };
}

/** ⚠️ **あきらめたあとは戻せない。**終わった盤面なので、履歴を辿る意味が無い。 */
export function canUndo(state: GameState): boolean {
  return !state.present.gaveUp && state.past.length > 0;
}

export function canRedo(state: GameState): boolean {
  return !state.present.gaveUp && state.future.length > 0;
}

function changesBoard(before: BoardState, after: BoardState): boolean {
  return before.entries !== after.entries || before.notes !== after.notes;
}

/**
 * 取り消しても**メモモードは戻さない。**
 *
 * メモモードは盤面の中身ではなく「いまどちらを入力するか」という手元の状態である。
 * 戻すと、取り消したとたんに入力先が変わって次の一手を取り違える。
 */
function keepMode(target: BoardState, current: BoardState): BoardState {
  return target.noteMode === current.noteMode ? target : { ...target, noteMode: current.noteMode };
}
