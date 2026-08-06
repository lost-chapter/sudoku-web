import { describe, expect, it } from "vitest";

import type { StorageLike } from "../progress/progressStorage";

import {
  addSolvedResult,
  countSolvedResults,
  normalizeResults,
  type SavedResults,
  type SolvedResult,
} from "./results";
import {
  clearResults,
  readResults,
  recordSolvedResult,
  RESULTS_STORAGE_KEY,
} from "./resultsStorage";

const EASY: SolvedResult = {
  packPath: "packs/easy-000.txt",
  line: 42,
  difficulty: "easy",
  formatVersion: 1,
  generator: "0.1.0",
};

const NORMAL: SolvedResult = {
  ...EASY,
  line: 7,
  difficulty: "normal",
};

const VERSION = { formatVersion: 1, generator: "0.1.0" };

function fakeStorage(initial?: string): StorageLike & { readonly value: () => string | null } {
  let stored = initial ?? null;
  return {
    getItem: () => stored,
    setItem: (_key, value) => {
      stored = value;
    },
    removeItem: () => {
      stored = null;
    },
    value: () => stored,
  };
}

describe("normalizeResults", () => {
  it("保存された結果を読む", () => {
    const saved: SavedResults = { solved: [EASY] };
    expect(normalizeResults(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
  });

  it("同じ問題の重複は 1 件にまとめる", () => {
    expect(normalizeResults({ solved: [EASY, EASY] })).toEqual({ solved: [EASY] });
  });

  it.each([
    ["結果が配列でない", { solved: "result" }],
    ["パックが無い", { solved: [{ ...EASY, packPath: undefined }] }],
    ["行が負", { solved: [{ ...EASY, line: -1 }] }],
    ["行が整数でない", { solved: [{ ...EASY, line: 1.5 }] }],
    ["版が無い", { solved: [{ ...EASY, formatVersion: undefined }] }],
    ["生成器が無い", { solved: [{ ...EASY, generator: undefined }] }],
    ["難易度が未知", { solved: [{ ...EASY, difficulty: "insane" }] }],
    ["オブジェクトでない", "results"],
    ["null", null],
  ])("壊れていたら捨てる: %s", (_name, value) => {
    expect(normalizeResults(value)).toBeNull();
  });
});

describe("結果の集計", () => {
  it("問題を追加する", () => {
    expect(addSolvedResult(null, EASY)).toEqual({ solved: [EASY] });
    expect(addSolvedResult({ solved: [EASY] }, NORMAL)).toEqual({ solved: [EASY, NORMAL] });
  });

  it("同じ問題を追加しても二重計上しない", () => {
    const results = addSolvedResult({ solved: [EASY] }, EASY);
    expect(results).toEqual({ solved: [EASY] });
  });

  it("難易度ごとに現行版だけを数える", () => {
    const results: SavedResults = {
      solved: [
        EASY,
        NORMAL,
        { ...EASY, line: 99, formatVersion: 2 },
        { ...EASY, line: 100, generator: "0.2.0" },
      ],
    };
    expect(countSolvedResults(results, "easy", VERSION)).toBe(1);
    expect(countSolvedResults(results, "normal", VERSION)).toBe(1);
    expect(countSolvedResults(results, "hard", VERSION)).toBe(0);
  });
});

describe("結果の読み書き", () => {
  it("書いた結果を読める", () => {
    const storage = fakeStorage();
    recordSolvedResult(EASY, storage);
    expect(readResults(storage)).toEqual({ solved: [EASY] });
  });

  it("既存の結果を残したまま追加する", () => {
    const storage = fakeStorage(JSON.stringify({ solved: [EASY] }));
    recordSolvedResult(NORMAL, storage);
    expect(readResults(storage)).toEqual({ solved: [EASY, NORMAL] });
  });

  it("保存と読み込みを繰り返しても重複しない", () => {
    const storage = fakeStorage();
    recordSolvedResult(EASY, storage);
    recordSolvedResult(EASY, storage);
    expect(readResults(storage)).toEqual({ solved: [EASY] });
  });

  it("消せる", () => {
    const storage = fakeStorage(JSON.stringify({ solved: [EASY] }));
    clearResults(storage);
    expect(readResults(storage)).toBeNull();
  });

  it("鍵に前置きを付ける", () => {
    expect(RESULTS_STORAGE_KEY.startsWith("sudoku-web:")).toBe(true);
  });

  it("JSON として壊れていても投げない", () => {
    expect(readResults(fakeStorage("{壊れている"))).toBeNull();
  });

  it("保存できなくても投げない", () => {
    const failing: StorageLike = {
      getItem: () => {
        throw new Error("読めない");
      },
      setItem: () => {
        throw new Error("書けない");
      },
      removeItem: () => {
        throw new Error("消せない");
      },
    };

    expect(() => recordSolvedResult(EASY, failing)).not.toThrow();
    expect(() => clearResults(failing)).not.toThrow();
    expect(readResults(failing)).toBeNull();
  });
});
