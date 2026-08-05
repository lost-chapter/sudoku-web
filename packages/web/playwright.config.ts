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
  /*
   * ⚠️ **同じ検査を、レイアウトが分かれた両方の幅へ当てる。**
   * テストは増やしていない —— 面が 2 つに分かれたので、両方へ回すだけである。
   *
   * スマホ幅でキーボードを試すことに実用上の意味は薄い(スマホで Tab は使わない)。
   * **それでも回すのは、「同じ DOM と意味づけを保つ」という方針の検査になるから**で、
   * 落ちたら「レイアウトを分けた副作用で意味づけが壊れた」という知らせになる。
   */
  projects: [
    /*
     * ⚠️ **「1 画面に収める」は PC 版では回さない。**スマホ版の要件で、
     * 狭くした PC のウィンドウ(`pointer: fine`)は PC 版のまま縦に伸びてよい。
     *
     * 🔴 **押せる大きさは PC 版でも回す**(2026-08-06 に追加)。
     * ⚠️ **「1 画面に収まるか」と同じファイルに置いていたせいで、
     * 要らないほうと一緒に、要るほうまで落ちていた**(PC 版の 3 つが下限を割っていた)。
     * 🎯 **「この検査は PC に要らない」は、ファイル単位ではなく検査単位で確かめる。**
     */
    {
      name: "desktop",
      testMatch: ["**/keyboard.e2e.ts", "**/touchTarget.e2e.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    /*
     * ⚠️ **端末定義の既定は WebKit だが、Chromium で回す。**
     * 確かめたいのはブラウザ差ではなく「レイアウトを分けても意味づけが保たれるか」で、
     * **2 つ目のエンジンを CI へ持ち込む価値は無い**(取得も実行も倍になる)。
     */
    {
      name: "phone",
      use: { ...devices["iPhone 12"], browserName: "chromium" },
    },
    /*
     * ⚠️ **切り替えを跨ぐ検査(`layoutSwitch`)は `phone` でだけ回す。**
     * 中で自分から寸法を変えるので、**どの寸法から始めても見るものは同じ**である。
     * **更新情報(`releaseNotes`)も同じ** —— 見ているのは寸法ではなく中身である。
     * 3 つの project で回しても、同じことを 3 回確かめるだけになる。
     */
    {
      // ⚠️ **いちばん狭い端末。**ここが 1 画面と 24px の両立が最も厳しい。
      name: "phone-small",
      testIgnore: ["**/layoutSwitch.e2e.ts", "**/releaseNotes.e2e.ts"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 320, height: 568 },
        hasTouch: true,
        isMobile: true,
      },
    },
    {
      name: "phone-landscape",
      testIgnore: ["**/layoutSwitch.e2e.ts", "**/releaseNotes.e2e.ts"],
      use: { ...devices["iPhone SE landscape"], browserName: "chromium" },
    },
  ],
  webServer: {
    // 開発サーバへ当てる。ビルド成果物ではないので、待ち時間が短い。
    // ⚠️ ポートは他の担当と衝突しないものを使う(既定 5175)。
    //
    // ⚠️ **`--strictPort` を付ける。**Vite は既定では塞がっているポートを避けて
    // 別の番号で起動するが、Playwright は指定した番号を待ち続けるため、
    // **原因の分かりにくいタイムアウト**になる。塞がっていたら即座に失敗させる。
    command: `PORT=${PORT} pnpm dev -- --strictPort`,
    url: `http://localhost:${PORT}`,
    // ⚠️ **手元でも「動いているサーバを再利用」しない**(2026-08-05 に実測して変更)。
    //
    // 再利用を許すと、**別の担当が 5175 で立てた無関係なサーバに当たっても
    // そのまま走り**、3 件とも原因の分からない失敗になる(実際に再現した)。
    // 常に自前で立てれば、塞がっているときは Playwright が
    // 「already used」と名指しで止まる。**起動は 1 秒ほどしか変わらない。**
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
