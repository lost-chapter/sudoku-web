import { describe, expect, it } from "vitest";

import { decodeManifest, packsFor } from "./manifest";

const VALID = {
  formatVersion: 1,
  generatedWith: { generator: "0.1.0", techniques: [1, 2, 3, 4] },
  packs: [
    {
      path: "packs/easy-000.txt",
      difficulty: "easy",
      count: 1000,
      seed: "easy-000",
      bytes: 168000,
    },
    { path: "packs/normal-000.txt", difficulty: "normal", count: 1000 },
  ],
  totals: { easy: 1000, normal: 1000, hard: 0, expert: 0, extreme: 0 },
};

describe("decodeManifest", () => {
  it("契約どおりのマニフェストを読める", () => {
    const manifest = decodeManifest(VALID);
    expect(manifest?.generator).toBe("0.1.0");
    expect(manifest?.techniques).toEqual([1, 2, 3, 4]);
    expect(manifest?.packs).toHaveLength(2);
  });

  it.each([
    ["版が違う", { ...VALID, formatVersion: 2 }],
    ["版が無い", { ...VALID, formatVersion: undefined }],
    ["packs が無い", { ...VALID, packs: undefined }],
    ["オブジェクトでない", "manifest"],
    ["null", null],
  ])("読めない形式は捨てる: %s", (_name, value) => {
    expect(decodeManifest(value)).toBeNull();
  });

  it("壊れたパックの項目だけを捨て、マニフェストは捨てない", () => {
    const manifest = decodeManifest({
      ...VALID,
      packs: [
        ...VALID.packs,
        { path: "packs/broken.txt", difficulty: "insane", count: 10 },
        { path: "", difficulty: "easy", count: 10 },
        { path: "packs/nocount.txt", difficulty: "easy" },
      ],
    });
    expect(manifest?.packs.map((pack) => pack.path)).toEqual([
      "packs/easy-000.txt",
      "packs/normal-000.txt",
    ]);
  });

  it("generatedWith が欠けていても読める(難易度の意味は分からなくなる)", () => {
    const manifest = decodeManifest({ ...VALID, generatedWith: undefined });
    expect(manifest?.generator).toBe("");
    expect(manifest?.techniques).toEqual([]);
  });
});

describe("packsFor", () => {
  it("その難易度のパックだけを返す", () => {
    const manifest = decodeManifest(VALID);
    expect(manifest && packsFor(manifest, "easy").map((pack) => pack.path)).toEqual([
      "packs/easy-000.txt",
    ]);
  });

  it("空のパックは選ばせない", () => {
    const manifest = decodeManifest({
      ...VALID,
      packs: [{ path: "packs/hard-000.txt", difficulty: "hard", count: 0 }],
    });
    expect(manifest && packsFor(manifest, "hard")).toEqual([]);
  });
});
