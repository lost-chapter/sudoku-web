/**
 * 出力する HTML に埋め込むスタイル。
 *
 * 外部フォントも CDN も参照しない(オフラインで開けること)。
 * 要件は .claude/skills/docs-markdown-to-html/SKILL.md の「出力 HTML の要件」。
 *
 * 版面は 3 段。狭い画面では 1 段へ畳む。
 *   サイドメニュー | 本文 | 目次
 *
 * ## ⚠️ 色を足したら測る(2026-08-06 に 1 度差し戻された)
 *
 * **目視では分からない。** highlight.js の既定の灰色をそのまま使ったところ、
 * ライトのコメントが **4.27:1** で基準(4.5:1)を割っていた。
 * **和文の説明はコメントに書かれるので、いちばん読ませたい所が読みにくかった。**
 *
 * - **その文字が実際に乗る背景の上で測る。** コードは `--bg` ではなく
 *   `--surface` の上に乗る。**白の上で測ると足りて見える**
 * - **ライトとダークの両方で測る。**片方だけ直しても意味がない
 * - 測り方は [画面構成と操作仕様](../../docs/ui/screens-and-interactions.md) の
 *   「コントラストの測り方」に従う
 *
 * ## ⚠️ この見た目は自動では見張っていない
 *
 * **表の見出しの固定・図・色は、テストでは押さえられない。**
 * `pnpm docs:html` の出力を**実ブラウザで開いて確かめてから**変えること。
 * (`file:` ではなく、配信して開くほうが確実)
 */
export const PAGE_STYLE = `:root {
  color-scheme: light dark;
  --bg: #ffffff;
  --fg: #1f2328;
  --muted: #59636e;
  --border: #d1d9e0;
  --surface: #f6f8fa;
  --surface-2: #eaeef2;
  --link: #0969da;
  --accent: #0969da;
  --warn-bg: #fff8c5;
  --warn-border: #d4a72c;
  --ok-bg: rgba(46, 160, 67, 0.09);
  --ng-bg: rgba(207, 34, 46, 0.07);
  /* ⚠️ コードの色は --surface(#f6f8fa)の上に乗る。白の上で測ると足りて見える。
     highlight.js の既定の灰色 #6e7781 は白の上で 4.55 だが、この背景では 4.27 で失格。
     2026-08-06 に実測して差し替えた。 */
  --code-muted: #5f6873;
  --code-string: #0a3069;
  --code-keyword: #cf222e;
  --code-name: #6f42c1;
  --code-number: #0550ae;
  --code-meta: #953800;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0d1117;
    --fg: #e6edf3;
    --muted: #9198a1;
    --border: #3d444d;
    --surface: #161b22;
    --surface-2: #21262d;
    --link: #4493f8;
    --accent: #4493f8;
    --warn-bg: #272115;
    --warn-border: #bb8009;
    --ok-bg: rgba(63, 185, 80, 0.12);
    --ng-bg: rgba(248, 81, 73, 0.11);
    --code-muted: #8b949e;
    --code-string: #a5d6ff;
    --code-keyword: #ff7b72;
    --code-name: #d2a8ff;
    --code-number: #79c0ff;
    --code-meta: #ffa657;
  }
}
:root[data-theme="dark"] {
  --ok-bg: rgba(63, 185, 80, 0.12);
  --ng-bg: rgba(248, 81, 73, 0.11);
  --code-muted: #8b949e;
  --code-string: #a5d6ff;
  --code-keyword: #ff7b72;
  --code-name: #d2a8ff;
  --code-number: #79c0ff;
  --code-meta: #ffa657;
  --bg: #0d1117;
  --fg: #e6edf3;
  --muted: #9198a1;
  --border: #3d444d;
  --surface: #161b22;
  --surface-2: #21262d;
  --link: #4493f8;
  --accent: #4493f8;
  --warn-bg: #272115;
  --warn-border: #bb8009;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 4.5rem; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Noto Sans JP",
    "Yu Gothic", Meiryo, sans-serif;
  line-height: 1.9;
  font-size: 16px;
}

/* ---- 版面 ---- */
.layout {
  display: grid;
  grid-template-columns: 17rem minmax(0, 1fr) 18rem;
  gap: 2.5rem;
  max-width: 94rem;
  margin: 0 auto;
  padding: 0 1.5rem;
  align-items: start;
}
.page {
  min-width: 0;
  padding: 2.5rem 0 6rem;
  overflow-wrap: break-word;
}

/* ---- 上端のバー(狭い画面用) ---- */
.topbar {
  display: none;
  position: sticky;
  top: 0;
  z-index: 20;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}
.topbar strong { font-size: 0.95rem; }

/* ---- サイドメニュー ---- */
.sidebar {
  position: sticky;
  top: 0;
  max-height: 100vh;
  overflow-y: auto;
  padding: 2rem 0.5rem 3rem 0;
  font-size: 0.9rem;
  border-right: 1px solid var(--border);
}
.sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}
.sidebar-head a { font-weight: 700; text-decoration: none; color: var(--fg); }
#nav-filter {
  width: 100%;
  padding: 0.4rem 0.6rem;
  margin-bottom: 1rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: inherit;
  font: inherit;
  font-size: 0.85rem;
}
.nav-group { margin-bottom: 1.2rem; }
.nav-group > p {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--muted);
  text-transform: uppercase;
}
.nav-group ul { list-style: none; margin: 0; padding: 0; }
.nav-group li { margin: 0; }
.nav-group a {
  display: block;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  color: var(--fg);
  text-decoration: none;
  line-height: 1.5;
}
.nav-group a:hover { background: var(--surface-2); }
.nav-group a[aria-current="page"] {
  background: var(--surface-2);
  font-weight: 700;
  box-shadow: inset 3px 0 0 var(--accent);
}

/* ---- 目次(右) ---- */
.toc {
  position: sticky;
  top: 0;
  max-height: 100vh;
  overflow-y: auto;
  padding: 2.6rem 0 3rem;
  font-size: 0.8rem;
  border-left: 1px solid var(--border);
  padding-left: 1rem;
}
.toc-title {
  margin: 0 0 0.5rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--muted);
  text-transform: uppercase;
}
.toc ul { list-style: none; margin: 0; padding: 0; }
.toc li { margin: 0; }
/* 見出しは和文で長い。折り返す前提で、行間を詰めて項目の間を空ける。 */
.toc a {
  display: block;
  padding: 0.2rem 0 0.2rem 0.6rem;
  color: var(--muted);
  text-decoration: none;
  border-left: 2px solid transparent;
  line-height: 1.45;
}
.toc a:hover { color: var(--fg); }
.toc a.is-current { color: var(--accent); border-left-color: var(--accent); font-weight: 700; }
.toc-h3 { padding-left: 0.8rem; }

/* ---- 本文 ---- */
h1, h2, h3, h4 { line-height: 1.5; margin: 2.4em 0 0.8em; scroll-margin-top: 4.5rem; }
h1 { font-size: 1.9rem; margin-top: 0; }
h2 { font-size: 1.45rem; padding-bottom: 0.3em; border-bottom: 1px solid var(--border); }
h3 { font-size: 1.15rem; }
h4 { font-size: 1rem; }
.anchor {
  margin-left: 0.4em;
  color: var(--muted);
  text-decoration: none;
  opacity: 0;
  font-weight: 400;
  font-size: 0.8em;
}
h1:hover .anchor, h2:hover .anchor, h3:hover .anchor, h4:hover .anchor { opacity: 1; }
p, ul, ol, blockquote { margin: 1em 0; }
li { margin: 0.35em 0; }
a { color: var(--link); }
.external::after { content: "\\2197"; font-size: 0.8em; margin-left: 0.15em; }
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.88em;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.1em 0.35em;
}
pre {
  position: relative;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.9rem 1rem;
  overflow-x: auto;
  line-height: 1.6;
}
pre code { background: none; border: none; padding: 0; font-size: 0.85em; }
.copy {
  position: absolute;
  top: 0.4rem;
  right: 0.4rem;
  padding: 0.15rem 0.5rem;
  font: inherit;
  font-size: 0.72rem;
  color: var(--muted);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 5px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.1s;
}
pre:hover .copy, .copy:focus { opacity: 1; }
blockquote {
  margin-inline: 0;
  padding: 0.1rem 1rem;
  background: var(--warn-bg);
  border-left: 4px solid var(--warn-border);
  border-radius: 0 6px 6px 0;
}
/* ⚠️ で始まる段落は注意書き。引用と同じ見た目にして、読み手の語彙を増やさない。 */
p.warn {
  padding: 0.7rem 1rem;
  background: var(--warn-bg);
  border-left: 4px solid var(--warn-border);
  border-radius: 0 6px 6px 0;
}

/* ---- 図(閲覧時に CDN の mermaid が描く。理由は mermaid-cdn.mjs) ---- */
.diagram-figure {
  margin: 1.6em 0;
  padding: 1rem 0.5rem;
  text-align: center;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow-x: auto;
}
/* 描き終わるまでは記法が見えている。等幅で左寄せにしておく。 */
pre.mermaid {
  margin: 0;
  background: none;
  border: none;
  text-align: left;
  color: var(--muted);
}
pre.mermaid svg { max-width: 100%; height: auto; }
/* 読み込めなかったとき(ネットワークが無いとき)は記法をそのまま出す */
.diagram-fallback { margin: 1.6em 0; }
.diagram-note { margin: 0 0 0.4em; font-size: 0.85rem; color: var(--muted); }

/* ---- コードの色(highlight.js のクラス名に対応する) ---- */
.hljs-comment, .hljs-quote { color: var(--code-muted); font-style: italic; }
.hljs-string, .hljs-attr, .hljs-attribute { color: var(--code-string); }
.hljs-keyword, .hljs-literal, .hljs-type { color: var(--code-keyword); }
.hljs-built_in, .hljs-title, .hljs-title.function_ { color: var(--code-name); }
.hljs-number, .hljs-variable, .hljs-template-variable { color: var(--code-number); }
.hljs-meta, .hljs-symbol, .hljs-regexp { color: var(--code-meta); }
/* 表は横に溢れたら表だけがスクロールする(ページ全体は横スクロールさせない)。
   ⚠️ overflow-x を付けると縦もスクロールコンテナになるため、th の sticky は
   ページのスクロールでは効かない。画面より高い表だけ器の高さを止め、
   その中で見出し行を固定する(is-tall は script.mjs が付ける)。
   ⚠️ この挙動は自動では見張っていない。変えたら実ブラウザで、
   長い表(guides/handover.html)を器の中でスクロールして確かめること。 */
.table-scroll {
  overflow-x: auto;
  margin: 1.2em 0;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.table-scroll.is-tall { max-height: 78vh; overflow-y: auto; }
table { border-collapse: collapse; width: 100%; font-size: 0.92em; }
th, td { border-bottom: 1px solid var(--border); padding: 0.55em 0.8em; text-align: left; vertical-align: top; }
th + th, td + td { border-left: 1px solid var(--border); }
tr:last-child td { border-bottom: none; }
th { background: var(--surface); position: sticky; top: 0; z-index: 1; }
.is-tall th { box-shadow: 0 1px 0 var(--border); }
/* ✅ / ❌ で始まるセルは淡く色を敷く。⚠️ 濃くすると表が信号機になって読めない。 */
td.cell-ok { background: var(--ok-bg); }
td.cell-ng { background: var(--ng-bg); }
tbody tr:hover { background: var(--surface); }
img { max-width: 100%; height: auto; }
hr { border: none; border-top: 1px solid var(--border); margin: 2.5em 0; }

/* ---- 前後のページ ---- */
.pager {
  display: flex;
  gap: 1rem;
  justify-content: space-between;
  margin-top: 4rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
  font-size: 0.9rem;
}
.pager a {
  flex: 1;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  text-decoration: none;
  color: var(--fg);
}
.pager a:hover { background: var(--surface); }
.pager span { display: block; font-size: 0.72rem; color: var(--muted); }
.pager .next { text-align: right; }

.icon-button {
  padding: 0.25rem 0.5rem;
  font: inherit;
  font-size: 0.9rem;
  color: var(--muted);
  background: none;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
}
.icon-button:hover { background: var(--surface-2); }

/* ---- 狭い画面 ---- */
/* ⚠️ 3 段のまま窓を狭めると、両脇(17rem + 18rem)は変わらず本文だけが痩せる。
   1150px では本文欄が 444px しか残らず、表も図も縮んでいた(2026-08-06 実測)。
   目次を早めに畳んで本文へ幅を返す。1250px で畳むと本文は 790px になる。 */
@media (max-width: 1250px) {
  .layout { grid-template-columns: 16rem minmax(0, 1fr); }
  .toc { display: none; }
}
@media (max-width: 820px) {
  .topbar { display: flex; }
  .layout { grid-template-columns: minmax(0, 1fr); gap: 0; padding: 0 1rem; }
  .sidebar {
    position: static;
    max-height: none;
    border-right: none;
    border-bottom: 1px solid var(--border);
    padding: 1rem 0;
  }
  .sidebar[hidden] { display: none; }
  .page { padding-top: 1.5rem; }
}

/* ---- 印刷 ---- */
@media print {
  :root { --bg: #ffffff; --fg: #000000; --surface: #ffffff; --warn-bg: #ffffff; }
  .sidebar, .toc, .topbar, .pager, .copy, .anchor { display: none !important; }
  .layout { display: block; max-width: none; padding: 0; }
  pre, .table-scroll, .diagram-figure { break-inside: avoid; }
  /* 紙には器のスクロールが無い。高さを止めると表が途中で切れる。 */
  .table-scroll.is-tall { max-height: none; overflow: visible; }
}
`;
