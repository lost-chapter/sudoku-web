import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { renderMarkdown } from "./render.mjs";

const SAMPLE = [
  "# 見出し",
  "",
  "本文と[相対リンク](../guides/handover.md)と[外部リンク](https://example.com/a.md)。",
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

describe("renderMarkdown", () => {
  it("同じ入力からは常に同じ出力になる(決定性)", () => {
    expect(renderMarkdown(SAMPLE, "sample")).toBe(renderMarkdown(SAMPLE, "sample"));
  });

  it("日時や乱数を埋め込まない", () => {
    const html = renderMarkdown(SAMPLE, "sample");
    // 生成日時を入れると決定性が壊れる。年らしき 4 桁が出ていないことで見張る。
    expect(html).not.toMatch(/20\d{2}-\d{2}-\d{2}/);
  });

  it("先頭の h1 を title にする", () => {
    expect(renderMarkdown(SAMPLE, "sample")).toContain("<title>見出し</title>");
  });

  it("h1 が無ければファイル名を title にする", () => {
    expect(renderMarkdown("本文だけ\n", "fallback")).toContain("<title>fallback</title>");
  });

  it("相対リンクの .md だけを .html へ書き換える", () => {
    const html = renderMarkdown(SAMPLE, "sample");
    expect(html).toContain('href="../guides/handover.html"');
    expect(html).toContain('href="https://example.com/a.md"');
  });

  it("見出しに決定的な id を振り、重複したら連番を足す", () => {
    const html = renderMarkdown(SAMPLE, "sample");
    expect(html).toContain('<h2 id="節">');
    expect(html).toContain('<h2 id="節-2">');
  });

  it("見出しが 2 つ以上あれば目次を出す", () => {
    expect(renderMarkdown(SAMPLE, "sample")).toContain('<nav class="toc"');
    expect(renderMarkdown("# 題\n\n本文\n", "x")).not.toContain('<nav class="toc"');
  });

  it("表を横スクロールできる器で包む", () => {
    expect(renderMarkdown(SAMPLE, "sample")).toContain('<div class="table-scroll">');
  });

  it("生の HTML はエスケープする", () => {
    expect(renderMarkdown(SAMPLE, "sample")).not.toContain("<script>alert(1)</script>");
  });

  it("外部リソースを参照しない(オフラインで開ける)", () => {
    const html = renderMarkdown(SAMPLE, "sample");
    expect(html).not.toMatch(/<link[^>]+href=/);
    expect(html).not.toMatch(/<script[^>]+src=/);
  });

  it("入力の .md を書き換えない(副作用なし)", async () => {
    const path = fileURLToPath(new URL("./render.test.mjs", import.meta.url));
    const before = await stat(path);
    renderMarkdown(await readFile(path, "utf8"), "self");
    expect((await stat(path)).mtimeMs).toBe(before.mtimeMs);
  });
});
