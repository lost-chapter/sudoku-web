/**
 * 問題を大量生成する CLI。
 *
 * 出力は puzzles/ 配下のパックとマニフェスト。
 * 形式は docs/api/puzzle-file-format.md の契約に従う。
 *
 * 中身の実装は工程 2(担当 agent-b)。ここにあるのは骨組みだけである。
 */
import { BOARD_SIZE } from "@sudoku/core";

function main(argv: readonly string[]): number {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(
      [
        "使い方: pnpm --filter @sudoku/generator generate [options]",
        "",
        `  ${BOARD_SIZE}x${BOARD_SIZE} の数独の問題を生成してパックへ書き出す。`,
        "  生成の実装は工程 2 で入る(現時点では何も生成しない)。",
        "",
      ].join("\n"),
    );
    return 0;
  }

  process.stderr.write("生成はまだ実装されていない(工程 2)。--help を参照。\n");
  return 1;
}

process.exitCode = main(process.argv.slice(2));
