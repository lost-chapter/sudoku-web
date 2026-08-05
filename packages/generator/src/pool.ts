/**
 * 生成の並列実行。
 *
 * **並列度を変えても出来上がるパックは変わらない。**
 * 試行番号でシードが決まり、採用したものを試行番号順に並べてから切り取るためである
 * (`generate-pack.ts` の「並列でも結果が変わらない作り」)。
 *
 * ⚠️ **到着順にファイルへ書かない。** それをすると同じシードから同じファイルができず、
 * ADR 0003 の前提(管理外のパックはシードから作り直せる)が壊れる。
 */

import { Worker } from "node:worker_threads";

import { encodePuzzleLine } from "@sudoku/core";
import type { Difficulty } from "@sudoku/core";

import { runAttemptRange } from "./generate-pack.ts";
import type { WorkerRequest, WorkerResponse } from "./worker.ts";

/** 1 回の波でワーカー 1 つに任せる試行の数の下限と上限。 */
const MIN_CHUNK = 8;
const MAX_CHUNK = 256;

/**
 * 次の波で 1 ワーカーに任せる試行数を決める。
 *
 * **採用率は難易度クラスで 6 倍違う**(やさしい 40.3% / むずかしい 6.8%)。
 * 固定にすると、やさしいクラスでは大幅に作りすぎ、むずかしいクラスでは波が増える。
 * **これまでの採用率から必要な試行数を見積もる。**
 *
 * ⚠️ **チャンクの大きさを変えても出来上がりは変わらない。**
 * 試行番号でシードが決まり、採用したものを試行番号順に切り取るためである。
 */
function nextChunk(remaining: number, slots: number, attempts: number, accepted: number): number {
  const rate = attempts === 0 ? 0.1 : Math.max(accepted / attempts, 0.001);
  const needed = Math.ceil(remaining / rate / slots);
  return Math.max(MIN_CHUNK, Math.min(MAX_CHUNK, needed));
}

export type GeneratePackOptions = {
  readonly seed: string;
  readonly difficulty: Difficulty;
  /** 欲しい問題数。 */
  readonly count: number;
  /** 同時に走らせる数。1 ならその場で回す。 */
  readonly workers: number;
  /** これだけ試しても揃わなければ諦める。 */
  readonly maxAttempts: number;
  readonly onProgress?: (accepted: number, attempts: number) => void;
  /**
   * 実際にスレッドを立てるか。既定は立てる。
   *
   * **`false` にしても出来上がりは同じ**(試行の分け方が変わるだけ)。
   * ⚠️ **テストからは `false` で呼ぶ。** Vitest はワーカースレッドへ
   * TypeScript の読み込みを引き継がないため、スレッドを立てると
   * `@sudoku/core` を解決できずに落ちる。
   */
  readonly useWorkers?: boolean;
};

export type GeneratePackResult = {
  /** 採用した問題の 1 行表現。**試行番号の昇順。** */
  readonly lines: readonly string[];
  /** 実際に回した試行の回数。採用率の計算に使う。 */
  readonly attempts: number;
  /** 目標数に届いたか。 */
  readonly complete: boolean;
};

type Accepted = { readonly index: number; readonly line: string };

/** ワーカー 1 つを、1 度に 1 件の依頼だけ処理する形で包む。 */
class WorkerHandle {
  private readonly worker: Worker;

  constructor(url: URL) {
    this.worker = new Worker(url);
  }

  run(request: WorkerRequest): Promise<Accepted[]> {
    return new Promise((resolve, reject) => {
      const cleanup = (): void => {
        this.worker.off("message", onMessage);
        this.worker.off("error", onError);
      };
      const onMessage = (response: WorkerResponse): void => {
        cleanup();
        resolve([...response.accepted]);
      };
      const onError = (error: Error): void => {
        cleanup();
        reject(error);
      };
      this.worker.on("message", onMessage);
      this.worker.on("error", onError);
      this.worker.postMessage(request);
    });
  }

  async terminate(): Promise<void> {
    await this.worker.terminate();
  }
}

/** ワーカーを立てずにその場で 1 波ぶん回す。 */
function runLocally(seed: string, from: number, count: number, difficulty: Difficulty): Accepted[] {
  return runAttemptRange(seed, from, count, difficulty).map((attempt) => ({
    index: attempt.index,
    line: encodePuzzleLine(attempt.puzzle),
  }));
}

/** パック 1 個ぶんの行を作る。 */
export async function generatePackLines(options: GeneratePackOptions): Promise<GeneratePackResult> {
  const { seed, difficulty, count, workers, maxAttempts, onProgress } = options;
  const useWorkers = options.useWorkers ?? true;
  const handles =
    useWorkers && workers > 1
      ? Array.from(
          { length: workers },
          () => new WorkerHandle(new URL("./worker.ts", import.meta.url)),
        )
      : [];

  const accepted: Accepted[] = [];
  let attempts = 0;

  try {
    while (accepted.length < count && attempts < maxAttempts) {
      // 1 波ぶんの試行範囲を、ワーカー数だけ切り出す(ワーカーが 0 なら 1 つ)。
      const requests: WorkerRequest[] = [];
      const slots = Math.max(handles.length, useWorkers ? 1 : workers);
      const chunk = nextChunk(count - accepted.length, slots, attempts, accepted.length);
      for (let position = 0; position < slots; position += 1) {
        const from = attempts + position * chunk;
        const remaining = maxAttempts - from;
        if (remaining <= 0) break;
        requests.push({ seed, from, count: Math.min(chunk, remaining), difficulty });
      }
      if (requests.length === 0) break;

      const waves =
        handles.length === 0
          ? requests.map((request) =>
              runLocally(request.seed, request.from, request.count, request.difficulty),
            )
          : await Promise.all(requests.map((request, position) => handles[position].run(request)));

      for (const wave of waves) accepted.push(...wave);
      attempts += requests.reduce((total, request) => total + request.count, 0);
      onProgress?.(Math.min(accepted.length, count), attempts);
    }
  } finally {
    await Promise.all(handles.map((handle) => handle.terminate()));
  }

  const lines = accepted
    .sort((a, b) => a.index - b.index)
    .slice(0, count)
    .map((entry) => entry.line);

  return { lines, attempts, complete: lines.length === count };
}
