/**
 * ` ```mermaid ` の flowchart を、ビルド時に SVG へ変換する。
 *
 * **`.md` には本物の mermaid 記法を書く。** GitHub・VS Code・Obsidian は
 * mermaid をそのまま描くので、`.md` を直接読む人にも図が届く。
 * ここでやるのは「HTML で読むときに、同じ図を JS 無しで見せる」ことだけ。
 *
 * ## なぜ mermaid 本体を使わないか(2026-08-06 の実測)
 *
 * | 案 | 実測 | 判定 |
 * |----|------|------|
 * | mermaid をインラインで埋めてブラウザで描く | `mermaid.min.js` は 3.57 MB。1 ページ +3.4 MB | 却下 |
 * | ビルド時に chromium で mermaid を回す | 2 回流せば一致するが、**フォントを変えると出力が変わる**。CI に chromium 196 MB も要る | 却下 |
 * | dagre で配置して SVG を自前で書く(これ) | 図 1 枚 1〜2 KB。**文字幅を実測しないので端末に依存しない** | 採用 |
 *
 * ⚠️ **文字の幅は実フォントを測らず、固定表で見積もる。**
 * ここで実測に頼ると、フォントの入っていない環境で出力が変わり、
 * 「いつ・どの端末で流してもバイト単位で同じ」が壊れる。
 * **見た目の精度より決定性を採る。**
 *
 * ## 対応している記法
 *
 * - `flowchart` / `graph` の `TB` `TD` `BT` `LR` `RL`
 * - ノードの形: `A[四角]` `A(角丸)` `A((円))` `A{ひし形}` `A{{六角形}}`
 * - 矢印: `-->` `---` `-.->` `==>`、ラベル付き `-->|はい|`
 * - 連鎖: `A --> B --> C`
 * - 改行: ラベル内の `<br/>`
 *
 * **これ以外(`subgraph` / `class` / `click` / sequence など)は例外にする。**
 * 呼び出し側が元の記法をコードブロックとして出すので、変換全体は落ちない。
 */
import dagre from "@dagrejs/dagre";

/** 1 文字の幅(font-size に対する比)。全角は 1、半角は 0.55 とみなす。 */
const FULL_WIDTH = /[ᄀ-ᇿ⺀-〿぀-ヿ㐀-䶿一-鿿豈-﫿＀-｠￠-￦]/;
const FONT_SIZE = 14;
const LINE_HEIGHT = 20;

function measure(text) {
  let width = 0;
  for (const char of text) width += FULL_WIDTH.test(char) ? 1 : 0.55;
  return width * FONT_SIZE;
}

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** ラベルを行へ分ける(`<br/>` で改行できる)。 */
function toLines(label) {
  return label
    .split(/<br\s*\/?>/i)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

const SHAPES = [
  [/^\{\{([\s\S]*)\}\}$/, "hexagon"],
  [/^\(\(([\s\S]*)\)\)$/, "circle"],
  [/^\{([\s\S]*)\}$/, "diamond"],
  [/^\(([\s\S]*)\)$/, "round"],
  [/^\[([\s\S]*)\]$/, "rect"],
];

/** 矢印。`-->` `---` `-.->` `==>` と、続く `|ラベル|`。 */
const EDGE = /(-{2,3}>|-{3}|-\.-+>|={2,3}>)\s*(?:\|([^|]*)\|)?\s*/;

const UNSUPPORTED = /^(subgraph|end|click|style|classDef|class|linkStyle|direction)\b/;

function parseNode(raw, nodes) {
  const matched = /^([A-Za-z0-9_-]+)([\s\S]*)$/.exec(raw.trim());
  if (!matched) throw new Error(`ノードとして読めない: ${raw.trim()}`);

  const [, id, body] = matched;
  const declaration = body.trim();

  if (declaration) {
    const shape = SHAPES.find(([pattern]) => pattern.test(declaration));
    if (!shape) throw new Error(`ノードの形として読めない: ${raw.trim()}`);
    const label = shape[0]
      .exec(declaration)[1]
      .trim()
      .replace(/^"([\s\S]*)"$/, "$1");
    nodes.set(id, { id, label, shape: shape[1] });
  } else if (!nodes.has(id)) {
    nodes.set(id, { id, label: id, shape: "rect" });
  }

  return id;
}

/** mermaid の flowchart を読む。読めない記法は例外にする。 */
export function parseFlowchart(source) {
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("%%"));

  const header = /^(?:flowchart|graph)\s+(TB|TD|BT|LR|RL)$/.exec(lines[0] ?? "");
  if (!header) throw new Error("flowchart の宣言が無い");

  const nodes = new Map();
  const edges = [];

  for (const line of lines.slice(1)) {
    if (UNSUPPORTED.test(line)) throw new Error(`未対応の記法: ${line.split(/\s+/)[0]}`);

    let rest = line;
    let previous = null;

    while (rest.trim().length > 0) {
      const hit = EDGE.exec(rest);
      if (!hit) {
        parseNode(rest, nodes);
        break;
      }

      const left = rest.slice(0, hit.index).trim();
      if (!left && !previous) throw new Error(`矢印の左側が無い: ${line}`);
      const from = left ? parseNode(left, nodes) : previous;

      rest = rest.slice(hit.index + hit[0].length);
      const next = EDGE.exec(rest);
      const right = (next ? rest.slice(0, next.index) : rest).trim();
      if (!right) throw new Error(`矢印の右側が無い: ${line}`);

      const to = parseNode(right, nodes);
      edges.push({
        from,
        to,
        label: (hit[2] ?? "").trim(),
        dashed: hit[1].includes("."),
        thick: hit[1].includes("="),
        arrow: hit[1].endsWith(">"),
      });

      previous = to;
      rest = next ? rest.slice(next.index) : "";
    }
  }

  if (nodes.size === 0) throw new Error("ノードが 1 つも無い");
  return { rankdir: header[1] === "TD" ? "TB" : header[1], nodes: [...nodes.values()], edges };
}

/** ノードの大きさを、ラベルの見積もり幅から決める。 */
function sizeOf(node) {
  const lines = toLines(node.label);
  const text = Math.max(...lines.map(measure), 0);
  const height = lines.length * LINE_HEIGHT;

  switch (node.shape) {
    // ひし形と円は、文字が入る内接の箱が半分しかない
    case "diamond":
      return { width: Math.round(text * 2 + 24), height: Math.round(height * 2 + 20) };
    case "circle": {
      const size = Math.round(Math.max(text, height) * 1.6 + 20);
      return { width: size, height: size };
    }
    case "hexagon":
      return { width: Math.round(text + 52), height: Math.round(height + 20) };
    default:
      return { width: Math.round(text + 30), height: Math.round(height + 20) };
  }
}

function renderNodeShape(node) {
  const { x, y, width, height } = node;
  const left = (x - width / 2).toFixed(1);
  const top = (y - height / 2).toFixed(1);

  if (node.shape === "diamond" || node.shape === "hexagon") {
    const points =
      node.shape === "diamond"
        ? [
            [x, y - height / 2],
            [x + width / 2, y],
            [x, y + height / 2],
            [x - width / 2, y],
          ]
        : [
            [x - width / 2 + 14, y - height / 2],
            [x + width / 2 - 14, y - height / 2],
            [x + width / 2, y],
            [x + width / 2 - 14, y + height / 2],
            [x - width / 2 + 14, y + height / 2],
            [x - width / 2, y],
          ];
    return `<polygon class="dg-node" points="${points.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ")}"/>`;
  }

  if (node.shape === "circle") {
    return `<circle class="dg-node" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(width / 2).toFixed(1)}"/>`;
  }

  const radius = node.shape === "round" ? Math.min(height / 2, 18) : 6;
  return `<rect class="dg-node" x="${left}" y="${top}" width="${width}" height="${height}" rx="${radius}"/>`;
}

/**
 * 線の中点を求める。
 *
 * ⚠️ **dagre が返す矢印ラベルの座標は使わない。** dagre はラベルのぶんだけ
 * 場所を空けて返すので、線から離れた位置になる。線の上へ置くほうが読める。
 */
function midpoint(points) {
  const lengths = points.slice(1).map((point, index) => {
    const previous = points[index];
    return Math.hypot(point.x - previous.x, point.y - previous.y);
  });
  const half = lengths.reduce((sum, length) => sum + length, 0) / 2;

  let walked = 0;
  for (const [index, length] of lengths.entries()) {
    if (walked + length >= half) {
      const ratio = length === 0 ? 0 : (half - walked) / length;
      const from = points[index];
      const to = points[index + 1];
      return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio };
    }
    walked += length;
  }

  return points[points.length - 1];
}

/** 複数行のラベルを中央へ置く。 */
function renderLabel(text, x, y, className) {
  const lines = toLines(text);
  const first = y - ((lines.length - 1) * LINE_HEIGHT) / 2 + 5;

  return lines
    .map(
      (line, index) =>
        `<text class="${className}" x="${x.toFixed(1)}" y="${(first + index * LINE_HEIGHT).toFixed(1)}">${escapeXml(line)}</text>`,
    )
    .join("");
}

/**
 * mermaid の flowchart を SVG にする。**この関数は純粋関数である。**
 * 乱数も日時も使わず、同じ入力からは同じ文字列を返す。
 */
export function renderFlowchart(source, key = "d0") {
  const { rankdir, nodes, edges } = parseFlowchart(source);

  const graph = new dagre.graphlib.Graph({ multigraph: true });
  graph.setGraph({ rankdir, nodesep: 28, ranksep: 46, marginx: 12, marginy: 12 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) graph.setNode(node.id, { ...node, ...sizeOf(node) });
  for (const [index, edge] of edges.entries()) {
    const lines = toLines(edge.label);
    graph.setEdge(
      edge.from,
      edge.to,
      {
        ...edge,
        width: edge.label ? Math.round(Math.max(...lines.map(measure)) + 10) : 0,
        height: edge.label ? lines.length * LINE_HEIGHT : 0,
      },
      `e${index}`,
    );
  }

  dagre.layout(graph);
  const { width, height } = graph.graph();

  const parts = [];

  // 線を先に描く。ノードの下へ潜らせるため。
  for (const edgeKey of graph.edges()) {
    const edge = graph.edge(edgeKey);
    const path = edge.points
      .map(
        (point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
      )
      .join(" ");
    const classes = ["dg-edge", edge.dashed && "dg-dashed", edge.thick && "dg-thick"]
      .filter(Boolean)
      .join(" ");
    const marker = edge.arrow ? ` marker-end="url(#${key}-arrow)"` : "";
    parts.push(`<path class="${classes}" d="${path}"${marker}/>`);

    if (edge.label) {
      const center = midpoint(edge.points);
      parts.push(
        `<rect class="dg-edge-label-bg" x="${(center.x - edge.width / 2).toFixed(1)}" y="${(center.y - edge.height / 2).toFixed(1)}" width="${edge.width}" height="${edge.height}" rx="4"/>`,
        renderLabel(edge.label, center.x, center.y, "dg-edge-label"),
      );
    }
  }

  for (const id of graph.nodes()) {
    const node = graph.node(id);
    parts.push(renderNodeShape(node), renderLabel(node.label, node.x, node.y, "dg-label"));
  }

  return [
    `<svg class="diagram" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}"`,
    ' role="img" xmlns="http://www.w3.org/2000/svg">',
    `<defs><marker id="${key}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7"`,
    ' orient="auto-start-reverse"><path class="dg-arrow-head" d="M0 0 L10 5 L0 10 z"/></marker></defs>',
    parts.join(""),
    "</svg>",
  ].join("");
}
