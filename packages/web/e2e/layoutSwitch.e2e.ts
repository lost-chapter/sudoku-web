import { expect, test, type Page } from "@playwright/test";

/**
 * **レイアウトが切り替わっても遊技が続くこと。**
 *
 * 🔴 2026-08-06 に、**幅を広げると入力も保存も消え、別の問題になる**欠陥が見つかった。
 * `Shell` がレイアウトによって `GameScreen` の置き場所を変えていたため、
 * React が同じ要素と見なせず**作り直していた**。
 *
 * ⚠️ **E2E 33 件が通っていたのに見つからなかった。**
 * project ごとに幅を固定して回しており、**切り替えを跨ぐ検査が 1 つも無かった。**
 *
 * ⚠️ **数ではなく意味を見る。**「描画が壊れていない」ではなく、
 * **「入力が残っている」「保存が残っている」「同じ問題である」**の 3 つを見る。
 */

interface Snapshot {
  /** 遊技者が入れた数字の数。 */
  readonly entries: number;
  /** `localStorage` に残っている入力の数。**保存が消えると `null`。** */
  readonly saved: number | null;
  /** どのパックの何行目か。**問題が入れ替わると変わる。** */
  readonly line: number | null;
  /** 最初から埋まっているマス。**同じ問題なら一致する。** */
  readonly givens: string;
}

async function snapshot(page: Page): Promise<Snapshot> {
  // ⚠️ **読み上げのラベルで数える。**CSS モジュールのクラス名は変換で変わるので、
  // それに頼ると**実装の都合でテストが落ちる**。
  return page.evaluate(() => {
    const labels = [...document.querySelectorAll('[role="gridcell"]')].map(
      (cell) => cell.getAttribute("aria-label") ?? "",
    );
    const raw = localStorage.getItem("sudoku-web:progress");
    const saved = raw === null ? null : (JSON.parse(raw) as { entries: unknown[]; line: number });

    return {
      // 「1 行 1 列、7」が遊技者の入力。手がかりと答えは語が付くので混ざらない。
      entries: labels.filter((label) => /、\d+$/.test(label)).length,
      saved: saved ? saved.entries.filter(Boolean).length : null,
      line: saved ? saved.line : null,
      givens: labels.filter((label) => /、手がかり \d+$/.test(label)).join("|"),
    };
  });
}

/** 空いているマスへ 2 つ入れる。**入力の経路はスマホ版のパッドを使う。** */
async function enterTwoDigits(page: Page): Promise<void> {
  // 入れるたびに「空」でなくなるので、**そのつど先頭を取り直す**。
  const empty = page.locator('[role="gridcell"][aria-label$="、空"]');

  await empty.first().click();
  await page.getByRole("button", { name: /^7 を入力$/ }).click();
  await empty.first().click();
  await page.getByRole("button", { name: /^4 を入力$/ }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "むずかしい" }).click();
  await expect(page.getByRole("grid", { name: "数独の盤面" })).toBeVisible();
});

test("PC 幅へ広げても、入力も保存も同じ問題も残る", async ({ page }) => {
  await enterTwoDigits(page);
  const before = await snapshot(page);
  expect(before.entries).toBe(2);
  expect(before.saved).toBe(2);

  // ⚠️ **`pointer: coarse` は保ったまま幅だけ広げる。**
  // PC でウィンドウを狭める / タブレットで画面分割の幅を変える、に相当する。
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole("button", { name: "難易度を選び直す" })).toBeVisible();

  const after = await snapshot(page);
  expect(after.entries).toBe(before.entries);
  expect(after.saved).toBe(before.saved);
  expect(after.line).toBe(before.line);
  expect(after.givens).toBe(before.givens);
});

test("横向きにしても、入力も保存も同じ問題も残る", async ({ page }) => {
  const portrait = page.viewportSize();
  test.skip(portrait === null, "端末の寸法が取れないと回せない");

  await enterTwoDigits(page);
  const before = await snapshot(page);
  expect(before.entries).toBe(2);
  expect(before.saved).toBe(2);

  // ⚠️ **実機で最も起きやすいのはこれ**(スマホを横にする)。
  await page.setViewportSize({ width: portrait!.height, height: portrait!.width });
  await expect(page.getByRole("grid", { name: "数独の盤面" })).toBeVisible();

  const after = await snapshot(page);
  expect(after.entries).toBe(before.entries);
  expect(after.saved).toBe(before.saved);
  expect(after.line).toBe(before.line);
  expect(after.givens).toBe(before.givens);
});
