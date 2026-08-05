import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";

describe("既定値", () => {
  it("既定で切なのは「誤りの即時指摘」だけ", () => {
    const off = Object.entries(DEFAULT_SETTINGS)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    expect(off).toEqual(["showMistakes"]);
  });
});

describe("normalizeSettings", () => {
  it("保存された設定を読む", () => {
    const stored = { ...DEFAULT_SETTINGS, showConflicts: false, showMistakes: true };
    expect(normalizeSettings(stored)).toEqual(stored);
  });

  it("足りない項目は既定で補う(項目が増えても古い保存を捨てない)", () => {
    expect(normalizeSettings({ showMistakes: true })).toEqual({
      ...DEFAULT_SETTINGS,
      showMistakes: true,
    });
  });

  it("知らない項目は落とす", () => {
    expect(normalizeSettings({ ...DEFAULT_SETTINGS, ほか: true })).toEqual(DEFAULT_SETTINGS);
  });

  it.each([
    ["真偽値でない", { showConflicts: "はい" }],
    ["配列", []],
    ["文字列", "settings"],
    ["null", null],
    ["undefined", undefined],
  ])("壊れていたら既定へ倒す: %s", (_name, value) => {
    expect(normalizeSettings(value)).toEqual(DEFAULT_SETTINGS);
  });
});
