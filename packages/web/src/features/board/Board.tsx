import { CELL_COUNT } from "@sudoku/core";

import {
  columnOf,
  isGiven,
  rowOf,
  valueAt,
  type BoardState,
  type CellIndex,
} from "../../state/boardState";

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
  readonly onSelect: (index: CellIndex) => void;
  /** 盤面自身がキーを拾う。ホットキーの登録は呼び出し側にまとめてある。 */
  readonly boardRef?: React.Ref<HTMLDivElement>;
}

const CELL_INDEXES = Array.from({ length: CELL_COUNT }, (_, index) => index);

const ROWS = Array.from({ length: 9 }, (_, row) => CELL_INDEXES.slice(row * 9, row * 9 + 9));

export function Board({ state, onSelect, boardRef }: BoardProps) {
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
  readonly selected: boolean;
  readonly onSelect: (index: CellIndex) => void;
}

function Cell({ index, state, selected, onSelect }: CellProps) {
  const value = valueAt(state, index);
  const given = isGiven(state, index);

  const className = [
    classes.cell,
    given ? classes.given : classes.entry,
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
      aria-label={cellLabel(index, value, given)}
      className={className}
      onPointerDown={() => onSelect(index)}
    >
      {value === 0 ? "" : value}
    </div>
  );
}

function cellId(index: CellIndex): string {
  return `sudoku-cell-${index}`;
}

/** 例: 「5 行 3 列、手がかり 7」「5 行 3 列、空」 */
function cellLabel(index: CellIndex, value: number, given: boolean): string {
  const position = `${rowOf(index) + 1} 行 ${columnOf(index) + 1} 列`;
  if (value === 0) {
    return `${position}、空`;
  }
  return given ? `${position}、手がかり ${value}` : `${position}、${value}`;
}
