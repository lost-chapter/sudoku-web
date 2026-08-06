import { Button, Group, Text } from "@mantine/core";

import type { Difficulty } from "@sudoku/core";

import { Icon } from "../ui/Icon";

import { TOUCH_TARGET } from "./layout";

/**
 * 記号だけのボタンの左右の余白。
 *
 * ⚠️ **44px の下限を幅でも満たすために要る。**アイコンは 20px しかないので、
 * 既定の余白のままだと**高さは 44 でも幅が足りない**。
 * 14 × 2 + 20 = 48px で、境界ぴったりを避けてある。
 */
const ICON_ONLY_PADDING = 14;

/**
 * ゲーム画面のヘッダ。**難易度 / パック名 / 設定**
 * (docs/ui/screens-and-interactions.md「ゲーム画面の構成」)。
 */
export interface GameHeaderProps {
  readonly difficulty: Difficulty;
  readonly onOpenSettings: () => void;
  readonly onGiveUp: () => void;
  /** 終わったあとは押せない。 */
  readonly canGiveUp: boolean;
  /**
   * ホームへ戻る。**スマホ版だけ渡す。**
   *
   * PC 版は画面の下に置く余裕があるが、スマホ版は 1 画面に収めるので
   * ヘッダへ寄せる。⚠️ **押してほしくないものはヘッダ**、という並べ方は同じ。
   */
  readonly onHome?: () => void;
  /**
   * 幅が無いとき(横向き)は文字を落として 1 行に収める。
   *
   * ⚠️ **難易度はホーム画面で選んでいるので、遊技中は無くても困らない。**
   * 折り返すと 2 行になり、**縦の余裕が無い横向きでは中身がはみ出す**(実測)。
   */
  readonly compact?: boolean;
}

export function GameHeader({
  difficulty,
  onOpenSettings,
  onGiveUp,
  canGiveUp,
  onHome,
  compact,
}: GameHeaderProps) {
  return (
    // ⚠️ **横向きのヘッダは幅が狭い。**折り返しを許さないと文字が切れる。
    <Group justify="space-between" align="center" gap="xs">
      <Group gap="xs" wrap="nowrap">
        {/*
          ⚠️ **高さだけを 44px へ上げる。**幅は文字数で決まり、いずれも足りている。
          `size` を上げると文字も大きくなり、横向きのヘッダが 2 行になる(実測)。

          ⚠️ **「ホーム」と「設定」は記号だけにする。**ヘッダは幅がいちばん厳しく、
          **320px 幅では 3 つ並べると 2 行に折り返す**。
          **名前は `aria-label` が持つので、読み上げでは今までと同じに聞こえる。**
        */}
        {onHome && (
          <Button
            variant="default"
            size="xs"
            h={TOUCH_TARGET}
            px={ICON_ONLY_PADDING}
            aria-label="ホーム"
            onClick={onHome}
          >
            <Icon name="home" />
          </Button>
        )}
        {!compact && <Text fw={500}>{DIFFICULTY_LABELS[difficulty]}</Text>}
      </Group>

      <Group gap="xs" wrap="nowrap">
        {/*
          ⚠️ **あきらめるはヘッダに置く。**親指の付け根から最も遠く、
          遊技中に誤って触りにくい(docs/ui/screens-and-interactions.md)。
          押すと確認のモーダルが出るので、置き場所と合わせて二重に防いでいる。
        */}
        {/*
          🔴 **「あきらめる」だけは文字を残す。**押すと遊技が終わる操作で、
          **記号だけにすると「押してみて確かめる」が起きうる。**
          置き場所(親指から遠い)と確認モーダルに続く 3 つ目の歯止めである。
        */}
        <Button
          variant="default"
          size="xs"
          h={TOUCH_TARGET}
          leftSection={<Icon name="flag" size={16} />}
          disabled={!canGiveUp}
          onClick={onGiveUp}
        >
          あきらめる
        </Button>
        <Button
          variant="default"
          size="xs"
          h={TOUCH_TARGET}
          px={ICON_ONLY_PADDING}
          aria-label="設定"
          onClick={onOpenSettings}
        >
          <Icon name="settings" />
        </Button>
      </Group>
    </Group>
  );
}

/**
 * 表示名。**docs/algorithms/difficulty-rating.md の「難易度クラス」の表に合わせる。**
 * ファイル上の値は英語で固定なので、対応付けは UI 側の責務である。
 */
export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  easy: "やさしい",
  normal: "ふつう",
  hard: "むずかしい",
  expert: "難問",
  extreme: "最難関",
};
