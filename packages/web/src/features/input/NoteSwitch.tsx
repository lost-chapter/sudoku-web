import { Icon } from "../../ui/Icon";

import classes from "./NoteSwitch.module.css";

/**
 * メモモードの切り替え。**ボタンではなくスイッチにする**(2026-08-06・発注者の要望)。
 *
 * 🔴 **「メモ 切」というボタンは、状態にも命令にも読める。**
 * 「いま切です」なのか「押すと切ります」なのかが**文字を足しても定まらない。**
 * ⇒ **状態を持つものは、状態を表す形にする。**
 *
 * ⚠️ **`<button role="switch">` にする。素の `<input type="checkbox">` にしない。**
 * ホットキーは `use-hotkeys` が `INPUT` へのフォーカス中は無視するので、
 * **入力欄にすると、そこにフォーカスがある間だけ数字キーが効かなくなる。**
 * **ボタンなら今までどおりキーボードで遊べる。**
 *
 * ⚠️ **PC 版とスマホ版で同じ部品を使う。**
 * **同じ迷いが両方で起きる**ので、片方だけ直すと食い違う。
 */
export interface NoteSwitchProps {
  readonly checked: boolean;
  readonly onChange: () => void;
  /** 幅の詰まったところ(スマホの横向き)では文字を落とす。 */
  readonly compact?: boolean;
}

export function NoteSwitch({ checked, onChange, compact }: NoteSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      // ⚠️ **名前は「メモ」だけ。**状態は `aria-checked` が持つので、
      // 名前へ「入 / 切」を混ぜると**読み上げで二重になる**。
      aria-label="メモ"
      className={[classes.switch, compact ? classes.compact : ""].join(" ")}
      onClick={onChange}
    >
      <Icon name="pencil" size={18} />
      {compact ? null : "メモ"}
      <span className={classes.track} aria-hidden="true">
        <span className={classes.thumb} />
      </span>
    </button>
  );
}
