import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

/*
 * Mantine のスタイルは @layer mantine に入る。
 * レイヤーに属さない自前 CSS が import 順に関係なく常に勝つため、
 * 盤面の CSS が Mantine に負けない(ADR 0002)。
 *
 * ⚠️ **全部入り(`@mantine/core/styles.layer.css`)は読まない。**
 * 使っていない部品のぶんまで配ることになる(ロードマップの課題 6)。
 * **代わりに、使う部品の CSS だけを 1 つずつ読む。**
 *
 * ⚠️ **部品を足したらここへも足すこと。**import 漏れは型でもテストでも
 * 捕まらず、**その部品だけ見た目が崩れる**形で出る。
 */

// 土台。**この 3 つは部品によらず要る。**順序も変えない。
import "@mantine/core/styles/baseline.layer.css";
import "@mantine/core/styles/default-css-variables.layer.css";
import "@mantine/core/styles/global.layer.css";

// 使っている部品。アルファベット順に並べて、足し忘れを見つけやすくする。
import "@mantine/core/styles/UnstyledButton.layer.css"; // Button の土台
import "@mantine/core/styles/Button.layer.css";
import "@mantine/core/styles/Paper.layer.css"; // Card と Modal の土台
import "@mantine/core/styles/Card.layer.css";
import "@mantine/core/styles/CloseButton.layer.css"; // Modal のヘッダ
import "@mantine/core/styles/Container.layer.css";
import "@mantine/core/styles/Group.layer.css";
import "@mantine/core/styles/List.layer.css";
import "@mantine/core/styles/Overlay.layer.css"; // Modal の背景
import "@mantine/core/styles/ScrollArea.layer.css"; // Modal の中身
import "@mantine/core/styles/ModalBase.layer.css";
import "@mantine/core/styles/Modal.layer.css";
import "@mantine/core/styles/SegmentedControl.layer.css";
import "@mantine/core/styles/SimpleGrid.layer.css";
import "@mantine/core/styles/Stack.layer.css";
import "@mantine/core/styles/InlineInput.layer.css"; // Switch の土台
import "@mantine/core/styles/Switch.layer.css";
import "@mantine/core/styles/Text.layer.css";
import "@mantine/core/styles/Title.layer.css";
import "@mantine/core/styles/VisuallyHidden.layer.css";

// 自前の上書き。**Mantine のあとに読む**(レイヤーの外なので順序に関係なく勝つが、
// 何を上書きしているかを読み手に分かりやすくするため後ろに置く)。
import "./app/theme.css";

import { App } from "./app/App";

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root が見つからない");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
