import { useRef, useState, type PointerEvent } from "react";
import { BOARD_SIZE, CELL_COUNT, candidateDigits, maskOfDigit } from "@sudoku/core";

import {
  columnOf,
  isGiven,
  isRevealed,
  notesAt,
  rowOf,
  valueAt,
  type BoardState,
  type CellIndex,
} from "../../state/boardState";
import type { BoardHighlights } from "./highlights";

import classes from "./Board.module.css";

/**
 * 9×9 の盤面。
 *
 * **Mantine の部品は使わない**(9×9 のグリッドはどの UI ライブラリにも無い)。
 * 自前の CSS Modules で書く(docs/decisions/0002-ui-library-selection.md)。
 *
 * アクセシビリティの要点(docs/ui/screens-and-interactions.md):
 *
 * - 盤面が `role="grid"`、セルが `role="gridcell"`
 * - **Tab の対象は盤面ひとつだけ。**81 個を Tab で辿らせない。
 *   選択中のセルは `aria-activedescendant` で支援技術へ伝える
 * - セルのラベルに位置と中身を入れる(例: 5 行 3 列、空)
 */
export interface BoardProps {
  readonly state: BoardState;
  readonly highlights: BoardHighlights;
  readonly onSelect: (index: CellIndex) => void;
  /** スマホでセルからスワイプ入力する。デスクトップでは渡さない。 */
  readonly onSwipeDigit?: (index: CellIndex, digit: number) => void;
  /** 盤面自身がキーを拾う。ホットキーの登録は呼び出し側にまとめてある。 */
  readonly boardRef?: React.Ref<HTMLDivElement>;
}

const CELL_INDEXES = Array.from({ length: CELL_COUNT }, (_, index) => index);

const ROWS = Array.from({ length: 9 }, (_, row) => CELL_INDEXES.slice(row * 9, row * 9 + 9));

/** iPhone のキーガイド相当の吹き出し幅は約 64px。盤面の外へはみ出さないよう少し余裕を取る。 */
const GUIDE_HALF_SIZE = 32;
/** 指を開始位置からこの距離以上動かしたら、タップではなくエリア選択とみなす。 */
const SWIPE_MOVE_DISTANCE = 8;
/** 3×3 エリアガイドの 1 エリアの一辺。判定領域と表示を同じ寸法にする。 */
const MAP_AREA_SIZE = 32;
/** 3×3 エリアガイドの内側の余白。 */
const MAP_PADDING = 6;
/** 開始位置を中心に表示するエリアガイドの半分の幅。 */
const MAP_HALF_SIZE = MAP_PADDING + (MAP_AREA_SIZE * 3) / 2;
const MAP_INNER_SIZE = MAP_AREA_SIZE * 3;

interface ActiveSwipe {
  readonly originX: number;
  readonly originY: number;
  x: number;
  y: number;
  digit: number | null;
  below: boolean;
}

interface SwipeGesture extends ActiveSwipe {
  readonly index: CellIndex;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  moved: boolean;
}

export function Board({ state, highlights, onSelect, onSwipeDigit, boardRef }: BoardProps) {
  const boardNode = useRef<HTMLDivElement>(null);
  const gesture = useRef<SwipeGesture | null>(null);
  const [activeSwipe, setActiveSwipe] = useState<ActiveSwipe | null>(null);

  const setBoardRef = (node: HTMLDivElement | null) => {
    boardNode.current = node;
    if (typeof boardRef === "function") {
      boardRef(node);
    } else if (boardRef) {
      boardRef.current = node;
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>, index: CellIndex) => {
    onSelect(index);
    if (event.pointerType !== "touch" || !onSwipeDigit || isGiven(state, index)) {
      return;
    }

    const board = boardNode.current;
    if (!board) {
      return;
    }

    const box = board.getBoundingClientRect();
    const localX = event.clientX - box.left;
    const localY = event.clientY - box.top;
    const nextGesture: SwipeGesture = {
      index,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      // ガイドを盤面内へ無理に収めない。開始位置そのものを中央エリア(5)にするため、
      // 画面端ではガイドが盤面からはみ出すことを許容する。
      originX: localX,
      originY: localY,
      x: Math.min(Math.max(localX, GUIDE_HALF_SIZE), box.width - GUIDE_HALF_SIZE),
      y: localY,
      // 開始時は中央エリア(5)を選択状態にする。純粋なタップでは確定しない。
      digit: 5,
      below: localY < 120,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = nextGesture;
    setActiveSwipe(nextGesture);
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) {
      return;
    }

    const board = boardNode.current;
    if (!board) {
      return;
    }

    const box = board.getBoundingClientRect();
    const localX = event.clientX - box.left;
    const localY = event.clientY - box.top;
    current.moved ||=
      Math.hypot(event.clientX - current.startX, event.clientY - current.startY) >=
      SWIPE_MOVE_DISTANCE;
    // 方向ベクトルではなく、開始時に表示した 3×3 エリアそのものに対して判定する。
    current.digit = digitAtPoint(localX, localY, current.originX, current.originY);
    current.x = Math.min(Math.max(localX, GUIDE_HALF_SIZE), box.width - GUIDE_HALF_SIZE);
    current.y = localY;
    // 盤面の上端では指の下へ出す。その他は iPhone のキー候補のように上へ出す。
    current.below = localY < 120;
    setActiveSwipe({ ...current });
    // phone layout の touch-action:none と合わせて、OS のスクロールを確実に止める。
    event.preventDefault();
  };

  const finishPointer = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) {
      return;
    }

    if (current.moved && current.digit !== null) {
      onSwipeDigit?.(current.index, current.digit);
    }
    event.preventDefault();
    gesture.current = null;
    setActiveSwipe(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const cancelPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current?.pointerId !== event.pointerId) {
      return;
    }
    gesture.current = null;
    setActiveSwipe(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={setBoardRef}
      role="grid"
      aria-label="数独の盤面"
      aria-activedescendant={cellId(state.selected)}
      tabIndex={0}
      className={[classes.board, onSwipeDigit ? classes.swipeable : ""].filter(Boolean).join(" ")}
    >
      {ROWS.map((indexes, row) => (
        <div key={row} role="row" className={classes.row}>
          {indexes.map((index) => (
            <Cell
              key={index}
              index={index}
              state={state}
              highlights={highlights}
              selected={index === state.selected}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={finishPointer}
              onPointerCancel={cancelPointer}
            />
          ))}
        </div>
      ))}
      {activeSwipe && (
        <>
          <SwipeAreaMap {...activeSwipe} />
          <SwipeGuide {...activeSwipe} />
        </>
      )}
    </div>
  );
}

interface CellProps {
  readonly index: CellIndex;
  readonly state: BoardState;
  readonly highlights: BoardHighlights;
  readonly selected: boolean;
  readonly onPointerDown: (event: PointerEvent<HTMLDivElement>, index: CellIndex) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onPointerUp: (event: PointerEvent<HTMLDivElement>) => void;
  readonly onPointerCancel: (event: PointerEvent<HTMLDivElement>) => void;
}

function Cell({
  index,
  state,
  highlights,
  selected,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: CellProps) {
  const value = valueAt(state, index);
  const given = isGiven(state, index);
  const notes = notesAt(state, index);
  const revealed = isRevealed(state, index);
  const className = [
    classes.cell,
    given ? classes.given : revealed ? classes.revealed : classes.entry,
    // 強調は選択より下に敷く。順序を入れ替えると選択が見えなくなる。
    highlights.units.has(index) ? classes.unit : "",
    highlights.sameDigit.has(index) ? classes.sameDigit : "",
    selected ? classes.selected : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      id={cellId(index)}
      role="gridcell"
      aria-selected={selected}
      aria-readonly={given || undefined}
      aria-label={cellLabel(index, value, given, notes, revealed)}
      className={className}
      onPointerDown={(event) => onPointerDown(event, index)}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {value !== 0 && value}
      {value === 0 && notes !== 0 && <Notes mask={notes} />}
    </div>
  );
}

function SwipeGuide({ x, y, digit, below }: ActiveSwipe) {
  if (digit === null) {
    return null;
  }

  return (
    <div
      className={[classes.swipeGuide, below ? classes.swipeGuideBelow : ""]
        .filter(Boolean)
        .join(" ")}
      style={{ left: x, top: y }}
      data-swipe-guide="true"
      data-active-digit={digit}
      aria-hidden="true"
    >
      <span className={classes.swipeGuideDigit}>{digit}</span>
    </div>
  );
}

function SwipeAreaMap({ originX, originY, digit }: ActiveSwipe) {
  return (
    <div
      className={classes.swipeAreaMap}
      style={{ left: originX, top: originY }}
      data-swipe-map="true"
      data-active-digit={digit ?? ""}
      aria-hidden="true"
    >
      {DIGITS.map((candidate) => (
        <span
          key={candidate}
          className={candidate === digit ? classes.swipeAreaActive : classes.swipeAreaDigit}
        >
          {candidate}
        </span>
      ))}
    </div>
  );
}

function digitAtPoint(x: number, y: number, originX: number, originY: number): number | null {
  const left = originX - MAP_HALF_SIZE + MAP_PADDING;
  const top = originY - MAP_HALF_SIZE + MAP_PADDING;
  const relativeX = x - left;
  const relativeY = y - top;
  if (
    relativeX < 0 ||
    relativeX >= MAP_INNER_SIZE ||
    relativeY < 0 ||
    relativeY >= MAP_INNER_SIZE
  ) {
    return null;
  }

  const column = Math.min(2, Math.floor(relativeX / MAP_AREA_SIZE));
  const row = Math.min(2, Math.floor(relativeY / MAP_AREA_SIZE));
  return row * 3 + column + 1;
}

/**
 * メモ(候補)。**3×3 に並べ、数字の位置で何が立っているかが分かるようにする。**
 * 詰めて並べると読み取りに数え直しが要る。
 */
function Notes({ mask }: { readonly mask: number }) {
  return (
    <span className={classes.notes} aria-hidden="true">
      {DIGITS.map((digit) => (
        <span key={digit}>{(mask & maskOfDigit(digit)) === 0 ? "" : digit}</span>
      ))}
    </span>
  );
}

const DIGITS = Array.from({ length: BOARD_SIZE }, (_, index) => index + 1);

function cellId(index: CellIndex): string {
  return `sudoku-cell-${index}`;
}

/**
 * 例: 「5 行 3 列、手がかり 7」「5 行 3 列、空」「5 行 3 列、候補 1 2 7」
 *
 * ⚠️ **2026-08-06 に「重複」「誤り」の読み上げを消した。**
 * 画面に印を出さなくなったので、読み上げだけ残すと**見える人と見えない人で
 * 分かることが変わってしまう**。
 */
function cellLabel(
  index: CellIndex,
  value: number,
  given: boolean,
  notes: number,
  revealed: boolean,
): string {
  const position = `${rowOf(index) + 1} 行 ${columnOf(index) + 1} 列`;
  if (value === 0) {
    return notes === 0
      ? `${position}、空`
      : `${position}、候補 ${candidateDigits(notes).join(" ")}`;
  }

  if (given) {
    return `${position}、手がかり ${value}`;
  }
  // ⚠️ **画面で区別が付くものは、読み上げでも区別が付くようにする。**
  // 片方だけにすると、見える人と見えない人で分かることが変わる。
  return revealed ? `${position}、答え ${value}` : `${position}、${value}`;
}
