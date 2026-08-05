/**
 * 補助表示の設定。
 *
 * **すべて設定で切れること**が要件である
 * (docs/ui/screens-and-interactions.md「補助表示」)。既定は控えめ側に寄せる。
 *
 * ⚠️ **2026-08-06 に 3 つ削除した**(発注者の要望)。
 * 「矛盾の表示」「残り数の表示」「誤りの即時指摘」は**設定ごと無くなった**。
 * **間違いを教えない**のがこのアプリの方針である。
 * 古い保存に残っている鍵は {@link normalizeSettings} が落とす。
 */
export interface Settings {
  /** 選択中のセルと同じ数字を目立たせる。 */
  readonly highlightSameDigit: boolean;
  /** 選択中のセルが属する行・列・ブロックを薄く敷く。 */
  readonly highlightUnits: boolean;
  /**
   * スマホで、数字を上へはじくとメモになる(2026-08-06・発注者の要望)。
   *
   * ⚠️ **既定は入。**
   * **知らなければ気づかないだけで損はせず、既定で切ると誰にも届かない。**
   */
  readonly flickToNote: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  highlightSameDigit: true,
  highlightUnits: true,
  flickToNote: true,
};

/**
 * 保存されている設定を読む。
 *
 * **壊れていたら既定へ倒す。**保存の失敗で遊べなくならないこと
 * (docs/architecture/system-architecture.md「エラーハンドリングの方針」)。
 * 項目が増えたときに古い保存を捨てずに済むよう、**足りない項目だけ既定で補う。**
 *
 * ⚠️ **知らない鍵は落とす。**組み立てを `DEFAULT_SETTINGS` の側から回しているので、
 * 削除した設定(`showConflicts` など)が古い保存に残っていても持ち込まれない。
 */
export function normalizeSettings(value: unknown): Settings {
  if (typeof value !== "object" || value === null) {
    return DEFAULT_SETTINGS;
  }

  const stored = value as Record<string, unknown>;
  const entries = Object.entries(DEFAULT_SETTINGS).map(([key, fallback]) => [
    key,
    typeof stored[key] === "boolean" ? stored[key] : fallback,
  ]);

  return Object.fromEntries(entries) as Settings;
}
