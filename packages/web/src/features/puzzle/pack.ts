import { decodePuzzleLine } from "./puzzleLine";
import type { Puzzle } from "./types";

/**
 * パックファイル(`.txt`)を読む。**1 行 1 問。**
 *
 * ⚠️ **行を捨てても、パック全体は捨てない**
 * (docs/api/puzzle-file-format.md「読み込み側の検証」)。
 * 1 行の破損で 1,000 問が使えなくなるのは割に合わない。
 *
 * ⚠️ **暫定実装。**問題ファイルの読み書きは `core` の責務と決まっている
 * (2026-08-05・管理役の裁定)。`core` に入ったらこのファイルは消して差し替える。
 */
export interface PackEntry {
  readonly puzzle: Puzzle;
  /**
   * パック内の行番号(0 起点)。**壊れた行を捨てても詰めない。**
   * 進行の保存が行番号で問題を指すため、実ファイルの位置と合っている必要がある
   * (docs/api/puzzle-file-format.md「進行の保存との関係」)。
   */
  readonly line: number;
}

export function decodePack(text: string): PackEntry[] {
  const entries: PackEntry[] = [];

  text.split("\n").forEach((line, index) => {
    if (line.trim() === "") {
      return;
    }
    const puzzle = decodePuzzleLine(line);
    if (puzzle) {
      entries.push({ puzzle, line: index });
    }
  });

  return entries;
}
