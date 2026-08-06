import { Button, Group, SimpleGrid, Stack } from "@mantine/core";
import { BOARD_SIZE } from "@sudoku/core";

import { Icon } from "../../ui/Icon";

import { NoteSwitch } from "./NoteSwitch";

/**
 * 画面の入力パッド。
 *
 * **盤面の外側なので Mantine の部品を使う**(docs/decisions/0002-ui-library-selection.md)。
 * キーボードで入れられるものと同じ操作を、指でも届くように並べたものである。
 *
 * 難易度の選択とテーマの切替は工程 4 の最後の区切り。
 */
export interface NumberPadProps {
  readonly onDigit: (digit: number) => void;
  readonly onClear: () => void;
  readonly onToggleNoteMode: () => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  /** メモモード中か。**押しっぱなしの状態なので `aria-pressed` で伝える。** */
  readonly noteMode: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** 手がかりのセルを選んでいるときは押しても何も起きないので、落としておく。 */
  readonly disabled?: boolean;
}

const DIGITS = Array.from({ length: BOARD_SIZE }, (_, index) => index + 1);

export function NumberPad({
  onDigit,
  onClear,
  onToggleNoteMode,
  onUndo,
  onRedo,
  noteMode,
  canUndo,
  canRedo,
  disabled,
}: NumberPadProps) {
  return (
    <Stack gap="xs">
      <SimpleGrid cols={{ base: 5, xs: 9 }} spacing="xs">
        {/*
          ⚠️ **2026-08-06 に「残り数」を消した**(発注者の要望)。
          入りきった数字を落とす挙動も一緒に無くなっている。**パッドは数字だけ。**
        */}
        {DIGITS.map((digit) => (
          <Button
            key={digit}
            variant="default"
            size="lg"
            /*
              ⚠️ **左右の余白を持たせない。**9 列に詰めると 1 列 54px で、
              `size="lg"` の余白(22px × 2)だけで幅を食い尽くし、
              **数字が 0 幅に潰れて消える**(2026-08-06 に実測)。
            */
            px={0}
            disabled={disabled}
            aria-label={`${digit} を${noteMode ? "メモする" : "入力"}`}
            onClick={() => onDigit(digit)}
          >
            {digit}
          </Button>
        ))}
      </SimpleGrid>

      {/*
        「消す」と「メモ」は数字と並べると幅が足りず文字が折り返す。別の行に置く。

        ⚠️ **PC 版は記号に文字を添える。**幅に余裕があるので文字を落とす理由が無い。
        **スマホ版は幅が無いので記号だけにしてある** —— そこだけが違う。
      */}
      <Group grow gap="xs">
        <Button
          variant="default"
          size="lg"
          leftSection={<Icon name="backspace" />}
          disabled={disabled}
          onClick={onClear}
        >
          消す
        </Button>
        {/*
          🔴 **メモはスイッチにする**(2026-08-06・発注者の要望)。
          ⚠️ **PC 版とスマホ版で同じ部品を使う。**同じ迷いが両方で起きるので、
          片方だけ直すと食い違う。
        */}
        <NoteSwitch checked={noteMode} onChange={onToggleNoteMode} />
      </Group>

      {/*
        取り消し / やり直しは数字より使う頻度が低いので小さくする。
        ただし `subtle` は文字色が primary(blue-6)になり、白地で 3.4:1 と
        本文の目安を割るため使わない。
      */}
      <Group grow gap="xs">
        <Button
          variant="default"
          size="sm"
          leftSection={<Icon name="undo" size={18} />}
          disabled={!canUndo}
          onClick={onUndo}
        >
          取り消し
        </Button>
        <Button
          variant="default"
          size="sm"
          leftSection={<Icon name="redo" size={18} />}
          disabled={!canRedo}
          onClick={onRedo}
        >
          やり直し
        </Button>
      </Group>
    </Stack>
  );
}
