import { decodeManifest, packsFor, type Manifest } from "./manifest";
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
  /**
   * 取ってきた時点のパックの版。
   *
   * **進行の保存が古くなったかの判定に要る**(docs/api/puzzle-file-format.md)。
   */
  readonly formatVersion: number;
  readonly generator: string;
}

export interface LoadPuzzleOptions {
  /** 配信元。末尾の `/` は付けても付けなくてもよい。 */
  readonly baseUrl?: string;
  /** 差し替え口。テストではここに偽の取得を渡す。 */
  readonly fetch?: typeof globalThis.fetch;
}

export interface LoadRandomPuzzleOptions extends LoadPuzzleOptions {
  readonly difficulty: Difficulty;
  /** 乱択。テストでは固定値を渡して同じ問題を選ばせる。 */
  readonly random?: () => number;
}

export interface LoadPuzzleAtOptions extends LoadPuzzleOptions {
  readonly packPath: string;
  readonly line: number;
}

const DEFAULT_BASE_URL = "/puzzles";

/** 難易度を指定して 1 問を乱択する。 */
export async function loadRandomPuzzle(
  options: LoadRandomPuzzleOptions,
): Promise<LoadedPuzzle | null> {
  const { difficulty, random = Math.random } = options;
  const fetch = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;

  const manifest = await fetchManifest(fetch, baseUrl);
  if (!manifest) {
    return null;
  }

  const packs = packsFor(manifest, difficulty);
  if (packs.length === 0) {
    return null;
  }

  const pack = packs[pick(random, packs.length)];
  const entries = await fetchEntries(fetch, baseUrl, pack.path);
  if (entries.length === 0) {
    return null;
  }

  const entry = entries[pick(random, entries.length)];
  return toLoaded(entry.puzzle, pack.path, entry.line, manifest);
}

/**
 * パックと行を指定して 1 問取る。**遊びかけの復元に使う。**
 *
 * 行が見つからなければ `null`(パックが差し替わって行が消えた場合)。
 */
export async function loadPuzzleAt(options: LoadPuzzleAtOptions): Promise<LoadedPuzzle | null> {
  const { packPath, line } = options;
  const fetch = options.fetch ?? globalThis.fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;

  const manifest = await fetchManifest(fetch, baseUrl);
  if (!manifest) {
    return null;
  }

  // マニフェストに無いパックは取りに行かない。
  if (!manifest.packs.some((pack) => pack.path === packPath)) {
    return null;
  }

  const entry = (await fetchEntries(fetch, baseUrl, packPath)).find((item) => item.line === line);
  if (!entry) {
    return null;
  }

  return toLoaded(entry.puzzle, packPath, line, manifest);
}

function toLoaded(
  puzzle: Puzzle,
  packPath: string,
  line: number,
  manifest: Manifest,
): LoadedPuzzle {
  return {
    puzzle,
    packPath,
    line,
    formatVersion: manifest.formatVersion,
    generator: manifest.generator,
  };
}

/** マニフェストだけを取る。**ホーム画面が難易度の一覧を作るのに使う。** */
export function loadManifest(options: LoadPuzzleOptions = {}): Promise<Manifest | null> {
  return fetchManifest(options.fetch ?? globalThis.fetch, options.baseUrl ?? DEFAULT_BASE_URL);
}

async function fetchManifest(
  fetch: typeof globalThis.fetch,
  baseUrl: string,
): Promise<Manifest | null> {
  const value = await fetchJson(fetch, join(baseUrl, "manifest.json"));
  return value === null ? null : decodeManifest(value);
}

/** 壊れた行はここで落ちる。パック全体は捨てない。 */
async function fetchEntries(fetch: typeof globalThis.fetch, baseUrl: string, path: string) {
  const text = await fetchText(fetch, join(baseUrl, path));
  return text === null ? [] : decodePack(text);
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
