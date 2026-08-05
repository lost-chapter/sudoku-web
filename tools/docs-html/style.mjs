/**
 * 出力する HTML に埋め込むスタイル。
 *
 * 外部フォントも CDN も参照しない(オフラインで開けること)。
 * 要件は .claude/skills/docs-markdown-to-html/SKILL.md の「出力 HTML の要件」。
 */
export const PAGE_STYLE = `:root {
  color-scheme: light dark;
  --bg: #ffffff;
  --fg: #1f2328;
  --muted: #59636e;
  --border: #d1d9e0;
  --surface: #f6f8fa;
  --link: #0969da;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0d1117;
    --fg: #e6edf3;
    --muted: #9198a1;
    --border: #3d444d;
    --surface: #161b22;
    --link: #4493f8;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP",
    "Yu Gothic", Meiryo, sans-serif;
  line-height: 1.9;
  font-size: 16px;
}
.page {
  max-width: 46em;
  margin: 0 auto;
  padding: 3rem 1.25rem 6rem;
  overflow-wrap: break-word;
}
h1, h2, h3, h4 { line-height: 1.5; margin: 2.4em 0 0.8em; }
h1 { font-size: 1.9rem; margin-top: 0; }
h2 { font-size: 1.45rem; padding-bottom: 0.3em; border-bottom: 1px solid var(--border); }
h3 { font-size: 1.15rem; }
h4 { font-size: 1rem; }
p, ul, ol, blockquote { margin: 1em 0; }
li { margin: 0.35em 0; }
a { color: var(--link); }
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.88em;
  background: var(--surface);
  border-radius: 4px;
  padding: 0.15em 0.35em;
}
pre {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.9rem 1rem;
  overflow-x: auto;
  line-height: 1.6;
}
pre code { background: none; padding: 0; font-size: 0.85em; }
blockquote {
  margin-inline: 0;
  padding: 0.1rem 1rem;
  border-left: 4px solid var(--border);
  color: var(--muted);
}
.table-scroll { overflow-x: auto; margin: 1.2em 0; }
table {
  border-collapse: collapse;
  width: 100%;
  font-size: 0.92em;
}
th, td { border: 1px solid var(--border); padding: 0.5em 0.7em; text-align: left; vertical-align: top; }
th { background: var(--surface); }
img { max-width: 100%; height: auto; }
hr { border: none; border-top: 1px solid var(--border); margin: 2.5em 0; }
.toc {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.8rem 1.2rem;
  margin-bottom: 2.5rem;
  font-size: 0.92em;
}
.toc-title { font-weight: 700; margin: 0.3em 0; }
.toc ul { list-style: none; padding-left: 0; margin: 0.4em 0; }
.toc li { margin: 0.2em 0; }
.toc-h3 { padding-left: 1.4em; }
@media print {
  :root { --bg: #ffffff; --fg: #000000; --surface: #ffffff; }
  .page { max-width: none; padding: 0; }
  .toc { display: none; }
  pre, table { break-inside: avoid; }
}
`;
