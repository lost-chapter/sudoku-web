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
 * ここが持つのは「どの問題を遊ぶか」と設定だけで、
 * 盤面とヘッダ(難易度 / 経過時間 / 設定)は {@link Game} が持つ。
 * 経過時間を止める条件(完成したか)がそちらにしか無いためである。
 *
 * 問題が変わったら `key` で作り直す。
 */
export interface GameScreenProps {
  readonly difficulty: Difficulty;
  /** 遊びかけから始めるか。 */
  readonly resume: boolean;
  readonly onHome: () => void;
}

export function GameScreen({ difficulty, resume, onHome }: GameScreenProps) {
  const { status, puzzle, source, restored, elapsedMs, puzzleKey, next } = usePuzzle({
    difficulty,
    resume,
  });
  const { settings, setSetting } = useSettings();
  const [settingsOpened, settingsModal] = useDisclosure(false);

  return (
    <Stack gap="md">
      {puzzle ? (
        <Game
          key={puzzleKey}
          puzzle={puzzle}
          settings={settings}
          source={source}
          restored={restored}
          initialElapsedMs={elapsedMs}
          onNext={next}
          onOpenSettings={settingsModal.open}
        />
      ) : (
        <Text size="sm" c="dimmed" role="status" aria-live="polite">
          問題を読み込んでいます
        </Text>
      )}

      <Group justify="space-between" align="center">
        {/* `subtle` は文字色が primary になり白地で 3.4:1 と本文の目安を割る。使わない。 */}
        <Button variant="default" size="xs" onClick={onHome}>
          難易度を選び直す
        </Button>
        <Text size="xs" c="dimmed" role="status" aria-live="polite">
          {statusMessage(status)}
        </Text>
      </Group>

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
function statusMessage(status: PuzzleStatus): string {
  switch (status) {
    case "loading":
      return "";
    case "loaded":
      // パック名はヘッダに出ているので、ここでは何も言わない。
      return "";
    case "resumed":
      return "遊びかけから再開しました";
    case "fallback":
      return "問題を取得できないので、同梱の 1 問で遊びます";
  }
}
