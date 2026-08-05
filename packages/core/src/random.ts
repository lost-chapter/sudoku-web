/**
 * シード付きの疑似乱数。
 *
 * **`core` は乱数を内部で作らない**(docs/architecture/system-architecture.md)。
 * 生成の関数は乱数を**引数で受け取る**。この module が提供するのは
 * **シードから決まる関数を作る道具**であって、勝手に乱数を引くものではない。
 *
 *   ❌ core の中で Math.random() を呼ぶ   …… 同じシードから同じ問題が作れなくなる
 *   ✅ createRandom("easy-000") を呼び出し側が作って渡す
 *
 * **`Math.random()` をこの module でも使わない。** 使った時点で
 * [ADR 0003](docs/decisions/0003-external-puzzle-files.md) の
 * 「管理外のパックはシードから作り直せる」が壊れる。
 *
 * 実装は cyrb128(シードのハッシュ)+ sfc32(生成器)。どちらも 32 ビット整数演算
 * だけで書けるので、**ブラウザと Node で同じ値の列が出る**。
 */

/** 0 以上 1 未満の値を返す関数。呼ぶたびに状態が進む。 */
export type Random = () => number;

/** シードの文字列を 4 つの 32 ビット整数へ潰す(cyrb128)。 */
function hashSeed(seed: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let index = 0; index < seed.length; index += 1) {
    const code = seed.charCodeAt(index);
    h1 = h2 ^ Math.imul(h1 ^ code, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ code, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ code, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ code, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

/**
 * シードから乱数を作る。**同じシードからは常に同じ列が出る。**
 *
 * シードは文字列でも数値でもよい(数値は文字列にしてから潰す)。
 * パックのシード(`easy-000` など)をそのまま渡せるようにしてある
 * (docs/api/puzzle-file-format.md のマニフェスト)。
 */
export function createRandom(seed: string | number): Random {
  let [a, b, c, d] = hashSeed(String(seed));
  return function random(): number {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/** 0 以上 `upperExclusive` 未満の整数を返す。 */
export function randomInt(random: Random, upperExclusive: number): number {
  return Math.floor(random() * upperExclusive);
}

/**
 * 並びを入れ替えた新しい配列を返す(Fisher-Yates)。**入力は書き換えない。**
 *
 * 生成の「ランダムな順に試す」はすべてこれを通す。
 */
export function shuffled<T>(random: Random, values: readonly T[]): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = randomInt(random, index + 1);
    const swapped = result[index];
    result[index] = result[target];
    result[target] = swapped;
  }
  return result;
}
