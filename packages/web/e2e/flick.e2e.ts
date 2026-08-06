import { expect, test, type Page } from "@playwright/test";

/**
 * **数字キーの指の操作に「何も起きない」領域が無いこと。**
 *
 * 🔴 **合成した `TouchEvent` では分からない。**
 * ブラウザは**指が少し滑ると `click` の合成をやめる**(tap slop)。
 * **JS から `click` を自分で出して確かめると、その挙動ごと消えてしまう。**
 * ⚠️ **実際に 1 度これで誤った表を書いた**(2026-08-06)。
 *
 * **CDP で本物のタッチを送る。**Playwright の `touchscreen` はタップしか送れない。
 */

interface Cell {
  readonly label: string;
}

/**
 * ⚠️ **見るセルを最初に 1 つ掴んで、以後それだけを見る。**
 * `.first()` で取り直すと**入力のたびに別のセルを指す**(空でなくなるため)。
 */
async function pinEmptyCell(page: Page): Promise<Cell> {
  const label = await page
    .locator('[role="gridcell"][aria-label$="、空"]')
    .first()
    .getAttribute("aria-label");
  expect(label).not.toBeNull();
  await page.locator(`[role="gridcell"][aria-label="${label}"]`).click();
  return { label: label as string };
}

/** 位置で指したセルの、いまの読み上げラベル。 */
async function stateOf(page: Page, cell: Cell): Promise<string> {
  const position = cell.label.replace(/、.*$/, "");
  const label = await page
    .locator(`[role="gridcell"][aria-label^="${position}、"]`)
    .getAttribute("aria-label");
  return (label ?? "").replace(`${position}、`, "");
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "やさしい" }).click();
  await expect(page.getByRole("grid", { name: "数独の盤面" })).toBeVisible();
});

test("上へどれだけ滑らせても、必ず入力かメモのどちらかになる", async ({ page, context }) => {
  const cell = await pinEmptyCell(page);
  const key = page.getByRole("button", { name: /^1 を入力$/ });
  const box = await key.boundingBox();
  expect(box).not.toBeNull();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;

  const cdp = await context.newCDPSession(page);
  const clear = page.getByRole("button", { name: "消す" });
  const slideUp = async (distance: number) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y - distance }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };

  // ⚠️ **tap slop(およそ 15px)をまたぐ範囲を刻んで見る。**
  // **境目の値だけを見ると、穴がその外にあったときに気づけない。**
  for (const distance of [0, 10, 14, 16, 20, 23, 24, 30, 40]) {
    const memo = distance >= 24;
    await slideUp(distance);
    await expect
      .poll(() => stateOf(page, cell), { message: `上へ ${distance}px` })
      .toBe(memo ? "候補 1" : "1");

    // ⚠️ **「消す」は候補を消さない**(確定入力だけを消す仕様)。
    // **候補はもう一度同じフリックで落とす**(トグル)。
    if (memo) {
      await slideUp(distance);
    } else {
      await clear.click();
    }
    await expect.poll(() => stateOf(page, cell)).toBe("空");
  }
});

test("キーの外で離したら何も起きない", async ({ page, context }) => {
  // **指を外へ滑らせて取り消す**のは、ボタンの標準的な振る舞いである。
  const cell = await pinEmptyCell(page);
  const box = await page.getByRole("button", { name: /^1 を入力$/ }).boundingBox();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;

  const cdp = await context.newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x + box!.width * 2, y }],
  });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

  await expect.poll(() => stateOf(page, cell)).toBe("空");
});

test("盤面からスワイプすると数字パレットを表示して入力する", async ({ page, context }) => {
  const cell = await pinEmptyCell(page);
  const target = page.locator(`[role="gridcell"][aria-label="${cell.label}"]`);
  const box = await target.boundingBox();
  expect(box).not.toBeNull();

  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  const cdp = await context.newCDPSession(page);

  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: x + 32, y }],
  });

  // 右へ滑らせたので、3×3 パレットの中央右(6)が選ばれている。
  await expect(page.locator('[data-swipe-picker="true"]')).toHaveAttribute(
    "data-active-digit",
    "6",
  );

  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => stateOf(page, cell)).toBe("6");
});

test("設定で切ると、上へはじいてもメモにならない", async ({ page, context }) => {
  // ⚠️ **切ったときに「何も起きない」領域が復活しないことも見る。**
  // **フリックの判定だけを止めると、タップが `click` 任せに戻って slop の穴が開く。**
  await page.getByRole("button", { name: "設定" }).click();
  /*
   * ⚠️ **`getByRole("checkbox")` では見つからない。**
   * **Mantine の `Switch` は `input[type=checkbox]` だが `role="switch"` を上書きしている。**
   * 🎯 **`role="switch"` にした瞬間に走査から外れた**のと同じ形で、
   * **今度はテストを書く側が踏んだ**(2026-08-06)。
   *
   * ⚠️ **`uncheck()` も使えない。**本体の `input` は隠されているので、
   * Playwright が「見えていない」と判断して待ち続ける。**見えているラベルを押す。**
   */
  const flick = page.getByRole("switch", { name: /上へはじいてメモ/ });
  await expect(flick).toBeChecked();
  await page.locator('label:has-text("上へはじいてメモ")').click();
  await expect(flick).not.toBeChecked();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

  const cell = await pinEmptyCell(page);
  const box = await page.getByRole("button", { name: /^1 を入力$/ }).boundingBox();
  const x = box!.x + box!.width / 2;
  const y = box!.y + box!.height / 2;
  const cdp = await context.newCDPSession(page);
  const slideUp = async (distance: number) => {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y: y - distance }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  };

  // キーの中に収まる範囲は確定入力のまま。**穴は開かない。**
  for (const distance of [0, 16, 23]) {
    await slideUp(distance);
    await expect.poll(() => stateOf(page, cell), { message: `上へ ${distance}px` }).toBe("1");
    await page.getByRole("button", { name: "消す" }).click();
    await expect.poll(() => stateOf(page, cell)).toBe("空");
  }

  // **キーの外まで滑らせたら取り消し。**候補は立たない。
  // ⚠️ **固定の px を使わない。**キーの高さは画面によって変わるので、
  // **「キーの高さぶん上へ」= 必ず外**、という取り方にする。
  await slideUp(box!.height);
  await expect.poll(() => stateOf(page, cell)).toBe("空");
});
