import { normalizeProgress, type SavedProgress } from "./progress";

/** `localStorage` の鍵。**前置きを付けて他のアプリと衝突させない。** */
export const PROGRESS_STORAGE_KEY = "sudoku-web:progress";

/**
 * 遊びかけの読み書き。
 *
 * ⚠️ **`localStorage` は失敗しうる。**容量制限や、プライベートモードでの拒否がある。
 * **失敗しても遊技を止めない**ので、ここでは投げずに黙って捨てる
 * (docs/architecture/system-architecture.md「エラーハンドリングの方針」)。
 *
 * 設定と違って `use-local-storage` を使っていないのは、進行が
 * **「起動時に 1 回読む」「変わるたびに書く」**という非対称な使い方だからである。
 * 値を React の状態として持つと、書くたびに描画が 1 回増える。
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function readProgress(
  storage: StorageLike | undefined = defaultStorage(),
): SavedProgress | null {
  if (!storage) {
    return null;
  }
  try {
    const raw = storage.getItem(PROGRESS_STORAGE_KEY);
    return raw === null ? null : normalizeProgress(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeProgress(
  progress: SavedProgress,
  storage: StorageLike | undefined = defaultStorage(),
): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // 保存できなくても遊技は続く。
  }
}

export function clearProgress(storage: StorageLike | undefined = defaultStorage()): void {
  if (!storage) {
    return;
  }
  try {
    storage.removeItem(PROGRESS_STORAGE_KEY);
  } catch {
    // 消せなくても遊技は続く。
  }
}

/** テストや SSR で `localStorage` が無い場合に備える。 */
function defaultStorage(): StorageLike | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}
