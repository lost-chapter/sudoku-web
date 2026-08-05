import { describe, expect, it } from "vitest";

import { tryParseManifest, type Manifest } from "@sudoku/core";

import { availableDifficulties, packsFor } from "./packSelection";

/**
 * マニフェストの読み書きは `core` が持つ。ここで確かめるのは**遊技側の選び方**だけ。
 */

function manifestOf(
  packs: readonly { path: string; difficulty: string; count: number }[],
): Manifest {
  const parsed = tryParseManifest(
    JSON.stringify({
      formatVersion: 1,
      generatedWith: { generator: "0.1.0", techniques: [1, 2, 3, 4] },
      packs: packs.map((pack) => ({ ...pack, seed: pack.path, bytes: pack.count * 168 })),
    }),
  );
  if (!parsed) {
    throw new Error("テストのマニフェストが読めない");
  }
  return parsed;
}

const MANIFEST = manifestOf([
  { path: "packs/easy-000.txt", difficulty: "easy", count: 1000 },
  { path: "packs/normal-000.txt", difficulty: "normal", count: 1000 },
  { path: "packs/hard-000.txt", difficulty: "hard", count: 0 },
]);

describe("packsFor", () => {
  it("その難易度のパックだけを返す", () => {
    expect(packsFor(MANIFEST, "easy").map((pack) => pack.path)).toEqual(["packs/easy-000.txt"]);
  });

  it("空のパックは選ばせない", () => {
    expect(packsFor(MANIFEST, "hard")).toEqual([]);
  });

  it("収録の無い難易度は空", () => {
    expect(packsFor(MANIFEST, "extreme")).toEqual([]);
  });
});

describe("availableDifficulties", () => {
  it("0 件のクラスは出さない(画面にクラスを固定で書かないため)", () => {
    // hard は 0 件、expert と extreme は収録そのものが無い。
    expect(availableDifficulties(MANIFEST)).toEqual(["easy", "normal"]);
  });

  it("並びは難易度の順を保つ", () => {
    const all = manifestOf([
      { path: "packs/extreme-000.txt", difficulty: "extreme", count: 1 },
      { path: "packs/easy-000.txt", difficulty: "easy", count: 1 },
      { path: "packs/hard-000.txt", difficulty: "hard", count: 1 },
    ]);
    expect(availableDifficulties(all)).toEqual(["easy", "hard", "extreme"]);
  });

  it("手筋が増えて上のクラスが埋まれば、UI を直さずに選べるようになる", () => {
    const before = manifestOf([{ path: "packs/easy-000.txt", difficulty: "easy", count: 1 }]);
    const after = manifestOf([
      { path: "packs/easy-000.txt", difficulty: "easy", count: 1 },
      { path: "packs/expert-000.txt", difficulty: "expert", count: 1 },
    ]);

    expect(availableDifficulties(before)).toEqual(["easy"]);
    expect(availableDifficulties(after)).toEqual(["easy", "expert"]);
  });
});
