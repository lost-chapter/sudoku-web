import { BOARD_SIZE } from "@sudoku/core";

import { Icon } from "../../ui/Icon";

import { NoteSwitch } from "./NoteSwitch";
import type { PadProps } from "./padProps";
import { useTouchInput } from "./useFlick";

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
  /**
   * 上へはじいてメモを使うか(設定で切れる。既定は入)。
   *
   * ⚠️ **切ったときは指の振り分けごと止める。**
   * **フリックの判定だけを止めると、タップの経路が `click` 任せに戻り、
   * 指が少し滑った範囲が無反応になる**(tap slop。{@link ./useFlick})。
   */
  readonly flickToNote?: boolean;
}

const DIGITS = Array.from({ length: BOARD_SIZE }, (_, index) => index + 1);

/**
 * 数字のキー。**タップで確定入力、上へはじくとメモ**(2026-08-06 の試作)。
 *
 * ⚠️ **部品に切り出したのはフリックのためである。**`map` の中では hook を呼べない。
 *
 * ⚠️ **読み上げの名前は「入力」のままにしてある。**
 * **フリックは読み上げでは使えない操作**なので、名前に混ぜると、
 * **その経路を持たない人へ届かない案内をすることになる。**
 * メモを入れる手段は「メモ」キー(モード)のほうが正本である。
 */
function DigitKey({
  digit,
  noteMode,
  disabled,
  onDigit,
  flickToNote,
}: { readonly digit: number; readonly flickToNote?: boolean } & Pick<
  PadProps,
  "noteMode" | "disabled" | "onDigit"
>) {
  // ⚠️ **指のときは `click` を使わない**(`useTouchInput` が `preventDefault` する)。
  // **マウスとキーボードは `onClick` のまま** —— そちらに `touchend` は来ない。
  const touch = useTouchInput({
    onFlickUp: () => onDigit(digit, true),
    onTap: () => onDigit(digit),
    flickEnabled: flickToNote,
  });

  return (
    <button
      type="button"
      className={classes.key}
      disabled={disabled}
      aria-label={noteMode ? `${digit} をメモする` : `${digit} を入力`}
      onClick={() => onDigit(digit)}
      {...touch}
    >
      {digit}
    </button>
  );
}

/**
 * 「消す」。**縦向きは数字の行、横向きは補助の行**と置き場所が変わるだけで中身は同じ。
 * ⚠️ **2 か所に同じものを書かない。**片方だけ直す形を作らないための部品である。
 */
function ClearKey({ disabled, onClear }: Pick<PadProps, "disabled" | "onClear">) {
  return (
    <button
      type="button"
      className={classes.key}
      aria-label="消す"
      disabled={disabled}
      onClick={onClear}
    >
      <Icon name="backspace" />
    </button>
  );
}

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
  flickToNote,
}: TouchPadProps) {
  return (
    <div className={classes.pad}>
      <div className={[classes.digits, landscape ? classes.digitsLandscape : ""].join(" ")}>
        {DIGITS.map((digit) => (
          <DigitKey
            key={digit}
            digit={digit}
            noteMode={noteMode}
            disabled={disabled}
            onDigit={onDigit}
            flickToNote={flickToNote}
          />
        ))}
        {/*
          縦向きは 5 列なので、数字 9 個 + 消す でちょうど 2 行に収まる。
          ⚠️ **横向きは 3 列。**ここに置くと 4 行目ができて高さが足りなくなるので、
          補助行へ回す(実測: 320px の高さに収まらなかった)。
        */}
        {!landscape && <ClearKey disabled={disabled} onClear={onClear} />}
      </div>

      <div className={landscape ? classes.utilityLandscape : classes.utility}>
        {landscape && <ClearKey disabled={disabled} onClear={onClear} />}
        {/*
          🔴 **メモはスイッチにする**(2026-08-06・発注者の要望)。
          **「メモ 切」は状態にも命令にも読めた。**状態を持つものは状態を表す形にする。
          ⚠️ **横向きは幅が無いので文字を落とす。**つまみの位置で状態は分かる。
        */}
        <NoteSwitch checked={noteMode} onChange={onToggleNoteMode} compact={landscape} />
        <button
          type="button"
          className={classes.key}
          aria-label="取り消し"
          disabled={!canUndo}
          onClick={onUndo}
        >
          <Icon name="undo" />
        </button>
        <button
          type="button"
          className={classes.key}
          aria-label="やり直し"
          disabled={!canRedo}
          onClick={onRedo}
        >
          <Icon name="redo" />
        </button>
      </div>
    </div>
  );
}
