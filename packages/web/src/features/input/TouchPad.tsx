import { BOARD_SIZE } from "@sudoku/core";

import type { PadProps } from "./padProps";

import classes from "./TouchPad.module.css";

/**
 * スマホ向けの入力パッド。**画面下端に固定して置く。**
 *
 * 親指の付け根は本体の下隅付近に固定されるので、**下端に近いほど届きやすい**。
 * 遊技中に何度も押すもの(数字・消す・メモ・取り消し)をここへ集め、
 * 押してほしくないもの(設定・あきらめる)はヘッダへ置く
 * (docs/ui/screens-and-interactions.md)。
 *
 * ⚠️ **PC 版({@link ./NumberPad})と別の部品にしてある。**
 * 並べ方・大きさ・固定位置が別物で、1 つに条件分岐で押し込むと読めなくなる。
 * **ただし呼び出し口({@link PadProps})は共有**し、できることは同じにする。
 *
 * ⚠️ **素の `<button>` を使う。**キーボードでも同じように押せることが要件で、
 * PC 版と意味づけを揃えておかないと、レイアウトを分けた副作用で壊れる。
 */
export interface TouchPadProps extends PadProps {
  /** 横向きは幅に余裕があるので数字を 3 列に並べる。 */
  readonly landscape?: boolean;
}

const DIGITS = Array.from({ length: BOARD_SIZE }, (_, index) => index + 1);

export function TouchPad({
  onDigit,
  onClear,
  onToggleNoteMode,
  onUndo,
  onRedo,
  noteMode,
  canUndo,
  canRedo,
  disabled,
  landscape,
}: TouchPadProps) {
  return (
    <div className={classes.pad}>
      <div className={[classes.digits, landscape ? classes.digitsLandscape : ""].join(" ")}>
        {DIGITS.map((digit) => (
          <button
            key={digit}
            type="button"
            className={classes.key}
            disabled={disabled}
            aria-label={noteMode ? `${digit} をメモする` : `${digit} を入力`}
            onClick={() => onDigit(digit)}
          >
            {digit}
          </button>
        ))}
        {/* 縦向きでは数字 9 個 + 消す でちょうど 2 行(5 列)に収まる。 */}
        <button type="button" className={classes.key} disabled={disabled} onClick={onClear}>
          消す
        </button>
      </div>

      <div className={classes.utility}>
        <button
          type="button"
          className={[classes.key, noteMode ? classes.pressed : ""].join(" ")}
          aria-pressed={noteMode}
          onClick={onToggleNoteMode}
        >
          メモ{noteMode ? " 入" : " 切"}
        </button>
        <button type="button" className={classes.key} disabled={!canUndo} onClick={onUndo}>
          取り消し
        </button>
        <button type="button" className={classes.key} disabled={!canRedo} onClick={onRedo}>
          やり直し
        </button>
      </div>
    </div>
  );
}
