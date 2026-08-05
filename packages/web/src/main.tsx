import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Mantine のスタイルは @layer mantine に入る。
// レイヤーに属さない自前 CSS が import 順に関係なく常に勝つため、
// 盤面の CSS が Mantine に負けない(ADR 0002)。
import "@mantine/core/styles.layer.css";

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
