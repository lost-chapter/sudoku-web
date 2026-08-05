import { useEffect, useState } from "react";
import { Button, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";

import { readProgress, type StorageLike } from "../features/progress/progressStorage";
import { isStale, type SavedProgress } from "../features/progress/progress";
import { availableDifficulties } from "../features/puzzle/packSelection";
import { loadManifest } from "../features/puzzle/loadPuzzle";
import { ReleaseNotesModal } from "../features/releaseNotes/ReleaseNotesModal";
import { useReleaseNotes } from "../features/releaseNotes/useReleaseNotes";
import type { Difficulty, Manifest } from "@sudoku/core";

import { Icon } from "../ui/Icon";

import { DIFFICULTY_LABELS } from "./GameHeader";
import { TOUCH_TARGET } from "./layout";

import classes from "./HomeScreen.module.css";

/**
 * ホーム画面。**難易度を選ぶ。遊びかけがあれば「続きから」を出す**
 * (docs/ui/screens-and-interactions.md)。
 *
 * ⚠️ **難易度の一覧は `manifest.json` の `totals` から作る。**
 * 画面にクラスを固定で書かない。実装済みの手筋によっては上のクラスが
 * 1 問も無く、そのときは選ばせてはいけない。
 *
 * 🎯 **難易度は順序のある情報である。**その順序が形に出ていないと、
 * **同じ見た目のボタンが並んでいるだけ**に見える(2026-08-06・発注者の指摘)。
 * **⇒ 縦に積んで幅を揃え、段階を「塗られたマスの数」で表す。**
 */
export interface HomeScreenProps {
  readonly onStart: (difficulty: Difficulty, resume: boolean) => void;
  /** テストから差し替えるための口。 */
  readonly storage?: StorageLike;
}

/** 表題の印で塗るマス。**対角に置くと、9 マスのうちどこが埋まっているかが読み取りやすい。** */
const MARK_CELLS = new Set([0, 4, 8]);

/** 3 桁ごとの区切り。⚠️ **`toLocaleString` は環境で結果が変わる**ので使わない。 */
function groupDigits(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 難易度の 1 段。**カード全体が 1 つのボタン**である。
 *
 * ⚠️ **段階は色ではなく個数で表す。**塗られたマスを数えれば分かるので、
 * **色を見分けられなくても順序が読める**(仕様の「色だけに情報を載せない」)。
 */
function DifficultyCard({
  difficulty,
  level,
  count,
  onStart,
}: {
  readonly difficulty: Difficulty;
  /** 1 から始まる段階。塗るマスの数になる。 */
  readonly level: number;
  readonly count: number;
  readonly onStart: () => void;
}) {
  const name = DIFFICULTY_LABELS[difficulty];

  return (
    <button
      type="button"
      className={classes.card}
      // 読み上げは 1 つの文にまとめる。**盤面のセルと同じ考え方。**
      aria-label={`${name} ${groupDigits(count)} 問`}
      onClick={onStart}
    >
      <span className={classes.meter} aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} data-on={index < level} />
        ))}
      </span>

      <span className={classes.cardBody} aria-hidden="true">
        <span className={classes.cardName}>{name}</span>
        <span className={classes.cardMeta}>{groupDigits(count)} 問</span>
      </span>

      <Icon name="play" size={18} className={classes.go} />
    </button>
  );
}

export function HomeScreen({ onStart, storage }: HomeScreenProps) {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saved] = useState<SavedProgress | null>(() => readProgress(storage));
  const { notes, unread, markRead } = useReleaseNotes({ storage });
  const [releaseNotesOpened, releaseNotes] = useDisclosure(false);

  const [stale, setStale] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadManifest().then((value) => {
      if (cancelled) {
        return;
      }
      setManifest(value);
      setLoaded(true);
      // 版が変わった保存は開いても捨てられる。**出さないほうが正直である。**
      setStale(
        saved !== null &&
          value !== null &&
          isStale(saved, {
            formatVersion: value.formatVersion,
            generator: value.generatedWith.generator,
          }),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [saved]);

  const difficulties = manifest ? availableDifficulties(manifest) : [];
  const total = difficulties.reduce(
    (sum, difficulty) => sum + (manifest?.totals[difficulty] ?? 0),
    0,
  );

  return (
    <div className={classes.screen}>
      <header className={classes.hero}>
        {/*
          🎯 **盤面そのものを表題の印にする。**画像も Web フォントも増やさない。
          ⚠️ **飾りなので読み上げない。**題名は下の `h1` が持つ。
        */}
        <span className={classes.mark} aria-hidden="true">
          {Array.from({ length: 9 }, (_, index) => (
            <span key={index} data-on={MARK_CELLS.has(index)} />
          ))}
        </span>
        <span className={classes.titleGroup}>
          <Title order={1} size="h2">
            数独
          </Title>
          {/* ⚠️ **持っている情報を出す。**マニフェストに収録数がある。 */}
          {difficulties.length > 0 && (
            <Text size="sm" c="dimmed">
              {difficulties.length} 段階・全 {groupDigits(total)} 問
            </Text>
          )}
        </span>
      </header>

      {!loaded && (
        <Text size="sm" c="dimmed" role="status" aria-live="polite">
          収録内容を読み込んでいます
        </Text>
      )}
      {loaded && difficulties.length === 0 && (
        <Text size="sm" c="dimmed" role="status" aria-live="polite">
          遊べる問題が見つかりません。読み込み直してください。
        </Text>
      )}

      {/*
        ⚠️ **見出しは読み上げだけに持たせる。**
        **スマホでは 1 画面に収める**ので、カードを見れば分かるものに行を使わない。
      */}
      <div className={classes.list} role="group" aria-label="難易度を選ぶ">
        {/*
          🎯 **遊びかけも同じ形のカードにする。**専用の囲みを別に置くと、
          **その高さぶんだけ 1 画面に入らなくなる。**
        */}
        {saved && !stale && (
          <button
            type="button"
            className={[classes.card, classes.resume].join(" ")}
            aria-label={`続きから ${DIFFICULTY_LABELS[saved.difficulty]}`}
            onClick={() => onStart(saved.difficulty, true)}
          >
            <span className={classes.resumeMark} aria-hidden="true">
              <Icon name="play" size={20} />
            </span>
            <span className={classes.cardBody} aria-hidden="true">
              <span className={classes.cardName}>続きから</span>
              <span className={classes.cardMeta}>{DIFFICULTY_LABELS[saved.difficulty]}</span>
            </span>
          </button>
        )}

        {difficulties.map((difficulty, index) => (
          <DifficultyCard
            key={difficulty}
            difficulty={difficulty}
            level={index + 1}
            count={manifest?.totals[difficulty] ?? 0}
            onStart={() => onStart(difficulty, false)}
          />
        ))}
      </div>

      {/*
        ⚠️ **更新情報はホームに置く。**遊技中に押してほしくないものの置き場所は
        「あきらめる」と同じ考え方で決める(ADR 0005)。
        **設定の中には入れない** —— あそこは「遊び方を変えるところ」で、性質が違う。

        ⚠️ **取れなかったときは入口ごと出さない。**押しても何も出ないボタンは、
        壊れているのか中身が無いのかが分からない。

        🎯 **難易度より弱く見せる。**主役は難易度で、これは添え物である。
      */}
      {notes && (
        <div className={classes.footer}>
          {/*
            ⚠️ **`subtle` は使わない。**文字色が primary になり、
            白地で 3.4:1 と本文の目安を割る(2026-08-05 の実測)。
            **主従は大きさで付ける** —— 色を変えるとコントラストの検査が増える。
          */}
          <Button
            variant="default"
            size="sm"
            h={TOUCH_TARGET}
            leftSection={<Icon name="bell" size={18} />}
            onClick={() => {
              markRead();
              releaseNotes.open();
            }}
          >
            {/*
              🎯 **しるしは文字で出す。**色や点だけに載せると、
              **色を見分けられない人へ届かない**(仕様の「色だけに情報を載せない」)。
              読み上げでも「更新情報(新着)」と読まれる。
            */}
            更新情報{unread ? "(新着)" : ""}
          </Button>

          <ReleaseNotesModal
            opened={releaseNotesOpened}
            notes={notes}
            onClose={releaseNotes.close}
          />
        </div>
      )}
    </div>
  );
}
