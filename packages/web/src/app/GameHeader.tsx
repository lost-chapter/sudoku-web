import { Button, Group, Text } from "@mantine/core";

import type { Difficulty } from "@sudoku/core";

/**
 * ゲーム画面のヘッダ。**難易度 / パック名 / 設定**
 * (docs/ui/screens-and-interactions.md「ゲーム画面の構成」)。
 */
export interface GameHeaderProps {
  readonly difficulty: Difficulty;
  /** どのパックから取ったか。同梱の 1 問で遊んでいるときは空。 */
  readonly packLabel: string;
  readonly onOpenSettings: () => void;
}

export function GameHeader({ difficulty, packLabel, onOpenSettings }: GameHeaderProps) {
  return (
    <Group justify="space-between" align="center" wrap="nowrap">
      <Text fw={500}>{DIFFICULTY_LABELS[difficulty]}</Text>

      <Text size="xs" c="dimmed" truncate>
        {packLabel}
      </Text>

      <Button variant="default" size="xs" onClick={onOpenSettings}>
        設定
      </Button>
    </Group>
  );
}

/**
 * 表示名。**docs/algorithms/difficulty-rating.md の「難易度クラス」の表に合わせる。**
 * ファイル上の値は英語で固定なので、対応付けは UI 側の責務である。
 */
export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  easy: "やさしい",
  normal: "ふつう",
  hard: "むずかしい",
  expert: "難問",
  extreme: "最難関",
};
