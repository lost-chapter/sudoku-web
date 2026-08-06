import { useEffect, useReducer, useState } from "react";
import { Button, Group, Modal, Stack, Text, VisuallyHidden } from "@mantine/core";
import { useHotkeys, type HotkeyItem } from "@mantine/hooks";

import { Board } from "../features/board/Board";
import { computeHighlights } from "../features/board/highlights";
import { NumberPad } from "../features/input/NumberPad";
import { TouchPad } from "../features/input/TouchPad";
import { isEmpty } from "../features/progress/progress";
import { clearProgress, writeProgress } from "../features/progress/progressStorage";
import type { LoadedPuzzle } from "../features/puzzle/loadPuzzle";
import type { Puzzle } from "@sudoku/core";
import type { Settings } from "../features/settings/settings";
import { isGiven, isSolvedByPlayer, type RestoredBoard } from "../state/boardState";
import {
  canRedo,
  canUndo,
  createGameState,
  gameReducer,
  type GameAction,
} from "../state/gameState";

import { GameHeader } from "./GameHeader";
import { PhoneLayout } from "./PhoneLayout";
import { useLayout } from "./layout";

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
  /** スマホ版だけ。ヘッダに「ホーム」を出す。 */
  readonly onHome?: () => void;
}

export function Game({
  puzzle,
  settings,
  source,
  restored,
  onNext,
  onOpenSettings,
  onHome,
}: GameProps) {
  const [game, dispatch] = useReducer(
    gameReducer,
    { puzzle, restored: restored ?? undefined },
    createGameState,
  );
  const state = game.present;
  // ⚠️ **あきらめて解が出た状態を「完成」と呼ばない。**
  // 盤面は解と一致するが、解いたのは遊技者ではない。
  const completed = isSolvedByPlayer(state);
  // ⚠️ **完成もあきらめも「終わった状態」。**どちらでも盤面は動かさない。
  const finished = completed || state.gaveUp;
  const highlights = computeHighlights(state, settings);
  const layout = useLayout();
  const [confirmingGiveUp, setConfirmingGiveUp] = useState(false);

  useEffect(() => {
    // 同梱の 1 問には保存の宛先(パックと行)が無いので保存しない。
    if (!source) {
      return;
    }
    if (finished || isEmpty(state)) {
      // ⚠️ **終わった盤面と、何も入っていない盤面は残さない。**
      // あきらめた盤面を「続きから」に出すと、開いても入力できないので嘘になる。
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
  }, [finished, puzzle.difficulty, source, state]);

  // 終わったら盤面を動かさない。知らせが次の入力で消えてしまうのを防ぐ。
  const play = (action: GameAction) => {
    if (!finished) {
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

  const padProps = {
    disabled: finished || isGiven(state, state.selected),
    noteMode: state.noteMode,
    canUndo: canUndo(game),
    canRedo: canRedo(game),
    onDigit: (digit: number, asNote?: boolean) => play({ type: "inputDigit", digit, asNote }),
    onClear: () => play({ type: "clearCell" }),
    onToggleNoteMode: () => play({ type: "toggleNoteMode" }),
    onUndo: () => play({ type: "undo" }),
    onRedo: () => play({ type: "redo" }),
  };

  const header = (
    <GameHeader
      difficulty={puzzle.difficulty}
      onOpenSettings={onOpenSettings}
      onGiveUp={() => setConfirmingGiveUp(true)}
      canGiveUp={!finished}
      onHome={onHome}
      compact={layout === "phone-landscape"}
    />
  );

  const board = (
    <Board
      state={state}
      highlights={highlights}
      onSelect={(index) => play({ type: "selectCell", index })}
    />
  );

  return (
    <>
      {layout === "desktop" ? (
        <Stack gap="lg">
          {header}
          {board}
          <NumberPad {...padProps} />
        </Stack>
      ) : (
        <PhoneLayout
          landscape={layout === "phone-landscape"}
          header={header}
          board={board}
          pad={
            <TouchPad
              {...padProps}
              landscape={layout === "phone-landscape"}
              flickToNote={settings.flickToNote}
            />
          }
        />
      )}

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
        {completed ? "完成しました" : state.gaveUp ? "答えを表示しました" : ""}
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

      {/*
        あきらめたあと。**完成と同じく、閉じる手段は「次の問題へ」だけ。**
        ⚠️ 赤や警告の見た目にはしない。**あきらめるのは救済であって失敗ではない。**
      */}
      <Modal
        opened={state.gaveUp}
        onClose={onNext}
        title="答えを表示しました"
        centered
        withCloseButton={false}
        closeOnEscape={false}
        closeOnClickOutside={false}
      >
        <Stack gap="md">
          <Text>盤面に正解が入っています。自分で入れた数字はそのままです。</Text>
          <Button onClick={onNext} autoFocus>
            次の問題へ
          </Button>
        </Stack>
      </Modal>

      {/*
        ⚠️ **押すと遊技が終わるので、確認を挟む。**
        既定のフォーカスは「やめる」に置く。Enter の連打で確定させないため。
        置き場所(ヘッダ = 親指から最も遠い)と合わせて二重に防いでいる。
      */}
      {/*
        ⚠️ **閉じるボタンを置かない。**Mantine は開いたときに最初の押せる要素へ
        フォーカスを移すので、閉じるボタンがあるとそちらへ行き、
        **「やめる」に置くという設計が効かない**(実測して気づいた)。
        Escape でも閉じられるので、閉じる手段が減るわけではない。
      */}
      <Modal
        opened={confirmingGiveUp}
        onClose={() => setConfirmingGiveUp(false)}
        title="あきらめますか?"
        centered
        withCloseButton={false}
      >
        <Stack gap="md">
          <Text>正解が表示され、この問題は終わります。</Text>
          <Group grow>
            <Button variant="default" onClick={() => setConfirmingGiveUp(false)}>
              やめる
            </Button>
            <Button
              onClick={() => {
                setConfirmingGiveUp(false);
                dispatch({ type: "giveUp" });
              }}
            >
              あきらめる
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

const DIGIT_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
