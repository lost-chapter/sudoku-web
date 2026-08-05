import { expect, test, type Page, type TestInfo } from "@playwright/test";

/**
 * **押せるものの大きさ。両方のレイアウトで回す。**
 *
 * 🔴 **`layout.e2e.ts` から切り出した**(2026-08-06)。
 * あちらは「1 画面に収まるか」で**スマホ版だけの要件**なので PC 版では回していない。
 * ⚠️ **押せる大きさは PC 版にも要る**のに、同じファイルに置いたせいで一緒に落ちていた。
 * 実際に **PC 版の 3 つが下限を割ったまま残っていた**(管理役が発見)。
 *
 * 🎯 **「この検査は PC に要らない」と判断したら、ファイル単位ではなく検査単位で確かめる。**
 *
 * ⚠️ **代表を 1 つ測らない。画面上のボタンを全部走査する**
 * (docs/verification/testing-policy.md「取れたものが、測りたかったものとは限らない」)。
 */

/**
 * 下限。**指かマウスかで変わる**(docs/ui/screens-and-interactions.md「押せる大きさ」)。
 *
 * ⚠️ **project の名前では分けない。**分けるのは端末の性質であって、設定の名前ではない。
 * `hasTouch` は「指で触る端末か」そのものなので、project を増やしても正しく効く。
 */
function minimumSize(testInfo: TestInfo): number {
  // 44 は指の接触面が根拠(WCAG 2.5.5)。マウスに同じ根拠は無いので 24(WCAG 2.5.8)。
  return testInfo.project.use.hasTouch === true ? 44 : 24;
}

async function expectEveryButtonIsBigEnough(page: Page, minimum: number): Promise<void> {
  const buttons = page.getByRole("button");
  const count = await buttons.count();
  // ⚠️ **0 個でも for 文は通る。**「走査した」と「見た」を分けるために数を確かめる。
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

    expect(box?.width ?? 0, `「${name}」の幅`).toBeGreaterThanOrEqual(minimum);
    expect(box?.height ?? 0, `「${name}」の高さ`).toBeGreaterThanOrEqual(minimum);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "やさしい" }).click();
  await expect(page.getByRole("grid", { name: "数独の盤面" })).toBeVisible();
});

test("ゲーム画面の押せるものは下限を割らない", async ({ page }, testInfo) => {
  await expectEveryButtonIsBigEnough(page, minimumSize(testInfo));
});

test("ホーム画面の押せるものは下限を割らない", async ({ page }, testInfo) => {
  // ⚠️ **1 つ入れてから戻る。**空の盤面は保存されないので、
  // そのまま戻ると「続きから」が出ず、**測る対象が 1 つ減る。**
  await page.locator('[role="gridcell"][aria-label$="、空"]').first().click();
  await page.getByRole("button", { name: /^1 を入力$/ }).click();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "続きから" })).toBeVisible();

  await expectEveryButtonIsBigEnough(page, minimumSize(testInfo));
});
