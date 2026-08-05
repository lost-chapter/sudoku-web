import { useState } from "react";
import { Container, MantineProvider, Stack, Title, type MantineThemeOverride } from "@mantine/core";

import type { Difficulty } from "@sudoku/core";

import { GameScreen } from "./GameScreen";
import { HomeScreen } from "./HomeScreen";
import { useLayout } from "./layout";

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

/**
 * ⚠️ **塗りつぶしのボタンの濃さを両テーマとも 8 段目に固定する。**
 *
 * Mantine の既定はライトが 6 段目で、白文字を載せると **3.56:1** と本文の目安を割る
 * (「続きから」「次の問題へ」「メモ 入」が該当)。8 段目にすると **5.02:1**。
 *
 * ⚠️ **CSS 変数の上書きでは直らない。**Button は描画時に色を解決して
 * `--button-bg` を要素へ直接書くので、`:root` を書き換えても効かない。
 * **テーマの設定で変える必要がある。**
 */
const THEME: MantineThemeOverride = {
  primaryShade: { light: 8, dark: 8 },
};

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "home" });

  return (
    <MantineProvider defaultColorScheme="auto" theme={THEME}>
      <Shell screen={screen} setScreen={setScreen} />
    </MantineProvider>
  );
}

/**
 * ⚠️ **スマホ版のゲーム画面だけ、外枠(タイトル・余白)を外す。**
 * 1 画面に収めるのが要件で、**外枠のぶんだけ盤面が小さくなる**ため。
 * ホーム画面と PC 版は今までどおり。
 *
 * 🔴 **外枠は「有無」ではなく「太さ」で切り替える。**要素そのものを出し入れすると、
 * `GameScreen` の置き場所が変わり、**React が同じ画面と見なせず作り直す。**
 * 2026-08-06 に、**幅を広げただけで入力も保存も消え、別の問題が出る**欠陥を出した
 * (`packages/web/e2e/layoutSwitch.e2e.ts` が見張っている)。
 *
 * ⚠️ **ここに `if` を足して早期 return したくなったら、それが再発である。**
 * 遊技の状態は `Game` の `useReducer` にあり、**作り直した瞬間に消える。**
 */
function Shell({
  screen,
  setScreen,
}: {
  readonly screen: Screen;
  readonly setScreen: (screen: Screen) => void;
}) {
  const phone = useLayout() !== "desktop";
  /** 外枠を外すか。**スマホ版のゲーム画面だけ。** */
  const bare = screen.name === "game" && phone;

  return (
    <Container size="sm" fluid={bare} px={bare ? 0 : "xs"} py={bare ? 0 : "md"}>
      <Stack gap={bare ? 0 : "md"}>
        {/*
          ⚠️ **タイトルは「描かない」で消す。**囲みごと外すと下の画面の位置が動く。
        */}
        {bare ? null : (
          <Title order={1} size="h2">
            数独
          </Title>
        )}

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
  );
}
