/**
 * 入力パッドの呼び出し口。
 *
 * **PC 版({@link ../input/NumberPad}) とスマホ版({@link ./TouchPad})で共有する。**
 * 並べ方と大きさは別物だが、**何ができるかは同じ**でなければならない。
 * 型を 1 つにしておけば、片方だけに操作が増えたときに型で気づける。
 */
export interface PadProps {
  readonly onDigit: (digit: number) => void;
  readonly onClear: () => void;
  readonly onToggleNoteMode: () => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  /** メモモード中か。**押しっぱなしの状態なので `aria-pressed` で伝える。** */
  readonly noteMode: boolean;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  /** 手がかりのセルを選んでいるときは押しても何も起きないので、落としておく。 */
  readonly disabled?: boolean;
}
