#!/usr/bin/env node
/**
 * リリースノートを web の配信物へ変換する。
 *
 * 正本は `docs/release-notes/<version>.md`。形式は
 * [リリースノートの形式](../../docs/api/release-notes-format.md) にある。
 *
 *   docs/release-notes/0.1.0.md  →  packages/web/public/release-notes.json
 *
 * **`tools/docs-html` と同じ契約を守る。**
 *
 * | 性質 | 中身 |
 * |------|------|
 * | 決定性 | 同じ入力 → 常に同じ出力。**生成日時を埋め込まない** |
 * | 入力を変えない | `.md` は読むだけ |
 * | 副作用を出力先に限る | 出力する `.json` 以外を作らない・消さない |
 *
 * ⚠️ **ファイルの読み込み順に依存させない。** `readdir` の順は環境で変わりうるので、
 * 必ず版で並べ替えてから出す。ここを外すと出力が端末ごとに変わる。
 *
 * 🔴 **形式に合わない行があったら失敗する。** 契約なので緩めない。
 * 書き損じを配信物へ通すほうが害が大きい。
 */
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SOURCE = join(ROOT, "docs/release-notes");
const DESTINATION = join(ROOT, "packages/web/public/release-notes.json");

/** この形式の版。読む側はこれが違うものを読まない。 */
export const FORMAT_VERSION = 1;

/** 使える節はこの 3 つだけ。増やすときは契約の文書と閲覧機能の両方を直す。 */
const SECTIONS = new Set(["追加", "変更", "修正"]);

const VERSION_PATTERN = /^\d+\.\d+\.\d+$/;
const HEADING_PATTERN = /^# (\S+) \((\d{4}-\d{2}-\d{2})\)$/;

/**
 * 1 版ぶんの `.md` を読む。
 *
 * `fileVersion` はファイル名から取った版。見出しの版と食い違ったら失敗する。
 * **どちらか片方だけ直したときに気づけるようにするため**である。
 */
export function parseRelease(text, fileVersion) {
  const lines = text.split("\n");
  const errors = [];
  const sections = [];

  let heading = null;
  let current = null;

  lines.forEach((line, index) => {
    const at = `${fileVersion}.md:${index + 1}`;
    if (line.trim() === "") return;

    if (line.startsWith("# ")) {
      if (heading !== null) {
        errors.push(`${at}: 見出し(#)が 2 つある`);
        return;
      }
      const matched = HEADING_PATTERN.exec(line);
      if (matched === null) {
        errors.push(`${at}: 1 行目は "# <版> (<YYYY-MM-DD>)" の形にする`);
        return;
      }
      if (matched[1] !== fileVersion) {
        errors.push(`${at}: 見出しの版(${matched[1]})がファイル名(${fileVersion})と違う`);
        return;
      }
      heading = { version: matched[1], date: matched[2] };
      return;
    }

    if (line.startsWith("## ")) {
      const title = line.slice(3).trim();
      if (!SECTIONS.has(title)) {
        errors.push(`${at}: 使えない節「${title}」(${[...SECTIONS].join(" / ")} のどれか)`);
        return;
      }
      if (sections.some((section) => section.title === title)) {
        errors.push(`${at}: 節「${title}」が 2 つある`);
        return;
      }
      current = { title, items: [] };
      sections.push(current);
      return;
    }

    if (line.startsWith("- ")) {
      if (current === null) {
        errors.push(`${at}: 節(##)の外に項目がある`);
        return;
      }
      current.items.push(line.slice(2).trim());
      return;
    }

    errors.push(`${at}: 形式に合わない行がある`);
  });

  if (heading === null) {
    errors.push(`${fileVersion}.md: 見出し(#)が無い`);
  }
  for (const section of sections) {
    if (section.items.length === 0) {
      errors.push(`${fileVersion}.md: 節「${section.title}」が空である`);
    }
  }
  if (sections.length === 0) {
    errors.push(`${fileVersion}.md: 節(##)が 1 つも無い`);
  }

  if (errors.length > 0) return { errors };
  return { release: { ...heading, sections } };
}

/** 新しい版が先頭に来る順に並べ替える。**同じ入力なら常に同じ順**になること。 */
export function compareVersionsDescending(a, b) {
  const left = a.split(".").map(Number);
  const right = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    if (left[i] !== right[i]) return right[i] - left[i];
  }
  return 0;
}

/** 正本のディレクトリを読んで配信物の中身を作る。**書き出しはしない。** */
export async function buildReleaseNotes(source = SOURCE) {
  const entries = await readdir(source).catch(() => null);
  if (entries === null) {
    return { errors: [`リリースノートが見つからない: ${source}`] };
  }

  const versions = entries
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.slice(0, -".md".length));

  const errors = [];
  for (const version of versions) {
    if (!VERSION_PATTERN.test(version)) {
      errors.push(`${version}.md: ファイル名は "<数>.<数>.<数>.md" にする`);
    }
  }
  if (versions.length === 0) {
    errors.push(`リリースノートが 1 件も無い: ${source}`);
  }
  if (errors.length > 0) return { errors };

  const releases = [];
  for (const version of [...versions].sort(compareVersionsDescending)) {
    const text = await readFile(join(source, `${version}.md`), "utf8");
    const parsed = parseRelease(text, version);
    if (parsed.errors) {
      errors.push(...parsed.errors);
      continue;
    }
    releases.push(parsed.release);
  }
  if (errors.length > 0) return { errors };

  return { notes: { formatVersion: FORMAT_VERSION, releases } };
}

async function main() {
  const built = await buildReleaseNotes();
  if (built.errors) {
    process.stderr.write(`リリースノートの形式が違う\n`);
    for (const error of built.errors) {
      process.stderr.write(`  ${error}\n`);
    }
    return 1;
  }

  await mkdir(dirname(DESTINATION), { recursive: true });
  // 末尾の改行まで固定する。付けるか付けないかで差分が出るのを避ける。
  await writeFile(DESTINATION, `${JSON.stringify(built.notes, null, 2)}\n`, "utf8");

  const count = built.notes.releases.length;
  process.stdout.write(`リリースノートを配信物へ変換した(${count} 版)\n`);
  return 0;
}

// テストから読み込んだときは走らせない。
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
