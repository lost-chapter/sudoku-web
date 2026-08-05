import { BOARD_SIZE, CELL_COUNT, candidateDigits, maskOfDigit } from "@sudoku/core";

import {
  columnOf,
  isGiven,
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
  /** 盤面自身がキーを拾う。ホットキーの登録は呼び出し側にまとめてある。 */
  readonly boardRef?: React.Ref<HTMLDivElement>;
}

const CELL_INDEXES = Array.from({ length: CELL_COUNT }, (_, index) => index);

const ROWS = Array.from({ length: 9 }, (_, row) => CELL_INDEXES.slice(row * 9, row * 9 + 9));

export function Board({ state, highlights, onSelect, boardRef }: BoardProps) {
  return (
    <div
      ref={boardRef}
      role="grid"
      aria-label="数独の盤面"
      aria-activedescendant={cellId(state.selected)}
      tabIndex={0}
      className={classes.board}
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
              onSelect={onSelect}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

interface CellProps {
  readonly index: CellIndex;
  readonly state: BoardState;
  readonly highlights: BoardHighlights;
  readonly selected: boolean;
  readonly onSelect: (index: CellIndex) => void;
}

function Cell({ index, state, highlights, selected, onSelect }: CellProps) {
  const value = valueAt(state, index);
  const given = isGiven(state, index);
  const notes = notesAt(state, index);
  const conflicted = highlights.conflicts.has(index);
  const mistaken = highlights.mistakes.has(index);

  const className = [
    classes.cell,
    given ? classes.given : classes.entry,
    // 強調は選択より下に敷く。順序を入れ替えると選択が見えなくなる。
    highlights.units.has(index) ? classes.unit : "",
    highlights.sameDigit.has(index) ? classes.sameDigit : "",
    conflicted ? classes.conflict : "",
    mistaken ? classes.mistake : "",
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
      aria-label={cellLabel(index, value, given, notes, conflicted, mistaken)}
      className={className}
      onPointerDown={() => onSelect(index)}
    >
      {value !== 0 && value}
      {value === 0 && notes !== 0 && <Notes mask={notes} />}
    </div>
  );
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
 * 「5 行 3 列、4、重複」
 *
 * **矛盾と誤りは印だけでなく読み上げにも載せる。**印が見えない人にも要る情報である。
 */
function cellLabel(
  index: CellIndex,
  value: number,
  given: boolean,
  notes: number,
  conflicted: boolean,
  mistaken: boolean,
): string {
  const position = `${rowOf(index) + 1} 行 ${columnOf(index) + 1} 列`;
  if (value === 0) {
    return notes === 0
      ? `${position}、空`
      : `${position}、候補 ${candidateDigits(notes).join(" ")}`;
  }

  const marks = [conflicted ? "重複" : "", mistaken ? "誤り" : ""].filter(Boolean);
  if (marks.length > 0) {
    return [position, given ? `手がかり ${value}` : `${value}`, ...marks].join("、");
  }
  return given ? `${position}、手がかり ${value}` : `${position}、${value}`;
}
