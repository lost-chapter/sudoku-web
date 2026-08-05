import { expect, test } from "@playwright/test";

/**
 * キーボードだけで遊べることのうち、**合成キーでは確かめられなかった 2 点**。
 *
 * ⚠️ **ここを増やさない。**盤面の遷移(選択・入力・メモ・取り消し)は
 * reducer のテストで押さえてあり、E2E で二重に持つと遅く壊れやすくなる。
 * ここにあるのは「本物のキーイベントでないと起きないこと」だけである。
 *
 * 仕様は docs/ui/screens-and-interactions.md の
 * 「キーボードだけで最初から最後まで遊べること」。
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  // 遊びかけがあると「続きから」が増えて Tab の順序が変わる。毎回消しておく。
  await page.evaluate(() => {
    localStorage.removeItem("sudoku-web:progress");
    localStorage.removeItem("sudoku-web:settings");
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "やさしい" })).toBeVisible();
});

test("ホームで Tab して Enter を押すと遊び始められる", async ({ page }) => {
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "やさしい" })).toBeFocused();

  await page.keyboard.press("Enter");

  await expect(page.getByRole("grid", { name: "数独の盤面" })).toBeVisible();
});

test("ホームで Tab して Space を押しても遊び始められる", async ({ page }) => {
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "ふつう" })).toBeFocused();

  await page.keyboard.press("Space");

  // ⚠️ 難易度の文字はレイアウトによって出ない(横向きは幅が無いので畳む)。
  // ここで見たいのは「Space でも始まるか」だけなので、盤面が出たことで足りる。
  await expect(page.getByRole("grid", { name: "数独の盤面" })).toBeVisible();
});

test("設定を Escape で閉じるとフォーカスが「設定」へ戻る", async ({ page }) => {
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("grid", { name: "数独の盤面" })).toBeVisible();

  const settings = page.getByRole("button", { name: "設定" });
  await settings.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  // 開いたらフォーカスはモーダルの中にある(閉じ込め)。
  await expect(dialog.locator(":focus")).toHaveCount(1);

  await page.keyboard.press("Escape");

  await expect(dialog).toBeHidden();
  // **閉じたら開く前の場所へ戻る。**戻らないと、キーボードだけの遊技者は
  // 画面の先頭から Tab をやり直すことになる。
  await expect(settings).toBeFocused();
});
