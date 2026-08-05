import { useReducer } from "react";
import { Group, Stack, Text } from "@mantine/core";
import { useHotkeys, type HotkeyItem } from "@mantine/hooks";

import { Board } from "../features/board/Board";
import { NumberPad } from "../features/input/NumberPad";
import { SAMPLE_PUZZLE } from "../features/puzzle/samplePuzzle";
import { boardReducer, createBoardState, isGiven } from "../state/boardState";

/**
 * ゲーム画面。**アプリの本体**(docs/ui/screens-and-interactions.md)。
 *
 * 状態は `core` へ寄せられる純粋な reducer に持たせ、React は `useReducer` でつなぐだけ
 * (docs/architecture/system-architecture.md「状態管理は reducer に寄せる」)。
 *
 * ⚠️ **キー操作は `use-hotkeys` にまとめる。**素の `addEventListener` を散らさない
 * (docs/decisions/0002-ui-library-selection.md の影響)。
 * document に付くので、盤面へフォーカスしていなくてもキーだけで遊べる。
 *
 * いまは手書きの 1 問を直接読んでいる。問題の取得(マニフェスト → パック)は工程 4。
 */
export function GameScreen() {
  const [state, dispatch] = useReducer(boardReducer, SAMPLE_PUZZLE, createBoardState);

  useHotkeys([
    ["arrowup", () => dispatch({ type: "moveSelection", direction: "up" })],
    ["arrowdown", () => dispatch({ type: "moveSelection", direction: "down" })],
    ["arrowleft", () => dispatch({ type: "moveSelection", direction: "left" })],
    ["arrowright", () => dispatch({ type: "moveSelection", direction: "right" })],
    ...DIGIT_KEYS.map<HotkeyItem>((digit) => [
      String(digit),
      () => dispatch({ type: "inputDigit", digit }),
    ]),
    ["0", () => dispatch({ type: "clearCell" })],
    ["backspace", () => dispatch({ type: "clearCell" })],
    ["delete", () => dispatch({ type: "clearCell" })],
  ]);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Text fw={500}>難易度: {DIFFICULTY_LABELS[SAMPLE_PUZZLE.difficulty]}</Text>
      </Group>

      <Board state={state} onSelect={(index) => dispatch({ type: "selectCell", index })} />

      <NumberPad
        disabled={isGiven(state, state.selected)}
        onDigit={(digit) => dispatch({ type: "inputDigit", digit })}
        onClear={() => dispatch({ type: "clearCell" })}
      />
    </Stack>
  );
}

const DIGIT_KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * 表示名。**docs/algorithms/difficulty-rating.md の「難易度クラス」の表に合わせる。**
 * ファイル上の値は英語で固定なので、対応付けは UI 側の責務である。
 */
const DIFFICULTY_LABELS = {
  easy: "やさしい",
  normal: "ふつう",
  hard: "むずかしい",
  expert: "難問",
  extreme: "最難関",
} as const;
