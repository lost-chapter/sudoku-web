import { useEffect, useState } from "react";
import { Button, Card, Group, Stack, Text } from "@mantine/core";

import { formatElapsed } from "../features/progress/useElapsedTime";
import { readProgress, type StorageLike } from "../features/progress/progressStorage";
import type { SavedProgress } from "../features/progress/progress";
import { availableDifficulties } from "../features/puzzle/manifest";
import { loadManifest } from "../features/puzzle/loadPuzzle";
import type { Difficulty } from "../features/puzzle/types";

import { DIFFICULTY_LABELS } from "./GameHeader";

/**
 * ホーム画面。**難易度を選ぶ。遊びかけがあれば「続きから」を出す**
 * (docs/ui/screens-and-interactions.md)。
 *
 * ⚠️ **難易度の一覧は `manifest.json` の `totals` から作る。**
 * 画面にクラスを固定で書かない。実装済みの手筋によっては上のクラスが
 * 1 問も無く、そのときは選ばせてはいけない。
 */
export interface HomeScreenProps {
  readonly onStart: (difficulty: Difficulty, resume: boolean) => void;
  /** テストから差し替えるための口。 */
  readonly storage?: StorageLike;
}

export function HomeScreen({ onStart, storage }: HomeScreenProps) {
  const [difficulties, setDifficulties] = useState<readonly Difficulty[] | null>(null);
  const [saved] = useState<SavedProgress | null>(() => readProgress(storage));

  useEffect(() => {
    let cancelled = false;
    void loadManifest().then((manifest) => {
      if (!cancelled) {
        setDifficulties(manifest ? availableDifficulties(manifest) : []);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Stack gap="lg">
      {saved && (
        <Card withBorder padding="md">
          <Stack gap="sm">
            <Text fw={500}>遊びかけがあります</Text>
            <Text size="sm" c="dimmed">
              {DIFFICULTY_LABELS[saved.difficulty]} / {formatElapsed(saved.elapsedMs)}
            </Text>
            <Button onClick={() => onStart(saved.difficulty, true)}>続きから</Button>
          </Stack>
        </Card>
      )}

      <Stack gap="sm">
        <Text fw={500}>難易度を選ぶ</Text>
        {difficulties === null && (
          <Text size="sm" c="dimmed" role="status" aria-live="polite">
            収録内容を読み込んでいます
          </Text>
        )}
        {difficulties?.length === 0 && (
          <Text size="sm" c="dimmed" role="status" aria-live="polite">
            遊べる問題が見つかりません。読み込み直してください。
          </Text>
        )}
        <Group gap="sm">
          {difficulties?.map((difficulty) => (
            <Button key={difficulty} variant="default" onClick={() => onStart(difficulty, false)}>
              {DIFFICULTY_LABELS[difficulty]}
            </Button>
          ))}
        </Group>
      </Stack>
    </Stack>
  );
}
