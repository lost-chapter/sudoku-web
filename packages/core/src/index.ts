/**
 * 盤面ロジック。生成側(generator)と遊技側(web)の両方から使う。
 *
 * このパッケージは次の 3 つを守る。破ると生成側と遊技側でロジックが割れる。
 *
 * 1. DOM も Node の API も使わない(ブラウザでも Node でも同じコードが動く)
 * 2. 乱数を内部で作らない(シード付きの乱数を引数で受け取る)
 * 3. 副作用を持たない(ファイルを読まない・書かない)
 *
 * 詳細は docs/architecture/system-architecture.md の
 * 「`core` が守る 3 つの制約」を参照。
 *
 * 中身の実装は工程 2(担当 agent-b)。ここにあるのは骨組みだけである。
 */

/** 盤面の一辺のセル数。 */
export const BOARD_SIZE = 9;

/** 盤面のセル数。 */
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;
