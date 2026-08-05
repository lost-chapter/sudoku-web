import { expect, test, type Page } from "@playwright/test";

/**
 * **1 画面に収まること**と**盤面が読める大きさであること**。
 * どちらも発注者の要件で、**実ブラウザでしか測れない**
 * (レイアウトが確定しないと高さが出ない)。
 *
 * ⚠️ **この検査はスマホ向けの project でだけ回す**(playwright.config.ts)。
 * 狭くした PC のウィンドウは PC 版のままでよく、縦に伸びても要件違反ではない。
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

/**
 * ⚠️ **パッドのキーだけを見ない。**大きさを自由に取れるものは**すべて**下限を守る。
 * 入力パッドだけ測っていたので、**ホームの難易度ボタンが 36px のまま残っていた**
 * (2026-08-06 に管理役が発見)。
 */
async function expectAllButtonsAreTouchable(page: Page): Promise<void> {
  const buttons = page.getByRole("button");
  const count = await buttons.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    const button = buttons.nth(index);
    // ⚠️ **記号だけのボタンは `textContent` が空になる。**どれが落ちたか分からなくなるので、
    // **読み上げの名前を先に見る**(記号だけのボタンはそこにしか名前が無い)。
    const [box, label] = await Promise.all([
      button.boundingBox(),
      button.getAttribute("aria-label"),
    ]);
    const name = label ?? (await button.textContent());

    expect(box?.width ?? 0, `「${name}」の幅`).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0, `「${name}」の高さ`).toBeGreaterThanOrEqual(44);
  }
}

test("ゲーム画面の押せるものは 44px 四方を下回らない", async ({ page }) => {
  await expectAllButtonsAreTouchable(page);
});

test("ホーム画面の押せるものは 44px 四方を下回らない", async ({ page }) => {
  // ⚠️ **1 つ入れてから戻る。**空の盤面は保存されないので、
  // そのまま戻ると「続きから」が出ず、**測る対象が 1 つ減る。**
  await page.locator('[role="gridcell"][aria-label$="、空"]').first().click();
  await page.getByRole("button", { name: /^1 を入力$/ }).click();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "続きから" })).toBeVisible();

  await expectAllButtonsAreTouchable(page);
});
