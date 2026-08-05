/**
 * 収録済みのパックを全件検証する(docs/verification/testing-policy.md の性質 6)。
 *
 * **このテストは実際の `puzzles/` を読む。** 壊れた問題を配ってしまうと、
 * 遊技者は自分の入力を疑い続けることになるので、ここは実物で確かめる。
 *
 * 解の規則検証と読み込みは全件、解の一意性と難易度は抜き取りで見る
 * (全件に一意解の判定を掛けると 3,000 問で数秒かかるため)。
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  countSolutions,
  decodePack,
  isSolvedBoard,
  rateDifficulty,
  tryParseManifest,
} from "@sudoku/core";
import type { Manifest } from "@sudoku/core";

const PUZZLES_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "puzzles");

function readManifest(): Manifest {
  const manifest = tryParseManifest(readFileSync(join(PUZZLES_DIR, "manifest.json"), "utf8"));
  if (manifest === null) throw new Error("manifest.json を読めなかった");
  return manifest;
}

const manifest = readManifest();

describe("収録済みのパック", () => {
  it("マニフェストは仮置きではなく生成器が作ったものである", () => {
    // 仮置きの目印は 0.0.0-dev(同型変換で作った 3 問が入っていた)。
    expect(manifest.generatedWith.generator).not.toBe("0.0.0-dev");
    expect(manifest.generatedWith.techniques.length).toBeGreaterThan(0);
    expect(manifest.packs.length).toBeGreaterThan(0);
  });

  it("マニフェストの件数とバイト数が実ファイルと一致する", () => {
    for (const pack of manifest.packs) {
      const text = readFileSync(join(PUZZLES_DIR, pack.path), "utf8");
      expect(Buffer.byteLength(text, "utf8")).toBe(pack.bytes);
      expect(decodePack(text)).toHaveLength(pack.count);
    }
  });

  it("全問が読み込める(性質 6)", () => {
    for (const pack of manifest.packs) {
      const text = readFileSync(join(PUZZLES_DIR, pack.path), "utf8");
      const lines = text.split("\n").filter((line) => line.trim() !== "");
      const entries = decodePack(text);
      // 1 行も捨てられていないこと。
      expect(entries).toHaveLength(lines.length);
    }
  });

  it("全問の解が数独の規則を満たす(性質 5)", () => {
    for (const pack of manifest.packs) {
      const entries = decodePack(readFileSync(join(PUZZLES_DIR, pack.path), "utf8"));
      for (const { puzzle } of entries) {
        expect(isSolvedBoard(puzzle.solution)).toBe(true);
      }
    }
  });

  it("宣言した難易度クラスと中身が一致する", () => {
    for (const pack of manifest.packs) {
      const entries = decodePack(readFileSync(join(PUZZLES_DIR, pack.path), "utf8"));
      for (const { puzzle } of entries) {
        expect(puzzle.difficulty).toBe(pack.difficulty);
      }
    }
  });

  it("難易度クラスとスコアの昇順で並んでいる", () => {
    for (const pack of manifest.packs) {
      const entries = decodePack(readFileSync(join(PUZZLES_DIR, pack.path), "utf8"));
      const scores = entries.map((entry) => entry.puzzle.score);
      expect(scores).toStrictEqual([...scores].sort((a, b) => a - b));
    }
  });

  it("抜き取った問題が一意解で、評価も宣言どおりである(性質 1・4)", () => {
    for (const pack of manifest.packs) {
      const entries = decodePack(readFileSync(join(PUZZLES_DIR, pack.path), "utf8"));
      const step = Math.max(1, Math.floor(entries.length / 20));
      for (let index = 0; index < entries.length; index += step) {
        const { puzzle } = entries[index];
        expect(countSolutions(puzzle.givens)).toBe(1);
        expect(rateDifficulty(puzzle.givens).difficulty).toBe(puzzle.difficulty);
      }
    }
  }, 120000);
});
