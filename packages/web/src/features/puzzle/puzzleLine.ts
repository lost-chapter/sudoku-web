import { CELL_COUNT } from "@sudoku/core";

import { DIFFICULTIES, type Difficulty, type Puzzle } from "./types";

/**
 * パックファイルの 1 行を読む。
 *
 * 形式は docs/api/puzzle-file-format.md:
 *
 *     <手がかり81文字>,<解81文字>,<難易度クラス>,<スコア>
 *
 * **壊れた行は読み込み時に弾く**(同ドキュメント「読み込み側の検証」)。
 * 1 行が壊れていてもパック全体は捨てないので、返り値は例外ではなく `null` にしてある。
 *
 * ⚠️ **解が数独の規則を満たすかまでは検証しない。**
 * 81 マスの規則検証を全問に掛けると起動が重くなるため、
 * 正しさは収録前(生成側)の検証で担保する。ここで見るのは形式と、
 * 手がかりと解が食い違っていないかだけである。
 *
 * ⚠️ **暫定実装。** 問題ファイルの読み書きは本来 `core` の責務
 * (docs/architecture/system-architecture.md のパッケージ構成)。
 * `core` に読み込み関数が入ったら、そちらへ差し替えてこのファイルは消す。
 */
export function decodePuzzleLine(line: string): Puzzle | null {
  const columns = line.trim().split(",");
  if (columns.length !== 4) {
    return null;
  }

  const [givenText, solutionText, difficultyText, scoreText] = columns;

  const givens = decodeCells(givenText, /^[.0-9]+$/);
  const solution = decodeCells(solutionText, /^[1-9]+$/);
  if (!givens || !solution) {
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

/**
 * 81 文字を 81 要素の配列へ直す。**空きマス(`.` と `0`)は 0 になる。**
 *
 * 書き出しは `.` に統一する契約だが、読み込みは `0` も受理する
 * (既存の公開データセットは `0` を使うものが多い)。
 */
function decodeCells(text: string, allowed: RegExp): number[] | null {
  if (text.length !== CELL_COUNT || !allowed.test(text)) {
    return null;
  }
  return [...text].map((character) => (character === "." ? 0 : Number(character)));
}

function isDifficulty(value: string): value is Difficulty {
  return (DIFFICULTIES as readonly string[]).includes(value);
}
