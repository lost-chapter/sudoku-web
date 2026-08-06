import { expect, test } from "@playwright/test";

/**
 * **あきらめる経路。**
 *
 * ⚠️ **見た目では気づけない欠陥があった。**あきらめると盤面が解と一致するので
 * 完成の判定も発火し、**完成のモーダルと読み上げが同時に出ていた**。
 * 画面には手前のモーダルしか見えないため、目視では通ってしまう。
 *
 * ⚠️ **「モーダルが 1 つだけ」ではなく「完成の知らせが出ない」を見る。**
 * 数を数えるだけでは意味を見ていない。
 */

/**
 * ヘッダの「あきらめる」。⚠️ **確認モーダルの中にも同じ名前のボタンがある**ので、
 * モーダルの外(`#root`)に限って探す。モーダルは portal で外へ出ている。
 */
const giveUpInHeader = (page: import("@playwright/test").Page) =>
  page.locator("#root").getByRole("button", { name: "あきらめる" });

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: /^やさしい/ }).click();
  await expect(page.getByRole("grid", { name: "数独の盤面" })).toBeVisible();
});

test("確認を挟み、既定のフォーカスは「やめる」にある", async ({ page }) => {
  await giveUpInHeader(page).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  // ⚠️ Enter の連打で確定させないため、危険でないほうへフォーカスを置く。
  await expect(page.getByRole("button", { name: "やめる" })).toBeFocused();
});

test("「やめる」を選べば遊技は続く", async ({ page }) => {
  await giveUpInHeader(page).click();
  await page.getByRole("button", { name: "やめる" }).click();

  await expect(page.getByRole("dialog")).toBeHidden();
  // 盤面はまだ触れる。
  await expect(page.getByRole("button", { name: "1 を入力" })).toBeEnabled();
});

test("あきらめると解が出るが、「完成」の知らせは出ない", async ({ page }) => {
  await giveUpInHeader(page).click();
  await page.getByRole("dialog").getByRole("button", { name: "あきらめる" }).click();

  await expect(page.getByRole("heading", { name: "答えを表示しました" })).toBeVisible();
  // 結果の案内をモーダルで覆わず、解答盤面を見られるようにする。
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("gridcell", { name: /答え/ }).first()).toBeVisible();

  // 🔴 ここが本体。盤面は解と一致するが、解いたのは遊技者ではない。
  await expect(page.getByRole("heading", { name: "完成!" })).toBeHidden();
  await expect(page.getByText("すべてのマスが解と一致しました。")).toBeHidden();

  // 読み上げにも「完成しました」を出さない。
  const announced = await page.evaluate(() =>
    Array.from(document.querySelectorAll("[aria-live]"))
      .map((el) => el.textContent?.trim() ?? "")
      .join(" / "),
  );
  expect(announced).not.toContain("完成しました");
  expect(announced).toContain("答えを表示しました");

  // あきらめた問題は正解数へ記録しない。
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("sudoku-web:results")))
    .toBeNull();
});

test("あきらめたあとは入力できない", async ({ page }) => {
  await giveUpInHeader(page).click();
  await page.getByRole("dialog").getByRole("button", { name: "あきらめる" }).click();
  await expect(page.getByRole("heading", { name: "答えを表示しました" })).toBeVisible();

  await expect(page.getByRole("button", { name: "1 を入力" })).toBeDisabled();
  await expect(giveUpInHeader(page)).toBeDisabled();
});
