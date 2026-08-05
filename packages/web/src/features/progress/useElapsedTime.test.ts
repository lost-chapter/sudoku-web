import { describe, expect, it } from "vitest";

import { formatElapsed } from "./useElapsedTime";

describe("formatElapsed", () => {
  it.each([
    [0, "0:00"],
    [1000, "0:01"],
    [59_000, "0:59"],
    [60_000, "1:00"],
    [187_000, "3:07"],
    [3_599_000, "59:59"],
    [3_600_000, "1:00:00"],
    [3_753_000, "1:02:33"],
  ])("%i ミリ秒 → %s", (elapsedMs, expected) => {
    expect(formatElapsed(elapsedMs)).toBe(expected);
  });

  it("秒未満は切り捨てる(急かす演出をしないので細かくしない)", () => {
    expect(formatElapsed(1999)).toBe("0:01");
  });
});
