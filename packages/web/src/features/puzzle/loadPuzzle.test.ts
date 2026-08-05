import { describe, expect, it } from "vitest";

import { loadRandomPuzzle } from "./loadPuzzle";
import { SAMPLE_PUZZLE_LINE } from "./samplePuzzle";

/**
 * 取得は差し替え口から偽の応答を返して確かめる。
 * **通信もファイルも使わない**ので、この経路の検証にブラウザは要らない。
 */

const MANIFEST = {
  formatVersion: 1,
  generatedWith: { generator: "0.1.0", techniques: [1] },
  packs: [
    {
      path: "packs/easy-000.txt",
      difficulty: "easy",
      count: 2,
      seed: "easy-000",
      bytes: 336,
    },
  ],
  totals: { easy: 2, normal: 0, hard: 0, expert: 0, extreme: 0 },
};

const SECOND_LINE = SAMPLE_PUZZLE_LINE.replace(",easy,14", ",easy,15");
const PACK = `${SAMPLE_PUZZLE_LINE}\n${SECOND_LINE}\n`;

/** URL と中身の対応表から偽の `fetch` を作る。表に無い URL は 404 になる。 */
function fakeFetch(files: Record<string, string>): typeof globalThis.fetch {
  return ((url: string) => {
    const body = files[url];
    if (body === undefined) {
      return Promise.resolve(new Response("not found", { status: 404 }));
    }
    return Promise.resolve(new Response(body, { status: 200 }));
  }) as typeof globalThis.fetch;
}

const FILES = {
  "/puzzles/manifest.json": JSON.stringify(MANIFEST),
  "/puzzles/packs/easy-000.txt": PACK,
};

describe("loadRandomPuzzle", () => {
  it("マニフェストを見てからパックを取り、1 問返す", async () => {
    const loaded = await loadRandomPuzzle({
      difficulty: "easy",
      fetch: fakeFetch(FILES),
      random: () => 0,
    });

    expect(loaded?.packPath).toBe("packs/easy-000.txt");
    expect(loaded?.line).toBe(0);
    expect(loaded?.puzzle.score).toBe(14);
  });

  it("乱択で別の行も選ぶ", async () => {
    const loaded = await loadRandomPuzzle({
      difficulty: "easy",
      fetch: fakeFetch(FILES),
      random: () => 0.99,
    });

    expect(loaded?.line).toBe(1);
    expect(loaded?.puzzle.score).toBe(15);
  });

  it("配信元を差し替えられる", async () => {
    const loaded = await loadRandomPuzzle({
      difficulty: "easy",
      baseUrl: "/data/",
      fetch: fakeFetch({
        "/data/manifest.json": JSON.stringify(MANIFEST),
        "/data/packs/easy-000.txt": PACK,
      }),
      random: () => 0,
    });

    expect(loaded?.puzzle.difficulty).toBe("easy");
  });

  it("その難易度のパックが無ければ null", async () => {
    const loaded = await loadRandomPuzzle({
      difficulty: "extreme",
      fetch: fakeFetch(FILES),
      random: () => 0,
    });

    expect(loaded).toBeNull();
  });

  it.each([
    ["マニフェストが取れない", {}],
    ["マニフェストが JSON でない", { "/puzzles/manifest.json": "壊れている" }],
    [
      "マニフェストの版が違う",
      { "/puzzles/manifest.json": JSON.stringify({ ...MANIFEST, formatVersion: 2 }) },
    ],
    ["パックが取れない", { "/puzzles/manifest.json": JSON.stringify(MANIFEST) }],
    [
      "パックの中身が全部壊れている",
      {
        "/puzzles/manifest.json": JSON.stringify(MANIFEST),
        "/puzzles/packs/easy-000.txt": "こわれた\nこれも",
      },
    ],
  ])("取れなければ例外ではなく null を返す: %s", async (_name, files) => {
    const loaded = await loadRandomPuzzle({
      difficulty: "easy",
      fetch: fakeFetch(files),
      random: () => 0,
    });

    expect(loaded).toBeNull();
  });

  it("通信そのものが失敗しても投げない", async () => {
    const failing = (() => Promise.reject(new Error("offline"))) as typeof globalThis.fetch;

    await expect(loadRandomPuzzle({ difficulty: "easy", fetch: failing })).resolves.toBeNull();
  });
});
