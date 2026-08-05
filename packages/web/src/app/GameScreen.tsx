import { Button, Group, Stack, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import type { Difficulty } from "../features/puzzle/types";
import { usePuzzle, type PuzzleStatus } from "../features/puzzle/usePuzzle";
import { SettingsModal } from "../features/settings/SettingsModal";
import { useSettings } from "../features/settings/useSettings";

import { Game } from "./Game";

/**
 * ゲーム画面。**アプリの本体**(docs/ui/screens-and-interactions.md)。
 *
 * ここが持つのは「どの問題を遊ぶか」と設定だけで、盤面の中身は {@link Game} が持つ。
 * 問題が変わったら `key` で作り直す。
 *
 * 難易度の選択(ホーム画面)と経過時間の表示は工程 4 の最後の区切り。
 */
const DIFFICULTY: Difficulty = "easy";

export function GameScreen() {
  const { status, puzzle, source, restored, elapsedMs, puzzleKey, next } = usePuzzle(DIFFICULTY);
  const { settings, setSetting } = useSettings();
  const [settingsOpened, settingsModal] = useDisclosure(false);

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Text fw={500}>難易度: {DIFFICULTY_LABELS[DIFFICULTY]}</Text>
        <Group gap="sm" align="center">
          <Text size="sm" c="dimmed" role="status" aria-live="polite">
            {statusMessage(status, source?.packPath)}
          </Text>
          <Button variant="default" size="xs" onClick={settingsModal.open}>
            設定
          </Button>
        </Group>
      </Group>

      {puzzle && (
        <Game
          key={puzzleKey}
          puzzle={puzzle}
          settings={settings}
          source={source}
          restored={restored}
          initialElapsedMs={elapsedMs}
          onNext={next}
        />
      )}

      <SettingsModal
        opened={settingsOpened}
        settings={settings}
        onChange={setSetting}
        onClose={settingsModal.close}
      />
    </Stack>
  );
}

/**
 * 取得に失敗したことは伝えるが、**遊技は止めない**
 * (docs/architecture/system-architecture.md「エラーハンドリングの方針」)。
 */
function statusMessage(status: PuzzleStatus, packPath?: string): string {
  switch (status) {
    case "loading":
      return "問題を読み込んでいます";
    case "loaded":
      return packPath ?? "";
    case "resumed":
      return "遊びかけから再開しました";
    case "fallback":
      return "問題を取得できないので、同梱の 1 問で遊びます";
  }
}

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
