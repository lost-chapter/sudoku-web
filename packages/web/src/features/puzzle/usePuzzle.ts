import { useCallback, useEffect, useState } from "react";

import { isStale } from "../progress/progress";
import { clearProgress, readProgress } from "../progress/progressStorage";
import type { RestoredBoard } from "../../state/boardState";

import { loadPuzzleAt, loadRandomPuzzle, type LoadedPuzzle } from "./loadPuzzle";
import { SAMPLE_PUZZLE } from "./samplePuzzle";
import type { Difficulty, Puzzle } from "./types";

/**
 * 問題を 1 問取ってきて、遊べる状態にする。
 *
 * **起動時は遊びかけを優先する。**あれば同じ問題を開き、入力とメモを戻す
 * (docs/api/puzzle-file-format.md「進行の保存との関係」)。
 *
 * **取得に失敗しても遊技を止めない。**同梱の 1 問へ退避する
 * (docs/architecture/system-architecture.md「エラーハンドリングの方針」)。
 */
export type PuzzleStatus =
  /** 取得中。**まだ盤面を出さない。** */
  | "loading"
  /** パックから取れた。 */
  | "loaded"
  /** 遊びかけを再開した。 */
  | "resumed"
  /** 取れなかったので同梱の 1 問で遊ぶ。 */
  | "fallback";

export interface UsePuzzleResult {
  readonly status: PuzzleStatus;
  /** 取得中は `null`。それ以外は必ず遊べる問題が入る。 */
  readonly puzzle: Puzzle | null;
  /** どのパックの何行目か。同梱の 1 問で遊んでいるときは `null`。 */
  readonly source: LoadedPuzzle | null;
  /** 遊びかけから戻す入力とメモ。新しい問題なら `null`。 */
  readonly restored: RestoredBoard | null;
  /** 遊びかけの経過時間。新しい問題なら 0。 */
  readonly elapsedMs: number;
  /**
   * 盤面を作り直す目印。**同じ問題を引き直しても値が変わる**ので、
   * これを `key` に使えば「次の問題へ」で盤面が必ず初期化される。
   */
  readonly puzzleKey: string;
  readonly next: () => void;
}

interface Attempt {
  /** どの取得に対する結果か。**いまの要求と一致しなければ古い結果である。** */
  readonly key: string;
  readonly loaded: LoadedPuzzle | null;
  readonly restored: RestoredBoard | null;
  readonly elapsedMs: number;
}

export interface UsePuzzleOptions {
  readonly difficulty: Difficulty;
  /** 遊びかけから始めるか。**ホーム画面で「続きから」を選んだときだけ真。** */
  readonly resume: boolean;
}

export function usePuzzle({ difficulty, resume }: UsePuzzleOptions): UsePuzzleResult {
  const [count, setCount] = useState(0);
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  const key = `${difficulty}:${count}`;

  useEffect(() => {
    // 取得中に難易度を変えられたり、続けて「次の問題へ」を押されたりしたときに、
    // 古い取得の結果で新しい盤面を上書きしないようにする。
    let cancelled = false;

    // 遊びかけを見るのは選ばれたときの 1 回だけ。「次の問題へ」では新しい問題を引く。
    const load = resume && count === 0 ? resumeOrLoad(difficulty) : loadFresh(difficulty);

    void load.then((result) => {
      if (!cancelled) {
        setAttempt({ key, ...result });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [count, difficulty, key, resume]);

  const next = useCallback(() => {
    // 次へ進んだ時点で遊びかけは無い。残すと次回の起動で古い問題が開く。
    clearProgress();
    setCount((value) => value + 1);
  }, []);

  // 取得中かどうかは「結果がいまの要求のものか」で決まる。状態として別に持たない。
  const current = attempt?.key === key ? attempt : null;

  if (current === null) {
    return {
      status: "loading",
      puzzle: null,
      source: null,
      restored: null,
      elapsedMs: 0,
      puzzleKey: key,
      next,
    };
  }

  if (current.loaded === null) {
    return {
      status: "fallback",
      puzzle: SAMPLE_PUZZLE,
      source: null,
      restored: null,
      elapsedMs: 0,
      puzzleKey: key,
      next,
    };
  }

  return {
    status: current.restored ? "resumed" : "loaded",
    puzzle: current.loaded.puzzle,
    source: current.loaded,
    restored: current.restored,
    elapsedMs: current.elapsedMs,
    puzzleKey: `${key}:${current.loaded.packPath}:${current.loaded.line}`,
    next,
  };
}

type LoadResult = Omit<Attempt, "key">;

async function loadFresh(difficulty: Difficulty): Promise<LoadResult> {
  return { loaded: await loadRandomPuzzle({ difficulty }), restored: null, elapsedMs: 0 };
}

/**
 * 遊びかけがあればそれを開く。**無ければ・古ければ新しい問題を引く。**
 *
 * ⚠️ **版が変わった保存は捨てる。**パックを差し替えると行番号がずれるので、
 * 同じ行が別の問題を指している(docs/api/puzzle-file-format.md)。
 */
async function resumeOrLoad(difficulty: Difficulty): Promise<LoadResult> {
  const saved = readProgress();
  if (!saved) {
    return loadFresh(difficulty);
  }

  const loaded = await loadPuzzleAt({ packPath: saved.packPath, line: saved.line });
  if (!loaded || isStale(saved, loaded)) {
    // 開けない保存は残しておいても使えない。
    clearProgress();
    return loadFresh(difficulty);
  }

  return {
    loaded,
    restored: { entries: saved.entries, notes: saved.notes },
    elapsedMs: saved.elapsedMs,
  };
}
