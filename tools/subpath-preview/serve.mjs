#!/usr/bin/env node
/**
 * 本番ビルドを**サブパスの下**で配って、GitHub Pages の置かれ方を手元で再現する。
 *
 * 🔴 **なぜ要るか。** Pages は `https://<org>.github.io/<repo>/` に置かれる。
 * `vite.config.ts` の `base` は **HTML が参照する資産(JS / CSS)しか直さない**。
 * **アプリの中で組み立てている URL は直らない**ので、
 * 手元(`/`)では動くのにサイトでは 404、という壊れ方をする。
 *
 * ⚠️ **`pnpm preview` では見つからない。** あれはルートで配るので、
 * 絶対パスの `fetch` がそのまま当たってしまう。
 *
 * 2026-08-06 の実測: これを使って `/puzzles/manifest.json` の 404 を見つけた
 * (画面には「遊べる問題が見つかりません」と出て、1 問も遊べなかった)。
 *
 * 使い方:
 *
 *   BASE_PATH=/sudoku-web/ pnpm --filter @sudoku/web build
 *   node tools/subpath-preview/serve.mjs
 *   # → http://localhost:4321/sudoku-web/ を開く
 *
 * **止めると、サブパスの外へ出た要求の一覧を出す。** ここに何か並んでいたら、
 * それが本番で 404 になるものである。
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DIST = join(ROOT, "packages/web/dist");

const PREFIX = (process.env.BASE_PATH ?? "/sudoku-web/").replace(/\/$/, "");
const PORT = Number(process.env.PORT ?? 4321);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
};

/** サブパスの外へ出た要求。**これが本番で 404 になるもの。** */
const escaped = new Set();

/**
 * **本番でも 404 になるが、直しようが無いもの。**
 *
 * ⚠️ **ブラウザがドメイン直下へ勝手に取りに行く。**アプリのコードには出てこないので、
 * `import.meta.env.BASE_URL` を検索しても見つからない。
 *
 * `/favicon.ico` は `<user>.github.io/favicon.ico` を指す —— **配信先の外**である。
 * `public/` へ置いても `/sudoku-web/favicon.ico` になるので当たらない
 * (2026-08-06 に実際に ICO を作って確かめた)。
 * **実害は無い。**タブのアイコンは `index.html` の `link` が指す SVG が使われる。
 *
 * 🎯 **黙って除外しない。** 一覧に必ず出るものがあると、
 * **人は一覧そのものを見なくなり、本物の 1 件を見落とす。**
 * **「直せるもの」と「直せないもの」に分けて、両方出す。**
 */
const UNAVOIDABLE = new Set(["/favicon.ico"]);

const server = createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? "/", "http://localhost");

  if (pathname !== PREFIX && !pathname.startsWith(`${PREFIX}/`)) {
    escaped.add(pathname);
    process.stderr.write(`外へ出た: ${pathname}\n`);
    response.writeHead(404).end("サブパスの外");
    return;
  }

  const relative = pathname.slice(PREFIX.length) || "/";
  const file = join(DIST, relative === "/" ? "/index.html" : relative);

  try {
    const body = await readFile(file);
    response.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    escaped.add(pathname);
    process.stderr.write(`無い: ${pathname}\n`);
    response.writeHead(404).end("無い");
  }
});

function report() {
  const all = [...escaped].sort();
  const fixable = all.filter((path) => !UNAVOIDABLE.has(path));
  const known = all.filter((path) => UNAVOIDABLE.has(path));

  if (fixable.length === 0) {
    process.stdout.write("\n直せる 404 は無かった\n");
  } else {
    process.stdout.write(`\n🔴 本番で 404 になるものが ${fixable.length} 件ある\n`);
    for (const path of fixable) {
      process.stdout.write(`  ${path}\n`);
    }
  }

  if (known.length > 0) {
    process.stdout.write(`\n出たが直しようが無いもの(実害なし)\n`);
    for (const path of known) {
      process.stdout.write(`  ${path}\n`);
    }
  }

  process.exit(fixable.length === 0 ? 0 : 1);
}

process.on("SIGINT", report);
process.on("SIGTERM", report);

server.listen(PORT, () => {
  process.stdout.write(`http://localhost:${PORT}${PREFIX}/ で配っている(Ctrl-C で結果)\n`);
});
