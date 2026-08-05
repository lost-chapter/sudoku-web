import { Button, SimpleGrid, Stack } from "@mantine/core";
import { BOARD_SIZE } from "@sudoku/core";

/**
 * 画面の入力パッド。
 *
 * **盤面の外側なので Mantine の部品を使う**(docs/decisions/0002-ui-library-selection.md)。
 * キーボードで入れられるものと同じ操作を、指でも届くように並べたものである。
 *
 * メモ・取り消し / やり直しは工程 4。
 */
export interface NumberPadProps {
  readonly onDigit: (digit: number) => void;
  readonly onClear: () => void;
  /** 手がかりのセルを選んでいるときは押しても何も起きないので、落としておく。 */
  readonly disabled?: boolean;
}

const DIGITS = Array.from({ length: BOARD_SIZE }, (_, index) => index + 1);

export function NumberPad({ onDigit, onClear, disabled }: NumberPadProps) {
  return (
    <Stack gap="xs">
      <SimpleGrid cols={{ base: 5, xs: 9 }} spacing="xs">
        {DIGITS.map((digit) => (
          <Button
            key={digit}
            variant="default"
            size="lg"
            disabled={disabled}
            aria-label={`${digit} を入力`}
            onClick={() => onDigit(digit)}
          >
            {digit}
          </Button>
        ))}
      </SimpleGrid>
      {/* 「消す」は数字と並べると幅が足りず文字が折り返すので、独立した 1 行に置く。 */}
      <Button variant="default" size="lg" disabled={disabled} onClick={onClear}>
        消す
      </Button>
    </Stack>
  );
}
