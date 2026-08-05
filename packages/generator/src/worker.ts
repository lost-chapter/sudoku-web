/**
 * 生成のワーカー(`worker_threads`)。
 *
 * **1 問ごとに完全に独立している**ので並列化は素直に効く。
 * ワーカーは**試行番号の範囲**を受け取って走らせるだけで、
 * 採用の判断も並べ替えも親がやる(docs/algorithms/board-generation.md の「並列化」)。
 *
 * ⚠️ **ワーカーごとに違うシードを配る**のではなく、**試行番号でシードが決まる**。
 * こうしないと、並列度を変えたときに出来上がるパックが変わってしまう。
 */

import { parentPort } from "node:worker_threads";

import { encodePuzzleLine } from "@sudoku/core";
import type { Difficulty } from "@sudoku/core";

import { runAttemptRange } from "./generate-pack.ts";

/** 親から届く仕事。 */
export type WorkerRequest = {
  readonly seed: string;
  readonly from: number;
  readonly count: number;
  readonly difficulty: Difficulty;
};

/**
 * 親へ返す結果。
 *
 * **盤面を Uint8Array のまま返さず、1 行の文字列にして返す。**
 * 構造化クローンの往復を減らせるうえ、親はそのままファイルへ書ける。
 */
export type WorkerResponse = {
  readonly accepted: readonly { readonly index: number; readonly line: string }[];
};

parentPort?.on("message", (request: WorkerRequest) => {
  const accepted = runAttemptRange(
    request.seed,
    request.from,
    request.count,
    request.difficulty,
  ).map((attempt) => ({ index: attempt.index, line: encodePuzzleLine(attempt.puzzle) }));

  const response: WorkerResponse = { accepted };
  parentPort?.postMessage(response);
});
