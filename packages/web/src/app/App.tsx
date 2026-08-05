import { Container, MantineProvider, Stack, Text, Title } from "@mantine/core";

import { BOARD_SIZE } from "@sudoku/core";

/**
 * アプリの骨組み。
 *
 * 画面と操作の実装は工程 3〜4(担当 agent-c)。
 * 仕様は docs/ui/screens-and-interactions.md にある。
 *
 * defaultColorScheme="auto" で端末の設定に従う(同ドキュメントの「テーマ」)。
 */
export function App() {
  return (
    <MantineProvider defaultColorScheme="auto">
      <Container size="sm" py="xl">
        <Stack gap="xs">
          <Title order={1}>数独</Title>
          <Text c="dimmed">
            開発基盤の骨組み。{BOARD_SIZE}×{BOARD_SIZE} の盤面は工程 3 で入る。
          </Text>
        </Stack>
      </Container>
    </MantineProvider>
  );
}
