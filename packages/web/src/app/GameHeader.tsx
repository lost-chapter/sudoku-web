import { Button, Group, Text } from "@mantine/core";

import { formatElapsed } from "../features/progress/useElapsedTime";
import type { Difficulty } from "../features/puzzle/types";

/**
 * ゲーム画面のヘッダ。**難易度 / 経過時間 / 設定**
 * (docs/ui/screens-and-interactions.md「ゲーム画面の構成」)。
 *
 * ⚠️ **経過時間は表示するが、急かす演出はしない。**
 * 数字を出すだけで、色を変える・点滅させる・音を出すはしない。
 *
 * 盤面を持つ {@link Game} の中で描く。経過時間を止める条件(完成したか)が
 * そちらにしか無いためである。
 */
export interface GameHeaderProps {
  readonly difficulty: Difficulty;
  readonly elapsedMs: number;
  readonly onOpenSettings: () => void;
}

export function GameHeader({ difficulty, elapsedMs, onOpenSettings }: GameHeaderProps) {
  return (
    <Group justify="space-between" align="center" wrap="nowrap">
      <Text fw={500}>{DIFFICULTY_LABELS[difficulty]}</Text>

      <Text size="sm" c="dimmed" aria-label={`経過時間 ${formatElapsed(elapsedMs)}`}>
        {formatElapsed(elapsedMs)}
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
