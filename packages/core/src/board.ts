/**
 * 盤面の表現と数独の規則の検証。
 *
 * 添字は 0〜80 の一次元で持つ(docs/algorithms/solver.md 「盤面の表現」)。
 * 行 = i / 9、列 = i % 9、ブロック = (行 / 3) * 3 + (列 / 3)。
 *
 *   値    Uint8Array(81)   0 = 空き、1〜9 = 確定値
 *   候補  Uint16Array(81)  ビットマスク。bit n が立っていれば数字 n + 1 が入りうる
 *
 * 候補をビットマスクで持つのは、交差と差集合がビット演算 1 回で済み、
 * 「候補が 1 個だけ」を popcount で判定できるからである。
 *
 * 行・列・ブロックの添字表は毎回計算せず、この module の読み込み時に一度だけ作る。
 */

/** 盤面の一辺のセル数。 */
export const BOARD_SIZE = 9;

/** ブロック(3x3)の一辺のセル数。 */
export const BOX_SIZE = 3;

/** 盤面のセル数。 */
export const CELL_COUNT = BOARD_SIZE * BOARD_SIZE;

/** 単位(行 9 + 列 9 + ブロック 9)の個数。 */
export const UNIT_COUNT = BOARD_SIZE * 3;

/** 1 つのセルが規則を共有する相手(同じ行・列・ブロックのセル)の数。 */
export const PEER_COUNT = 20;

/** 1〜9 のすべての候補が立ったビットマスク。 */
export const ALL_CANDIDATES = 0b1_1111_1111;

/** 盤面の値。長さ 81。0 = 空き、1〜9 = 確定値。 */
export type Board = Uint8Array;

/** 候補のビットマスク。長さ 81。確定済みのセルは 0。 */
export type Candidates = Uint16Array;

/**
 * 添字 → 行番号(0〜8)。
 *
 * この表と後続の表は共有物なので**書き換えてはいけない**。
 * TypeScript では読み取り専用の TypedArray を表現できないため、規約で守る。
 */
export const ROW_OF = new Uint8Array(CELL_COUNT);

/** 添字 → 列番号(0〜8)。書き換えない。 */
export const COLUMN_OF = new Uint8Array(CELL_COUNT);

/** 添字 → ブロック番号(0〜8)。書き換えない。 */
export const BOX_OF = new Uint8Array(CELL_COUNT);

for (let index = 0; index < CELL_COUNT; index += 1) {
  const row = Math.floor(index / BOARD_SIZE);
  const column = index % BOARD_SIZE;
  ROW_OF[index] = row;
  COLUMN_OF[index] = column;
  BOX_OF[index] = Math.floor(row / BOX_SIZE) * BOX_SIZE + Math.floor(column / BOX_SIZE);
}

/**
 * 単位ごとのセルの添字。長さ 27。書き換えない。
 *
 * 0〜8 が行、9〜17 が列、18〜26 がブロック。この並びは
 * {@link UNITS_OF} と対応しているので入れ替えない。
 */
export const UNITS: Uint8Array[] = [];

for (let row = 0; row < BOARD_SIZE; row += 1) {
  const cells = new Uint8Array(BOARD_SIZE);
  for (let column = 0; column < BOARD_SIZE; column += 1) {
    cells[column] = row * BOARD_SIZE + column;
  }
  UNITS.push(cells);
}
for (let column = 0; column < BOARD_SIZE; column += 1) {
  const cells = new Uint8Array(BOARD_SIZE);
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    cells[row] = row * BOARD_SIZE + column;
  }
  UNITS.push(cells);
}
for (let box = 0; box < BOARD_SIZE; box += 1) {
  const cells = new Uint8Array(BOARD_SIZE);
  const topRow = Math.floor(box / BOX_SIZE) * BOX_SIZE;
  const leftColumn = (box % BOX_SIZE) * BOX_SIZE;
  for (let offset = 0; offset < BOARD_SIZE; offset += 1) {
    const row = topRow + Math.floor(offset / BOX_SIZE);
    const column = leftColumn + (offset % BOX_SIZE);
    cells[offset] = row * BOARD_SIZE + column;
  }
  UNITS.push(cells);
}

/**
 * 添字 → そのセルが属する 3 つの単位([行, 列, ブロック])の {@link UNITS} 上の番号。
 * 書き換えない。
 */
export const UNITS_OF: Uint8Array[] = [];

for (let index = 0; index < CELL_COUNT; index += 1) {
  UNITS_OF.push(
    new Uint8Array([ROW_OF[index], BOARD_SIZE + COLUMN_OF[index], BOARD_SIZE * 2 + BOX_OF[index]]),
  );
}

/**
 * 添字 → 規則を共有する相手のセル(同じ行・列・ブロック)の添字。各 20 個。
 * 昇順。書き換えない。
 */
export const PEERS: Uint8Array[] = [];

for (let index = 0; index < CELL_COUNT; index += 1) {
  const peers = new Set<number>();
  for (const unitIndex of UNITS_OF[index]) {
    for (const cell of UNITS[unitIndex]) {
      if (cell !== index) peers.add(cell);
    }
  }
  PEERS.push(new Uint8Array([...peers].sort((a, b) => a - b)));
}

/** ビットマスク → 立っているビットの数。 */
const POPCOUNT = new Uint8Array(ALL_CANDIDATES + 1);

for (let mask = 1; mask <= ALL_CANDIDATES; mask += 1) {
  POPCOUNT[mask] = POPCOUNT[mask >> 1] + (mask & 1);
}

/** 1 ビットだけのマスク → その数字。それ以外のマスクに対しては 0。 */
const DIGIT_OF_BIT = new Uint8Array(ALL_CANDIDATES + 1);

for (let digit = 1; digit <= BOARD_SIZE; digit += 1) {
  DIGIT_OF_BIT[1 << (digit - 1)] = digit;
}

/** 行と列から添字を求める。 */
export function cellIndex(row: number, column: number): number {
  return row * BOARD_SIZE + column;
}

/** 数字 1〜9 に対応するビットマスクを返す。 */
export function maskOfDigit(digit: number): number {
  return 1 << (digit - 1);
}

/** マスクに立っている候補の数を返す。 */
export function countCandidates(mask: number): number {
  return POPCOUNT[mask];
}

/** マスクのうち最小の数字を返す。マスクが 0 なら 0。 */
export function lowestDigit(mask: number): number {
  return DIGIT_OF_BIT[mask & -mask];
}

/** マスクに立っている数字を昇順の配列で返す。 */
export function candidateDigits(mask: number): number[] {
  const digits: number[] = [];
  for (let rest = mask; rest !== 0; rest &= rest - 1) {
    digits.push(DIGIT_OF_BIT[rest & -rest]);
  }
  return digits;
}

/** 空の盤面を作る。 */
export function createEmptyBoard(): Board {
  return new Uint8Array(CELL_COUNT);
}

/** 盤面を複製する。 */
export function cloneBoard(board: Board): Board {
  return Uint8Array.from(board);
}

/** 2 つの盤面が完全に一致するか。 */
export function boardsEqual(a: Board, b: Board): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

/**
 * 81 文字の文字列を盤面へ読む。読めなければ `null` を返す。
 *
 * 空きマスは `.` と `0` の両方を受理する(既存の公開データセットは `0` を使うものが
 * 多い)。書き出しは {@link formatBoard} が常に `.` へ統一する
 * (docs/api/puzzle-file-format.md)。
 *
 * **壊れた入力で例外を投げない。** 読み込み側は 1 行を捨ててパック全体は捨てない。
 */
export function tryParseBoard(text: string): Board | null {
  if (text.length !== CELL_COUNT) return null;
  const board = createEmptyBoard();
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const character = text[index];
    if (character === "." || character === "0") continue;
    const digit = character.charCodeAt(0) - 48;
    if (digit < 1 || digit > BOARD_SIZE) return null;
    board[index] = digit;
  }
  return board;
}

/**
 * 81 文字の文字列を盤面へ読む。読めなければ例外を投げる。
 *
 * 壊れていないことが前提の場所(テストの固定値・生成器の内部)で使う。
 * 外部から来た文字列には {@link tryParseBoard} を使う。
 */
export function parseBoard(text: string): Board {
  const board = tryParseBoard(text);
  if (board === null) {
    throw new Error(`盤面として読めない文字列である(81 文字の . 0 1〜9 が要る): ${text}`);
  }
  return board;
}

/** 盤面を 81 文字の文字列にする。空きマスは常に `.`。 */
export function formatBoard(board: Board): string {
  let text = "";
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const digit = board[index];
    text += digit === 0 ? "." : String(digit);
  }
  return text;
}

/** 空きマスが 1 つも無いか。規則を満たすかは見ない。 */
export function isComplete(board: Board): boolean {
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (board[index] === 0) return false;
  }
  return true;
}

/**
 * 規則に反しているセルの添字を昇順で返す。空きマスは対象外。
 *
 * 遊技側の「矛盾の表示」もこれを使う。矛盾はエラーではなく表示するだけである
 * (docs/architecture/system-architecture.md のエラーハンドリング)。
 */
export function findConflicts(board: Board): number[] {
  const conflicted = new Set<number>();
  for (const unit of UNITS) {
    for (let a = 0; a < BOARD_SIZE; a += 1) {
      const cellA = unit[a];
      const digit = board[cellA];
      if (digit === 0) continue;
      for (let b = a + 1; b < BOARD_SIZE; b += 1) {
        const cellB = unit[b];
        if (board[cellB] !== digit) continue;
        conflicted.add(cellA);
        conflicted.add(cellB);
      }
    }
  }
  return [...conflicted].sort((a, b) => a - b);
}

/** 規則に反していないか。空きマスがあってもよい。 */
export function isValidBoard(board: Board): boolean {
  return findConflicts(board).length === 0;
}

/**
 * 数字を置けるか(同じ行・列・ブロックに同じ数字が無いか)。
 *
 * そのセル自身の現在値は見ない。上書きの可否は呼び出し側が決める。
 */
export function isValidPlacement(board: Board, index: number, digit: number): boolean {
  for (const peer of PEERS[index]) {
    if (board[peer] === digit) return false;
  }
  return true;
}

/**
 * 埋まっていて、かつ行・列・ブロックに 1〜9 が 1 個ずつあるか。
 *
 * テストの方針の性質 5「解いた結果が数独の規則を満たす」がこれを使う。
 */
export function isSolvedBoard(board: Board): boolean {
  if (board.length !== CELL_COUNT) return false;
  for (const unit of UNITS) {
    let seen = 0;
    for (const cell of unit) {
      const digit = board[cell];
      if (digit < 1 || digit > BOARD_SIZE) return false;
      seen |= maskOfDigit(digit);
    }
    if (seen !== ALL_CANDIDATES) return false;
  }
  return true;
}

/**
 * 各セルの候補をビットマスクで求める。確定済みのセルは 0。
 *
 * 規則に反した盤面に対しても計算する(候補が 0 のセルが出るだけ)。
 */
export function computeCandidates(board: Board): Candidates {
  const usedInUnit = new Uint16Array(UNIT_COUNT);
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const digit = board[index];
    if (digit === 0) continue;
    const bit = maskOfDigit(digit);
    for (const unitIndex of UNITS_OF[index]) {
      usedInUnit[unitIndex] |= bit;
    }
  }

  const candidates = new Uint16Array(CELL_COUNT);
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (board[index] !== 0) continue;
    const units = UNITS_OF[index];
    const used = usedInUnit[units[0]] | usedInUnit[units[1]] | usedInUnit[units[2]];
    candidates[index] = ALL_CANDIDATES & ~used;
  }
  return candidates;
}
