import type { StorageLike } from "../progress/progressStorage";

import { addSolvedResult, normalizeResults, type SavedResults, type SolvedResult } from "./results";

/** 正解結果の保存先。**進行とは別の鍵にして、役割を混ぜない。** */
export const RESULTS_STORAGE_KEY = "sudoku-web:results";

/** 保存された正解結果を読む。**壊れていても遊技は止めない。** */
export function readResults(
  storage: StorageLike | undefined = defaultStorage(),
): SavedResults | null {
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(RESULTS_STORAGE_KEY);
    return raw === null ? null : normalizeResults(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** 正解した問題を保存する。**同じ問題は 1 回だけ数える。** */
export function recordSolvedResult(
  result: SolvedResult,
  storage: StorageLike | undefined = defaultStorage(),
): void {
  if (!storage) {
    return;
  }
  try {
    const next = addSolvedResult(readResults(storage), result);
    storage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 保存できなくても遊技は続く(容量制限・プライベートモードなど)。
  }
}

/** テストや開発時に結果を消す。**アプリの画面からは呼ばない。** */
export function clearResults(storage: StorageLike | undefined = defaultStorage()): void {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(RESULTS_STORAGE_KEY);
  } catch {
    // 消せなくても遊技は続く。
  }
}

function defaultStorage(): StorageLike | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}
