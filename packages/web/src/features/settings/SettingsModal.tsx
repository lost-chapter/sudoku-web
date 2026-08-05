import {
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Switch,
  Text,
  useMantineColorScheme,
} from "@mantine/core";

import { Icon, type IconName } from "../../ui/Icon";

import type { Settings } from "./settings";

/**
 * テーマの選択肢。**記号に文字を添える。**
 * ⚠️ **文字を落とさない。**「自動」は絵で表しにくく、記号だけでは意味が伝わらない。
 */
function ThemeLabel({ icon, text }: { readonly icon: IconName; readonly text: string }) {
  return (
    <Group gap={6} wrap="nowrap" justify="center">
      <Icon name={icon} size={16} />
      {text}
    </Group>
  );
}

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
  {
    key: "flickToNote",
    // ⚠️ **「フリック」と書かない。**遊ぶ人の言葉で、**何が起きるか**を書く。
    label: "上へはじいてメモ",
    description: "スマートフォンで、数字を上へはじくと候補になります",
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
              { value: "auto", label: <ThemeLabel icon="desktop" text="自動" /> },
              { value: "light", label: <ThemeLabel icon="sun" text="ライト" /> },
              { value: "dark", label: <ThemeLabel icon="moon" text="ダーク" /> },
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
