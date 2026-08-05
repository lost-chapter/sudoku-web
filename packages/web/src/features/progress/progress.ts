import { CELL_COUNT } from "@sudoku/core";

/**
 * 遊びかけの進行。
 *
 * **問題そのものではなく参照と差分を持つ**
 * (docs/api/puzzle-file-format.md「進行の保存との関係」)。
 * 手がかりはパックから引き直せるので保存しない。
 */
export interface SavedProgress {
  /** どのパックの何行目か。**この 2 つで問題を指す。** */
  readonly packPath: string;
  readonly line: number;
  /** 遊技者が入れた数字。81 要素。0 は未入力。 */
  readonly entries: readonly number[];
  /** メモ。81 要素のビットマスク。 */
  readonly notes: readonly number[];
  readonly elapsedMs: number;
  /**
   * 保存した時点のパックの版。
   *
   * ⚠️ **パックを差し替えると行番号がずれる。**この 2 つのどちらかが変わったら
   * **保存された進行は破棄して新しい盤面から始める**(同ドキュメント)。
   */
  readonly formatVersion: number;
  readonly generator: string;
}

/** 版の照合に使う、いま配られているパックの情報。 */
export interface PackVersion {
  readonly formatVersion: number;
  readonly generator: string;
}

/**
 * 保存されている進行を読む。**読めなければ `null`。**
 *
 * 壊れていたら黙って捨てて新しい盤面から始める。
 * **保存の失敗で遊べなくならないこと**
 * (docs/architecture/system-architecture.md「エラーハンドリングの方針」)。
 */
export function normalizeProgress(value: unknown): SavedProgress | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const stored = value as Record<string, unknown>;
  const entries = normalizeCells(stored.entries);
  const notes = normalizeCells(stored.notes);

  if (
    typeof stored.packPath !== "string" ||
    stored.packPath === "" ||
    !Number.isInteger(stored.line) ||
    (stored.line as number) < 0 ||
    !entries ||
    !notes ||
    !Number.isFinite(stored.elapsedMs) ||
    (stored.elapsedMs as number) < 0 ||
    !Number.isInteger(stored.formatVersion) ||
    typeof stored.generator !== "string"
  ) {
    return null;
  }

  return {
    packPath: stored.packPath,
    line: stored.line as number,
    entries,
    notes,
    elapsedMs: stored.elapsedMs as number,
    formatVersion: stored.formatVersion as number,
    generator: stored.generator,
  };
}

/**
 * その進行がもう使えないか。
 *
 * **版が変わったら行番号の指す問題が別物になっている。**
 * 中身を見て判断できないので、版で切る。
 */
export function isStale(progress: SavedProgress, pack: PackVersion): boolean {
  return progress.formatVersion !== pack.formatVersion || progress.generator !== pack.generator;
}

/** 何も入っていない進行は保存しない。**空の保存で「続きから」を出さない。** */
export function isEmpty(progress: Pick<SavedProgress, "entries" | "notes">): boolean {
  return (
    progress.entries.every((value) => value === 0) && progress.notes.every((mask) => mask === 0)
  );
}

function normalizeCells(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== CELL_COUNT) {
    return null;
  }
  if (!value.every((cell) => Number.isInteger(cell) && cell >= 0)) {
    return null;
  }
  return value as number[];
}
