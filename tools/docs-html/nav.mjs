/**
 * サイドメニューの並びを組み立てる。
 *
 * 並びは入力のファイル集合だけで決まる(決定性)。
 * カテゴリの順序はここに固定してある。docs/README.md の
 * 「カテゴリ一覧」と同じ並びに保つこと。
 */

/** カテゴリの表示名と並び順。docs/ 直下のディレクトリ名に対応する。 */
const CATEGORIES = [
  ["", "入口"],
  ["overview", "概要"],
  ["architecture", "アーキテクチャ"],
  ["algorithms", "アルゴリズム"],
  ["ui", "画面と操作"],
  ["api", "データ形式"],
  ["verification", "検証"],
  ["decisions", "設計判断"],
  ["guides", "手順書"],
  ["reference", "リファレンス"],
  ["reports", "レポート"],
];

/** docs/README.md は出力の入口にする(フォルダを開いてすぐ読めるように)。 */
export function toHref(relativePath) {
  const html = relativePath.replace(/\.md$/, ".html");
  return html === "README.html" ? "index.html" : html;
}

/** 文書の先頭の h1 を見出しとして取り出す。無ければファイル名。 */
export function extractTitle(markdown, fallback) {
  for (const line of markdown.split("\n")) {
    const matched = /^#\s+(.+?)\s*$/.exec(line);
    if (matched) return matched[1];
  }
  return fallback;
}

/**
 * ページの一覧をカテゴリ別にまとめる。
 *
 * @param pages {{ href: string, title: string, category: string }[]}
 */
export function buildNav(pages) {
  const known = new Set(CATEGORIES.map(([dir]) => dir));
  const groups = [];

  for (const [dir, label] of CATEGORIES) {
    const items = pages.filter((page) => page.category === dir);
    if (items.length > 0) groups.push({ label, items });
  }

  // 未知のカテゴリ(あとから足されたディレクトリ)も落とさず末尾へ出す
  const extras = [...new Set(pages.map((p) => p.category))].filter((dir) => !known.has(dir)).sort();

  for (const dir of extras) {
    groups.push({ label: dir, items: pages.filter((page) => page.category === dir) });
  }

  return groups;
}
