#!/usr/bin/env node
/**
 * docs/ の Markdown を、人間が読みやすい HTML のサイトへ変換する。
 *
 * この変換は純粋関数として扱う。契約は
 * .claude/skills/docs-markdown-to-html/SKILL.md にある。
 *
 *   1. 決定性     同じ入力からは常に同じ出力(日時・乱数を埋め込まない)
 *   2. 入力不変   .md を書き換えない
 *   3. 副作用限定 出力ディレクトリ以外を作らない・消さない
 *   4. 自己完結   CSS と JS はインライン。外部 CDN を参照しない
 *
 * 「入力」は 1 ファイルではなく **docs/ のツリー全体**である。
 * サイドメニューが全文書の一覧を持つため、文書が 1 つ増えると全ページが変わる。
 *
 * 使い方:
 *   node tools/docs-html/render.mjs [--src docs] [--out docs-html]
 */
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, posix, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import MarkdownIt from "markdown-it";

import { applyCjkEmphasis } from "./cjk-emphasis.mjs";
import { highlight } from "./highlight.mjs";
import { renderFlowchart } from "./mermaid-flowchart.mjs";
import { buildNav, extractTitle, toHref } from "./nav.mjs";
import { PAGE_SCRIPT } from "./script.mjs";
import { PAGE_STYLE } from "./style.mjs";

const DEFAULT_SRC = "docs";
const DEFAULT_OUT = "docs-html";

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 見出しの id を見出しテキストから決定的に作る。重複したら連番を足す。 */
function slugify(text, used) {
  const base =
    text
      .toLowerCase()
      .replace(/[`*_~[\]()#!]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\p{Letter}\p{Number}-]/gu, "") || "section";

  const seen = used.get(base) ?? 0;
  used.set(base, seen + 1);
  return seen === 0 ? base : `${base}-${seen + 1}`;
}

/**
 * 見出しの表示用テキストを取り出す。
 *
 * ⚠️ **`inline.content` をそのまま使わない。** 記法の記号が入っており、
 * 目次に `**決定(2026-08-05)**` のように出てしまう。
 * 解析済みの子トークンから地の文とコードの中身だけを集める。
 */
function plainText(inline) {
  if (!inline || inline.type !== "inline" || !inline.children) return "";

  return inline.children
    .filter((child) => child.type === "text" || child.type === "code_inline")
    .map((child) => child.content)
    .join("")
    .trim();
}

/** インラインの本文がこの印で始まるか。強調(`⚠️ **…**`)の中でも拾う。 */
function startsWith(inline, mark) {
  return plainText(inline).startsWith(mark);
}

/**
 * 相対リンクを HTML 側の宛先へ書き換える。
 *
 * - `.md` → `.html`(`README.md` は入口なので `index.html`)
 * - `guides/` のようなディレクトリ参照 → そのカテゴリの先頭ページ。
 *   HTML にはディレクトリの索引が無いため、放っておくと行き止まりになる
 */
function rewriteHref(href, dirIndex) {
  const directory = /(?:^|\/)([^/]+)\/$/.exec(href);
  if (directory) {
    const first = dirIndex[directory[1]];
    if (first) return `${href}${first}`;
  }

  return href
    .replace(/(?:^|(?<=\/))README\.md(?=$|[#?])/, "index.html")
    .replace(/\.md(?=$|[#?])/, ".html");
}

/**
 * トークン列へ手を入れ、目次の材料を返す。
 *
 * - 見出しに決定的な id と、見出しへ戻れるアンカーを付ける
 * - 相対リンクの .md を .html へ書き換える(外部リンクとアンカーは触らない)
 * - 外部リンクは別タブで開き、印を付ける
 * - `⚠️` で始まる段落を注意書きの箱にする
 * - `✅` `❌` で始まる表のセルに印を付ける
 */
function transform(tokens, dirIndex) {
  const usedIds = new Map();
  const headings = [];
  let inQuote = 0;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (token.type === "blockquote_open") inQuote += 1;
    if (token.type === "blockquote_close") inQuote -= 1;

    // ⚠️ で始まる段落は注意書きとして扱う。docs は 78 か所でこの書き方をしており、
    // 地の文と同じ見た目では警告として立たない。
    // 引用の中は既に箱なので二重にしない。
    if (token.type === "paragraph_open" && inQuote === 0) {
      if (startsWith(tokens[i + 1], "⚠️")) token.attrJoin("class", "warn");
      continue;
    }

    // 表のセルの ✅ / ❌ は「終わったか」を一目で拾うための印。
    if (token.type === "td_open") {
      if (startsWith(tokens[i + 1], "✅")) token.attrJoin("class", "cell-ok");
      else if (startsWith(tokens[i + 1], "❌")) token.attrJoin("class", "cell-ng");
      continue;
    }

    if (token.type === "heading_open") {
      const inline = tokens[i + 1];
      const text = plainText(inline);
      const id = slugify(text, usedIds);
      token.attrSet("id", id);

      const level = Number(token.tag.slice(1));
      if (level === 2 || level === 3) headings.push({ id, level, text });

      if (inline && inline.type === "inline") {
        const anchor = new inline.constructor("html_inline", "", 0);
        anchor.content = ` <a class="anchor" href="#${id}" aria-label="この見出しへのリンク">#</a>`;
        inline.children.push(anchor);
      }
      continue;
    }

    if (token.type === "inline" && token.children) {
      for (const child of token.children) {
        if (child.type !== "link_open") continue;
        const href = child.attrGet("href");
        if (!href) continue;

        if (/^[a-z][a-z0-9+.-]*:/i.test(href)) {
          child.attrSet("target", "_blank");
          child.attrSet("rel", "noopener noreferrer");
          child.attrJoin("class", "external");
          continue;
        }
        if (href.startsWith("#")) continue;

        child.attrSet("href", rewriteHref(href, dirIndex));
      }
    }
  }

  return headings;
}

function renderToc(headings) {
  if (headings.length < 2) return "";

  const items = headings
    .map(
      ({ id, level, text }) =>
        `<li class="toc-h${level}"><a href="#${id}">${escapeHtml(text)}</a></li>`,
    )
    .join("\n");

  return `<nav class="toc" aria-label="このページの目次">\n<p class="toc-title">このページ</p>\n<ul>\n${items}\n</ul>\n</nav>`;
}

/** ページからの相対パスを組む(出力はサブディレクトリを持つため)。 */
function relativeHref(fromHref, toTarget) {
  const depth = fromHref.split("/").length - 1;
  return depth === 0 ? toTarget : `${"../".repeat(depth)}${toTarget}`;
}

function renderSidebar(nav, currentHref) {
  const groups = nav
    .map(({ label, items }) => {
      const links = items
        .map((item) => {
          const current = item.href === currentHref;
          const href = relativeHref(currentHref, item.href);
          const attrs = current ? ' aria-current="page"' : "";
          return `<li><a href="${href}"${attrs}>${escapeHtml(item.title)}</a></li>`;
        })
        .join("\n");
      return `<div class="nav-group">\n<p>${escapeHtml(label)}</p>\n<ul>\n${links}\n</ul>\n</div>`;
    })
    .join("\n");

  const home = relativeHref(currentHref, "index.html");

  return [
    '<nav class="sidebar" id="sidebar" aria-label="ドキュメント一覧">',
    '<div class="sidebar-head">',
    `<a href="${home}">sudoku-web ドキュメント</a>`,
    '<button type="button" class="icon-button" id="theme-toggle" aria-label="テーマを切り替える">◐</button>',
    "</div>",
    '<input type="search" id="nav-filter" placeholder="絞り込む" aria-label="ドキュメントを絞り込む">',
    groups,
    "</nav>",
  ].join("\n");
}

function renderPager(prev, next, currentHref) {
  if (!prev && !next) return "";

  const link = (page, kind, label) =>
    page
      ? `<a class="${kind}" href="${relativeHref(currentHref, page.href)}"><span>${label}</span>${escapeHtml(page.title)}</a>`
      : "<span></span>";

  return `<nav class="pager" aria-label="前後のドキュメント">\n${link(prev, "prev", "前")}\n${link(next, "next", "次")}\n</nav>`;
}

/**
 * 1 ページ分の HTML を組み立てる。**これが純粋関数の本体である。**
 * ここで日時や乱数に触ってはいけない。
 */
export function renderPage({
  markdown,
  title,
  nav = [],
  currentHref = "index.html",
  prev,
  next,
  dirIndex = {},
}) {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

  // 和文は「。**」のような閉じ方をすると強調が効かない(CommonMark の flanking 規則)。
  applyCjkEmphasis(md);

  // 表は横に溢れたら表だけがスクロールする。ページ全体を横スクロールさせない。
  md.renderer.rules.table_open = () => '<div class="table-scroll">\n<table>\n';
  md.renderer.rules.table_close = () => "</table>\n</div>\n";

  // コードの色付けと図の描画はここ(ビルド時)で終える。
  // 出力に載るのは SVG とクラス名だけで、ブラウザは何も実行しない。
  md.renderer.rules.fence = (tokens, index) => {
    const token = tokens[index];
    const language = token.info.trim().split(/\s+/)[0].toLowerCase();

    if (language === "mermaid") {
      try {
        // marker の id はページ内で重ならないように、トークンの位置から決める
        return `<figure class="diagram-figure">${renderFlowchart(token.content, `d${index}`)}</figure>\n`;
      } catch (error) {
        // ⚠️ 図が描けなくても変換全体は落とさない。記法をそのまま見せる。
        return [
          '<div class="diagram-fallback">',
          `<p>この図はまだ描けない(${escapeHtml(error.message)})。記法をそのまま載せる。</p>`,
          `<pre><code>${escapeHtml(token.content)}</code></pre>`,
          "</div>\n",
        ].join("");
      }
    }

    const colored = highlight(token.content, token.info);
    const attrs = colored ? ' class="hljs"' : "";
    return `<pre><code${attrs}>${colored ?? escapeHtml(token.content)}</code></pre>\n`;
  };

  const tokens = md.parse(markdown, {});
  const headings = transform(tokens, dirIndex);
  const body = md.renderer.render(tokens, md.options, {});

  return [
    "<!doctype html>",
    '<html lang="ja">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)} | sudoku-web</title>`,
    `<style>\n${PAGE_STYLE}</style>`,
    "</head>",
    "<body>",
    '<div class="topbar">',
    `<strong>${escapeHtml(title)}</strong>`,
    '<button type="button" class="icon-button" onclick="document.getElementById(\'sidebar\').hidden = !document.getElementById(\'sidebar\').hidden">☰ 目次</button>',
    "</div>",
    '<div class="layout">',
    renderSidebar(nav, currentHref),
    '<main class="page">',
    body,
    renderPager(prev, next, currentHref),
    "</main>",
    renderToc(headings),
    "</div>",
    `<script>${PAGE_SCRIPT}</script>`,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/** ディレクトリを再帰的に走査する。並びは決定的(名前順)。 */
async function walk(root, current = "") {
  const entries = await readdir(join(root, current), { withFileTypes: true });
  const files = [];

  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const child = current === "" ? entry.name : `${current}/${entry.name}`;
    if (entry.isDirectory()) files.push(...(await walk(root, child)));
    else files.push(child);
  }

  return files;
}

function parseArgs(argv) {
  let src = DEFAULT_SRC;
  let out = DEFAULT_OUT;

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--src" && argv[i + 1]) src = argv[(i += 1)];
    else if (argv[i] === "--out" && argv[i + 1]) out = argv[(i += 1)];
  }

  return { src, out };
}

async function main(argv) {
  const { src, out } = parseArgs(argv);

  const all = (await walk(src).catch(() => null)) ?? null;
  if (all === null) {
    process.stderr.write(`入力ディレクトリが読めない: ${src}\n`);
    return 1;
  }

  const markdownFiles = all.filter((file) => extname(file) === ".md");
  if (markdownFiles.length === 0) {
    process.stderr.write("変換対象の .md が見つからない\n");
    return 1;
  }

  // 先に全ページの見出しを読む。サイドメニューが一覧を持つため。
  const pages = [];
  for (const file of markdownFiles) {
    const markdown = await readFile(join(src, file), "utf8");
    pages.push({
      source: file,
      href: toHref(file),
      title: extractTitle(markdown, file.split("/").at(-1).replace(/\.md$/, "")),
      category: file.includes("/") ? file.split("/")[0] : "",
      markdown,
    });
  }

  const nav = buildNav(pages);
  const ordered = nav.flatMap((group) => group.items);

  // ディレクトリ参照(`guides/`)の宛先。HTML には索引が無いので先頭ページへ繋ぐ。
  const dirIndex = {};
  for (const page of ordered) {
    if (page.category && !dirIndex[page.category]) {
      dirIndex[page.category] = page.href.split("/").at(-1);
    }
  }

  for (let i = 0; i < ordered.length; i += 1) {
    const page = ordered[i];
    const html = renderPage({
      markdown: page.markdown,
      title: page.title,
      nav,
      currentHref: page.href,
      prev: ordered[i - 1],
      next: ordered[i + 1],
      dirIndex,
    });

    const destination = resolve(out, page.href);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, html, "utf8");
  }

  // 画像などの添付は構造を保って複製する(相対パスがそのまま効くように)
  const assets = all.filter((file) => extname(file) !== ".md");
  for (const asset of assets) {
    const destination = resolve(out, asset.split("/").join(sep));
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(join(src, asset), destination);
  }

  process.stdout.write(
    `${ordered.length} 件を ${posix.join(out, "index.html")} へ変換した(添付 ${assets.length} 件)\n`,
  );
  return 0;
}

// テストから import されたときに main を走らせない。
// (import しただけで変換が始まると「副作用は出力先だけ」の契約が壊れる)
const entry = process.argv[1] ? resolve(process.argv[1]) : "";
if (entry === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
