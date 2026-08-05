import { isComplete, tryParseBoard } from "@sudoku/core";

import { DIFFICULTIES, type Difficulty, type Puzzle } from "./types";

/**
 * パックファイルの 1 行を読む。
 *
 * 形式は docs/api/puzzle-file-format.md:
 *
 *     <手がかり81文字>,<解81文字>,<難易度クラス>,<スコア>
 *
 * **81 文字 → 盤面の部分は `core` の `tryParseBoard` に任せる。**
 * 同じ読み方を web 側で書くと、生成側と遊技側で受理する文字がずれる。
 * ここが持つのは行の分解(4 列)と列ごとの検証だけである。
 *
 * **壊れた行は読み込み時に弾く**(同ドキュメント「読み込み側の検証」)。
 * 1 行が壊れていてもパック全体は捨てないので、返り値は例外ではなく `null` にしてある。
 * `core` にも `parseBoard`(例外を投げる版)があるが、**ここでは使ってはいけない。**
 *
 * ⚠️ **解が数独の規則を満たすかまでは検証しない。**
 * 81 マスの規則検証を全問に掛けると起動が重くなるため、
 * 正しさは収録前(生成側)の検証で担保する。ここで見るのは形式と、
 * 手がかりと解が食い違っていないかだけである。
 *
 * ⚠️ **暫定実装。**パックの行を読む部分は `core` へ入る予定である
 * (2026-08-05・管理役)。入ったらこのファイルは消して差し替える。
 */
export function decodePuzzleLine(line: string): Puzzle | null {
  const columns = line.trim().split(",");
  if (columns.length !== 4) {
    return null;
  }

  const [givenText, solutionText, difficultyText, scoreText] = columns;

  const givens = tryParseBoard(givenText);
  const solution = tryParseBoard(solutionText);
  if (!givens || !solution) {
    return null;
  }

  // 解に空きマスがあってはいけない。規則を満たすかまでは見ない。
  if (!isComplete(solution)) {
    return null;
  }

  // 手がかりのあるマスは、解でも同じ数字でなければならない。
  const consistent = givens.every((value, index) => value === 0 || value === solution[index]);
  if (!consistent) {
    return null;
  }

  if (!isDifficulty(difficultyText)) {
    return null;
  }

  const score = Number(scoreText);
  if (!Number.isInteger(score)) {
    return null;
  }

  return { givens, solution, difficulty: difficultyText, score };
}

function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}
