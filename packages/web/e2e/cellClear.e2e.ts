import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: /^やさしい/ }).click();
  await expect(page.getByRole("grid", { name: "数独の盤面" })).toBeVisible();
});

test("セル内クリアはメモだけを消し、確定数字を消さない", async ({ page }) => {
  const initialCell = page.locator('[role="gridcell"][aria-label$="、空"]').first();
  const cellId = await initialCell.getAttribute("id");
  expect(cellId).not.toBeNull();
  const cell = page.locator(`[role="gridcell"]#${cellId}`);
  await cell.click();

  const clearNotes = page.getByRole("button", { name: "セル内クリア" });
  await expect(clearNotes).toHaveAttribute("aria-describedby", "cell-notes-clear-description");
  await expect(clearNotes).toBeDisabled();

  await page.getByRole("switch", { name: "メモ" }).click();
  await page.getByRole("button", { name: "1 をメモする" }).click();
  await expect(cell).toHaveAttribute("aria-label", /、候補 1$/);
  await expect(clearNotes).toBeEnabled();

  // 「消す」は確定数字専用なので、メモは残る。
  await page.getByRole("button", { name: "消す" }).click();
  await expect(cell).toHaveAttribute("aria-label", /、候補 1$/);

  await clearNotes.click();
  await expect(cell).toHaveAttribute("aria-label", /、空$/);
  await expect(clearNotes).toBeDisabled();

  await page.getByRole("switch", { name: "メモ" }).click();
  await page.getByRole("button", { name: "1 を入力" }).click();
  await expect(cell).toHaveAttribute("aria-label", /、1$/);
  await expect(clearNotes).toBeDisabled();
});

test("手がかりセルではセル内クリアを押せない", async ({ page }) => {
  const given = page.locator('[role="gridcell"][aria-readonly="true"]').first();
  await given.click();

  await expect(page.getByRole("button", { name: "セル内クリア" })).toBeDisabled();
});
