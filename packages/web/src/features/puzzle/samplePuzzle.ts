import { decodePuzzleLine } from "./puzzleLine";
import type { Puzzle } from "./types";

/**
 * 開発用に手書きした 1 問。
 *
 * **generator(agent-b)の完成を待たずに UI を作りきるための足場である。**
 * 問題ファイルの形式が契約として先に決まっているので、
 * 実物のパックが来ても読み込み口を差し替えるだけで済む
 * (docs/guides/implementation-roadmap.md の「並列化の単位と前提」)。
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
  throw new Error("開発用の問題が問題ファイルの形式に合っていない");
}

export const SAMPLE_PUZZLE: Puzzle = decoded;
