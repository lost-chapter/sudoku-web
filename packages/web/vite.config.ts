import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 開発サーバのポートは worktree ごとに変える(docs/guides/handover.md の体制表)。
// PORT を指定すればそちらが使われる。
const port = Number(process.env.PORT ?? 5173);

export default defineConfig({
  plugins: [react()],
  server: { port },
  preview: { port },
});
