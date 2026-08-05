import assert from "node:assert/strict";
import { test } from "node:test";

import { check } from "./check-emphasis.mjs";

/** 何行目が挙がったかだけを見る。本文の切り出し方はテストで固定しない。 */
const linesOf = (source) => check(source).map((found) => found.lineno);

test("約物で閉じた強調を見つける", () => {
  assert.deepEqual(linesOf("**完了。**次へ進む。\n"), [1]);
});

test("閉じの直後が空白なら正しい", () => {
  assert.deepEqual(linesOf("**完了。** 次へ進む。\n"), []);
});

test("閉じの直後が約物なら正しい", () => {
  assert.deepEqual(linesOf("**完了。**「次へ」を押す。\n"), []);
});

test("句点を強調の外へ出したものは正しい", () => {
  assert.deepEqual(linesOf("**完了**。次へ進む。\n"), []);
});

// ⚠️ ここが行単位をやめた理由。ADR 0005 の 1 か所を実際に誤検知していた。
// 行で切ると 2 行目の開きと閉じがずれ、正しい強調が「閉じていない」に見える。
test("2 行にまたがる正しい強調を誤検知しない", () => {
  const source = ["**これは 2 行にわたる強調で、", "正しく閉じている。** ⇒ **次も強調。**"].join(
    "\n",
  );
  assert.deepEqual(linesOf(`${source}\n`), []);
});

// ⚠️ 誤検知を消すだけでは足りない。段落にすると見逃しも消えることを固定する。
test("2 行にまたがる壊れた強調を見つける", () => {
  assert.deepEqual(linesOf("**これは 2 行にわたる強調で、\n閉じそこねている。**次の文。\n"), [2]);
});

test("段落が違えば対応させない", () => {
  // 空行を挟んだ別の段落の `**` で閉じたことにすると、壊れているのに見逃す。
  assert.deepEqual(linesOf("**開いたまま終わる段落。\n\n閉じそこねている。**次の文。\n"), []);
});

test("表の行は 1 行で 1 つの塊として見る", () => {
  const table = ["| a | b |", "| --- | --- |", "| **壊れている。**続き | **正しい**。 |"].join(
    "\n",
  );
  assert.deepEqual(linesOf(`${table}\n`), [3]);
});

test("見出しは次の行と繋げない", () => {
  assert.deepEqual(linesOf("## **見出し**\n\n**本文。**続き\n"), [3]);
});

// ⚠️ 規則の文書が壊れた書き方を例示している。拾うと「直せない検査」になる。
test("コードスパンの中は見ない", () => {
  assert.deepEqual(linesOf("`**完了。**次へ` は強調にならない。\n"), []);
});

test("コード塊の中は見ない", () => {
  assert.deepEqual(linesOf("```\n**完了。**次へ\n```\n"), []);
});

test("コードスパンの外にある壊れは見つける", () => {
  assert.deepEqual(linesOf("`code` の後に **完了。**続き\n"), [1]);
});

test("引用の中も見る", () => {
  assert.deepEqual(linesOf("> **完了。**次へ進む。\n"), [1]);
});

test("壊れていない文書からは 1 件も出ない", () => {
  const source = [
    "# 見出し",
    "",
    "**正しい強調**。次の文。",
    "",
    "- **項目**: 説明",
    "- ⚠️ **注意。** 空白で閉じている",
    "",
    "```js",
    "const a = 1; // **完了。**次へ",
    "```",
    "",
    "| 列 | 値 |",
    "|----|----|",
    "| **名前** | `**完了。**次へ` |",
  ].join("\n");
  assert.deepEqual(linesOf(`${source}\n`), []);
});
