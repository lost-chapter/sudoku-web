import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { MERMAID_VERSION } from "./mermaid-cdn.mjs";
import { buildNav, extractTitle, toHref } from "./nav.mjs";
import { renderPage } from "./render.mjs";

const SAMPLE = [
  "# 見出し",
  "",
  "本文と[相対リンク](../guides/handover.md)と[入口](../README.md)と[外部](https://example.com/a.md)。",
  "",
  "## 節",
  "",
  "| 列 A | 列 B |",
  "|------|------|",
  "| 1    | 2    |",
  "",
  "## 節",
  "",
  "```ts",
  "const x = 1;",
  "```",
  "",
  "<script>alert(1)</script>",
  "",
].join("\n");

const NAV = [
  { label: "入口", items: [{ href: "index.html", title: "ドキュメント" }] },
  {
    label: "手順書",
    items: [
      { href: "guides/handover.html", title: "作業の引き継ぎ" },
      { href: "guides/local-setup.html", title: "ローカル環境の構築" },
    ],
  },
];

function render(overrides = {}) {
  return renderPage({
    markdown: SAMPLE,
    title: "見出し",
    nav: NAV,
    currentHref: "guides/handover.html",
    ...overrides,
  });
}

describe("renderPage", () => {
  it("同じ入力からは常に同じ出力になる(決定性)", () => {
    expect(render()).toBe(render());
  });

  it("日時や乱数を埋め込まない", () => {
    expect(render()).not.toMatch(/20\d{2}-\d{2}-\d{2}T/);
  });

  it("title に文書の見出しを使う", () => {
    expect(render()).toContain("<title>見出し | sudoku-web</title>");
  });

  it("相対リンクの .md を .html にし、README.md は index.html にする", () => {
    const html = render();
    expect(html).toContain('href="../guides/handover.html"');
    expect(html).toContain('href="../index.html"');
  });

  it("ディレクトリ参照はそのカテゴリの先頭ページへ繋ぐ", () => {
    const html = render({
      markdown: "# 題\n\n[手順書](../guides/)と[検証](verification/)。\n",
      dirIndex: { guides: "branch-strategy.html", verification: "testing-policy.html" },
    });
    expect(html).toContain('href="../guides/branch-strategy.html"');
    expect(html).toContain('href="verification/testing-policy.html"');
  });

  it("外部リンクは書き換えず、別タブで開く", () => {
    const html = render();
    expect(html).toContain('href="https://example.com/a.md"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });

  it("見出しに決定的な id を振り、重複したら連番を足す", () => {
    const html = render();
    expect(html).toContain('<h2 id="節">');
    expect(html).toContain('<h2 id="節-2">');
  });

  it("見出しへのアンカーを付ける", () => {
    expect(render()).toContain('<a class="anchor" href="#節"');
  });

  it("サイドメニューに全文書を出し、現在のページに印を付ける", () => {
    const html = render();
    expect(html).toContain('class="sidebar"');
    expect(html).toContain("ローカル環境の構築");
    expect(html).toContain('href="../guides/handover.html" aria-current="page"');
    // 階層の違うページへは相対パスで辿れる
    expect(html).toContain('href="../index.html">ドキュメント</a>');
  });

  it("前後のドキュメントへの導線を出す", () => {
    const html = render({
      prev: { href: "index.html", title: "ドキュメント" },
      next: { href: "guides/local-setup.html", title: "ローカル環境の構築" },
    });
    expect(html).toContain('class="pager"');
    expect(html).toContain('class="prev"');
    expect(html).toContain('class="next"');
  });

  it("見出しが 2 つ以上あればページ内の目次を出す", () => {
    expect(render()).toContain('<nav class="toc"');
    expect(render({ markdown: "# 題\n\n本文\n" })).not.toContain('<nav class="toc"');
  });

  it("目次には記法の記号を出さない", () => {
    const html = render({
      markdown: "# 題\n\n## 1. 技術構成 —— ✅ **決定**\n\n本文\n\n## `core` の制約\n\n本文\n",
    });
    expect(html).toContain('<a href="#1-技術構成---決定">1. 技術構成 —— ✅ 決定</a>');
    expect(html).toContain('<a href="#core-の制約">core の制約</a>');
  });

  it("表を横スクロールできる器で包む", () => {
    expect(render()).toContain('<div class="table-scroll">');
  });

  it("⚠️ で始まる段落を注意書きの箱にする", () => {
    const html = render({ markdown: "# 題\n\n本文\n\n⚠️ **触らない。**壊れる\n\n> 引用の中\n" });
    expect(html).toContain('<p class="warn">');
    // 引用は既に箱なので二重にしない
    expect(html).toContain("<blockquote>\n<p>引用の中</p>");
  });

  it("✅ / ❌ で始まる表のセルに印を付ける", () => {
    const html = render({
      markdown:
        "# 題\n\n| 項目 | 状態 |\n|---|---|\n| a | ✅ 完了 |\n| b | ❌ 未着手 |\n| c | 実測中 |\n",
    });
    expect(html).toContain('<td class="cell-ok">✅ 完了</td>');
    expect(html).toContain('<td class="cell-ng">❌ 未着手</td>');
    expect(html).toContain("<td>実測中</td>");
  });

  it("言語を指定したコードだけ色を付ける(ビルド時・クラス名のみ)", () => {
    const html = render({
      markdown: "# 題\n\n```bash\n# 数える\npnpm test\n```\n\n```\nsudoku-web/\n└── docs/\n```\n",
    });
    expect(html).toContain('<code class="hljs">');
    expect(html).toContain('<span class="hljs-comment"># 数える</span>');
    // 言語の指定が無いものは推測せず、素のまま出す(ASCII の図が色付くのを防ぐ)
    expect(html).toContain("<pre><code>sudoku-web/\n└── docs/\n</code></pre>");
  });

  it("mermaid の記法はそのまま置き、閲覧時に描かせる", () => {
    const html = render({
      markdown: '# 題\n\n```mermaid\nflowchart TD\n  A["作る"] -->|生成| B{"一意解か"}\n```\n',
    });
    expect(html).toContain('<figure class="diagram-figure"><pre class="mermaid">');
    // 記法はエスケープして置く(文書に書いたタグが実行されないこと)
    expect(html).toContain("A[&quot;作る&quot;] --&gt;|生成| B{&quot;一意解か&quot;}");
  });

  it("mermaid の版をパッチまで固定する", () => {
    const html = render({ markdown: "# 題\n\n```mermaid\nflowchart LR\n  A --> B\n```\n" });
    expect(html).toContain(`mermaid@${MERMAID_VERSION}/dist/mermaid.esm.min.mjs`);
    expect(MERMAID_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("図のあるページにだけ mermaid の読み込みを埋める", () => {
    const withDiagram = render({ markdown: "# 題\n\n```mermaid\nflowchart LR\n  A --> B\n```\n" });
    const withoutDiagram = render({ markdown: "# 題\n\n本文だけ\n" });
    expect(withDiagram).toContain("mermaid.esm.min.mjs");
    // CSS には .mermaid の指定が残るので、読み込み(import)の有無で見る
    expect(withoutDiagram).not.toContain("mermaid.esm.min.mjs");
    expect(withoutDiagram).not.toContain("import(");
  });

  it("読み込みに失敗したら記法を見せる道を持つ", () => {
    const html = render({ markdown: "# 題\n\n```mermaid\nflowchart LR\n  A --> B\n```\n" });
    // 白紙にせず、記法をそのまま出す(ネットワークが無いときのため)
    expect(html).toContain("diagram-fallback");
    expect(html).toContain(".catch(");
  });

  it("生の HTML はエスケープする", () => {
    expect(render()).not.toContain("<script>alert(1)</script>");
  });

  it("外部リソースを参照しない(オフラインで開ける)", () => {
    const html = render();
    expect(html).not.toMatch(/<link[^>]+href=/);
    expect(html).not.toMatch(/<script[^>]+src=/);
  });

  it("和文の約物で閉じた強調も強調になる", () => {
    // 素の CommonMark では「。」の直後の `**` が閉じにならず、記号がそのまま出る。
    const html = render({
      markdown: "# 題\n\n本文\n\n**完了(2026-08-05)。**5 クラスすべてを収録した。\n",
    });
    expect(html).toContain("<strong>完了(2026-08-05)。</strong>5 クラス");
    expect(html).not.toContain("**");
  });

  it("表の中の強調も同じように効く", () => {
    const html = render({
      markdown: "# 題\n\n| 担当 | 状態 |\n|---|---|\n| b | **完了。**次へ |\n",
    });
    expect(html).toContain("<td><strong>完了。</strong>次へ</td>");
  });

  it("全角空白は空白として扱う(強調を閉じない)", () => {
    const html = render({ markdown: "# 題\n\n本文\n\n**強調　**の後\n" });
    expect(html).toContain("<p>**強調　**の後</p>");
  });

  it("欧文の強調の扱いは変えない", () => {
    const html = render({ markdown: "# 題\n\n本文\n\nplain **bold** and a**b**c text\n" });
    expect(html).toContain("<strong>bold</strong>");
    // 単語の途中は `**` でも強調にしない(CommonMark どおり)
    expect(html).toContain("a<strong>b</strong>c");
  });

  it("入力の .md を書き換えない(副作用なし)", async () => {
    const path = fileURLToPath(new URL("./render.test.mjs", import.meta.url));
    const before = await stat(path);
    renderPage({ markdown: await readFile(path, "utf8"), title: "self" });
    expect((await stat(path)).mtimeMs).toBe(before.mtimeMs);
  });
});

describe("nav", () => {
  it("README.md は入口(index.html)にする", () => {
    expect(toHref("README.md")).toBe("index.html");
    expect(toHref("guides/handover.md")).toBe("guides/handover.html");
  });

  it("先頭の h1 を見出しにし、無ければ代替を使う", () => {
    expect(extractTitle("# 題\n\n本文", "x")).toBe("題");
    expect(extractTitle("本文だけ", "x")).toBe("x");
  });

  it("カテゴリの並びは固定で、未知のカテゴリは末尾へ出す", () => {
    const nav = buildNav([
      { href: "zzz/a.html", title: "未知", category: "zzz" },
      { href: "guides/a.html", title: "手順", category: "guides" },
      { href: "index.html", title: "入口", category: "" },
    ]);
    expect(nav.map((group) => group.label)).toEqual(["入口", "手順書", "zzz"]);
  });

  it("文書が無いカテゴリは出さない", () => {
    const nav = buildNav([{ href: "index.html", title: "入口", category: "" }]);
    expect(nav).toHaveLength(1);
  });
});
