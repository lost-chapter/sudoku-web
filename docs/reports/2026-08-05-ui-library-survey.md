# UI ライブラリの選定調査

- **目的**: React + TypeScript で数独アプリを作るにあたり、UI ライブラリを 1 つ選ぶ
- **実施日**: 2026-08-05
- **対象**: Mantine / shadcn/ui / Chakra UI / MUI / Ark UI(Park UI)
- **条件**: 盤面(9×9・セル選択・候補表示・キーボード操作)は**自前実装する前提**。
  ライブラリに期待するのは盤面の外側の部品・フック・アクセシビリティの土台
- **方法**: npm registry の `time` / `peerDependencies` の直接照会、Bundlephobia、各公式ドキュメント

**結論は [ADR 0002](../decisions/0002-ui-library-selection.md) にある。この文書は根拠の記録である。**

## 結果

バージョンと公開日は npm registry の実測値(2026-08-05 時点)。
サイズは Bundlephobia の **パッケージ全体を import した場合**の値で、実アプリのバンドルサイズではない。

| | Mantine | shadcn/ui | Chakra UI | MUI | Ark UI |
|---|---|---|---|---|---|
| 最新安定版 | **9.5.1**(2026-08-02) | ライブラリではない(CLI でコピー) | 3.36.1(2026-07-19) | 9.3.0(2026-08-05) | 5.38.0(2026-08-03) |
| React 19 | **必須(`^19.2.0`)** | 対応表明あり | peer は `>=18`。**表明は不明** | v7 で対応表明 | peer は `>=18`。**表明は不明** |
| スタイリング | CSS Modules + CSS 変数 | Tailwind CSS | Emotion(CSS-in-JS) | Emotion(CSS-in-JS) | 完全 unstyled |
| gzip(全部入り) | 約 161 KB | 使った分のみ | 約 300 KB | 約 153 KB | 約 280 KB |
| ホットキーのフック | **公式(`use-hotkeys`)** | 無し | 確認範囲で無し | **不明**(見つからず) | 無し |
| localStorage のフック | **公式(`use-local-storage`)** | 無し | 確認範囲で無し | 別プロダクト(Toolpad) | 無し |
| テーマ切替 | `auto` + localStorage 永続化 + フラッシュ防止 | **自前実装**(公式が手書きコードを提示) | `next-themes` 依存 | **最も手厚い** | 自前実装 |
| a11y の裏付け | **jest-axe 自動テスト + VoiceOver 手動テストを明記** | Radix / Base UI が WAI-ARIA 準拠 | 包括的な表明は**見つからず** | v9 で改善に言及。準拠表明は無し | 専用ページが 404。**不明** |

## 決め手になった 3 点

1. **フックが公式に揃っているのは Mantine だけだった。**
   数独で要るのは `use-hotkeys`(数字キー・メモ切替・取り消し)と
   `use-local-storage`(進行の保存)。他の 4 候補はどれも自前実装か別ライブラリが要る
2. **Mantine は `@layer mantine` に全スタイルが入る。**
   レイヤーに入っていない自前 CSS が **import 順に関係なく常に勝つ**ため、
   盤面の細かい境界線制御で `!important` を積む事故が起きにくい
3. **a11y の裏付けが「検証方法まで」公表されているのは Mantine だけだった**

## shadcn/ui の前提が 2026 年に変わっていた

**2026-07 に既定の基盤が Radix UI から Base UI へ切り替わった**(Radix も併存、React Aria も追加)。
その Base UI 自体が **`1.0.0-rc.0` で安定版が未公開**。

この変化は次点の評価を下げた。個人開発規模では、
**基盤の選択と将来の移行判断という意思決定が増えること自体がコスト**である。

## 却下理由

| 候補 | 却下理由 |
|------|---------|
| Chakra UI 3 | gzip 300 KB と候補中最大。`useDisclosure` 等がドキュメント化されておらず、追加要望も "not planned" でクローズ |
| MUI 9 | テーマ切替は最強だが Emotion 必須。**公式が次期メジャーでの Emotion 非依存化を予告済み**で、移行が待っている |
| Ark UI / Park UI | 完全 unstyled のため部品の見た目も全部自作になり、ライブラリを入れる目的が達成されない |

## 調査で確かめられなかったこと

**推測で埋めず、そのまま残す。**

- Chakra UI / Ark UI の **React 19 対応の公式表明の有無**(peer 上はインストール可能)
- Ark UI の WAI-ARIA 準拠の具体的な記述(a11y 専用ページが 404)
- Park UI の現行バージョンと配布形態
- MUI にホットキー用の公式フックが**無いこと**(見つからなかっただけで、無いとは断言できない)

## 残課題

- **Mantine は React 19.2+ が必須。** React 18 へ戻る選択肢は無くなる
- `@mantine/core` の全部入り gzip 161 KB は小さくない。
  **実際に使う部品だけを import しているか**を工程 3 以降で実測する

## 出典

- [Mantine changelog 9.0.0](https://mantine.dev/changelog/9-0-0/) /
  [Hooks package](https://mantine.dev/hooks/package/) /
  [Mantine styles](https://mantine.dev/styles/mantine-styles/) /
  [Color schemes](https://mantine.dev/theming/color-schemes/) /
  [accessibility FAQ](https://help.mantine.dev/q/are-mantine-components-accessible)
- [shadcn/ui: Base UI as the Default (2026-07)](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default) /
  [Dark mode (Vite)](https://ui.shadcn.com/docs/dark-mode/vite)
- [Radix UI accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [Chakra UI installation](https://chakra-ui.com/docs/get-started/installation) /
  [Issue #10651](https://github.com/chakra-ui/chakra-ui/issues/10651)
- [Introducing Material UI and MUI X v9](https://mui.com/blog/introducing-mui-v9/) /
  [MUI dark mode](https://mui.com/material-ui/customization/dark-mode/)
- [About Ark UI](https://ark-ui.com/docs/overview/about) / [Park UI](https://park-ui.com/)
- npm registry(`@mantine/core` / `@chakra-ui/react` / `@mui/material` / `@ark-ui/react` /
  `radix-ui` / `@base-ui-components/react`)、Bundlephobia API
