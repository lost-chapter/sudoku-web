/**
 * 生成の速さを測る(docs/verification/testing-policy.md の「性能を測るときの約束」)。
 *
 *     pnpm --filter @sudoku/generator bench
 *
 * **数値を報告するときは、この出力をそのまま貼る。**
 * 実行のしかた・機械・`load average`・2 回ぶんの値が全部入っているので、
 * 受け取った側が同じ条件で再現できる。
 *
 * ⚠️ **テストに入れていない。** 実行時間は機械と同時実行に左右されるので、
 * テストとして固定すると他の作業が動いているだけで落ちる。
 *
 * ⚠️ **Vitest から呼ばない。** Vitest 経由は module をまたぐ呼び出しが
 * 最適化されず 5 倍前後遅く出る(同上の文書)。
 */

import { availableParallelism, cpus, loadavg } from "node:os";

import { createRandom, generatePuzzle, generateSolvedBoard, rateDifficulty } from "@sudoku/core";

import { generatePackLines } from "./pool.ts";

/** 1 ラウンドあたりの回数。 */
const N = 300;

/** 暖機の回数。 */
const WARMUP = 20;

/** 並列の効きを見るときに作る問題数。 */
const PACK_SAMPLE = 100;

function line(message: string): void {
  process.stdout.write(`${message}\n`);
}

function currentLoad(): string {
  return loadavg()
    .map((value) => value.toFixed(2))
    .join(" / ");
}

function measureRound(round: number): void {
  const random = createRandom(`bench-${String(round)}`);
  for (let index = 0; index < WARMUP; index += 1) generatePuzzle(random);

  const solvedStarted = performance.now();
  for (let index = 0; index < N; index += 1) generateSolvedBoard(random);
  const solvedMs = performance.now() - solvedStarted;

  const puzzleStarted = performance.now();
  for (let index = 0; index < N; index += 1) generatePuzzle(random);
  const puzzleMs = performance.now() - puzzleStarted;

  const ratedStarted = performance.now();
  for (let index = 0; index < N; index += 1) rateDifficulty(generatePuzzle(random).puzzle);
  const ratedMs = performance.now() - ratedStarted;

  line(
    `  ${String(round)} 回目: 完成盤 ${((solvedMs / N) * 1000).toFixed(0)} μs/個 / ` +
      `問題 ${(puzzleMs / N).toFixed(2)} ms/問 / 問題+評価 ${(ratedMs / N).toFixed(2)} ms/問`,
  );
}

async function measureParallel(workers: number): Promise<number> {
  const started = performance.now();
  const result = await generatePackLines({
    seed: "bench-parallel",
    difficulty: "normal",
    count: PACK_SAMPLE,
    workers,
    maxAttempts: 100000,
  });
  const elapsed = performance.now() - started;
  line(
    `  ワーカー ${String(workers)}: ${(elapsed / 1000).toFixed(2)} 秒 / ` +
      `${(elapsed / result.lines.length).toFixed(2)} ms/問(試行 ${String(result.attempts)} 回)`,
  );
  return elapsed;
}

line("## 環境");
line(`  実行のしかた: tsx(pnpm --filter @sudoku/generator bench)`);
line(
  `  Node ${process.version} / ${cpus()[0]?.model ?? "不明"} / ${String(availableParallelism())} コア`,
);
line(`  load average(開始時): ${currentLoad()}`);

line("");
line(`## 単スレッド(${String(N)} 回 × 2)`);
measureRound(1);
measureRound(2);

line("");
line(`## 並列(ふつうを ${String(PACK_SAMPLE)} 問)`);
const single = await measureParallel(1);
for (const workers of [2, 4, 8]) {
  const elapsed = await measureParallel(workers);
  line(`    → 単スレッド比 ${(single / elapsed).toFixed(2)} 倍`);
}

line("");
line(`  load average(終了時): ${currentLoad()}`);
