/**
 * 問題ファイルの読み書き(docs/api/puzzle-file-format.md)。
 *
 * **これは生成側(`generator`)と遊技側(`web`)をつなぐ契約である。**
 * 片方だけを変えてはいけない。だから `core` に 1 つだけ置く。
 *
 *     <手がかり81文字>,<解81文字>,<難易度クラス>,<スコア>
 *
 * ⚠️ **読む側は例外を投げない。** 壊れた行は `null` にして**その行だけ捨てる**。
 * 1 行の破損で 1,000 問が使えなくなるのは割に合わない。
 * `board.ts` に `parseBoard`(例外を投げる版)もあるが、
 * **パックの 1 行を読むときは必ず `tryParseBoard`(`null` を返す版)を使う。**
 *
 * ⚠️ **解が数独の規則を満たすかまでは読み込み時に検証しない。**
 * 81 マスの規則検証を全問に掛けると起動が重くなる。
 * **正しさは収録前(生成側)の検証で担保する**(docs/verification/testing-policy.md)。
 */

import type { Board } from "./board";
import { CELL_COUNT, formatBoard, isComplete, tryParseBoard } from "./board";
import type { Difficulty } from "./difficulty";
import { DIFFICULTIES } from "./difficulty";

/** 問題ファイルの版。**既存の読み込みコードで読めなくなる変更をしたら上げる。** */
export const PUZZLE_FILE_FORMAT_VERSION = 1;

/** パックの 1 行が表す 1 問。 */
export type Puzzle = {
  /** 手がかり。0 は空きマス。 */
  readonly givens: Board;
  /** 解。すべて 1〜9。 */
  readonly solution: Board;
  readonly difficulty: Difficulty;
  /** 同じクラスの中で並べ替えるための整数。 */
  readonly score: number;
};

/** パックの中の 1 問と、その行番号。 */
export type PackEntry = {
  readonly puzzle: Puzzle;
  /**
   * パック内の行番号(0 起点)。**壊れた行を捨てても詰めない。**
   * 進行の保存が行番号で問題を指すため、実ファイルの位置と合っている必要がある。
   */
  readonly line: number;
};

function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}

/**
 * パックの 1 行を読む。読めなければ `null`(その行だけ捨てる)。
 *
 * 検証するのは docs/api/puzzle-file-format.md の「読み込み側の検証」の 5 項目。
 */
export function decodePuzzleLine(line: string): Puzzle | null {
  const columns = line.trim().split(",");
  if (columns.length !== 4) return null;

  const [givenText, solutionText, difficultyText, scoreText] = columns;

  const givens = tryParseBoard(givenText);
  const solution = tryParseBoard(solutionText);
  if (givens === null || solution === null) return null;

  // 解に空きマスがあってはいけない。規則を満たすかまでは見ない。
  if (!isComplete(solution)) return null;

  // 手がかりのあるマスは、解でも同じ数字でなければならない。
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (givens[index] !== 0 && givens[index] !== solution[index]) return null;
  }

  if (!isDifficulty(difficultyText)) return null;

  // 空文字や "1e3" を Number() は通してしまうので、桁の並びとして検証する。
  if (!/^-?\d+$/.test(scoreText)) return null;
  const score = Number(scoreText);
  if (!Number.isSafeInteger(score)) return null;

  return { givens, solution, difficulty: difficultyText, score };
}

/** 1 問を 1 行にする。**空きマスは常に `.`。** */
export function encodePuzzleLine(puzzle: Puzzle): string {
  return [
    formatBoard(puzzle.givens),
    formatBoard(puzzle.solution),
    puzzle.difficulty,
    String(puzzle.score),
  ].join(",");
}

/**
 * パックファイル(`.txt`)を読む。**1 行 1 問。**
 *
 * ⚠️ **行を捨てても、パック全体は捨てない。**
 */
export function decodePack(text: string): PackEntry[] {
  const entries: PackEntry[] = [];
  text.split("\n").forEach((line, index) => {
    if (line.trim() === "") return;
    const puzzle = decodePuzzleLine(line);
    if (puzzle !== null) entries.push({ puzzle, line: index });
  });
  return entries;
}

/**
 * パックの並び順。**難易度クラス → スコア → 手がかりの文字列**の昇順。
 *
 * ⚠️ **到着順で書いてはいけない。** 並列生成すると到着順は毎回変わり、
 * 「同じシードから同じファイルができる」という保証
 * (docs/decisions/0003-external-puzzle-files.md)が壊れる。
 * スコアが同じ問題があるので、**最後に手がかりの文字列で並べて全順序にする**。
 */
export function comparePuzzles(a: Puzzle, b: Puzzle): number {
  const difficultyDiff = DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty);
  if (difficultyDiff !== 0) return difficultyDiff;
  if (a.score !== b.score) return a.score - b.score;
  return formatBoard(a.givens) < formatBoard(b.givens) ? -1 : 1;
}

/** パックファイルの中身を作る。**並べ替えてから書く。**末尾に改行を 1 つ置く。 */
export function encodePack(puzzles: readonly Puzzle[]): string {
  const sorted = [...puzzles].sort(comparePuzzles);
  return sorted.map(encodePuzzleLine).join("\n") + "\n";
}

/** マニフェストに載るパック 1 個の情報。 */
export type PackDescriptor = {
  /** `puzzles/` からの相対パス。 */
  readonly path: string;
  readonly difficulty: Difficulty;
  readonly count: number;
  /** **これがあるので作り直せる。**無いと管理外のパックを再生成できない。 */
  readonly seed: string;
  readonly bytes: number;
};

/** 収録内容の索引。**アプリはこれを最初に読む。** */
export type Manifest = {
  readonly formatVersion: number;
  readonly generatedWith: {
    /** 生成器のバージョン。どの版が作ったか分からないと不具合を切り分けられない。 */
    readonly generator: string;
    /**
     * 実装済みの手筋レベル。
     *
     * ⚠️ **忘れやすい。**手筋を実装するたびに難易度の基準が変わるので、
     * **古いパックの難易度を新しい基準と比べてはいけない。**
     */
    readonly techniques: readonly number[];
  };
  readonly packs: readonly PackDescriptor[];
  readonly totals: Readonly<Record<Difficulty, number>>;
};

/** 難易度ごとの合計を数える。収録が 0 件のクラスも 0 として必ず載せる。 */
export function countTotals(packs: readonly PackDescriptor[]): Record<Difficulty, number> {
  const totals = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, 0])) as Record<
    Difficulty,
    number
  >;
  for (const pack of packs) totals[pack.difficulty] += pack.count;
  return totals;
}

/**
 * マニフェストを JSON にする。**同じ入力からは常に同じ文字列**(キーの順を固定する)。
 */
export function encodeManifest(manifest: Manifest): string {
  const ordered = {
    formatVersion: manifest.formatVersion,
    generatedWith: {
      generator: manifest.generatedWith.generator,
      techniques: [...manifest.generatedWith.techniques],
    },
    packs: manifest.packs.map((pack) => ({
      path: pack.path,
      difficulty: pack.difficulty,
      count: pack.count,
      seed: pack.seed,
      bytes: pack.bytes,
    })),
    totals: Object.fromEntries(DIFFICULTIES.map((d) => [d, manifest.totals[d]])),
  };
  return `${JSON.stringify(ordered, null, 2)}\n`;
}

function isPackDescriptor(value: unknown): value is PackDescriptor {
  if (typeof value !== "object" || value === null) return false;
  const pack = value as Record<string, unknown>;
  return (
    typeof pack.path === "string" &&
    typeof pack.difficulty === "string" &&
    isDifficulty(pack.difficulty) &&
    typeof pack.count === "number" &&
    typeof pack.seed === "string" &&
    typeof pack.bytes === "number"
  );
}

/**
 * マニフェストを読む。読めなければ `null`。
 *
 * ⚠️ **知らない版は読まない。** 版が上がるのは「既存のコードで読めなくなる変更」を
 * したときなので、読めたつもりで壊れた盤面を出すより、読まない方が安全である。
 */
export function tryParseManifest(text: string): Manifest | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const value = parsed as Record<string, unknown>;
  if (value.formatVersion !== PUZZLE_FILE_FORMAT_VERSION) return null;

  const generatedWith = value.generatedWith as Record<string, unknown> | undefined;
  if (typeof generatedWith?.generator !== "string") return null;
  if (!Array.isArray(generatedWith.techniques)) return null;
  if (!generatedWith.techniques.every((level) => typeof level === "number")) return null;

  if (!Array.isArray(value.packs) || !value.packs.every(isPackDescriptor)) return null;

  // ⚠️ `totals` は書かれた値ではなく **packs から数え直した値**を返す。
  // 食い違っていてもマニフェスト全体を捨てない(捨てると 1 問も遊べなくなる)。
  return {
    formatVersion: PUZZLE_FILE_FORMAT_VERSION,
    generatedWith: {
      generator: generatedWith.generator,
      techniques: generatedWith.techniques,
    },
    packs: value.packs,
    totals: countTotals(value.packs),
  };
}
