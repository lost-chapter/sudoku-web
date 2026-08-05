import { useRef, type TouchEvent } from "react";

/**
 * 上フリックを見分ける。**試作**(2026-08-06。採否は未定)。
 *
 * 数字キーを**上へはじくとメモ、そのまま離すと確定入力**にする。
 * メモモードの切り替えが要らなくなるのが狙いである
 * (docs/reports/2026-08-06-flick-input-survey.md)。
 *
 * ⚠️ **タップの経路は消さない。**上へ動かなければ今までどおり `onClick` が走る。
 * **フリックは追加の経路であって、置き換えではない。**
 *
 * ⚠️ **`touchend` で `preventDefault()` を呼んで `click` を止めている。**
 * これをしないと、**メモを立てたあとに確定入力まで入る。**
 * React は `touchend` を passive にしないので効く(`touchstart` は passive)。
 */

/**
 * 上フリックと認める縦の移動量(px)。
 *
 * ⚠️ **タップの手ぶれと区別が付く必要がある。**24px は WCAG 2.2 の
 * ターゲットサイズ(最小)と同じ値で、**1 つのキーの中で収まる動きは拾わない**。
 * 小さくすると押しただけでメモになり、大きくすると指が届かない。
 */
const FLICK_DISTANCE = 24;

export interface FlickHandlers {
  readonly onTouchStart: (event: TouchEvent<HTMLElement>) => void;
  readonly onTouchEnd: (event: TouchEvent<HTMLElement>) => void;
}

/**
 * @param onFlickUp 上へはじかれたときに呼ぶ。**呼ばれたらタップは起きない。**
 */
export function useFlickUp(onFlickUp: () => void): FlickHandlers {
  const start = useRef<{ x: number; y: number } | null>(null);

  return {
    onTouchStart: (event) => {
      const touch = event.touches[0];
      start.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    },
    onTouchEnd: (event) => {
      const from = start.current;
      start.current = null;
      const touch = event.changedTouches[0];
      if (!from || !touch) {
        return;
      }

      const up = from.y - touch.clientY;
      const sideways = Math.abs(touch.clientX - from.x);
      // ⚠️ **縦が横を上回ることも見る。**斜めの動きを上フリックにすると、
      // 隣のキーへ滑らせただけで候補が立つ。
      if (up >= FLICK_DISTANCE && up > sideways) {
        event.preventDefault();
        onFlickUp();
      }
    },
  };
}
