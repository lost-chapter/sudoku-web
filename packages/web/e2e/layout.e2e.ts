import { expect, test, type Page } from "@playwright/test";

/**
 * **1 画面に収まること**と**盤面が読める大きさであること**。
 * どちらも発注者の要件で、**実ブラウザでしか測れない**
 * (レイアウトが確定しないと高さが出ない)。
 *
 * ⚠️ **この検査はスマホ向けの project でだけ回す**(playwright.config.ts)。
 * 狭くした PC のウィンドウは PC 版のままでよく、縦に伸びても要件違反ではない。
 *
 * 🔴 **押せるものの大きさは `touchTarget.e2e.ts` へ移した**(2026-08-06)。
 * **あちらは PC 版にも要る**のに、ここに置いたせいで一緒に落ちていた。
 *
 * ⚠️ **実装のしきい値を持ち込まない。**「この端末でどう見えてほしいか」を直接書く。
 * CSS の高さ条件を読んで条件分岐すると、実装を変えたときテストも一緒に動いてしまい、
 * **壊れても落ちない**。
 */

/** ページ全体が縦に流れていないか。**モーダルの中のスクロールは見ない。** */
async function overflowsVertically(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight + 1);
}

test.describe("ホーム画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // 難易度が並ぶまで待つ。**マニフェストを読んでから高さが決まる。**
    await expect(page.getByRole("button", { name: /^やさしい/ })).toBeVisible();
  });

  // 🔴 **2026-08-06 に発注者から「スマホではスクロールをできないように」。**
  // ゲーム画面と同じ扱いにする。⚠️ **PC 版は縦に伸びてよい**(「スマホでは」の指定)。
  test("縦スクロールしない", async ({ page }) => {
    expect(await overflowsVertically(page)).toBe(false);
  });

  // ⚠️ **遊びかけがあると「続きから」の枠がまるごと増える。**
  // **いちばん背が高くなる状態でも収まること**を見る。
  test("遊びかけがあっても縦スクロールしない", async ({ page }) => {
    await page.getByRole("button", { name: /^やさしい/ }).click();
    await expect(page.getByRole("grid", { name: "数独の盤面" })).toBeVisible();
    await page.locator('[role="gridcell"][aria-label$="、空"]').first().click();
    await page.getByRole("button", { name: /^1 を入力$/ }).click();

    await page.goto("/");
    await expect(page.getByRole("button", { name: "続きから" })).toBeVisible();

    expect(await overflowsVertically(page)).toBe(false);
  });
});

test.describe("ゲーム画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.getByRole("button", { name: /^やさしい/ }).click();
    await expect(page.getByRole("grid", { name: "数独の盤面" })).toBeVisible();
  });

  test("縦スクロールしない", async ({ page }) => {
    expect(await overflowsVertically(page)).toBe(false);
  });

  test("盤面のセルは 24px 四方を下回らない", async ({ page }) => {
    // ⚠️ 9 列あるので 44px は原理的に満たせない(docs/ui/screens-and-interactions.md)。
    // 下限は WCAG 2.2 のターゲットサイズ(最小)の 24px。
    const box = await page.locator('[role="gridcell"]').first().boundingBox();

    expect(box?.width ?? 0).toBeGreaterThanOrEqual(24);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
  });

  test("盤面の領域も縦スクロールしない", async ({ page }) => {
    const metrics = await page.getByRole("grid").evaluate((grid) => {
      const area = grid.parentElement;
      return {
        scrollHeight: area?.scrollHeight ?? 0,
        clientHeight: area?.clientHeight ?? 0,
        overflowY: area ? getComputedStyle(area).overflowY : "",
      };
    });

    expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
    expect(metrics.overflowY).not.toBe("auto");
    expect(metrics.overflowY).not.toBe("scroll");
  });
});
