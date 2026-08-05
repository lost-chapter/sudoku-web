import { useEffect, useState } from "react";

/** 1 秒ごとに数える。**秒までしか出さないので、これより細かくしても見えない。** */
const TICK_MS = 1000;

/**
 * 経過時間。
 *
 * **止まっている間は増えない。**完成したあとも数え続けると、
 * 保存された所要時間が実際より長くなる。
 *
 * ⚠️ **時計は「増えた分を足す」形にする。**開始時刻との差で出すと、
 * 遊びかけを再開したときに前回のぶんが飛ぶ。
 *
 * 急かす演出はしない(docs/ui/screens-and-interactions.md)。表示は分と秒だけ。
 */
export function useElapsedTime(initialMs: number, running: boolean): number {
  const [elapsedMs, setElapsedMs] = useState(initialMs);

  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = setInterval(() => {
      setElapsedMs((current) => current + TICK_MS);
    }, TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, [running]);

  return elapsedMs;
}

/** 例: 「3:07」「1:02:33」。**秒までしか出さない。** */
export function formatElapsed(elapsedMs: number): string {
  const total = Math.floor(elapsedMs / 1000);
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);

  const mm = hours === 0 ? String(minutes) : String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  return hours === 0 ? `${mm}:${ss}` : `${hours}:${mm}:${ss}`;
}
