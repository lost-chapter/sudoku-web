#!/usr/bin/env node
/**
 * 問題パックを web の配信物へ写す。
 *
 * 正本は**リポジトリ直下の `puzzles/`**([ADR 0003](../../docs/decisions/0003-external-puzzle-files.md))。
 * 一方 Vite が静的ファイルとして配るのは `packages/web/public/` なので、
 * ビルドと開発サーバの前にここで写す。
 *
 *   puzzles/manifest.json      →  packages/web/public/puzzles/manifest.json
 *   puzzles/packs/*.txt        →  packages/web/public/puzzles/packs/*.txt
 *
 * **`puzzles/generated/` は写さない。** 大量生成した追加分は配信物に含めない
 * (マニフェストのシードから作り直せる)。
 *
 * 写し先は Git 管理外。**手で編集しないこと。**次の同期で消える。
 */
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = join(ROOT, "puzzles");
const DESTINATION = join(ROOT, "packages/web/public/puzzles");

/** 配信物に含めないもの(大量生成した追加分と、開発者向けの説明)。 */
const EXCLUDED = new Set(["generated", "README.md"]);

async function main() {
  const entries = await readdir(SOURCE, { withFileTypes: true }).catch(() => null);
  if (entries === null) {
    process.stderr.write(`問題パックが見つからない: ${SOURCE}\n`);
    return 1;
  }

  // 消してから写す。正本から消えたパックが配信物に残らないように。
  await rm(DESTINATION, { recursive: true, force: true });
  await mkdir(DESTINATION, { recursive: true });

  let copied = 0;
  for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
    if (entry.name.startsWith(".") || EXCLUDED.has(entry.name)) continue;
    await cp(join(SOURCE, entry.name), join(DESTINATION, entry.name), { recursive: true });
    copied += 1;
  }

  process.stdout.write(`問題パックを配信物へ写した(${copied} 件)\n`);
  return 0;
}

process.exitCode = await main();
