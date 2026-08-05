import { decodePuzzleLine, type Puzzle } from "@sudoku/core";

/**
 * 同梱の 1 問。
 *
 * **パックを取得できないときの退避先である**
 * (docs/architecture/system-architecture.md「エラーハンドリングの方針」)。
 * 遊技を止めてよいのは「問題が 1 問も無いとき」だけなので、
 * ここに 1 問だけ抱えておく。
 *
 * 中身は数独の例題として広く使われている盤面で、
 * docs/api/puzzle-file-format.md の例と同じ行である。
 */
export const SAMPLE_PUZZLE_LINE =
  "53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79," +
  "534678912672195348198342567859761423426853791713924856961537284287419635345286179," +
  "easy,14";

const decoded = decodePuzzleLine(SAMPLE_PUZZLE_LINE);
if (!decoded) {
  // 手書きの定数なので、ここに来るのは書き間違いだけである。
  throw new Error("同梱の問題が問題ファイルの形式に合っていない");
}

export const SAMPLE_PUZZLE: Puzzle = decoded;
