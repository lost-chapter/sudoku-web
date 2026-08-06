import { DIFFICULTIES, type Difficulty } from "@sudoku/core";

/** 正解した問題を特定するための情報。**問題パックの行番号を ID として使う。** */
export interface SolvedResult {
  readonly packPath: string;
  readonly line: number;
  readonly difficulty: Difficulty;
  /** 問題パックを差し替えたとき、旧版の結果を混ぜないために持つ。 */
  readonly formatVersion: number;
  readonly generator: string;
}

/** `localStorage` に保存する正解結果。**同じ問題は 1 件だけ持つ。** */
export interface SavedResults {
  readonly solved: readonly SolvedResult[];
}

/** 現在配信している問題パックの版。 */
export interface ResultsVersion {
  readonly formatVersion: number;
  readonly generator: string;
}

/** 保存された値を読める形へ正規化する。**壊れていれば `null`。** */
export function normalizeResults(value: unknown): SavedResults | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const stored = value as Record<string, unknown>;
  if (!Array.isArray(stored.solved) || !stored.solved.every(isSolvedResult)) {
    return null;
  }

  return { solved: uniqueResults(stored.solved) };
}

/** 正解結果を 1 件追加する。**同じ問題は重複させない。** */
export function addSolvedResult(results: SavedResults | null, result: SolvedResult): SavedResults {
  const solved = results?.solved ?? [];
  if (solved.some((current) => sameResult(current, result))) {
    return results ?? { solved: [result] };
  }
  return { solved: [...solved, result] };
}

/** 現行版で難易度ごとに正解した問題数を数える。 */
export function countSolvedResults(
  results: SavedResults | null,
  difficulty: Difficulty,
  version: ResultsVersion,
): number {
  return (
    results?.solved.filter(
      (result) =>
        result.difficulty === difficulty &&
        result.formatVersion === version.formatVersion &&
        result.generator === version.generator,
    ).length ?? 0
  );
}

function isSolvedResult(value: unknown): value is SolvedResult {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const result = value as Partial<SolvedResult>;
  return (
    typeof result.packPath === "string" &&
    result.packPath !== "" &&
    Number.isInteger(result.line) &&
    (result.line as number) >= 0 &&
    Number.isInteger(result.formatVersion) &&
    (result.formatVersion as number) >= 0 &&
    typeof result.generator === "string" &&
    result.generator !== "" &&
    isDifficulty(result.difficulty)
  );
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === "string" && (DIFFICULTIES as readonly string[]).includes(value);
}

function uniqueResults(results: readonly SolvedResult[]): readonly SolvedResult[] {
  const unique: SolvedResult[] = [];
  for (const result of results) {
    if (!unique.some((current) => sameResult(current, result))) {
      unique.push(result);
    }
  }
  return unique;
}

function sameResult(left: SolvedResult, right: SolvedResult): boolean {
  return (
    left.packPath === right.packPath &&
    left.line === right.line &&
    left.formatVersion === right.formatVersion &&
    left.generator === right.generator
  );
}
