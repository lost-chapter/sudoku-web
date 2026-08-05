import { describe, expect, it } from "vitest";

import { isEmpty, isStale, normalizeProgress, type SavedProgress } from "./progress";
import {
  PROGRESS_STORAGE_KEY,
  clearProgress,
  readProgress,
  writeProgress,
  type StorageLike,
} from "./progressStorage";

const VALID: SavedProgress = {
  packPath: "packs/easy-000.txt",
  line: 42,
  entries: new Array<number>(81).fill(0),
  notes: new Array<number>(81).fill(0),
  difficulty: "easy",
  formatVersion: 1,
  generator: "0.1.0",
};

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

describe("normalizeProgress", () => {
  it("保存された進行を読む", () => {
    expect(normalizeProgress(JSON.parse(JSON.stringify(VALID)))).toEqual(VALID);
  });

  it("経過時間を持つ古い保存もそのまま読める(遊びかけが消えない)", () => {
    // 2026-08-06 に経過時間を消した。古い保存には elapsedMs が残っているが、
    // 検査していないので落ちず、余分な鍵は結果へ持ち込まれない。
    const old = { ...VALID, elapsedMs: 123456 };
    expect(normalizeProgress(JSON.parse(JSON.stringify(old)))).toEqual(VALID);
  });

  it.each([
    ["パックが無い", { ...VALID, packPath: undefined }],
    ["パックが空文字", { ...VALID, packPath: "" }],
    ["行が負", { ...VALID, line: -1 }],
    ["行が整数でない", { ...VALID, line: 1.5 }],
    ["入力が 81 要素でない", { ...VALID, entries: [0, 0] }],
    ["入力に負の数", { ...VALID, entries: new Array<number>(81).fill(-1) }],
    ["メモが配列でない", { ...VALID, notes: "0" }],
    ["版が無い", { ...VALID, formatVersion: undefined }],
    ["生成器が無い", { ...VALID, generator: undefined }],
    ["難易度が未知", { ...VALID, difficulty: "insane" }],
    ["オブジェクトでない", "progress"],
    ["null", null],
  ])("壊れていたら捨てる: %s", (_name, value) => {
    expect(normalizeProgress(value)).toBeNull();
  });
});

describe("isStale", () => {
  it("版が同じなら使える", () => {
    expect(isStale(VALID, { formatVersion: 1, generator: "0.1.0" })).toBe(false);
  });

  it("形式の版が変わったら捨てる", () => {
    expect(isStale(VALID, { formatVersion: 2, generator: "0.1.0" })).toBe(true);
  });

  it("生成器が変わったら捨てる(行番号がずれる)", () => {
    expect(isStale(VALID, { formatVersion: 1, generator: "0.2.0" })).toBe(true);
  });
});

describe("isEmpty", () => {
  it("何も入っていなければ空", () => {
    expect(isEmpty(VALID)).toBe(true);
  });

  it("入力があれば空でない", () => {
    const entries = [...VALID.entries];
    entries[3] = 5;
    expect(isEmpty({ ...VALID, entries })).toBe(false);
  });

  it("メモだけでも空でない", () => {
    const notes = [...VALID.notes];
    notes[3] = 0b1;
    expect(isEmpty({ ...VALID, notes })).toBe(false);
  });
});

describe("読み書き", () => {
  it("書いたものを読める", () => {
    const storage = fakeStorage();
    writeProgress(VALID, storage);
    expect(readProgress(storage)).toEqual(VALID);
  });

  it("消せる", () => {
    const storage = fakeStorage(JSON.stringify(VALID));
    clearProgress(storage);
    expect(readProgress(storage)).toBeNull();
  });

  it("鍵に前置きを付ける(他のアプリと衝突させない)", () => {
    expect(PROGRESS_STORAGE_KEY.startsWith("sudoku-web:")).toBe(true);
  });

  it("JSON として壊れていても投げない", () => {
    expect(readProgress(fakeStorage("{壊れている"))).toBeNull();
  });

  it("保存できなくても投げない(容量制限・プライベートモード)", () => {
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

    expect(() => writeProgress(VALID, failing)).not.toThrow();
    expect(() => clearProgress(failing)).not.toThrow();
    expect(readProgress(failing)).toBeNull();
  });
});
