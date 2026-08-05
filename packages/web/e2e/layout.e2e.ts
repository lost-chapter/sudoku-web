import { expect, test } from "@playwright/test";

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
 * `MIN_ONE_SCREEN_HEIGHT` を読んで条件分岐すると、しきい値を変えたときテストも
 * 一緒に動いてしまい、**壊れても落ちない**。
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "やさしい" }).click();
  await expect(page.getByRole("grid", { name: "数独の盤面" })).toBeVisible();
});

test("ゲーム画面が縦スクロールしない", async ({ page }) => {
  const overflows = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight + 1,
  );
  expect(overflows).toBe(false);
});

test("盤面のセルは 24px 四方を下回らない", async ({ page }) => {
  // ⚠️ 9 列あるので 44px は原理的に満たせない(docs/ui/screens-and-interactions.md)。
  // 下限は WCAG 2.2 のターゲットサイズ(最小)の 24px。
  const box = await page.locator('[role="gridcell"]').first().boundingBox();

  expect(box?.width ?? 0).toBeGreaterThanOrEqual(24);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
});
