/**
 * ` ```mermaid ` の図を、閲覧時に CDN の mermaid で描く。
 *
 * ## なぜ CDN なのか(2026-08-06 に方針が変わった)
 *
 * **ユーザーが CDN の使用を許可し、条件が「`file:` で見れること」になった。**
 * それまでは「オフラインで開ける」が条件だったため、mermaid 本体を使えず、
 * flowchart の部分集合を自前で SVG にしていた(`mermaid-flowchart.mjs`)。
 *
 * **条件が変わったので、本物の mermaid を使う。**
 * `subgraph` も sequence も gantt も、mermaid が描けるものはすべて描ける。
 *
 * | 案 | 出力への増分 | node_modules |
 * |----|------------|-------------|
 * | **閲覧時に CDN(これ)** | **0 バイト**(スクリプトのみ) | 0 |
 * | 3.4 MB の UMD を同梱 | 3.4 MB | 0 |
 * | npm 依存にして同梱 | 0 | +151 MB |
 *
 * ## 守っていること
 *
 * - 🔴 **版はパッチまで固定する。** `@11` にすると勝手に上がり、
 *   ある日図が変わる。**決定性の外側で内容が動くのを避ける**
 * - 🔴 **図のあるページにだけスクリプトを埋める。**
 *   図の無いページに読み込みを置く理由が無い
 * - 🔴 **読み込みに失敗したら記法をそのまま見せる。**
 *   ⚠️ **白紙になるより、記法が読めるほうがよい**
 * - **`startOnLoad` は使わず、明示的に `run()` を呼ぶ**(順序を自分で握る)
 *
 * ⚠️ **`file:` から `file:` の module import は落ちる**(origin が opaque)。
 * **CDN が `access-control-allow-origin: *` を返すので、CDN からは読める。**
 */

/** 🔴 パッチまで固定する。上げるときは 4 枚すべてを目で見てから。 */
export const MERMAID_VERSION = "11.16.1";

export const MERMAID_URL = `https://cdn.jsdelivr.net/npm/mermaid@${MERMAID_VERSION}/dist/mermaid.esm.min.mjs`;

/**
 * 図のあるページにだけ埋めるスクリプト。
 *
 * テーマの切替でも描き直せるよう、描画の関数を `window` へ置く
 * (`script.mjs` のテーマ切替から呼ぶ)。
 */
export const MERMAID_SCRIPT = `
(function () {
  var blocks = Array.prototype.slice.call(document.querySelectorAll("pre.mermaid"));
  if (blocks.length === 0) return;

  // 記法は先に控える。描画で中身が SVG へ置き換わるため。
  blocks.forEach(function (block) {
    block.setAttribute("data-source", block.textContent);
  });

  // 読み込めなかったときは、記法をそのまま見せる(白紙にしない)
  function showSource(reason) {
    blocks.forEach(function (block) {
      var note = document.createElement("p");
      note.className = "diagram-note";
      note.textContent = "図を描けなかった(" + reason + ")。記法をそのまま載せる。";

      var pre = document.createElement("pre");
      var code = document.createElement("code");
      code.textContent = block.getAttribute("data-source");
      pre.appendChild(code);

      var figure = block.parentNode;
      figure.replaceChild(pre, block);
      figure.insertBefore(note, pre);
      figure.className = "diagram-fallback";
    });
  }

  function isDark() {
    var chosen = document.documentElement.dataset.theme;
    if (chosen) return chosen === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  import("${MERMAID_URL}")
    .then(function (module) {
      var mermaid = module.default;

      window.docsDrawDiagrams = function () {
        blocks.forEach(function (block) {
          block.removeAttribute("data-processed");
          block.textContent = block.getAttribute("data-source");
        });
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          // 既定のテーマは紫が強い。文書の色(青と灰)に寄せる。
          theme: isDark() ? "dark" : "neutral",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Noto Sans JP', sans-serif",
          themeVariables: { fontSize: "14px" },
          // 既定の間隔は広く、縦に伸びる。本文の中に収まる密度へ詰める。
          flowchart: { nodeSpacing: 28, rankSpacing: 40, padding: 8, useMaxWidth: true },
        });
        mermaid.run({ nodes: blocks, suppressErrors: true });
      };

      window.docsDrawDiagrams();
    })
    .catch(function (error) {
      showSource("読み込みに失敗した。ネットワークが要る");
      if (window.console) console.warn("mermaid を読み込めなかった:", error);
    });
})();
`;
