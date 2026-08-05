import { describe, expect, it } from "vitest";

import { createRandom, randomInt, shuffled } from "./random";

function take(seed: string | number, count: number): number[] {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => random());
}

describe("シード付きの乱数", () => {
  it("同じシードからは同じ列が出る", () => {
    expect(take("easy-000", 20)).toStrictEqual(take("easy-000", 20));
    expect(take(42, 20)).toStrictEqual(take(42, 20));
  });

  it("違うシードからは違う列が出る", () => {
    expect(take("easy-000", 20)).not.toStrictEqual(take("easy-001", 20));
    expect(take(1, 20)).not.toStrictEqual(take(2, 20));
  });

  it("0 以上 1 未満を返す", () => {
    for (const value of take("range", 1000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("同じ値ばかりを返さない", () => {
    expect(new Set(take("variety", 100)).size).toBe(100);
  });

  it("大きく偏らない", () => {
    // 一様性の厳密な検定ではなく、実装を壊したときに気づくための粗い網。
    const values = take("distribution", 10000);
    const buckets = new Array<number>(10).fill(0);
    for (const value of values) buckets[Math.floor(value * 10)] += 1;
    for (const count of buckets) {
      expect(count).toBeGreaterThan(800);
      expect(count).toBeLessThan(1200);
    }
  });
});

describe("整数と並べ替え", () => {
  it("randomInt は 0 以上 upperExclusive 未満の整数を返す", () => {
    const random = createRandom("int");
    for (let i = 0; i < 1000; i += 1) {
      const value = randomInt(random, 9);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(9);
    }
  });

  it("並べ替えても要素は変わらない", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const result = shuffled(createRandom("shuffle"), values);
    expect([...result].sort((a, b) => a - b)).toStrictEqual(values);
  });

  it("入力の配列を書き換えない", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    shuffled(createRandom("shuffle"), values);
    expect(values).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it("同じシードからは同じ並びになる", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    expect(shuffled(createRandom("shuffle"), values)).toStrictEqual(
      shuffled(createRandom("shuffle"), values),
    );
  });

  it("並びが入れ替わる", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const results = ["a", "b", "c", "d", "e"].map((seed) =>
      shuffled(createRandom(seed), values).join(""),
    );
    // 5 つのシードすべてが元の並びのままになる確率は無視できる。
    expect(results.some((result) => result !== values.join(""))).toBe(true);
  });
});
