import { useCallback, useEffect, useState } from "react";

import type { StorageLike } from "../progress/progressStorage";

import {
  hasUnread,
  latestVersion,
  parseReleaseNotes,
  READ_STORAGE_KEY,
  type ReleaseNotes,
} from "./releaseNotes";

/**
 * リリースノートを読み込み、未読かどうかを持つ。
 *
 * ⚠️ **取れなくても遊技を止めない**
 * (docs/architecture/system-architecture.md「エラーハンドリングの方針」)。
 * **読めなければ閲覧機能を出さないだけ**にする。
 */
export interface UseReleaseNotesResult {
  /** 取れなかったときは `null`。**そのときは入口ごと出さない。** */
  readonly notes: ReleaseNotes | null;
  /** しるしを出すか。 */
  readonly unread: boolean;
  /** 開いたときに呼ぶ。**最新の版を既読として記録する。** */
  readonly markRead: () => void;
}

export interface UseReleaseNotesOptions {
  /** テストから差し替えるための口。 */
  readonly fetch?: typeof globalThis.fetch;
  readonly storage?: StorageLike;
}

/**
 * 配信物の場所。
 *
 * 🔴 **`"/release-notes.json"` と書いてはいけない。**
 * サブパス(GitHub Pages)では**ドメイン直下を指して 404 になる**
 * (docs/guides/deployment.md)。⚠️ **`BASE_URL` は末尾がスラッシュである。**
 */
const NOTES_URL = `${import.meta.env.BASE_URL}release-notes.json`;

export function useReleaseNotes(options: UseReleaseNotesOptions = {}): UseReleaseNotesResult {
  const { fetch = globalThis.fetch, storage } = options;
  const [notes, setNotes] = useState<ReleaseNotes | null>(null);
  const [read, setRead] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const loaded = await fetchNotes(fetch);
      if (cancelled) {
        return;
      }
      setNotes(loaded);

      const store = storage ?? defaultStorage();
      const saved = readVersion(store);
      // ⚠️ **記録が無ければ、開かなくても最新を記録する**(契約)。
      // **初めて遊ぶ人に、過去の変更点のしるしを見せない。**
      if (saved === null) {
        const latest = latestVersion(loaded);
        if (latest !== null) {
          writeVersion(store, latest);
        }
        setRead(latest);
        return;
      }
      setRead(saved);
    })();

    return () => {
      cancelled = true;
    };
  }, [fetch, storage]);

  const markRead = useCallback(() => {
    const latest = latestVersion(notes);
    if (latest === null) {
      return;
    }
    writeVersion(storage ?? defaultStorage(), latest);
    setRead(latest);
  }, [notes, storage]);

  return { notes, unread: hasUnread(notes, read), markRead };
}

async function fetchNotes(fetch: typeof globalThis.fetch): Promise<ReleaseNotes | null> {
  try {
    const response = await fetch(NOTES_URL);
    if (!response.ok) {
      return null;
    }
    return parseReleaseNotes(await response.json());
  } catch {
    // 取れなくても遊技は続く。
    return null;
  }
}

function readVersion(storage: StorageLike | undefined): string | null {
  if (!storage) {
    return null;
  }
  try {
    return storage.getItem(READ_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeVersion(storage: StorageLike | undefined, version: string): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(READ_STORAGE_KEY, version);
  } catch {
    // 覚えられなくても遊技は続く。
  }
}

function defaultStorage(): StorageLike | undefined {
  return typeof localStorage === "undefined" ? undefined : localStorage;
}
