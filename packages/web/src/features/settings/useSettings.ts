import { useLocalStorage } from "@mantine/hooks";

import { DEFAULT_SETTINGS, normalizeSettings, type Settings } from "./settings";

/** `localStorage` の鍵。**前置きを付けて他のアプリと衝突させない。** */
export const SETTINGS_STORAGE_KEY = "sudoku-web:settings";

export interface UseSettingsResult {
  readonly settings: Settings;
  readonly setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

/**
 * 補助表示の設定。**`localStorage` に残す**
 * (docs/architecture/system-architecture.md「進行の保存」)。
 *
 * 保存と読み出しは `@mantine/hooks` の `use-local-storage` に寄せる
 * (docs/decisions/0002-ui-library-selection.md)。自前で `localStorage` を触らない。
 *
 * **読み出しは必ず正規化する。**壊れた値や古い版が入っていても遊べなくならないこと。
 */
export function useSettings(): UseSettingsResult {
  const [settings, setSettings] = useLocalStorage<Settings>({
    key: SETTINGS_STORAGE_KEY,
    defaultValue: DEFAULT_SETTINGS,
    deserialize: (value) => {
      if (value === undefined) {
        return DEFAULT_SETTINGS;
      }
      try {
        return normalizeSettings(JSON.parse(value));
      } catch {
        // 壊れていたら黙って既定へ倒す。保存の失敗で遊べなくならないこと。
        return DEFAULT_SETTINGS;
      }
    },
  });

  return {
    settings,
    setSetting: (key, value) => {
      setSettings((current) => ({ ...current, [key]: value }));
    },
  };
}
