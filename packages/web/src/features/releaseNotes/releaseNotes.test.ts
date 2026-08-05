import { describe, expect, it } from "vitest";

import { hasUnread, latestVersion, parseReleaseNotes, type ReleaseNotes } from "./releaseNotes";

const NOTES: ReleaseNotes = {
  formatVersion: 1,
  releases: [
    { version: "0.2.0", date: "2026-08-07", sections: [{ title: "追加", items: ["増えました"] }] },
    { version: "0.1.0", date: "2026-08-06", sections: [{ title: "追加", items: ["出ました"] }] },
  ],
};

describe("parseReleaseNotes", () => {
  it("契約どおりのものを読む", () => {
    expect(parseReleaseNotes(structuredClone(NOTES))).toEqual(NOTES);
  });

  // ⚠️ **形式の版が違うものを読まない。**将来この形式を変えたとき、
  // 古いアプリが新しい配信物を読んで壊れるのを防ぐ。
  it("形式の版が違うものは読まない", () => {
    expect(parseReleaseNotes({ ...NOTES, formatVersion: 2 })).toBeNull();
    expect(parseReleaseNotes({ ...NOTES, formatVersion: "1" })).toBeNull();
  });

  it.each([
    ["null", null],
    ["配列", []],
    ["releases が無い", { formatVersion: 1 }],
    ["releases が配列でない", { formatVersion: 1, releases: {} }],
    ["version が無い", { formatVersion: 1, releases: [{ date: "2026-08-06", sections: [] }] }],
    [
      "items が文字列でない",
      {
        formatVersion: 1,
        releases: [
          { version: "0.1.0", date: "2026-08-06", sections: [{ title: "追加", items: [1] }] },
        ],
      },
    ],
  ])("%s は読まない", (_name, value) => {
    expect(parseReleaseNotes(value)).toBeNull();
  });
});

describe("latestVersion", () => {
  // 並べ替えは書く側の責務なので、先頭を取るだけ。
  it("先頭の版を返す", () => {
    expect(latestVersion(NOTES)).toBe("0.2.0");
  });

  it("読めていなければ null", () => {
    expect(latestVersion(null)).toBeNull();
  });
});

describe("hasUnread", () => {
  it("記録が最新でなければ未読", () => {
    expect(hasUnread(NOTES, "0.1.0")).toBe(true);
  });

  it("記録が最新なら既読", () => {
    expect(hasUnread(NOTES, "0.2.0")).toBe(false);
  });

  // ⚠️ **初回の起動でしるしを出さない。**過去の変更点を知らせても意味が無く、
  // 最初から付いていると「新しい知らせ」の意味が薄れる。
  it("記録が無ければ既読として扱う", () => {
    expect(hasUnread(NOTES, null)).toBe(false);
  });

  // ⚠️ **比較で落ちるより、しるしが出ないほうが害が小さい。**
  it("記録された版が配信物に無ければ既読として扱う", () => {
    expect(hasUnread(NOTES, "9.9.9")).toBe(false);
  });

  it("読めていなければ既読として扱う", () => {
    expect(hasUnread(null, "0.1.0")).toBe(false);
  });
});
