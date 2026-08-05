/**
 * リリースノートの変換の契約を固定する。
 *
 * ⚠️ **「通ったから正しい」と読まないこと。** ここで見ているのは
 * **形式に合わないものを落とすか**と**同じ入力から同じ出力が出るか**の 2 点である。
 * 中身が読みやすいかどうかは人が読んで決める。
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { buildReleaseNotes, compareVersionsDescending, parseRelease } from "./build.mjs";

const VALID = `# 0.1.0 (2026-08-06)

## 追加

- 数独で遊べるようになりました

## 修正

- 画面の向きを変えると遊技が消えることがあったのを直しました
`;

/** 一時ディレクトリに `.md` を並べる。**正本は触らない。** */
async function withSource(files) {
  const directory = await mkdtemp(join(tmpdir(), "release-notes-"));
  for (const [name, text] of Object.entries(files)) {
    await writeFile(join(directory, name), text, "utf8");
  }
  return directory;
}

test("見出しと節と項目を読む", () => {
  const { release, errors } = parseRelease(VALID, "0.1.0");
  assert.equal(errors, undefined);
  assert.equal(release.version, "0.1.0");
  assert.equal(release.date, "2026-08-06");
  assert.deepEqual(release.sections, [
    { title: "追加", items: ["数独で遊べるようになりました"] },
    { title: "修正", items: ["画面の向きを変えると遊技が消えることがあったのを直しました"] },
  ]);
});

test("節は正本に書いた順で出る", () => {
  const text = `# 0.2.0 (2026-08-07)

## 修正

- あ

## 追加

- い
`;
  const { release } = parseRelease(text, "0.2.0");
  assert.deepEqual(
    release.sections.map((section) => section.title),
    ["修正", "追加"],
  );
});

test("見出しの版がファイル名と違ったら落とす", () => {
  const { errors } = parseRelease("# 0.2.0 (2026-08-06)\n\n## 追加\n\n- あ\n", "0.1.0");
  assert.match(errors[0], /見出しの版\(0\.2\.0\)がファイル名\(0\.1\.0\)と違う/);
});

test("見出しが無かったら落とす", () => {
  const { errors } = parseRelease("## 追加\n\n- あ\n", "0.1.0");
  assert.match(errors.join("\n"), /見出し\(#\)が無い/);
});

test("知らない節は落とす", () => {
  const { errors } = parseRelease("# 0.1.0 (2026-08-06)\n\n## 廃止\n\n- あ\n", "0.1.0");
  assert.match(errors[0], /使えない節「廃止」/);
});

test("同じ節が 2 つあったら落とす", () => {
  const text = "# 0.1.0 (2026-08-06)\n\n## 追加\n\n- あ\n\n## 追加\n\n- い\n";
  const { errors } = parseRelease(text, "0.1.0");
  assert.match(errors[0], /節「追加」が 2 つある/);
});

test("空の節は落とす", () => {
  const { errors } = parseRelease("# 0.1.0 (2026-08-06)\n\n## 追加\n", "0.1.0");
  assert.match(errors.join("\n"), /節「追加」が空である/);
});

test("節の外に置いた項目は落とす", () => {
  const { errors } = parseRelease("# 0.1.0 (2026-08-06)\n\n- あ\n\n## 追加\n\n- い\n", "0.1.0");
  assert.match(errors[0], /節\(##\)の外に項目がある/);
});

test("形式に合わない行は落とす", () => {
  const text = "# 0.1.0 (2026-08-06)\n\n## 追加\n\n- あ\n\nこれは地の文である\n";
  const { errors } = parseRelease(text, "0.1.0");
  assert.match(errors[0], /形式に合わない行がある/);
});

test("日付の形が違ったら落とす", () => {
  const { errors } = parseRelease("# 0.1.0 (2026/08/06)\n\n## 追加\n\n- あ\n", "0.1.0");
  assert.match(errors[0], /1 行目は/);
});

test("新しい版が先頭に来る", () => {
  const versions = ["0.1.0", "1.0.0", "0.10.0", "0.2.3", "0.2.10"];
  assert.deepEqual([...versions].sort(compareVersionsDescending), [
    "1.0.0",
    "0.10.0",
    "0.2.10",
    "0.2.3",
    "0.1.0",
  ]);
});

test("ファイルの読み込み順が変わっても出力は変わらない", async () => {
  // ⚠️ readdir の順は環境で変わりうる。**版で並べ替えているか**を見る。
  const one = await withSource({
    "0.1.0.md": "# 0.1.0 (2026-08-06)\n\n## 追加\n\n- あ\n",
    "0.2.0.md": "# 0.2.0 (2026-08-07)\n\n## 追加\n\n- い\n",
  });
  const built = await buildReleaseNotes(one);
  assert.deepEqual(
    built.notes.releases.map((release) => release.version),
    ["0.2.0", "0.1.0"],
  );
});

test("2 回流しても同じものが出る", async () => {
  const directory = await withSource({ "0.1.0.md": VALID });
  const first = await buildReleaseNotes(directory);
  const second = await buildReleaseNotes(directory);
  assert.deepEqual(first, second);
});

test("入力の .md を書き換えない", async () => {
  const directory = await withSource({ "0.1.0.md": VALID });
  await buildReleaseNotes(directory);
  assert.equal(await readFile(join(directory, "0.1.0.md"), "utf8"), VALID);
  assert.deepEqual(await readdir(directory), ["0.1.0.md"]);
});

test("ファイル名が版の形でなかったら落とす", async () => {
  const directory = await withSource({ "next.md": VALID });
  const { errors } = await buildReleaseNotes(directory);
  assert.match(errors[0], /ファイル名は/);
});

test("1 件も無かったら落とす", async () => {
  const directory = await withSource({});
  const { errors } = await buildReleaseNotes(directory);
  assert.match(errors[0], /1 件も無い/);
});

test("正本が形式を満たしている", async () => {
  // 🔴 **これが本番の見張りである。**上のテストは仕掛けを見ているだけで、
  // 実際に配るものが通るかは別に確かめる必要がある。
  const built = await buildReleaseNotes();
  assert.equal(built.errors, undefined, JSON.stringify(built.errors));
  assert.ok(built.notes.releases.length >= 1);
});
