import { Button, Group, SimpleGrid, Stack } from "@mantine/core";
import { BOARD_SIZE } from "@sudoku/core";

/**
 * 画面の入力パッド。
 *
 * **盤面の外側なので Mantine の部品を使う**(docs/decisions/0002-ui-library-selection.md)。
 * キーボードで入れられるものと同じ操作を、指でも届くように並べたものである。
 *
 * 取り消し / やり直しは工程 4 の次の区切り。
 */
export interface NumberPadProps {
  readonly onDigit: (digit: number) => void;
  readonly onClear: () => void;
  readonly onToggleNoteMode: () => void;
  /** メモモード中か。**押しっぱなしの状態なので `aria-pressed` で伝える。** */
  readonly noteMode: boolean;
  /** 手がかりのセルを選んでいるときは押しても何も起きないので、落としておく。 */
  readonly disabled?: boolean;
}

const DIGITS = Array.from({ length: BOARD_SIZE }, (_, index) => index + 1);

export function NumberPad({
  onDigit,
  onClear,
  onToggleNoteMode,
  noteMode,
  disabled,
}: NumberPadProps) {
  return (
    <Stack gap="xs">
      <SimpleGrid cols={{ base: 5, xs: 9 }} spacing="xs">
        {DIGITS.map((digit) => (
          <Button
            key={digit}
            variant="default"
            size="lg"
            disabled={disabled}
            aria-label={noteMode ? `${digit} をメモする` : `${digit} を入力`}
            onClick={() => onDigit(digit)}
          >
            {digit}
          </Button>
        ))}
      </SimpleGrid>

      {/* 「消す」と「メモ」は数字と並べると幅が足りず文字が折り返す。別の行に置く。 */}
      <Group grow gap="xs">
        <Button variant="default" size="lg" disabled={disabled} onClick={onClear}>
          消す
        </Button>
        <Button
          variant={noteMode ? "filled" : "default"}
          size="lg"
          aria-pressed={noteMode}
          onClick={onToggleNoteMode}
        >
          メモ{noteMode ? " 入" : " 切"}
        </Button>
      </Group>
    </Stack>
  );
}
