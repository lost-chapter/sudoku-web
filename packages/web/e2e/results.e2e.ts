import { expect, test } from "@playwright/test";

/** ホーム画面が正解結果を読み、難易度ごとの件数を表示すること。 */
test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
});

test("localStorage に保存された正解数を難易度カードへ表示する", async ({ page }) => {
  await page.evaluate(async () => {
    const manifest = await fetch("/puzzles/manifest.json").then((response) => response.json());
    const pack = manifest.packs.find(
      (candidate: { readonly difficulty: string }) => candidate.difficulty === "easy",
    );
    localStorage.setItem(
      "sudoku-web:results",
      JSON.stringify({
        solved: [
          {
            packPath: pack.path,
            line: 0,
            difficulty: "easy",
            formatVersion: manifest.formatVersion,
            generator: manifest.generatedWith.generator,
          },
        ],
      }),
    );
  });
  await page.reload();

  const easy = page.getByRole("button", { name: /^やさしい/ });
  await expect(easy).toBeVisible();
  await expect(easy).toHaveAttribute("aria-label", /正解 1 問/);
  await expect(easy).toContainText("正解 1 / 1,000 問");
});

test("正解して完了した問題を localStorage へ記録する", async ({ page }) => {
  await page.getByRole("button", { name: /^やさしい/ }).click();
  await expect(page.getByRole("grid", { name: "数独の盤面" })).toBeVisible();

  const givens = await page.locator('[role="gridcell"]').evaluateAll((cells) =>
    cells.map((cell) => {
      const match = cell.getAttribute("aria-label")?.match(/、手がかり ([1-9])$/);
      return match ? Number(match[1]) : 0;
    }),
  );
  const solution = await page.evaluate(async (givenDigits) => {
    const manifest = await fetch("/puzzles/manifest.json").then((response) => response.json());
    const pack = manifest.packs.find(
      (candidate: { readonly difficulty: string }) => candidate.difficulty === "easy",
    );
    const text = await fetch(`/puzzles/${pack.path}`).then((response) => response.text());
    const givenText = givenDigits.map((digit) => (digit === 0 ? "." : String(digit))).join("");
    const line = text.split("\n").find((entry) => entry.startsWith(`${givenText},`));
    if (!line) {
      throw new Error("表示中の問題をパックから特定できない");
    }
    return line.split(",")[1].split("").map(Number);
  }, givens);

  const cells = page.locator('[role="gridcell"]');
  for (const [index, digit] of solution.entries()) {
    if (givens[index] !== 0) {
      continue;
    }
    await cells.nth(index).click();
    await page.getByRole("button", { name: `${digit} を入力` }).click();
  }

  await expect(page.getByRole("heading", { name: "完成!" })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem("sudoku-web:results");
        return raw === null ? 0 : JSON.parse(raw).solved.length;
      }),
    )
    .toBe(1);
});
