import { useCallback, useEffect, useState } from "react";

import { loadRandomPuzzle, type LoadedPuzzle } from "./loadPuzzle";
import { SAMPLE_PUZZLE } from "./samplePuzzle";
import type { Difficulty, Puzzle } from "./types";

/**
 * 問題を 1 問取ってきて、遊べる状態にする。
 *
 * **取得に失敗しても遊技を止めない。**同梱の 1 問へ退避する
 * (docs/architecture/system-architecture.md「エラーハンドリングの方針」)。
 */
export type PuzzleStatus =
  /** 取得中。**まだ盤面を出さない。** */
  | "loading"
  /** パックから取れた。 */
  | "loaded"
  /** 取れなかったので同梱の 1 問で遊ぶ。 */
  | "fallback";

export interface UsePuzzleResult {
  readonly status: PuzzleStatus;
  /** 取得中は `null`。それ以外は必ず遊べる問題が入る。 */
  readonly puzzle: Puzzle | null;
  /** どのパックの何行目か。同梱の 1 問で遊んでいるときは `null`。 */
  readonly source: LoadedPuzzle | null;
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
}

export function usePuzzle(difficulty: Difficulty): UsePuzzleResult {
  const [count, setCount] = useState(0);
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  const key = `${difficulty}:${count}`;

  useEffect(() => {
    // 取得中に難易度を変えられたり、続けて「次の問題へ」を押されたりしたときに、
    // 古い取得の結果で新しい盤面を上書きしないようにする。
    let cancelled = false;

    void loadRandomPuzzle({ difficulty }).then((loaded) => {
      if (!cancelled) {
        setAttempt({ key, loaded });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [difficulty, key]);

  const next = useCallback(() => {
    setCount((value) => value + 1);
  }, []);

  // 取得中かどうかは「結果がいまの要求のものか」で決まる。状態として別に持たない。
  const current = attempt?.key === key ? attempt : null;

  if (current === null) {
    return { status: "loading", puzzle: null, source: null, puzzleKey: key, next };
  }

  if (current.loaded === null) {
    return { status: "fallback", puzzle: SAMPLE_PUZZLE, source: null, puzzleKey: key, next };
  }

  return {
    status: "loaded",
    puzzle: current.loaded.puzzle,
    source: current.loaded,
    puzzleKey: `${key}:${current.loaded.packPath}:${current.loaded.line}`,
    next,
  };
}
