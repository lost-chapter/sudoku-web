import { List, Modal, Stack, Text, Title } from "@mantine/core";

import type { ReleaseNotes } from "./releaseNotes";

/**
 * 更新情報。**ホーム画面からモーダルで開く**(設定と同じ)。
 *
 * ⚠️ **遊技中には出さない。**置き場所の考え方は「あきらめる」と同じで、
 * **遊んでいる最中に押してほしくないものはホームへ置く**
 * ([ADR 0005](docs/decisions/0005-mobile-dedicated-layout.md))。
 *
 * ⚠️ **項目が増えるとスマホでは 1 画面に収まらない。**
 * **収める努力より、素直にスクロールさせるほうがよい**(読み物なので)。
 * Mantine の `Modal` は中身が高いとき自分でスクロールする。
 */
export interface ReleaseNotesModalProps {
  readonly opened: boolean;
  readonly notes: ReleaseNotes;
  readonly onClose: () => void;
}

export function ReleaseNotesModal({ opened, notes, onClose }: ReleaseNotesModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="更新情報" centered>
      <Stack gap="lg">
        {notes.releases.map((release) => (
          <Stack key={release.version} gap="xs">
            {/*
              ⚠️ **版と日付を 1 つの見出しにまとめる。**
              分けると、読み上げで「0.1.0」「2026-08-06」が別の塊になって繋がらない。
            */}
            <Title order={2} size="h5">
              {release.version}({release.date})
            </Title>

            {release.sections.map((section) => (
              <Stack key={section.title} gap={4}>
                <Text size="sm" fw={500}>
                  {section.title}
                </Text>
                <List size="sm" spacing={4}>
                  {section.items.map((item) => (
                    <List.Item key={item}>{item}</List.Item>
                  ))}
                </List>
              </Stack>
            ))}
          </Stack>
        ))}
      </Stack>
    </Modal>
  );
}
