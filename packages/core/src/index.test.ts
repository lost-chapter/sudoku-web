import { describe, expect, it } from "vitest";

import { BOARD_SIZE, CELL_COUNT } from "./index";

describe("盤面の大きさ", () => {
  it("9x9 の 81 マスである", () => {
    expect(BOARD_SIZE).toBe(9);
    expect(CELL_COUNT).toBe(81);
  });
});
