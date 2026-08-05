import { defineConfig, devices } from "@playwright/test";

/**
 * E2E は**自動化では測れなかったところだけ**に使う。
 *
 * ブラウザ面から送る合成キーでは**ネイティブのボタン活性化が起きない**ため、
 * 「Enter でボタンが押せるか」「モーダルを閉じたあとフォーカスが戻るか」は
 * どうしても確かめられなかった。Playwright は実ブラウザへ本物のキーイベントを
 * 送るので、そこだけを埋める。
 *
 * ⚠️ **ここで振る舞いを網羅しない。**盤面の遷移は reducer のテスト(Vitest)で
 * 押さえてある。E2E は遅く壊れやすいので、**代わりが無いものだけ**を入れる。
 *
 * ⚠️ **`pnpm test`(Vitest)と混ざらないようにする。**
 * Vitest は `*.test.ts` / `*.spec.ts` を拾うので、E2E は `*.e2e.ts` にしてある。
 */
const PORT = Number(process.env.PORT ?? 5175);

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  // Chromium だけで足りる。確かめたいのはブラウザ差ではなく、
  // 「本物のキーイベントで動くか」だけである。
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // 開発サーバへ当てる。ビルド成果物ではないので、待ち時間が短い。
    // ⚠️ ポートは他の担当と衝突しないものを使う(既定 5175)。
    command: `PORT=${PORT} pnpm dev`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
