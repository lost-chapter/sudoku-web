import { expect, test } from "@playwright/test";

/**
 * **更新情報が読めること。**
 *
 * ⚠️ **単体テストは形式の判定までしか見ていない。**
 * **配信物を取ってきて、読んで、画面に出るまでが繋がっているか**は
 * 実ブラウザでしか確かめられない
 * (`import.meta.env.BASE_URL` 起点の URL は、ビルドしないと本当の値にならない)。
 *
 * ⚠️ **中身の文言は固定しない。**版が上がるたびにテストを直すことになる。
 * **「版が 1 つ以上出ていること」だけを見る。**
 */

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("更新情報をキーボードだけで開いて読んで閉じられる", async ({ page }) => {
  const opener = page.getByRole("button", { name: /^更新情報/ });
  await expect(opener).toBeVisible();

  await opener.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "更新情報" });
  await expect(dialog).toBeVisible();
  // 版の見出しが 1 つ以上出ていること。**文言は固定しない。**
  await expect(dialog.getByRole("heading")).not.toHaveCount(0);
  await expect(dialog.getByRole("listitem")).not.toHaveCount(0);

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  // ⚠️ **閉じたあとフォーカスが戻ること。**戻らないと、次の Tab が先頭からになる。
  await expect(opener).toBeFocused();
});

test("初めての起動では新着のしるしを出さない", async ({ page }) => {
  // ⚠️ **過去の変更点を知らせても意味が無く、最初から付いていると
  // 「新しい知らせ」の意味が薄れる**(docs/api/release-notes-format.md)。
  await expect(page.getByRole("button", { name: "更新情報" })).toBeVisible();
  await expect(page.getByRole("button", { name: /新着/ })).toHaveCount(0);
});

/**
 * ⚠️ **同梱の配信物は 1 版しか無いので、未読の状態が作れない。**
 * **差し替えないと「新着が出て、開くと消える」を 1 度も通らない。**
 */
const TWO_RELEASES = {
  formatVersion: 1,
  releases: [
    { version: "0.2.0", date: "2026-08-07", sections: [{ title: "追加", items: ["増えました"] }] },
    { version: "0.1.0", date: "2026-08-06", sections: [{ title: "追加", items: ["出ました"] }] },
  ],
};

test("新着のしるしが出ているときも、押せば開いてしるしが消える", async ({ page }) => {
  await page.route("**/release-notes.json", (route) => route.fulfill({ json: TWO_RELEASES }));
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("sudoku-web:release-notes-read", "0.1.0"));
  await page.reload();

  const opener = page.getByRole("button", { name: /^更新情報/ });
  await expect(opener).toHaveText("更新情報(新着)");

  // 🔴 **開くのと既読にするのが同じ 1 回の操作で起きる。**
  // **しるしだけ消えて開かない、という壊れ方を実際に踏んだ**(2026-08-06)。
  await opener.click();
  await expect(page.getByRole("dialog", { name: "更新情報" })).toBeVisible();
  await expect(opener).toHaveText("更新情報");
});
