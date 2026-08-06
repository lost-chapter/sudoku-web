import { useRef, type TouchEvent } from "react";

/**
 * 数字キーの指の操作を、**タップとフリックへ自分で振り分ける**。
 *
 * 上へはじくとメモ、そのまま離すと確定入力
 * (docs/reports/2026-08-06-flick-input-survey.md)。
 *
 * 🔴 **`click` に任せない。**ブラウザは**指が少し滑っただけで `click` の合成をやめる**
 * (tap slop。実測でおよそ 15px)。
 * **フリックの閾値をそれより上に置くと、その間が「何も起きない」領域になる。**
 *
 * | 上への移動 | `click` に任せた場合 | **自分で振り分けた場合** |
 * |---|---|---|
 * | 0〜15px | 確定入力 | 確定入力 |
 * | **15〜24px** | 🔴 **何も起きない** | **確定入力** |
 * | 24px 以上 | メモ | メモ |
 *
 * ⚠️ **閾値を slop の直上へ下げる案は採らなかった。**
 * **slop の値はブラウザと端末で変わるので、また穴が開く。**
 * **「どこまでがタップか」を自分で決めれば、穴は原理的に無くなる。**
 *
 * ⚠️ **キーの外で離したら何もしない。**
 * **指を外へ滑らせて取り消す**のは、ボタンの標準的な振る舞いである。
 */

/**
 * 上フリックと認める縦の移動量(px)。
 *
 * ⚠️ **キーの高さ(48px)の半分。**キーの中で完結する動きはタップ、
 * **キーから出ていく動きはフリック**、という分け方である。
 */
const FLICK_DISTANCE = 24;

export interface FlickHandlers {
  readonly onTouchStart: (event: TouchEvent<HTMLElement>) => void;
  readonly onTouchMove: (event: TouchEvent<HTMLElement>) => void;
  readonly onTouchEnd: (event: TouchEvent<HTMLElement>) => void;
  readonly onTouchCancel: () => void;
}

export interface TouchInput {
  /** 上へはじかれた。 */
  readonly onFlickUp: () => void;
  /** 上フリックのガイドを表示し始める。 */
  readonly onFlickStart?: () => void;
  /** 上フリックが終わり、ガイドを隠す。 */
  readonly onFlickEnd?: () => void;
  /** そのまま離した(キーの中で)。 */
  readonly onTap: () => void;
  /**
   * 上フリックを見るか(設定。既定は入)。
   *
   * 🔴 **切っても、この hook ごと外さないこと。**
   * **外すとタップの経路が `click` 任せに戻り、slop の分だけ無反応の範囲が復活する。**
   * ⚠️ **切ったときの上フリックは「キーの外で離した」に落ちる**(= 取り消し)。
   * **ボタンとして自然な振る舞いであり、確定入力が入るよりも驚きが小さい。**
   */
  readonly flickEnabled?: boolean;
}

export function useTouchInput({
  onFlickUp,
  onFlickStart,
  onFlickEnd,
  onTap,
  flickEnabled = true,
}: TouchInput): FlickHandlers {
  const start = useRef<{ x: number; y: number } | null>(null);
  const flicking = useRef(false);

  return {
    onTouchStart: (event) => {
      const touch = event.touches[0];
      start.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
      flicking.current = false;
    },
    onTouchMove: (event) => {
      const from = start.current;
      const touch = event.touches[0];
      if (!from || !touch || flicking.current) {
        return;
      }

      const up = from.y - touch.clientY;
      const sideways = Math.abs(touch.clientX - from.x);
      if (flickEnabled && up >= FLICK_DISTANCE && up > sideways) {
        flicking.current = true;
        onFlickStart?.();
      }
    },
    onTouchCancel: () => {
      start.current = null;
      if (flicking.current) {
        flicking.current = false;
        onFlickEnd?.();
      }
    },
    onTouchEnd: (event) => {
      const from = start.current;
      start.current = null;
      const wasFlicking = flicking.current;
      flicking.current = false;
      if (wasFlicking) {
        onFlickEnd?.();
      }
      const touch = event.changedTouches[0];
      if (!from || !touch) {
        return;
      }

      // 🔴 **ここから先は必ず自分で決める。**`click` が来るかどうかに賭けない。
      event.preventDefault();

      const up = from.y - touch.clientY;
      const sideways = Math.abs(touch.clientX - from.x);
      // ⚠️ **縦が横を上回ることも見る。**斜めの動きを上フリックにすると、
      // 隣のキーへ滑らせただけで候補が立つ。
      if (flickEnabled && up >= FLICK_DISTANCE && up > sideways) {
        onFlickUp();
        return;
      }

      const box = event.currentTarget.getBoundingClientRect();
      const inside =
        touch.clientX >= box.left &&
        touch.clientX <= box.right &&
        touch.clientY >= box.top &&
        touch.clientY <= box.bottom;
      if (inside) {
        onTap();
      }
    },
  };
}
