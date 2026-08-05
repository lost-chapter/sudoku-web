import { useEffect, useState } from "react";
import { Button, Card, Group, Stack, Text } from "@mantine/core";

import { readProgress, type StorageLike } from "../features/progress/progressStorage";
import { isStale, type SavedProgress } from "../features/progress/progress";
import { availableDifficulties } from "../features/puzzle/packSelection";
import { loadManifest } from "../features/puzzle/loadPuzzle";
import type { Difficulty } from "@sudoku/core";

import { Icon } from "../ui/Icon";

import { DIFFICULTY_LABELS } from "./GameHeader";
import { TOUCH_TARGET } from "./layout";

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

  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadManifest().then((manifest) => {
      if (cancelled) {
        return;
      }
      setDifficulties(manifest ? availableDifficulties(manifest) : []);
      // 版が変わった保存は開いても捨てられる。**出さないほうが正直である。**
      setStale(
        saved !== null &&
          manifest !== null &&
          isStale(saved, {
            formatVersion: manifest.formatVersion,
            generator: manifest.generatedWith.generator,
          }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [saved]);

  return (
    <Stack gap="lg">
      {saved && !stale && (
        <Card withBorder padding="md">
          <Stack gap="sm">
            <Text fw={500}>遊びかけがあります</Text>
            <Text size="sm" c="dimmed">
              {DIFFICULTY_LABELS[saved.difficulty]}
            </Text>
            <Button
              h={TOUCH_TARGET}
              leftSection={<Icon name="play" />}
              onClick={() => onStart(saved.difficulty, true)}
            >
              続きから
            </Button>
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
            <Button
              key={difficulty}
              variant="default"
              h={TOUCH_TARGET}
              onClick={() => onStart(difficulty, false)}
            >
              {DIFFICULTY_LABELS[difficulty]}
            </Button>
          ))}
        </Group>
      </Stack>
    </Stack>
  );
}
