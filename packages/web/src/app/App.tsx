import { Container, MantineProvider, Stack, Title } from "@mantine/core";

import { GameScreen } from "./GameScreen";

/**
 * アプリの入口。
 *
 * ホーム / 設定 / 完成の画面は工程 4(docs/ui/screens-and-interactions.md)。
 * いまはゲーム画面だけを直接出している。
 *
 * defaultColorScheme="auto" で端末の設定に従う(同ドキュメントの「テーマ」)。
 */
export function App() {
  return (
    <MantineProvider defaultColorScheme="auto">
      <Container size="sm" px="xs" py="md">
        <Stack gap="md">
          <Title order={1} size="h2">
            数独
          </Title>
          <GameScreen />
        </Stack>
      </Container>
    </MantineProvider>
  );
}
