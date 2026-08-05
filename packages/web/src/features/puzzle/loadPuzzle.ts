import { decodeManifest, packsFor } from "./manifest";
import { decodePack } from "./pack";
import type { Difficulty, Puzzle } from "./types";

/**
 * 問題を 1 問取ってくる。
 *
 * ```
 * マニフェストを見る ──▶ 該当パックを取得 ──▶ 1 問取り出す
 * ```
 *
 * **全パックを最初に読み込まない**(docs/api/puzzle-file-format.md)。
 *
 * **失敗しても例外を投げず `null` を返す。** 取得の失敗で遊技を止めないため
 * (docs/architecture/system-architecture.md「エラーハンドリングの方針」)。
 * 呼び出し側は同梱の問題へ退避する。
 */
export interface LoadedPuzzle {
  readonly puzzle: Puzzle;
  /** どのパックの何行目か。**進行の保存はこの 2 つで問題を指す。** */
  readonly packPath: string;
  readonly line: number;
}

export interface LoadPuzzleOptions {
  readonly difficulty: Difficulty;
  /** 配信元。末尾の `/` は付けても付けなくてもよい。 */
  readonly baseUrl?: string;
  /** 差し替え口。テストではここに偽の取得を渡す。 */
  readonly fetch?: typeof globalThis.fetch;
  /** 乱択。テストでは固定値を渡して同じ問題を選ばせる。 */
  readonly random?: () => number;
}

const DEFAULT_BASE_URL = "/puzzles";

export async function loadRandomPuzzle(options: LoadPuzzleOptions): Promise<LoadedPuzzle | null> {
  const {
    difficulty,
    baseUrl = DEFAULT_BASE_URL,
    fetch = globalThis.fetch,
    random = Math.random,
  } = options;

  const manifestValue = await fetchJson(fetch, join(baseUrl, "manifest.json"));
  if (manifestValue === null) {
    return null;
  }

  const manifest = decodeManifest(manifestValue);
  if (!manifest) {
    return null;
  }

  const packs = packsFor(manifest, difficulty);
  if (packs.length === 0) {
    return null;
  }

  const pack = packs[pick(random, packs.length)];
  const text = await fetchText(fetch, join(baseUrl, pack.path));
  if (text === null) {
    return null;
  }

  // 壊れた行はここで落ちている。残った中から選ぶ。
  const entries = decodePack(text);
  if (entries.length === 0) {
    return null;
  }

  const entry = entries[pick(random, entries.length)];
  return { puzzle: entry.puzzle, packPath: pack.path, line: entry.line };
}

/** `random()` の 0〜1 を 0〜`length - 1` へ。1 になっても範囲から出さない。 */
function pick(random: () => number, length: number): number {
  return Math.min(length - 1, Math.floor(random() * length));
}

function join(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function fetchText(fetch: typeof globalThis.fetch, url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    return response.ok ? await response.text() : null;
  } catch {
    // 通信の失敗も「取得できなかった」として同じに扱う。
    return null;
  }
}

async function fetchJson(fetch: typeof globalThis.fetch, url: string): Promise<unknown> {
  const text = await fetchText(fetch, url);
  if (text === null) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
