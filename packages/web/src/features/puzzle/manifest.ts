import { DIFFICULTIES, type Difficulty } from "./types";

/**
 * 収録内容の索引(`manifest.json`)。
 *
 * **アプリはまず これを読み、必要なパックだけを取得する**
 * (docs/api/puzzle-file-format.md)。全パックを最初に読み込まない。
 */

/** 読めることが分かっている形式の版。上がったら読み方を見直す。 */
export const SUPPORTED_FORMAT_VERSION = 1;

export interface PackInfo {
  readonly path: string;
  readonly difficulty: Difficulty;
  readonly count: number;
}

export interface Manifest {
  readonly formatVersion: number;
  /**
   * どの版の生成器が、どの手筋まで実装した状態で作ったか。
   *
   * ⚠️ **実装済みの手筋が増えると難易度の意味が変わる。**
   * 古いパックの難易度を新しい基準と比べてはいけない。
   */
  readonly generator: string;
  readonly techniques: readonly number[];
  readonly packs: readonly PackInfo[];
  /**
   * 難易度クラスごとの収録数。
   *
   * **難易度の選択はこれで作る。画面にクラスを固定で書かない**
   * (docs/ui/screens-and-interactions.md「難易度の選択」)。
   * 実装済みの手筋が増えて上のクラスが埋まったとき、UI を直さずに選べるようになる。
   */
  readonly totals: Readonly<Record<Difficulty, number>>;
}

/**
 * マニフェストを読む。読めなければ `null`。
 *
 * **`formatVersion` が違えば丸ごと読まない。** 列の追加や難易度クラスの追加は
 * 版を上げる変更なので、古い読み方で解釈すると黙って取りこぼす。
 *
 * **パックの項目が壊れているときはその項目だけ捨てる。**
 * パックが 1 つ壊れていても、残りで遊べるほうがよい。
 */
export function decodeManifest(value: unknown): Manifest | null {
  if (!isRecord(value) || value.formatVersion !== SUPPORTED_FORMAT_VERSION) {
    return null;
  }

  const generatedWith = isRecord(value.generatedWith) ? value.generatedWith : undefined;
  const generator = typeof generatedWith?.generator === "string" ? generatedWith.generator : "";
  const techniques = Array.isArray(generatedWith?.techniques)
    ? generatedWith.techniques.filter((level): level is number => Number.isInteger(level))
    : [];

  if (!Array.isArray(value.packs)) {
    return null;
  }

  const packs = value.packs.filter(isPackInfo);

  return {
    formatVersion: value.formatVersion,
    generator,
    techniques,
    packs,
    totals: decodeTotals(value.totals, packs),
  };
}

/** その難易度のパックだけを取り出す。**遊技者は 1 クラスしか使わない。** */
export function packsFor(manifest: Manifest, difficulty: Difficulty): readonly PackInfo[] {
  return manifest.packs.filter((pack) => pack.difficulty === difficulty && pack.count > 0);
}

/**
 * いま遊べる難易度。**0 件のクラスは出さない。**
 *
 * ⚠️ 実装済みの手筋によっては上のクラスが 1 問も作れない
 * (docs/algorithms/difficulty-rating.md「実装していない手筋の扱い」)。
 * **画面にクラスを固定で書くと、手筋が増えるたびに UI を直すことになる。**
 */
export function availableDifficulties(manifest: Manifest): readonly Difficulty[] {
  return DIFFICULTIES.filter((difficulty) => manifest.totals[difficulty] > 0);
}

/**
 * `totals` を読む。**壊れていればパックの件数から数え直す。**
 * どちらも読めなければ 0 件として扱い、そのクラスを出さない。
 */
function decodeTotals(value: unknown, packs: readonly PackInfo[]): Record<Difficulty, number> {
  const stored = isRecord(value) ? value : {};
  const totals = {} as Record<Difficulty, number>;

  for (const difficulty of DIFFICULTIES) {
    const declared = stored[difficulty];
    totals[difficulty] =
      Number.isInteger(declared) && (declared as number) >= 0
        ? (declared as number)
        : packs
            .filter((pack) => pack.difficulty === difficulty)
            .reduce((sum, pack) => sum + pack.count, 0);
  }

  return totals;
}

function isPackInfo(value: unknown): value is PackInfo {
  return (
    isRecord(value) &&
    typeof value.path === "string" &&
    value.path !== "" &&
    typeof value.difficulty === "string" &&
    (DIFFICULTIES as readonly string[]).includes(value.difficulty) &&
    Number.isInteger(value.count) &&
    (value.count as number) >= 0
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
