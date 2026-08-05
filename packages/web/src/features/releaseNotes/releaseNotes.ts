/**
 * リリースノートの読み込みと、未読の判定。
 *
 * **形式は [契約](docs/api/release-notes-format.md) が正本。**
 * ⚠️ **片方の都合で変えない。**書く側(`tools/release-notes/build.mjs`)と対になっている。
 *
 * ⚠️ **React を知らない純粋な関数として書く。**表示と切り離しておけば、
 * 判定の規則をブラウザ無しで確かめられる。
 */

/** この閲覧機能が読める形式の版。**違うものは読まない。** */
export const SUPPORTED_FORMAT_VERSION = 1;

/** 既読を覚える場所。**契約で決まっている。** */
export const READ_STORAGE_KEY = "sudoku-web:release-notes-read";

export interface ReleaseSection {
  readonly title: string;
  readonly items: readonly string[];
}

export interface Release {
  readonly version: string;
  readonly date: string;
  readonly sections: readonly ReleaseSection[];
}

export interface ReleaseNotes {
  readonly formatVersion: number;
  /** **新しい版が先頭。** 並べ替えは書く側が済ませてある。 */
  readonly releases: readonly Release[];
}

/**
 * 取ってきた値がこの閲覧機能の読める形か。
 *
 * ⚠️ **`formatVersion` が違うものを読まない。**
 * 将来この形式を変えたとき、**古いアプリが新しい配信物を読んで壊れる**のを防ぐ。
 * ⚠️ **中身の形も見る。**`formatVersion` だけ合っていて中身が違う、はありうる。
 */
export function parseReleaseNotes(value: unknown): ReleaseNotes | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const notes = value as Partial<ReleaseNotes>;
  if (notes.formatVersion !== SUPPORTED_FORMAT_VERSION || !Array.isArray(notes.releases)) {
    return null;
  }
  if (!notes.releases.every(isRelease)) {
    return null;
  }
  return { formatVersion: notes.formatVersion, releases: notes.releases };
}

function isRelease(value: unknown): value is Release {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const release = value as Partial<Release>;
  return (
    typeof release.version === "string" &&
    typeof release.date === "string" &&
    Array.isArray(release.sections) &&
    release.sections.every(
      (section) =>
        typeof section === "object" &&
        section !== null &&
        typeof (section as ReleaseSection).title === "string" &&
        Array.isArray((section as ReleaseSection).items) &&
        (section as ReleaseSection).items.every((item) => typeof item === "string"),
    )
  );
}

/** いちばん新しい版。**並べ替えは書く側の責務なので、先頭を取るだけ。** */
export function latestVersion(notes: ReleaseNotes | null): string | null {
  return notes?.releases[0]?.version ?? null;
}

/**
 * しるしを出すか。
 *
 * ⚠️ **記録が無いとき(初回の起動)は「既読」とする。**
 * **初めて遊ぶ人に過去の変更点を知らせても意味が無く、
 * しるしが最初から付いていると「新しい知らせ」の意味が薄れる。**
 *
 * ⚠️ **記録された版が配信物に無いときも「既読」とする**(版を取り下げたなど)。
 * **比較で落ちるより、しるしが出ないほうが害が小さい。**
 */
export function hasUnread(notes: ReleaseNotes | null, read: string | null): boolean {
  const latest = latestVersion(notes);
  // ⚠️ **記録が配信物の中に無ければ、しるしを出さない。**
  // **初回の起動(記録が `null`)と、取り下げられた版の両方がここに落ちる。**
  // ⚠️ **`read === null` を別に書かない。**同じ結果を 2 か所で守ることになり、
  // **片方を消しても検査が落ちない**(実際に壊して確かめた)。
  if (latest === null || !notes?.releases.some((release) => release.version === read)) {
    return false;
  }
  return latest !== read;
}
