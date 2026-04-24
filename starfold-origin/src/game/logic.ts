export const BOARD_ROWS = 5;
export const BOARD_COLS = 5;
export const ASH_GRACE_MOVES = 5;
export const ASH_EVERY_TWO_END = 10;
export const ASH_EVERY_MOVE_END = 20;
export const DOUBLE_ASH_END = 30;
export const TRIPLE_ASH_START = DOUBLE_ASH_END + 1;

export type SigilKind = "sun" | "moon" | "wave" | "leaf" | "ember";
export type AshKind = "ash3" | "ash2" | "ash1";
export type TileKind = SigilKind | AshKind;
export type Axis = "row" | "col";
export type Direction = -1 | 1;
export type GameOverReason = "no_moves";

export interface Position {
  row: number;
  col: number;
}

export interface Tile {
  id: number;
  kind: TileKind;
}

export type Board = Tile[][];
export type SparseBoard = Array<Array<Tile | null>>;

export interface Move {
  axis: Axis;
  index: number;
  direction: Direction;
}

export interface GameState {
  board: Board;
  nextId: number;
  score: number;
  moves: number;
  ashCount: number;
  rngState: number;
  gameOver: boolean;
  gameOverReason: GameOverReason | null;
}

export interface ShiftStage {
  kind: "shift";
  before: Board;
  after: Board;
  move: Move;
  startOffsetPx: number;
}

export interface ClearStage {
  kind: "clear";
  board: Board;
  matched: Position[];
  damaged: Position[];
  cleansed: Position[];
  scoreGain: number;
  combo: number;
}

export interface CollapseStage {
  kind: "collapse";
  before: SparseBoard;
  after: Board;
}

export interface AshStage {
  kind: "ash";
  before: Board;
  after: Board;
  position: Position;
}

export type TurnStage = ShiftStage | ClearStage | CollapseStage | AshStage;

export interface TurnResult {
  state: GameState;
  stages: TurnStage[];
  maxCombo: number;
  scoreGained: number;
}

const SIGIL_KINDS: SigilKind[] = ["sun", "moon", "wave", "leaf", "ember"];
const ASH_KINDS: AshKind[] = ["ash3", "ash2", "ash1"];

export function createInitialState(seed = Date.now() >>> 0): GameState {
  let rngState = seed >>> 0;
  let nextId = 1;
  let board: Board = [];
  let playable = false;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    board = [];
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      const line: Tile[] = [];
      for (let col = 0; col < BOARD_COLS; col += 1) {
        let pick: SigilKind = SIGIL_KINDS[0]!;
        let guard = 0;
        do {
          const result = randomSigil(rngState);
          pick = result.kind;
          rngState = result.rngState;
          guard += 1;
        } while (guard < 10 && createsGroupAt(board, line, row, col, pick));
        line.push({ id: nextId, kind: pick });
        nextId += 1;
      }
      board.push(line);
    }
    if (findGroups(board).length === 0 && getPlayableMoves(board).length > 0) {
      playable = true;
      break;
    }
  }

  if (!playable) {
    throw new Error("Failed to generate a playable starting board");
  }

  return {
    board,
    nextId,
    score: 0,
    moves: 0,
    ashCount: 0,
    rngState,
    gameOver: false,
    gameOverReason: null,
  };
}

export function applyMove(state: GameState, move: Move, options: { startOffsetPx?: number } = {}): TurnResult {
  if (state.gameOver) {
    return { state, stages: [], maxCombo: 0, scoreGained: 0 };
  }
  if (!isPlayableMove(state.board, move)) {
    return { state, stages: [], maxCombo: 0, scoreGained: 0 };
  }

  let board = cloneBoard(state.board);
  const stages: TurnStage[] = [];
  let nextId = state.nextId;
  let rngState = state.rngState;
  let score = state.score;
  let totalGain = 0;
  let maxCombo = 0;

  const shifted = rotateBoard(board, move);
  stages.push({ kind: "shift", before: board, after: shifted, move, startOffsetPx: options.startOffsetPx ?? 0 });
  board = shifted;

  let combo = 0;
  while (true) {
    const groups = findGroups(board);
    if (groups.length === 0) {
      break;
    }
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    const { matched, damaged, cleansed, sparseBoard } = clearGroups(board, groups);
    const scoreGain = matched.length * 90 * combo + cleansed.length * 60 * combo;
    stages.push({
      kind: "clear",
      board,
      matched,
      damaged,
      cleansed,
      scoreGain,
      combo,
    });
    score += scoreGain;
    totalGain += scoreGain;

    const collapsed = collapseSparseBoard(sparseBoard, nextId, rngState);
    stages.push({
      kind: "collapse",
      before: sparseBoard,
      after: collapsed.board,
    });
    board = collapsed.board;
    nextId = collapsed.nextId;
    rngState = collapsed.rngState;
  }

  const moves = state.moves + 1;
  const ashBursts = ashBurstCountForMove(moves);
  if (ashBursts > 0) {
    for (let burst = 0; burst < ashBursts; burst += 1) {
      const ashResult = addAsh(board, rngState);
      if (!ashResult) break;
      stages.push({
        kind: "ash",
        before: board,
        after: ashResult.board,
        position: ashResult.position,
      });
      board = ashResult.board;
      rngState = ashResult.rngState;
    }
  }

  const ashCount = countAsh(board);
  const gameOverReason: GameOverReason | null = getPlayableMoves(board).length > 0 ? null : "no_moves";
  return {
    state: {
      board,
      nextId,
      score,
      moves,
      ashCount,
      rngState,
      gameOver: gameOverReason !== null,
      gameOverReason,
    },
    stages,
    maxCombo,
    scoreGained: totalGain,
  };
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

export function countAsh(board: Board): number {
  let count = 0;
  for (const row of board) {
    for (const tile of row) {
      if (isAshKind(tile.kind)) count += 1;
    }
  }
  return count;
}

export function ashIntervalForMove(moves: number): number {
  if (moves <= ASH_GRACE_MOVES) return 0;
  if (moves <= ASH_EVERY_TWO_END) return 2;
  return 1;
}

export function ashBurstCountForMove(moves: number): number {
  if (moves <= ASH_GRACE_MOVES) return 0;
  if (moves <= ASH_EVERY_TWO_END) {
    return moves % 2 === 0 ? 1 : 0;
  }
  if (moves <= ASH_EVERY_MOVE_END) return 1;
  if (moves <= DOUBLE_ASH_END) return 2;
  return 3;
}

export function findGroups(board: Board): Position[][] {
  const visited = Array.from({ length: BOARD_ROWS }, () => Array<boolean>(BOARD_COLS).fill(false));
  const groups: Position[][] = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      if (visited[row]![col]) continue;
      const tile = board[row]![col]!;
      visited[row]![col] = true;
      if (isAshKind(tile.kind)) continue;
      const group = floodGroup(board, visited, row, col, tile.kind);
      if (group.length >= 3) groups.push(group);
    }
  }
  return groups;
}

export function getPlayableMoves(board: Board): Move[] {
  const moves: Move[] = [];

  for (let index = 0; index < BOARD_ROWS; index += 1) {
    for (const direction of [1, -1] as const) {
      const move: Move = { axis: "row", index, direction };
      if (findGroups(rotateBoard(board, move)).length > 0) {
        moves.push(move);
      }
    }
  }

  for (let index = 0; index < BOARD_COLS; index += 1) {
    for (const direction of [1, -1] as const) {
      const move: Move = { axis: "col", index, direction };
      if (findGroups(rotateBoard(board, move)).length > 0) {
        moves.push(move);
      }
    }
  }

  return moves;
}

export function hasPlayableMove(board: Board): boolean {
  return getPlayableMoves(board).length > 0;
}

export function isAshKind(kind: TileKind): kind is AshKind {
  return ASH_KINDS.includes(kind as AshKind);
}

export function boardKinds(board: Board): TileKind[][] {
  return board.map((row) => row.map((tile) => tile.kind));
}

export function createBoardFromKinds(kinds: TileKind[][], nextId = 1): { board: Board; nextId: number } {
  const board: Board = kinds.map((row) =>
    row.map((kind) => {
      const tile = { id: nextId, kind };
      nextId += 1;
      return tile;
    }),
  );
  return { board, nextId };
}

function floodGroup(board: Board, visited: boolean[][], startRow: number, startCol: number, kind: SigilKind): Position[] {
  const queue: Position[] = [{ row: startRow, col: startCol }];
  const group: Position[] = [{ row: startRow, col: startCol }];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of neighbors(current.row, current.col)) {
      if (visited[neighbor.row]![neighbor.col]) continue;
      const tile = board[neighbor.row]![neighbor.col]!;
      if (tile.kind !== kind) continue;
      visited[neighbor.row]![neighbor.col] = true;
      group.push(neighbor);
      queue.push(neighbor);
    }
  }
  return group;
}

function clearGroups(board: Board, groups: Position[][]): { matched: Position[]; damaged: Position[]; cleansed: Position[]; sparseBoard: SparseBoard } {
  const matched = flattenPositions(groups);
  const sparseBoard: SparseBoard = board.map((row) => row.slice());
  const matchedSet = toPositionKeySet(matched);
  const damagedSet = new Set<string>();
  const cleansedSet = new Set<string>();
  for (const pos of matched) {
    sparseBoard[pos.row]![pos.col] = null;
  }
  for (const pos of matched) {
    for (const neighbor of neighbors(pos.row, pos.col)) {
      const key = positionKey(neighbor);
      if (matchedSet.has(key) || damagedSet.has(key)) continue;
      const tile = sparseBoard[neighbor.row]![neighbor.col];
      if (tile && isAshKind(tile.kind)) {
        damagedSet.add(key);
        if (tile.kind === "ash1") {
          sparseBoard[neighbor.row]![neighbor.col] = null;
          cleansedSet.add(key);
        } else {
          sparseBoard[neighbor.row]![neighbor.col] = {
            ...tile,
            kind: damageAsh(tile.kind),
          };
        }
      }
    }
  }
  return {
    matched,
    damaged: Array.from(damagedSet, decodePositionKey),
    cleansed: Array.from(cleansedSet, decodePositionKey),
    sparseBoard,
  };
}

function collapseSparseBoard(sparseBoard: SparseBoard, nextId: number, rngState: number): { board: Board; nextId: number; rngState: number } {
  const board: Board = Array.from({ length: BOARD_ROWS }, () => Array<Tile>(BOARD_COLS));
  for (let col = 0; col < BOARD_COLS; col += 1) {
    const survivors: Tile[] = [];
    for (let row = BOARD_ROWS - 1; row >= 0; row -= 1) {
      const tile = sparseBoard[row]![col];
      if (tile) survivors.push(tile);
    }
    let row = BOARD_ROWS - 1;
    for (const tile of survivors) {
      board[row]![col] = tile;
      row -= 1;
    }
    while (row >= 0) {
      const result = randomSigil(rngState);
      rngState = result.rngState;
      board[row]![col] = { id: nextId, kind: result.kind };
      nextId += 1;
      row -= 1;
    }
  }
  return { board, nextId, rngState };
}

function addAsh(board: Board, rngState: number): { board: Board; position: Position; rngState: number } | null {
  const candidates: Array<{ pos: Position; weight: number }> = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      if (isAshKind(board[row]![col]!.kind)) continue;
      candidates.push({
        pos: { row, col },
        weight: (row + 1) * (row + 1),
      });
    }
  }
  if (candidates.length === 0) return null;

  const totalWeight = candidates.reduce((sum, item) => sum + item.weight, 0);
  const roll = nextRandom(rngState);
  rngState = roll.rngState;
  let cursor = roll.value * totalWeight;
  let chosen = candidates[candidates.length - 1]!;
  for (const candidate of candidates) {
    cursor -= candidate.weight;
    if (cursor <= 0) {
      chosen = candidate;
      break;
    }
  }
  const nextBoard = cloneBoard(board);
  const tile = nextBoard[chosen.pos.row]![chosen.pos.col]!;
  nextBoard[chosen.pos.row]![chosen.pos.col] = { ...tile, kind: "ash3" };
  return { board: nextBoard, position: chosen.pos, rngState };
}

function isPlayableMove(board: Board, move: Move): boolean {
  return getPlayableMoves(board).some(
    (candidate) =>
      candidate.axis === move.axis && candidate.index === move.index && candidate.direction === move.direction,
  );
}

function damageAsh(kind: Exclude<AshKind, "ash1">): AshKind {
  return kind === "ash3" ? "ash2" : "ash1";
}

function rotateBoard(board: Board, move: Move): Board {
  const next = cloneBoard(board);
  if (move.axis === "row") {
    const row = board[move.index]!;
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const source = mod(col - move.direction, BOARD_COLS);
      next[move.index]![col] = row[source]!;
    }
    return next;
  }

  for (let row = 0; row < BOARD_ROWS; row += 1) {
    const source = mod(row - move.direction, BOARD_ROWS);
    next[row]![move.index] = board[source]![move.index]!;
  }
  return next;
}

function randomSigil(rngState: number): { kind: SigilKind; rngState: number } {
  const next = nextRandom(rngState);
  const index = Math.floor(next.value * SIGIL_KINDS.length);
  return { kind: SIGIL_KINDS[index]!, rngState: next.rngState };
}

function nextRandom(seed: number): { value: number; rngState: number } {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, rngState: (seed + 0x6d2b79f5) >>> 0 };
}

function createsGroupAt(existingRows: Tile[][], currentRow: Tile[], row: number, col: number, kind: SigilKind): boolean {
  const boardKinds = existingRows.map((existing) => existing.map((tile) => tile.kind as SigilKind));
  boardKinds[row] = currentRow.map((tile) => tile.kind as SigilKind);
  boardKinds[row]!.push(kind);
  const component = [{ row, col }];
  const seen = new Set<string>([positionKey({ row, col })]);
  const queue = component.slice();
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of neighbors(current.row, current.col)) {
      const rowKinds = boardKinds[neighbor.row];
      const value = rowKinds?.[neighbor.col];
      if (value !== kind) continue;
      const key = positionKey(neighbor);
      if (seen.has(key)) continue;
      seen.add(key);
      component.push(neighbor);
      queue.push(neighbor);
    }
  }
  return component.length >= 3;
}

function neighbors(row: number, col: number): Position[] {
  const items: Position[] = [];
  if (row > 0) items.push({ row: row - 1, col });
  if (row < BOARD_ROWS - 1) items.push({ row: row + 1, col });
  if (col > 0) items.push({ row, col: col - 1 });
  if (col < BOARD_COLS - 1) items.push({ row, col: col + 1 });
  return items;
}

function flattenPositions(groups: Position[][]): Position[] {
  const result: Position[] = [];
  for (const group of groups) {
    for (const pos of group) result.push(pos);
  }
  return result;
}

function toPositionKeySet(positions: Position[]): Set<string> {
  return new Set(positions.map(positionKey));
}

function positionKey(position: Position): string {
  return `${position.row}:${position.col}`;
}

function decodePositionKey(key: string): Position {
  const [row, col] = key.split(":").map(Number);
  return { row: row ?? 0, col: col ?? 0 };
}

function mod(value: number, size: number): number {
  return ((value % size) + size) % size;
}
