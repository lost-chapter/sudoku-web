import { useState } from "react";
import { Container, MantineProvider, Stack, Title } from "@mantine/core";

import type { Difficulty } from "../features/puzzle/types";

import { GameScreen } from "./GameScreen";
import { HomeScreen } from "./HomeScreen";

/**
 * アプリの入口。
 *
 * **画面遷移は最小に保つ**(docs/ui/screens-and-interactions.md)。
 * ホーム → ゲーム → (完成) → ゲーム が主動線で、設定と完成はモーダルにしてある。
 *
 * defaultColorScheme="auto" で端末の設定に従う(同ドキュメントの「テーマ」)。
 * 設定で明示的に固定でき、選択は Mantine が localStorage へ残す。
 */
type Screen = { readonly name: "home" } | { readonly name: "game"; readonly playing: Playing };

interface Playing {
  readonly difficulty: Difficulty;
  readonly resume: boolean;
}

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  return (
    <MantineProvider defaultColorScheme="auto">
      <Container size="sm" px="xs" py="md">
        <Stack gap="md">
          <Title order={1} size="h2">
            数独
          </Title>

          {screen.name === "home" ? (
            <HomeScreen
              onStart={(difficulty, resume) =>
                setScreen({ name: "game", playing: { difficulty, resume } })
              }
            />
          ) : (
            <GameScreen
              difficulty={screen.playing.difficulty}
              resume={screen.playing.resume}
              onHome={() => setScreen({ name: "home" })}
            />
          )}
        </Stack>
      </Container>
    </MantineProvider>
  );
}
