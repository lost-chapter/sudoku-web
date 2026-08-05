#!/usr/bin/env node
/**
 * Markdown を人間が読みやすい HTML へ変換する。
 *
 * この変換は純粋関数として扱う。契約は
 * .claude/skills/docs-markdown-to-html/SKILL.md にある。
 *
 *   1. 決定性     同じ入力からは常に同じ出力(日時・乱数を埋め込まない)
 *   2. 入力不変   .md を書き換えない
 *   3. 副作用限定 出力する .html 以外を作らない・消さない
 *   4. 自己完結   CSS はインライン。外部 CDN を参照しない
 *
 * 使い方:
 *   node tools/docs-html/render.mjs <path...> [--out <dir>]
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import MarkdownIt from "markdown-it";

import { PAGE_STYLE } from "./style.mjs";

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

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * markdown-it のトークン列へ手を入れる。
 *
 * - 見出しに決定的な id を振る
 * - 相対リンクの .md を .html へ書き換える(外部リンクとアンカーは触らない)
 * - 表を横スクロールできる器で包む
 */
function transform(tokens) {
  const usedIds = new Map();
  const headings = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    if (token.type === "heading_open") {
      const inline = tokens[i + 1];
      const text = inline && inline.type === "inline" ? inline.content : "";
      const id = slugify(text, usedIds);
      token.attrSet("id", id);
      const level = Number(token.tag.slice(1));
      if (level === 2 || level === 3) {
        headings.push({ id, level, text });
      }
      continue;
    }

    if (token.type === "inline" && token.children) {
      for (const child of token.children) {
        if (child.type !== "link_open") continue;
        const href = child.attrGet("href");
        if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith("#")) continue;
        child.attrSet("href", href.replace(/\.md(?=$|[#?])/, ".html"));
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

  return `<nav class="toc" aria-label="目次">\n<p class="toc-title">目次</p>\n<ul>\n${items}\n</ul>\n</nav>\n`;
}

/**
 * Markdown の文字列を HTML の文字列にする。**この関数が純粋関数の本体である。**
 * ここで日時や乱数に触ってはいけない。
 */
export function renderMarkdown(markdown, fallbackTitle) {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false });

  // 表は横に溢れたら表だけがスクロールする。ページ全体を横スクロールさせない。
  md.renderer.rules.table_open = () => '<div class="table-scroll">\n<table>\n';
  md.renderer.rules.table_close = () => "</table>\n</div>\n";

  const tokens = md.parse(markdown, {});
  const headings = transform(tokens);

  const firstH1 = tokens.findIndex((t) => t.type === "heading_open" && t.tag === "h1");
  const title = firstH1 >= 0 && tokens[firstH1 + 1] ? tokens[firstH1 + 1].content : fallbackTitle;

  const body = md.renderer.render(tokens, md.options, {});

  return [
    "<!doctype html>",
    '<html lang="ja">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(title)}</title>`,
    `<style>\n${PAGE_STYLE}</style>`,
    "</head>",
    "<body>",
    '<main class="page">',
    renderToc(headings),
    body,
    "</main>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

async function collectMarkdownFiles(target) {
  const entries = await readdir(target, { withFileTypes: true }).catch(() => null);
  if (entries === null) {
    return extname(target) === ".md" ? [target] : [];
  }

  const found = [];
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const child = join(target, entry.name);
    found.push(...(await collectMarkdownFiles(child)));
  }
  return found;
}

function parseArgs(argv) {
  const inputs = [];
  let out = null;

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--out") {
      out = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    inputs.push(argv[i]);
  }

  return { inputs, out };
}

async function main(argv) {
  const { inputs, out } = parseArgs(argv);

  if (inputs.length === 0) {
    process.stderr.write("使い方: node tools/docs-html/render.mjs <path...> [--out <dir>]\n");
    return 1;
  }

  const files = [];
  for (const input of inputs) {
    files.push(...(await collectMarkdownFiles(input)));
  }

  if (files.length === 0) {
    process.stderr.write("変換対象の .md が見つからない\n");
    return 1;
  }

  for (const file of files) {
    const markdown = await readFile(file, "utf8");
    const fallbackTitle = file.split(sep).at(-1).replace(/\.md$/, "");
    const html = renderMarkdown(markdown, fallbackTitle);

    // --out を使うときもディレクトリ構造を保つ(文書間の相対リンクを壊さないため)
    const destination =
      out === null
        ? file.replace(/\.md$/, ".html")
        : resolve(out, relative(inputs[0], file).replace(/\.md$/, ".html"));

    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, html, "utf8");
  }

  process.stdout.write(`${files.length} 件を HTML へ変換した\n`);
  return 0;
}

// テストから import されたときに main を走らせない。
// (import しただけで変換が始まると「副作用は出力先だけ」の契約が壊れる)
const entry = process.argv[1] ? resolve(process.argv[1]) : "";
if (entry === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
