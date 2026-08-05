import { describe, expect, it } from "vitest";

import { decodePack, encodePack, isSolvedBoard, rateDifficulty } from "@sudoku/core";

import { attemptSeed, runAttempt, runAttemptRange, takeInAttemptOrder } from "./generate-pack.ts";
import { generatePackLines } from "./pool.ts";

describe("試行", () => {
  it("シードは試行番号から決まる", () => {
    expect(attemptSeed("easy-000", 7)).toBe("easy-000#7");
    expect(attemptSeed("easy-000", 7)).toBe(attemptSeed("easy-000", 7));
  });

  it("同じ試行番号からは同じ問題ができる", () => {
    const first = runAttempt("test", 3);
    const second = runAttempt("test", 3);
    expect(first?.puzzle.difficulty).toBe(second?.puzzle.difficulty);
    expect(first?.puzzle.score).toBe(second?.puzzle.score);
  });

  it("目標クラスに合わない問題は採用しない", () => {
    for (let index = 0; index < 40; index += 1) {
      const attempt = runAttempt("target", index, "easy");
      if (attempt === null) continue;
      expect(attempt.puzzle.difficulty).toBe("easy");
    }
  });

  it("採用した問題は評価どおりの難易度である", () => {
    for (const attempt of runAttemptRange("range", 0, 20)) {
      expect(rateDifficulty(attempt.puzzle.givens).difficulty).toBe(attempt.puzzle.difficulty);
      expect(isSolvedBoard(attempt.puzzle.solution)).toBe(true);
    }
  });

  it("試行番号の昇順に並べて先頭から取る", () => {
    const attempts = runAttemptRange("order", 0, 30);
    expect(attempts.length).toBeGreaterThan(2);
    const taken = takeInAttemptOrder([...attempts].reverse(), 2);
    expect(taken).toStrictEqual(attempts.slice(0, 2).map((attempt) => attempt.puzzle));
  });
});

describe("パックの生成", () => {
  it("並列度を変えても同じパックができる", async () => {
    // ⚠️ ここでは実スレッドを立てない(Vitest はワーカーへ TypeScript の
    // 読み込みを引き継がない)。確かめたいのは「同時に走らせる数と
    // 試行の分け方が変わっても中身が同じ」という性質なので、これで足りる。
    const options = {
      seed: "parallel",
      difficulty: "easy",
      count: 6,
      maxAttempts: 3000,
      useWorkers: false,
    } as const;
    const single = await generatePackLines({ ...options, workers: 1 });
    const parallel = await generatePackLines({ ...options, workers: 4 });

    expect(single.lines).toHaveLength(6);
    expect(parallel.lines).toStrictEqual(single.lines);
  }, 120000);

  it("同じシードからは同じパックができる(性質 3)", async () => {
    const options = {
      seed: "repeat",
      difficulty: "easy",
      count: 4,
      workers: 2,
      maxAttempts: 3000,
      useWorkers: false,
    } as const;
    const first = await generatePackLines(options);
    const second = await generatePackLines(options);
    expect(second.lines).toStrictEqual(first.lines);
  }, 120000);

  it("書き出したパックを全問読み戻せる(性質 6)", async () => {
    const result = await generatePackLines({
      seed: "roundtrip",
      difficulty: "easy",
      count: 5,
      workers: 2,
      maxAttempts: 3000,
      useWorkers: false,
    });

    const text = `${result.lines.join("\n")}\n`;
    const entries = decodePack(text);
    expect(entries).toHaveLength(result.lines.length);
    for (const { puzzle } of entries) {
      expect(puzzle.difficulty).toBe("easy");
      expect(isSolvedBoard(puzzle.solution)).toBe(true);
      expect(rateDifficulty(puzzle.givens).difficulty).toBe("easy");
    }

    // 書き出しの並べ替えを通しても中身は変わらない。
    expect(decodePack(encodePack(entries.map((entry) => entry.puzzle)))).toHaveLength(
      entries.length,
    );
  }, 120000);

  it("試行の上限に達したら打ち切る(無限に回さない)", async () => {
    // 難問はレベル 5 以降の手筋が要るので、いまは 1 問も作れない。
    const result = await generatePackLines({
      seed: "expert-000",
      difficulty: "expert",
      count: 1,
      workers: 2,
      maxAttempts: 40,
      useWorkers: false,
    });
    expect(result.lines).toHaveLength(0);
    expect(result.complete).toBe(false);
    expect(result.attempts).toBeLessThanOrEqual(40);
  }, 120000);
});
