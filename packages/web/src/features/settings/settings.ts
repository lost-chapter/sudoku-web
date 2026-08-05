/**
 * 補助表示の設定。
 *
 * **すべて設定で切れること**が要件である
 * (docs/ui/screens-and-interactions.md「補助表示」)。既定は控えめ側に寄せる。
 *
 * ⚠️ **「矛盾の表示」と「誤りの即時指摘」は別物である。**
 * 前者は数独の規則(重複)だけを見る。後者は解を参照する。混同しないこと。
 */
export interface Settings {
  /** 選択中のセルと同じ数字を目立たせる。 */
  readonly highlightSameDigit: boolean;
  /** 選択中のセルが属する行・列・ブロックを薄く敷く。 */
  readonly highlightUnits: boolean;
  /** 同じ行・列・ブロックで数字が重複したら印を付ける。**規則だけを見る。** */
  readonly showConflicts: boolean;
  /** 各数字があと何個入るか。0 になった数字はパッドで落とす。 */
  readonly showRemaining: boolean;
  /** 解と違う入力をその場で指摘する。**遊びの質が変わるので既定は切。** */
  readonly showMistakes: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  highlightSameDigit: true,
  highlightUnits: true,
  showConflicts: true,
  showRemaining: true,
  showMistakes: false,
};

/**
 * 保存されている設定を読む。
 *
 * **壊れていたら既定へ倒す。**保存の失敗で遊べなくならないこと
 * (docs/architecture/system-architecture.md「エラーハンドリングの方針」)。
 * 項目が増えたときに古い保存を捨てずに済むよう、**足りない項目だけ既定で補う。**
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
