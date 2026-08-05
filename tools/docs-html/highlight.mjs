/**
 * コードブロックに色を付ける。
 *
 * ⚠️ **色付けはビルド時に行い、出力にはクラス名だけを載せる。**
 * ブラウザでハイライタを走らせると、その分の JS を全ページへ埋めることになる。
 * 色は style.mjs の CSS が決める。
 *
 * ⚠️ **言語を推測しない。** highlight.js には自動判定があるが、
 * `docs/` のコードブロック 48 個のうち 33 個は**言語の指定が無い**
 * (ディレクトリツリー・ASCII の図・コマンドの出力)。
 * 推測させると図が色付いて、かえって読みにくくなる。
 * **明示された言語だけを色付ける。**
 */
import hljs from "highlight.js/lib/core";
import bash from "highlight.js/lib/languages/bash";
import javascript from "highlight.js/lib/languages/javascript";
import json from "highlight.js/lib/languages/json";
import typescript from "highlight.js/lib/languages/typescript";

hljs.registerLanguage("bash", bash);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("json", json);
hljs.registerLanguage("typescript", typescript);

/** ` ```bash ` のような指定を highlight.js の言語名へ対応づける。 */
const LANGUAGES = {
  bash: "bash",
  sh: "bash",
  shell: "bash",
  console: "bash",
  js: "javascript",
  javascript: "javascript",
  ts: "typescript",
  typescript: "typescript",
  json: "json",
  jsonc: "json",
};

/**
 * コードを色付けた HTML にする。言語が分からなければ null を返す
 * (呼び出し側がエスケープして素のまま出す)。
 */
export function highlight(code, info) {
  const name = info.trim().split(/\s+/)[0].toLowerCase();
  const language = LANGUAGES[name];
  if (!language) return null;

  return hljs.highlight(code, { language }).value;
}
