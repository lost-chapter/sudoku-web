import { Button, Group, Text } from "@mantine/core";

import type { Difficulty } from "@sudoku/core";

import { TOUCH_TARGET } from "./layout";

/**
 * ゲーム画面のヘッダ。**難易度 / パック名 / 設定**
 * (docs/ui/screens-and-interactions.md「ゲーム画面の構成」)。
 */
export interface GameHeaderProps {
  readonly difficulty: Difficulty;
  /** どのパックから取ったか。同梱の 1 問で遊んでいるときは空。 */
  readonly packLabel: string;
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
  packLabel,
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
        */}
        {onHome && (
          <Button variant="default" size="xs" h={TOUCH_TARGET} onClick={onHome}>
            ホーム
          </Button>
        )}
        {!compact && <Text fw={500}>{DIFFICULTY_LABELS[difficulty]}</Text>}
      </Group>

      {!onHome && (
        <Text size="xs" c="dimmed" truncate>
          {packLabel}
        </Text>
      )}

      <Group gap="xs" wrap="nowrap">
        {/*
          ⚠️ **あきらめるはヘッダに置く。**親指の付け根から最も遠く、
          遊技中に誤って触りにくい(docs/ui/screens-and-interactions.md)。
          押すと確認のモーダルが出るので、置き場所と合わせて二重に防いでいる。
        */}
        <Button
          variant="default"
          size="xs"
          h={TOUCH_TARGET}
          disabled={!canGiveUp}
          onClick={onGiveUp}
        >
          あきらめる
        </Button>
        <Button variant="default" size="xs" h={TOUCH_TARGET} onClick={onOpenSettings}>
          設定
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
