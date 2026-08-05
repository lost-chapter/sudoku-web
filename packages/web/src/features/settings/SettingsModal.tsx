import { Modal, Stack, Switch, Text } from "@mantine/core";

import type { Settings } from "./settings";

/**
 * 設定。**ゲーム画面からモーダルで開く**(docs/ui/screens-and-interactions.md)。
 *
 * いまは補助表示だけ。テーマの切替は工程 4 の最後の区切り。
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
 * ⚠️ **「矛盾の表示」と「誤りの即時指摘」は別物である。**説明でそれが分かるようにする。
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
  {
    key: "showConflicts",
    label: "矛盾の表示",
    description: "同じ行・列・ブロックで数字が重なったら印を付ける（数独の規則だけを見る）",
  },
  {
    key: "showRemaining",
    label: "残り数の表示",
    description: "各数字があと何個入るか。0 になった数字はパッドで落とす",
  },
  {
    key: "showMistakes",
    label: "誤りの即時指摘",
    description: "解と違う入力をその場で指摘する（遊びの質が変わるので既定は切）",
  },
];

export function SettingsModal({ opened, settings, onChange, onClose }: SettingsModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="設定" centered>
      <Stack gap="lg">
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
