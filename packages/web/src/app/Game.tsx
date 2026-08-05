import { useReducer } from "react";
import { Button, Modal, Stack, Text, VisuallyHidden } from "@mantine/core";
import { useHotkeys, type HotkeyItem } from "@mantine/hooks";

import { Board } from "../features/board/Board";
import { NumberPad } from "../features/input/NumberPad";
import type { Puzzle } from "../features/puzzle/types";
import { boardReducer, createBoardState, isGiven, matchesSolution } from "../state/boardState";

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
  /** 完成したあと次の問題へ進む。 */
  readonly onNext: () => void;
}

export function Game({ puzzle, onNext }: GameProps) {
  const [state, dispatch] = useReducer(boardReducer, puzzle, createBoardState);
  const completed = matchesSolution(state);

  // 完成したら盤面を動かさない。完成の知らせが入力で消えてしまうのを防ぐ。
  const play = (action: Parameters<typeof dispatch>[0]) => {
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
  ]);

  return (
    <Stack gap="lg">
      <Board state={state} onSelect={(index) => play({ type: "selectCell", index })} />

      <NumberPad
        disabled={completed || isGiven(state, state.selected)}
        onDigit={(digit) => play({ type: "inputDigit", digit })}
        onClear={() => play({ type: "clearCell" })}
      />

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
