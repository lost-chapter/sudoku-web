import { describe, expect, it } from "vitest";

import { formatBoard, isSolvedBoard, parseBoard } from "./board";
import type { Difficulty } from "./difficulty";
import { generatePuzzle } from "./generate";
import type { Manifest, Puzzle } from "./puzzle-file";
import {
  PUZZLE_FILE_FORMAT_VERSION,
  comparePuzzles,
  countTotals,
  decodePack,
  decodePuzzleLine,
  encodeManifest,
  encodePack,
  encodePuzzleLine,
  tryParseManifest,
} from "./puzzle-file";
import { createRandom } from "./random";
import { rateDifficulty } from "./difficulty";
import { CLASSIC_PUZZLE, CLASSIC_SOLUTION } from "./test-puzzles";

const LINE = `${CLASSIC_PUZZLE},${CLASSIC_SOLUTION},easy,14`;

function puzzleOf(difficulty: Difficulty, score: number): Puzzle {
  return {
    givens: parseBoard(CLASSIC_PUZZLE),
    solution: parseBoard(CLASSIC_SOLUTION),
    difficulty,
    score,
  };
}

describe("パックの 1 行", () => {
  it("読める", () => {
    const puzzle = decodePuzzleLine(LINE);
    expect(puzzle).not.toBeNull();
    expect(formatBoard(puzzle?.givens ?? new Uint8Array())).toBe(CLASSIC_PUZZLE);
    expect(formatBoard(puzzle?.solution ?? new Uint8Array())).toBe(CLASSIC_SOLUTION);
    expect(puzzle?.difficulty).toBe("easy");
    expect(puzzle?.score).toBe(14);
  });

  it("書いて読むと元に戻る", () => {
    const puzzle = decodePuzzleLine(LINE);
    expect(puzzle).not.toBeNull();
    if (puzzle === null) return;
    expect(encodePuzzleLine(puzzle)).toBe(LINE);
  });

  it("空きマスを 0 で書いた行も読める(書き出しは . に統一される)", () => {
    const zeros = LINE.replaceAll(".", "0");
    const puzzle = decodePuzzleLine(zeros);
    expect(puzzle).not.toBeNull();
    if (puzzle === null) return;
    expect(encodePuzzleLine(puzzle)).toBe(LINE);
  });

  it("前後の空白を許す", () => {
    expect(decodePuzzleLine(`  ${LINE}  `)).not.toBeNull();
  });

  describe("壊れた行は null を返す(例外を投げない)", () => {
    it("列が 4 つでない", () => {
      expect(decodePuzzleLine(`${CLASSIC_PUZZLE},${CLASSIC_SOLUTION},easy`)).toBeNull();
      expect(decodePuzzleLine(`${LINE},extra`)).toBeNull();
      expect(decodePuzzleLine("")).toBeNull();
    });

    it("81 文字でない", () => {
      expect(decodePuzzleLine(`${CLASSIC_PUZZLE.slice(0, 80)},${CLASSIC_SOLUTION},easy,14`)).toBe(
        null,
      );
      expect(decodePuzzleLine(`${CLASSIC_PUZZLE},${CLASSIC_SOLUTION.slice(0, 80)},easy,14`)).toBe(
        null,
      );
    });

    it("使えない文字が入っている", () => {
      expect(decodePuzzleLine(`${"x".repeat(81)},${CLASSIC_SOLUTION},easy,14`)).toBeNull();
    });

    it("解に空きマスがある", () => {
      expect(decodePuzzleLine(`${CLASSIC_PUZZLE},${CLASSIC_PUZZLE},easy,14`)).toBeNull();
    });

    it("解が手がかりと矛盾している", () => {
      // 先頭の手がかりを解と違う数字にする。
      const broken = `1${CLASSIC_PUZZLE.slice(1)},${CLASSIC_SOLUTION},easy,14`;
      expect(decodePuzzleLine(broken)).toBeNull();
    });

    it("難易度クラスが未知", () => {
      expect(decodePuzzleLine(`${CLASSIC_PUZZLE},${CLASSIC_SOLUTION},insane,14`)).toBeNull();
    });

    it("スコアが整数でない", () => {
      expect(decodePuzzleLine(`${CLASSIC_PUZZLE},${CLASSIC_SOLUTION},easy,`)).toBeNull();
      expect(decodePuzzleLine(`${CLASSIC_PUZZLE},${CLASSIC_SOLUTION},easy,1.5`)).toBeNull();
      expect(decodePuzzleLine(`${CLASSIC_PUZZLE},${CLASSIC_SOLUTION},easy,abc`)).toBeNull();
    });
  });
});

describe("パック", () => {
  it("壊れた行を捨てても、他の行は読める", () => {
    const text = [LINE, "壊れた行", LINE, "", LINE].join("\n");
    const entries = decodePack(text);
    expect(entries).toHaveLength(3);
  });

  it("行番号は実ファイルの位置と一致する(捨てても詰めない)", () => {
    const text = ["壊れた行", LINE, "壊れた行", LINE].join("\n");
    expect(decodePack(text).map((entry) => entry.line)).toStrictEqual([1, 3]);
  });

  it("難易度クラスとスコアの昇順で書く(到着順にしない)", () => {
    const puzzles = [
      puzzleOf("hard", 5),
      puzzleOf("easy", 20),
      puzzleOf("normal", 1),
      puzzleOf("easy", 3),
    ];
    const written = decodePack(encodePack(puzzles)).map((entry) => entry.puzzle);
    expect(written.map((puzzle) => `${puzzle.difficulty}:${String(puzzle.score)}`)).toStrictEqual([
      "easy:3",
      "easy:20",
      "normal:1",
      "hard:5",
    ]);
  });

  it("並べ替えは全順序である(同じスコアでも順が決まる)", () => {
    const a = puzzleOf("easy", 10);
    const b: Puzzle = { ...a, givens: parseBoard(CLASSIC_SOLUTION) };
    expect(comparePuzzles(a, b)).toBeLessThan(0);
    expect(comparePuzzles(b, a)).toBeGreaterThan(0);
  });

  it("入力の並びが違っても同じファイルになる", () => {
    const puzzles = [puzzleOf("normal", 2), puzzleOf("easy", 9), puzzleOf("easy", 1)];
    expect(encodePack(puzzles)).toBe(encodePack([...puzzles].reverse()));
  });

  it("末尾に改行を 1 つ置く", () => {
    const text = encodePack([puzzleOf("easy", 1)]);
    expect(text.endsWith("\n")).toBe(true);
    expect(text.endsWith("\n\n")).toBe(false);
  });

  it("生成した問題を書いて読み戻せる(性質 6)", () => {
    const random = createRandom("pack-roundtrip");
    const puzzles: Puzzle[] = [];
    while (puzzles.length < 10) {
      const { puzzle, solution } = generatePuzzle(random);
      const rating = rateDifficulty(puzzle);
      if (rating.difficulty === null) continue;
      puzzles.push({
        givens: puzzle,
        solution,
        difficulty: rating.difficulty,
        score: rating.score,
      });
    }

    const entries = decodePack(encodePack(puzzles));
    expect(entries).toHaveLength(puzzles.length);
    for (const { puzzle } of entries) {
      expect(isSolvedBoard(puzzle.solution)).toBe(true);
      expect(rateDifficulty(puzzle.givens).difficulty).toBe(puzzle.difficulty);
    }
  });
});

describe("マニフェスト", () => {
  const manifest: Manifest = {
    formatVersion: PUZZLE_FILE_FORMAT_VERSION,
    generatedWith: { generator: "0.1.0", techniques: [1, 2, 3, 4] },
    packs: [
      {
        path: "packs/easy-000.txt",
        difficulty: "easy",
        count: 100,
        seed: "easy-000",
        bytes: 16800,
      },
      {
        path: "packs/normal-000.txt",
        difficulty: "normal",
        count: 50,
        seed: "normal-000",
        bytes: 8400,
      },
    ],
    totals: { easy: 100, normal: 50, hard: 0, expert: 0, extreme: 0 },
  };

  it("書いて読むと元に戻る", () => {
    const parsed = tryParseManifest(encodeManifest(manifest));
    expect(parsed).toStrictEqual(manifest);
  });

  it("同じ入力からは同じ文字列になる", () => {
    expect(encodeManifest(manifest)).toBe(encodeManifest(manifest));
  });

  it("収録が 0 件のクラスも totals に載せる", () => {
    expect(countTotals(manifest.packs)).toStrictEqual({
      easy: 100,
      normal: 50,
      hard: 0,
      expert: 0,
      extreme: 0,
    });
  });

  it("totals が食い違っていても数え直して読む(捨てない)", () => {
    const text = encodeManifest(manifest).replace('"easy": 100', '"easy": 999');
    expect(tryParseManifest(text)?.totals.easy).toBe(100);
  });

  it("知らない版は読まない", () => {
    const text = encodeManifest(manifest).replace('"formatVersion": 1', '"formatVersion": 2');
    expect(tryParseManifest(text)).toBeNull();
  });

  it("壊れた JSON や必須項目の欠落は null を返す", () => {
    expect(tryParseManifest("{")).toBeNull();
    expect(tryParseManifest("[]")).toBeNull();
    expect(tryParseManifest('{"formatVersion":1}')).toBeNull();
    expect(
      tryParseManifest('{"formatVersion":1,"generatedWith":{"generator":"x"},"packs":[]}'),
    ).toBeNull();
    expect(
      tryParseManifest(
        '{"formatVersion":1,"generatedWith":{"generator":"x","techniques":[1]},"packs":[{"path":"p"}]}',
      ),
    ).toBeNull();
  });

  it("未知の難易度クラスを含むパックは受け付けない", () => {
    const text = encodeManifest(manifest).replace('"difficulty": "easy"', '"difficulty": "insane"');
    expect(tryParseManifest(text)).toBeNull();
  });
});
