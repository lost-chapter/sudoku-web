/**
 * 入力パッドの呼び出し口。
 *
 * **PC 版({@link ../input/NumberPad}) とスマホ版({@link ./TouchPad})で共有する。**
 * 並べ方と大きさは別物だが、**何ができるかは同じ**でなければならない。
 * 型を 1 つにしておけば、片方だけに操作が増えたときに型で気づける。
 */
export interface PadProps {
  /**
   * 数字を入れる。
   *
   * `asNote` を渡すと**その 1 回だけメモになる**(モードは変わらない)。
   * スマホの上フリックがこれを使う(2026-08-06 に試作)。
   */
  readonly onDigit: (digit: number, asNote?: boolean) => void;
  readonly onClear: () => void;
  /** 選択中セルのメモだけを消す。確定入力は変えない。 */
  readonly onClearNotes: () => void;
  readonly onToggleNoteMode: () => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  /** メモモード中か。**押しっぱなしの状態なので `aria-pressed` で伝える。** */
  readonly noteMode: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** 手がかりのセルを選んでいるときは押しても何も起きないので、落としておく。 */
  readonly disabled?: boolean;
  /** メモが無いセル・手がかり・終了後は押しても何も起きないので、落としておく。 */
  readonly clearNotesDisabled?: boolean;
}

/** セル内クリアの説明を、PC 版とスマホ版で同じ読み上げにする。 */
export const CELL_NOTES_CLEAR_DESCRIPTION_ID = "cell-notes-clear-description";
