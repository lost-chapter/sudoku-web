/**
 * 問題を大量生成する CLI。
 *
 * 出力は `puzzles/` のパックとマニフェスト(docs/api/puzzle-file-format.md)。
 *
 *     pnpm --filter @sudoku/generator generate --difficulty easy,normal --count 100
 *
 * ## 同じ指定からは同じファイルができる
 *
 * パックのシードは**パック名そのもの**(`easy-000` など)で、
 * 中身は試行番号から決まる(`generate-pack.ts`)。
 * **並列度を変えても中身は変わらない**ので、`--workers` は速さだけの指定である。
 *
 * ⚠️ **難易度クラスは狙って作れない。** 生成してから評価し、外れたら捨てる。
 * 実装していない手筋が要る問題は評価できないので捨てる
 * (いまはレベル 1〜4 まで。難問・最難関は作れない)。
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  DIFFICULTIES,
  TECHNIQUE_LEVEL,
  countTotals,
  decodePuzzleLine,
  encodeManifest,
  encodePack,
  tryParseManifest,
} from "@sudoku/core";
import type { Difficulty, Manifest, PackDescriptor } from "@sudoku/core";

import { generatePackLines } from "./pool.ts";

const HERE = dirname(fileURLToPath(import.meta.url));

/** 既定の出力先。リポジトリ直下の `puzzles/`。 */
const DEFAULT_OUT = join(HERE, "..", "..", "..", "puzzles");

/** 実装済みの手筋レベル。**手筋を足すと自動で増える。** */
const IMPLEMENTED_TECHNIQUE_LEVELS = [...new Set(Object.values(TECHNIQUE_LEVEL))].sort(
  (a, b) => a - b,
);

type Options = {
  readonly difficulties: readonly Difficulty[];
  readonly packs: number;
  readonly count: number;
  readonly workers: number;
  readonly out: string;
  readonly maxAttempts: number;
  readonly generatorVersion: string;
};

const HELP = `使い方: pnpm --filter @sudoku/generator generate [options]

  数独の問題を生成して puzzles/ のパックとマニフェストへ書き出す。

  --difficulty <list>   生成する難易度クラス(コンマ区切り)。既定 easy,normal,hard
  --packs <n>           1 クラスあたりのパック数。既定 1
  --count <n>           1 パックの問題数。既定 1000
  --workers <n>         ワーカー数。既定 CPU 数 - 1(最大 8)。1 で並列化しない
  --out <dir>           出力先。既定 リポジトリの puzzles/
  --max-attempts <n>    1 パックあたりの試行の上限。既定 count × 500
  --generator-version   マニフェストへ書く生成器のバージョン。既定 package.json の値
  -h, --help            この説明

  ⚠️ 難問(expert)と最難関(extreme)は、レベル 5 以降の手筋が未実装のため
     1 問も作れない。指定しても 0 問で終わる。
`;

function readGeneratorVersion(): string {
  try {
    const parsed: unknown = JSON.parse(readFileSync(join(HERE, "..", "package.json"), "utf8"));
    const version = (parsed as { version?: unknown }).version;
    return typeof version === "string" ? version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

function readNumber(argv: readonly string[], name: string, fallback: number): number {
  const position = argv.indexOf(name);
  if (position === -1) return fallback;
  const value = Number(argv[position + 1]);
  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`${name} には 1 以上の数を渡す`);
  }
  return Math.floor(value);
}

function readString(argv: readonly string[], name: string, fallback: string): string {
  const position = argv.indexOf(name);
  if (position === -1) return fallback;
  const value = argv[position + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${name} には値を渡す`);
  return value;
}

function parseOptions(argv: readonly string[]): Options {
  const difficulties = readString(argv, "--difficulty", "easy,normal,hard")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value !== "");

  for (const difficulty of difficulties) {
    if (!(DIFFICULTIES as readonly string[]).includes(difficulty)) {
      throw new Error(`知らない難易度クラス: ${difficulty}(${DIFFICULTIES.join(" / ")})`);
    }
  }

  const count = readNumber(argv, "--count", 1000);
  const defaultWorkers = Math.max(1, Math.min(availableParallelism() - 1, 8));
  return {
    difficulties: difficulties as Difficulty[],
    packs: readNumber(argv, "--packs", 1),
    count,
    workers: readNumber(argv, "--workers", defaultWorkers),
    out: readString(argv, "--out", DEFAULT_OUT),
    maxAttempts: readNumber(argv, "--max-attempts", count * 500),
    generatorVersion: readString(argv, "--generator-version", readGeneratorVersion()),
  };
}

/** `easy-000` のようなパック名。**これがそのままシードになる。** */
function packName(difficulty: Difficulty, index: number): string {
  return `${difficulty}-${String(index).padStart(3, "0")}`;
}

function log(message: string): void {
  process.stderr.write(`${message}\n`);
}

async function generateAll(options: Options): Promise<PackDescriptor[]> {
  const descriptors: PackDescriptor[] = [];

  for (const difficulty of options.difficulties) {
    for (let index = 0; index < options.packs; index += 1) {
      const seed = packName(difficulty, index);
      const startedAt = performance.now();

      const result = await generatePackLines({
        seed,
        difficulty,
        count: options.count,
        workers: options.workers,
        maxAttempts: options.maxAttempts,
      });

      const elapsed = performance.now() - startedAt;
      if (result.lines.length === 0) {
        log(
          `⚠️ ${seed}: 1 問も採用できなかった(試行 ${String(result.attempts)} 回)。` +
            "実装済みの手筋では作れないクラスの可能性がある",
        );
        continue;
      }
      if (!result.complete) {
        log(
          `⚠️ ${seed}: ${String(result.lines.length)}/${String(options.count)} 問で打ち切った` +
            `(試行 ${String(result.attempts)} 回が上限)`,
        );
      }

      // ⚠️ 採用した順(試行番号順)ではなく、**難易度クラスとスコアの昇順**で書く。
      // 並べ替えは encodePack が持っているので、ここで自前に並べない。
      const puzzles = result.lines.map(decodePuzzleLine).filter((puzzle) => puzzle !== null);
      if (puzzles.length !== result.lines.length) {
        throw new Error(`${seed}: 書き出す直前に読めない行ができた`);
      }
      const text = encodePack(puzzles);
      const relative = `packs/${seed}.txt`;
      const path = join(options.out, "packs", `${seed}.txt`);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, text, "utf8");

      const bytes = Buffer.byteLength(text, "utf8");
      descriptors.push({ path: relative, difficulty, count: puzzles.length, seed, bytes });

      const rate = ((result.lines.length / result.attempts) * 100).toFixed(1);
      log(
        `${seed}: ${String(result.lines.length)} 問 / 試行 ${String(result.attempts)} 回` +
          `(採用 ${rate}%)/ ${(elapsed / 1000).toFixed(1)} 秒 / ${String(bytes)} バイト`,
      );
    }
  }

  return descriptors;
}

/**
 * マニフェストを更新する。
 *
 * **今回作らなかったパックの記述は残す**(それぞれのシードを失わないため)。
 */
function updateManifest(options: Options, generated: readonly PackDescriptor[]): Manifest {
  const manifestPath = join(options.out, "manifest.json");
  let existing: readonly PackDescriptor[] = [];
  try {
    const parsed = tryParseManifest(readFileSync(manifestPath, "utf8"));
    if (parsed !== null) existing = parsed.packs;
  } catch {
    existing = [];
  }

  const generatedPaths = new Set(generated.map((pack) => pack.path));
  const packs = [...existing.filter((pack) => !generatedPaths.has(pack.path)), ...generated].sort(
    (a, b) => {
      const order = DIFFICULTIES.indexOf(a.difficulty) - DIFFICULTIES.indexOf(b.difficulty);
      return order !== 0 ? order : a.path.localeCompare(b.path);
    },
  );

  const manifest: Manifest = {
    formatVersion: 1,
    generatedWith: {
      generator: options.generatorVersion,
      techniques: IMPLEMENTED_TECHNIQUE_LEVELS,
    },
    packs,
    totals: countTotals(packs),
  };

  mkdirSync(options.out, { recursive: true });
  writeFileSync(manifestPath, encodeManifest(manifest), "utf8");
  return manifest;
}

async function main(argv: readonly string[]): Promise<number> {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(HELP);
    return 0;
  }

  let options: Options;
  try {
    options = parseOptions(argv);
  } catch (error) {
    log(`引数が正しくない: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  log(
    `生成: ${options.difficulties.join(" / ")} × ${String(options.packs)} パック × ` +
      `${String(options.count)} 問(ワーカー ${String(options.workers)})`,
  );

  const startedAt = performance.now();
  const generated = await generateAll(options);
  if (generated.length === 0) {
    log("パックを 1 つも作れなかった");
    return 1;
  }

  const manifest = updateManifest(options, generated);
  const elapsed = (performance.now() - startedAt) / 1000;
  const totalPuzzles = generated.reduce((total, pack) => total + pack.count, 0);
  const totalBytes = generated.reduce((total, pack) => total + pack.bytes, 0);

  log(
    `完了: ${String(generated.length)} パック / ${String(totalPuzzles)} 問 / ` +
      `${String(totalBytes)} バイト / ${elapsed.toFixed(1)} 秒`,
  );
  log(`収録: ${DIFFICULTIES.map((d) => `${d} ${String(manifest.totals[d])}`).join(" / ")}`);
  return 0;
}

process.exitCode = await main(process.argv.slice(2));
