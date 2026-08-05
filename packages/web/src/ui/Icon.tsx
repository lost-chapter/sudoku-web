import type { SVGProps } from "react";

/**
 * 画面で使うアイコン。**必要なぶんだけ自前で持つ**(2026-08-06 決定)。
 *
 * ⚠️ **アイコンのライブラリは入れない。**`@tabler/icons-react` と両方を実測したところ、
 * **バンドルの差は gzip で 0.64 KB しか無く、`node_modules` は 140 MB 増えた。**
 * 使うのは 11 個で、**5,000 個の索引は要らない**
 * (docs/decisions/0006-own-svg-icons.md)。
 *
 * ⚠️ **体裁はここで固定する。**24×24 の枠・線の太さ 2・端は丸。
 * **`path` を足す人が体裁を選べないようにしてある** —— 揃わなくなるのはそこからである。
 *
 * ⚠️ **アイコンは意味を持たない。**`aria-hidden` を外さないこと。
 * **名前は必ず呼び出し側のボタンが持つ**(文字か `aria-label`)。
 * アイコンに名前を持たせると、**ボタンの名前と二重になって読み上げが濁る。**
 */
const PATHS = {
  /** ホームへ戻る。 */
  home: "M3 10.5 12 3l9 7.5M5 9.5V21h5v-6h4v6h5V9.5",
  /** あきらめる(白旗)。⚠️ **赤や警告の記号は使わない。救済であって失敗ではない。** */
  flag: "M5 21V4h13l-2 4 2 4H5",
  /** 設定(つまみ)。**歯車より線が少なく、小さくしても潰れない。** */
  settings: "M4 6h16M4 12h16M4 18h16M9 4v4M15 10v4M7 16v4",
  /** 消す。 */
  backspace: "M9 5h11v14H9L3 12zM12 9l5 6M17 9l-5 6",
  /** メモ(候補)。 */
  pencil: "M4 20h4L20 8l-4-4L4 16zM14 6l4 4",
  /** 取り消し。 */
  undo: "M9 7 4 12l5 5M4 12h10a5 5 0 0 1 0 10h-4",
  /** やり直し。 */
  redo: "M15 7l5 5-5 5M20 12H10a5 5 0 0 0 0 10h4",
  /** 続きから。 */
  play: "M7 4l13 8-13 8z",
  /** テーマ: 端末に従う。 */
  desktop: "M3 5h18v11H3zM9 20h6M12 16v4",
  /** テーマ: ライト。 */
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M4 12H2M22 12h-2M6 6 4.5 4.5M19.5 19.5 18 18M18 6l1.5-1.5M4.5 19.5 6 18",
  /** テーマ: ダーク。 */
  moon: "M20 14a8 8 0 1 1-10-10 7 7 0 0 0 10 10z",
} as const;

export type IconName = keyof typeof PATHS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  readonly name: IconName;
  /** 一辺の px。**既定は 20**(44px のボタンに載せて余白が残る大きさ)。 */
  readonly size?: number;
}

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
