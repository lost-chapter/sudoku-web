#!/usr/bin/env node
/**
 * 和文で閉じられない強調(`**`)を見つける。
 *
 * CommonMark は「直前が約物で、直後が空白でも約物でもない」`**` を**閉じとして認めない**。
 * `**完了。**次へ` と書くと強調が効かず、`**` がそのまま本文に出る。
 * 書き方の規則は docs/guides/documentation-guidelines.md にある。
 *
 *     pnpm docs:lint              # 既定の対象を検査
 *     node check-emphasis.mjs a.md b.md   # ファイルを指定
 *
 * ⚠️ **見つかったら終了コード 1 を返す。**CI から素直に使える。
 *
 * ⚠️ **検査するのは「閉じられるか」だけである。**
 * 強調の付け方が適切かは見ない。それは人が読んで決めること。
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import process from "node:process";

/** 既定の対象。⚠️ 生成物(`docs-html/`)と依存(`node_modules/`)は見ない。 */
const DEFAULT_GLOBS = [
  { dir: "docs", match: (name) => name.endsWith(".md") },
  { dir: ".claude/skills", match: (name) => name === "SKILL.md" },
];
const DEFAULT_FILES = ["AGENTS.md", "README.md"];

/**
 * 文字の種類。CommonMark の flanking 規則はこの 3 つで決まる。
 * ⚠️ 約物には記号(絵文字を含む)も入る。`⚠️` の直前で閉じられるのはそのため。
 */
function kindOf(ch) {
  if (ch === undefined || /\s/u.test(ch)) return "space";
  return /[\p{P}\p{S}]/u.test(ch) ? "punct" : "other";
}

/** その位置の `**` は閉じになれるか(right-flanking)。 */
function canClose(text, pos) {
  const before = kindOf(text[pos - 1]);
  const after = kindOf(text[pos + 2]);
  return before !== "space" && (before !== "punct" || after === "space" || after === "punct");
}

/**
 * コードスパンの範囲。ここにある `**` は本文ではない。
 *
 * ⚠️ **除外は必須である。**規則の文書が壊れた書き方を例示しているので、
 * 拾ってしまうと「直せない検査」になる。
 */
function codeSpans(text) {
  const spans = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] === "`") {
      let j = i + 1;
      while (j < text.length && text[j] === "`") j += 1;
      const fence = text.slice(i, j);
      const end = text.indexOf(fence, j);
      if (end === -1) {
        spans.push([i, text.length]);
        break;
      }
      spans.push([i, end + fence.length]);
      i = end + fence.length;
      continue;
    }
    i += 1;
  }
  return spans;
}

/**
 * 段落へ切り分ける。**行単位で見ない**のが要点。
 *
 * ⚠️ 強調は段落の中なら行をまたげる。行で切ると、
 * **2 行にまたがる正しい強調を「閉じていない」と誤検知する**(実際に踏んだ)。
 *
 * 逆に、**表の行と見出しは 1 行で 1 つの塊**である。まとめると、
 * 隣の行の `**` で閉じたことにしてしまい、**壊れているのに見逃す**。
 */
function paragraphs(lines) {
  const blocks = [];
  let current = [];
  let inFence = false;

  const flush = () => {
    if (current.length > 0) blocks.push(current);
    current = [];
  };

  lines.forEach((text, index) => {
    const lineno = index + 1;
    if (/^\s*(```|~~~)/.test(text)) {
      inFence = !inFence;
      flush();
      return;
    }
    if (inFence) return;
    if (text.trim() === "") {
      flush();
      return;
    }
    if (/^\s*\|/.test(text) || /^\s{0,3}#{1,6}\s/.test(text)) {
      flush();
      blocks.push([{ lineno, text }]);
      return;
    }
    current.push({ lineno, text });
  });
  flush();

  return blocks;
}

/** 1 つのファイルを検査する。 */
export function check(source) {
  const found = [];

  for (const block of paragraphs(source.split("\n"))) {
    // 行を改行でつなぐ。改行は空白なので、flanking の判定がそのまま正しくなる。
    const text = block.map((line) => line.text).join("\n");
    const spans = codeSpans(text);
    const inCode = (pos) => spans.some(([from, to]) => from <= pos && pos < to);

    let opened = false;
    for (let i = 0; i < text.length;) {
      if (text.startsWith("**", i) && !inCode(i)) {
        if (opened) {
          if (!canClose(text, i)) {
            // 何行目かは、その位置までの改行の数で分かる。
            const lineIndex = text.slice(0, i).split("\n").length - 1;
            found.push({ lineno: block[lineIndex].lineno, text: block[lineIndex].text.trim() });
          }
          opened = false;
        } else {
          opened = true;
        }
        i += 2;
        continue;
      }
      i += 1;
    }
  }

  return found;
}

function walk(dir, match, out) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, match, out);
    else if (match(name)) out.push(path);
  }
  return out;
}

function defaultTargets(root) {
  const files = [];
  for (const { dir, match } of DEFAULT_GLOBS) walk(join(root, dir), match, files);
  for (const name of DEFAULT_FILES) {
    const path = join(root, name);
    try {
      statSync(path);
      files.push(path);
    } catch {
      // 無ければ黙って飛ばす。
    }
  }
  return files.sort();
}

function main() {
  const root = process.cwd();
  const args = process.argv.slice(2);
  const targets = args.length > 0 ? args : defaultTargets(root);

  let total = 0;
  for (const path of targets) {
    for (const { lineno, text } of check(readFileSync(path, "utf8"))) {
      console.log(`${relative(root, path)}:${lineno}: ${text.slice(0, 100)}`);
      total += 1;
    }
  }

  if (total > 0) {
    console.log(`\n閉じられない強調: ${total} 件`);
    console.log("直し方は docs/guides/documentation-guidelines.md の「和文で強調を閉じるとき」。");
    return 1;
  }
  console.log(`閉じられない強調は無い(${targets.length} ファイル)。`);
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exit(main());
}
