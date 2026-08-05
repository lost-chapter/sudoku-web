import { Modal, SegmentedControl, Stack, Switch, Text, useMantineColorScheme } from "@mantine/core";

import type { Settings } from "./settings";

/**
 * 設定。**ゲーム画面からモーダルで開く**(docs/ui/screens-and-interactions.md)。
 *
 * 中身はテーマと、盤面の強調 2 つだけである。
 */
export interface SettingsModalProps {
  readonly opened: boolean;
  readonly settings: Settings;
  readonly onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  readonly onClose: () => void;
}

interface Item {
  readonly key: keyof Settings;
  readonly label: string;
  readonly description: string;
}

/**
 * 並びは仕様の表と同じにする。
 *
 * ⚠️ **2026-08-06 に「矛盾の表示」「残り数の表示」「誤りの即時指摘」を消した**
 * (発注者の要望)。**間違いを教えない**のがこのアプリの方針である。
 */
const ITEMS: readonly Item[] = [
  {
    key: "highlightSameDigit",
    label: "同じ数字の強調",
    description: "選択中のセルと同じ数字を目立たせる",
  },
  {
    key: "highlightUnits",
    label: "行・列・ブロックの強調",
    description: "選択中のセルが属する 3 方向を薄く敷く",
  },
];

export function SettingsModal({ opened, settings, onChange, onClose }: SettingsModalProps) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  return (
    <Modal opened={opened} onClose={onClose} title="設定" centered>
      <Stack gap="lg">
        {/*
          テーマ。**既定は端末の設定に従う**(自動)。
          明示的に固定でき、選択は Mantine が localStorage へ残す
          (docs/ui/screens-and-interactions.md「テーマ」)。
        */}
        <Stack gap="xs">
          <Text fw={500} size="sm">
            テーマ
          </Text>
          <SegmentedControl
            value={colorScheme}
            aria-label="テーマ"
            data={[
              { value: "auto", label: "自動" },
              { value: "light", label: "ライト" },
              { value: "dark", label: "ダーク" },
            ]}
            onChange={(value) => setColorScheme(value as "auto" | "light" | "dark")}
          />
        </Stack>

        {ITEMS.map((item) => (
          <Switch
            key={item.key}
            checked={settings[item.key]}
            label={item.label}
            description={item.description}
            onChange={(event) => onChange(item.key, event.currentTarget.checked)}
          />
        ))}
        <Text size="xs" c="dimmed">
          設定はこの端末に残ります。
        </Text>
      </Stack>
    </Modal>
  );
}
