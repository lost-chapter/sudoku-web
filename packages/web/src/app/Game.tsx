import { useEffect, useReducer } from "react";
import { Button, Modal, Stack, Text, VisuallyHidden } from "@mantine/core";
import { useHotkeys, type HotkeyItem } from "@mantine/hooks";

import { Board } from "../features/board/Board";
import { computeHighlights } from "../features/board/highlights";
import { NumberPad } from "../features/input/NumberPad";
import { isEmpty } from "../features/progress/progress";
import { clearProgress, writeProgress } from "../features/progress/progressStorage";
import type { LoadedPuzzle } from "../features/puzzle/loadPuzzle";
import type { Puzzle } from "@sudoku/core";
import type { Settings } from "../features/settings/settings";
import { isGiven, matchesSolution, type RestoredBoard } from "../state/boardState";
import {
  canRedo,
  canUndo,
  createGameState,
  gameReducer,
  type GameAction,
} from "../state/gameState";

import { GameHeader } from "./GameHeader";

/**
 * 1 問を遊ぶところ。
 *
 * **問題ごとに作り直す。**呼び出し側で `key` を変えることで盤面が初期化される。
 *
 * ⚠️ **キー操作は `use-hotkeys` にまとめる。**素の `addEventListener` を散らさない
 * (docs/decisions/0002-ui-library-selection.md の影響)。
 * document に付くので、盤面へフォーカスしていなくてもキーだけで遊べる。
 */
export interface GameProps {
  readonly puzzle: Puzzle;
  readonly settings: Settings;
  /** どのパックの何行目か。**同梱の 1 問で遊んでいるときは `null`(保存しない)。** */
  readonly source: LoadedPuzzle | null;
  /** 遊びかけから戻す入力とメモ。 */
  readonly restored: RestoredBoard | null;
  /** 完成したあと次の問題へ進む。 */
  readonly onNext: () => void;
  readonly onOpenSettings: () => void;
}

export function Game({ puzzle, settings, source, restored, onNext, onOpenSettings }: GameProps) {
  const [game, dispatch] = useReducer(
    gameReducer,
    { puzzle, restored: restored ?? undefined },
    createGameState,
  );
  const state = game.present;
  const completed = matchesSolution(state);
  const highlights = computeHighlights(state, settings);

  useEffect(() => {
    // 同梱の 1 問には保存の宛先(パックと行)が無いので保存しない。
    if (!source) {
      return;
    }
    if (completed || isEmpty(state)) {
      // 完成した盤面と、何も入っていない盤面は残さない。
      clearProgress();
      return;
    }
    writeProgress({
      packPath: source.packPath,
      line: source.line,
      entries: state.entries,
      notes: state.notes,
      difficulty: puzzle.difficulty,
      formatVersion: source.formatVersion,
      generator: source.generator,
    });
  }, [completed, puzzle.difficulty, source, state]);

  // 完成したら盤面を動かさない。完成の知らせが入力で消えてしまうのを防ぐ。
  const play = (action: GameAction) => {
    if (!completed) {
      dispatch(action);
    }
  };

  useHotkeys([
    ["arrowup", () => play({ type: "moveSelection", direction: "up" })],
    ["arrowdown", () => play({ type: "moveSelection", direction: "down" })],
    ["arrowleft", () => play({ type: "moveSelection", direction: "left" })],
    ["arrowright", () => play({ type: "moveSelection", direction: "right" })],
    ...DIGIT_KEYS.map<HotkeyItem>((digit) => [
      String(digit),
      () => play({ type: "inputDigit", digit }),
    ]),
    ["0", () => play({ type: "clearCell" })],
    ["backspace", () => play({ type: "clearCell" })],
    ["delete", () => play({ type: "clearCell" })],
    ["space", () => play({ type: "toggleNoteMode" })],
    // mod は Ctrl と ⌘ の両方に当たる。shift 付きは別の hotkey として登録する。
    ["mod+z", () => play({ type: "undo" })],
    ["mod+shift+z", () => play({ type: "redo" })],
  ]);

  return (
    <Stack gap="lg">
      <GameHeader
        difficulty={puzzle.difficulty}
        packLabel={source?.packPath ?? ""}
        onOpenSettings={onOpenSettings}
      />

      <Board
        state={state}
        highlights={highlights}
        onSelect={(index) => play({ type: "selectCell", index })}
      />

      <NumberPad
        disabled={completed || isGiven(state, state.selected)}
        noteMode={state.noteMode}
        canUndo={!completed && canUndo(game)}
        canRedo={!completed && canRedo(game)}
        onDigit={(digit) => play({ type: "inputDigit", digit })}
        onClear={() => play({ type: "clearCell" })}
        onToggleNoteMode={() => play({ type: "toggleNoteMode" })}
        onUndo={() => play({ type: "undo" })}
        onRedo={() => play({ type: "redo" })}
      />

      {/* メモモードの切替はキーでも起きる。切り替わったことを読み上げへ伝える。 */}
      <VisuallyHidden role="status" aria-live="polite">
        {state.noteMode ? "メモモード 入" : "メモモード 切"}
      </VisuallyHidden>

      {/*
        完成は目で見て分かるだけでは足りない。支援技術へも伝わるよう、
        モーダルとは別に読み上げ用の知らせを置く。
        aria-live は中身が入れ替わったときに読まれるので、常に置いておく必要がある。
      */}
      <VisuallyHidden role="status" aria-live="polite">
        {completed ? "完成しました" : ""}
      </VisuallyHidden>

      {/*
        閉じる手段を「次の問題へ」だけにしてある。Esc や枠外のクリックで閉じられると、
        次の問題へ進む導線を失ったまま完成した盤面が残る。
      */}
      <Modal
        opened={completed}
        onClose={onNext}
        title="完成!"
        centered
        withCloseButton={false}
        closeOnEscape={false}
        closeOnClickOutside={false}
      >
        <Stack gap="md">
          <Text>すべてのマスが解と一致しました。</Text>
          <Button onClick={onNext} autoFocus>
            次の問題へ
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}

const DIGIT_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
