import { describe, expect, it } from "vitest";

import { decodePack } from "./pack";
import { SAMPLE_PUZZLE_LINE } from "./samplePuzzle";

const OTHER_LINE = SAMPLE_PUZZLE_LINE.replace(",easy,14", ",normal,42");

describe("decodePack", () => {
  it("1 行 1 問として読む", () => {
    const entries = decodePack(`${SAMPLE_PUZZLE_LINE}\n${OTHER_LINE}\n`);
    expect(entries).toHaveLength(2);
    expect(entries[1].puzzle.difficulty).toBe("normal");
  });

  it("壊れた行だけを捨て、パック全体は捨てない", () => {
    const entries = decodePack(`${SAMPLE_PUZZLE_LINE}\nこわれた行\n${OTHER_LINE}`);
    expect(entries).toHaveLength(2);
  });

  it("壊れた行を捨てても行番号は詰めない(進行の保存が行番号で指すため)", () => {
    const entries = decodePack(`こわれた行\n${SAMPLE_PUZZLE_LINE}`);
    expect(entries[0].line).toBe(1);
  });

  it("空行は行番号だけ進めて読み飛ばす", () => {
    const entries = decodePack(`\n\n${SAMPLE_PUZZLE_LINE}\n`);
    expect(entries).toHaveLength(1);
    expect(entries[0].line).toBe(2);
  });

  it("全部壊れていれば空になる", () => {
    expect(decodePack("こわれた\nこれも")).toEqual([]);
  });
});
