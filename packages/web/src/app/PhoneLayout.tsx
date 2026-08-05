import type { ReactNode } from "react";

import classes from "./PhoneLayout.module.css";

/**
 * スマホ向けの骨組み。**中身は受け取るだけで、何も知らない。**
 *
 * ⚠️ **状態・キー操作・保存・完成判定は持たない。**それらは {@link ./Game} にある。
 * **振る舞いは 1 つ、見た目は 2 つ** —— レイアウトを分けてよいのは、
 * ここが「並べ方と寸法」しか持たないからである。
 *
 * 縦向き: ヘッダ → 盤面 → パッド(下端に固定)
 * 横向き: 盤面(左) → ヘッダ + パッド(右)
 */
export interface PhoneLayoutProps {
  readonly header: ReactNode;
  readonly board: ReactNode;
  readonly pad: ReactNode;
  readonly landscape?: boolean;
}

export function PhoneLayout({ header, board, pad, landscape }: PhoneLayoutProps) {
  if (landscape) {
    return (
      <div className={[classes.screen, classes.landscape].join(" ")}>
        <div className={classes.boardArea}>{board}</div>
        <div className={classes.pad}>
          <div className={classes.landscapeHeader}>{header}</div>
          {pad}
        </div>
      </div>
    );
  }

  return (
    <div className={classes.screen}>
      <div className={classes.header}>{header}</div>
      <div className={classes.boardArea}>{board}</div>
      <div className={classes.pad}>{pad}</div>
    </div>
  );
}
