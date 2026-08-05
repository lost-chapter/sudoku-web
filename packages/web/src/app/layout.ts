import { useMediaQuery } from "@mantine/hooks";

/**
 * どのレイアウトを出すかの判定。**条件式の正本はここ 1 か所。**
 *
 * ⚠️ **`navigator.userAgent` では分けない。**UA は偽装も変更もされ、
 * iPadOS は既定で Mac を名乗る。**UA で分けると構造的に外れる。**
 * 代わりに「いま触っている入力装置」と「いま使える大きさ」で見る。
 * どちらも偽装する動機が無く、外れても実害が小さい。
 *
 * ⚠️ **判定を間違えても壊れない。**どちらのレイアウトも単独で遊技が成立する。
 * スマホに PC 版が出れば縦に長い画面(いまと同じ)、PC にスマホ版が出れば
 * 大きなボタンが下に固定されるだけで、キーボードもそのまま効く。
 */

/**
 * 狭い画面向けのレイアウトを使うか。
 *
 * ⚠️ **高さも見る。**横向きのスマホは幅が 767 を超えることがある
 * (実測: iPhone X 級の横は 812×375)。幅だけで見ると PC 版へ落ちる。
 *
 * 500px の根拠: 実測した横向き 3 種の高さが 320〜375、縦向きは 568 以上。
 * **その間に線を引いただけで、キリのよさ以上の意味は無い。**
 */
export const PHONE_QUERY = "(pointer: coarse) and ((max-width: 767px) or (max-height: 500px))";

/** 横に並べるか(盤面を左・パッドを右)。仕様の「横画面では横に置く」。 */
export const LANDSCAPE_QUERY = "(orientation: landscape)";

/**
 * **1 画面に収めることを諦める高さ。**
 *
 * これを下回ると「スクロールしない」と「1 セル 24px 以上」が両立しない
 * (docs/ui/screens-and-interactions.md の「押せる大きさ」)。
 * **盤面が読めなければ遊べない**ので、24px を守ってスクロールを許す。
 *
 * 442 の根拠(計算): 盤面以外が 220px(ヘッダ 44 + 数字 2 行 96 + 隙間 8 +
 * 補助 1 行 48 + 余白 24)。1 セル 24px には盤面 222px が要る。
 */
export const MIN_ONE_SCREEN_HEIGHT = 442;

export type Layout = "desktop" | "phone-portrait" | "phone-landscape";

/**
 * いま出すべきレイアウト。**回転と画面分割で自動的に切り替わる**
 * (メディアクエリの購読なので、幅や向きが変われば再判定される)。
 */
export function useLayout(): Layout {
  // 判定が付く前は PC 版を出す。スマホでも遊べる形なので、外れても壊れない。
  const phone = useMediaQuery(PHONE_QUERY, false);
  const landscape = useMediaQuery(LANDSCAPE_QUERY, false);

  if (!phone) {
    return "desktop";
  }
  return landscape ? "phone-landscape" : "phone-portrait";
}
