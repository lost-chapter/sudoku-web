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
 * **押せるものの下限**(WCAG 2.2 のターゲットサイズ 最小の推奨値)。
 *
 * ⚠️ **盤面のセルだけが例外である。**9 列あるので幅 375px では原理的に届かない
 * (docs/ui/screens-and-interactions.md の「押せる大きさ」)。
 * **それ以外は大きさを自由に取れるので、下げる理由が無い。**
 *
 * ⚠️ **入力パッドのキーはこれより大きい 48px。**
 * 「44 を守れる最小」ではなく「狭い端末で盤面の 24px を守れる最大」として決めた値で、
 * **由来が違うので同じ定数にしない**(`TouchPad.module.css` の `--pad-key-height`)。
 */
export const TOUCH_TARGET = 44;

export type Layout = "desktop" | "phone-portrait" | "phone-landscape";

/**
 * いま出すべきレイアウト。**回転と画面分割で自動的に切り替わる**
 * (メディアクエリの購読なので、幅や向きが変われば再判定される)。
 */
export function useLayout(): Layout {
  /*
   * ⚠️ **最初の描画から正しい側を出す**(`getInitialValueInEffect: false`)。
   *
   * 既定では初回だけ初期値を返し、効果が走ってから実際の値になる。
   * つまり **1 フレームだけ PC 版が見える**。SSR をしないので、
   * `matchMedia` を同期で読んでよい。
   *
   * **`index.html` に先読みのスクリプトを置く案は採らない。**条件式が
   * 2 か所になり、片方だけ直して食い違うのがこの手の仕組みで最も多い壊れ方である。
   */
  const options = { getInitialValueInEffect: false };
  const phone = useMediaQuery(PHONE_QUERY, false, options);
  const landscape = useMediaQuery(LANDSCAPE_QUERY, false, options);

  if (!phone) {
    return "desktop";
  }
  return landscape ? "phone-landscape" : "phone-portrait";
}
