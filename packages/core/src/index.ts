/**
 * 盤面ロジック。生成側(generator)と遊技側(web)の両方から使う。
 *
 * このパッケージは次の 3 つを守る。破ると生成側と遊技側でロジックが割れる。
 *
 * 1. DOM も Node の API も使わない(ブラウザでも Node でも同じコードが動く)
 * 2. 乱数を内部で作らない(シード付きの乱数を引数で受け取る)
 * 3. 副作用を持たない(ファイルを読まない・書かない)
 *
 * 詳細は docs/architecture/system-architecture.md の
 * 「`core` が守る 3 つの制約」を参照。
 *
 * ここは公開する入口だけを置く。実装は各 module にある。
 */

export type { Board, Candidates } from "./board";
export {
  ALL_CANDIDATES,
  BOARD_SIZE,
  BOX_OF,
  BOX_SIZE,
  CELL_COUNT,
  COLUMN_OF,
  PEER_COUNT,
  PEERS,
  ROW_OF,
  UNIT_COUNT,
  UNITS,
  UNITS_OF,
  boardsEqual,
  candidateDigits,
  cellIndex,
  cloneBoard,
  computeCandidates,
  countCandidates,
  createEmptyBoard,
  findConflicts,
  formatBoard,
  isComplete,
  isSolvedBoard,
  isValidBoard,
  isValidPlacement,
  lowestDigit,
  maskOfDigit,
  parseBoard,
  tryParseBoard,
} from "./board";

export { countSolutions, findSolutions, hasUniqueSolution, solveBoard } from "./search-solver";

export type { Random } from "./random";
export { createRandom, randomInt, shuffled } from "./random";

export type { GeneratedPuzzle } from "./generate";
export { digHoles, generatePuzzle, generateSolvedBoard } from "./generate";

export type {
  Elimination,
  TechniqueName,
  TechniqueSolveResult,
  TechniqueStep,
} from "./technique-solver";

export {
  TECHNIQUE_LEVEL,
  TECHNIQUE_SCORE,
  findHint,
  solveWithTechniques,
} from "./technique-solver";

export type { Difficulty, DifficultyRating } from "./difficulty";
export { DIFFICULTIES, rateDifficulty } from "./difficulty";
