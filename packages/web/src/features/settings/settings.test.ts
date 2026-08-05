import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";

describe("既定値", () => {
  it("いま持っているのは盤面の強調 2 つと上フリック", () => {
    // 2026-08-06 に「矛盾の表示」「残り数の表示」「誤りの即時指摘」を消し、
    // 同じ日に「上へはじいてメモ」を足した。
    expect(Object.keys(DEFAULT_SETTINGS)).toEqual([
      "highlightSameDigit",
      "highlightUnits",
      "flickToNote",
    ]);
  });

  it("既定はすべて入", () => {
    expect(Object.values(DEFAULT_SETTINGS).every((value) => value)).toBe(true);
  });

  // ⚠️ **既定で切ると、要望どおり入れたものが誰にも届かない。**
  // 知らなければ気づかないだけで損はしないので、入で出す。
  it("上へはじいてメモの既定は入", () => {
    expect(DEFAULT_SETTINGS.flickToNote).toBe(true);
  });
});

describe("normalizeSettings", () => {
  it("保存された設定を読む", () => {
    const stored = { ...DEFAULT_SETTINGS, highlightUnits: false };
    expect(normalizeSettings(stored)).toEqual(stored);
  });

  it("足りない項目は既定で補う(項目が増えても古い保存を捨てない)", () => {
    expect(normalizeSettings({ highlightUnits: false })).toEqual({
      ...DEFAULT_SETTINGS,
      highlightUnits: false,
    });
  });

  // 🔴 **上フリックを足す前の保存**。0.1.0 で遊んでいた人がそのまま読む形である。
  it("上フリックを知らない古い保存でも、既定の入で読める", () => {
    const before = { highlightSameDigit: true, highlightUnits: false };
    expect(normalizeSettings(before)).toEqual({
      highlightSameDigit: true,
      highlightUnits: false,
      flickToNote: true,
    });
  });

  it("知らない項目は落とす", () => {
    expect(normalizeSettings({ ...DEFAULT_SETTINGS, ほか: true })).toEqual(DEFAULT_SETTINGS);
  });

  it("消した設定が古い保存に残っていても持ち込まない", () => {
    // ⚠️ 削除した機能が localStorage 経由で復活しないことを固定する。
    const old = {
      ...DEFAULT_SETTINGS,
      showConflicts: true,
      showRemaining: true,
      showMistakes: true,
    };
    expect(normalizeSettings(old)).toEqual(DEFAULT_SETTINGS);
  });

  it.each([
    ["真偽値でない", { highlightUnits: "はい" }],
    ["配列", []],
    ["文字列", "settings"],
    ["null", null],
    ["undefined", undefined],
  ])("壊れていたら既定へ倒す: %s", (_name, value) => {
    expect(normalizeSettings(value)).toEqual(DEFAULT_SETTINGS);
  });
});
