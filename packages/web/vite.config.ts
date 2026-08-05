import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// 開発サーバのポートは worktree ごとに変える(docs/guides/handover.md の体制表)。
// PORT を指定すればそちらが使われる。
const port = Number(process.env.PORT ?? 5173);

/**
 * サイトを置く位置。
 *
 * GitHub Pages はリポジトリ名のサブパス(`/sudoku-web/`)に置かれるので、
 * 資産の参照を絶対パス(`/assets/...`)のままにすると **すべて 404 になる**。
 * ⚠️ **手元の開発と `pnpm preview` は `/` のまま**にしたいので、環境変数で切り替える。
 *
 * ⚠️ **これを設定しただけでは足りない。** アプリの中で組み立てている URL
 * (問題パック・リリースノート)も `import.meta.env.BASE_URL` を起点にすること
 * (docs/guides/deployment.md)。
 */
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  server: { port },
  preview: { port },
});
