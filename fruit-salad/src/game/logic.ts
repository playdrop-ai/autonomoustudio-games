export const COLORS = ["coral", "gold", "jade", "cyan", "plum"] as const;
export type LanternColor = (typeof COLORS)[number];

export const COLS = 7;
export const MAX_ROWS = 12;
export const DANGER_ROW = 10;
export const ANCHOR_COLS = [1, 3, 5] as const;
export const SINK_ROWS = 2;

export type Board = (LanternColor | null)[][];

export interface Slot {
  row: number;
  col: number;
}

export interface ResolvedLantern extends Slot {
  color: LanternColor;
}

export interface GameState {
  board: Board;
  currentShot: LanternColor;
  reserveShot: LanternColor;
  score: number;
  bestScore: number;
  totalShots: number;
  shotsUntilSink: number;
  largestDrop: number;
  gameOver: boolean;
  rng: number;
}

export interface ShotResult {
  state: GameState;
  placed: ResolvedLantern;
  popped: ResolvedLantern[];
  dropped: ResolvedLantern[];
  scoreGain: number;
  bonusShots: number;
  sankLine: boolean;
  sinkSteps: number;
  boardBeforeSink: Board | null;
  injectedWave: boolean;
  boardBeforeRefill: Board | null;
}

export interface ShotPreview {
  placed: ResolvedLantern;
  popped: ResolvedLantern[];
  dropped: ResolvedLantern[];
  bonusShots: number;
  sinkSteps: number;
  shotsUntilSinkAfter: number;
  willSink: boolean;
}

const START_DEPTH = 6;
const REFILL_DEPTH = 3;
const WAVE_CLEAR_THRESHOLD = 9;
const WAVE_PATTERNS: number[][] = [
  [1, 2, 3, 4, 5],
  [0, 1, 2, 3, 4, 5, 6],
  [1, 2, 3, 4, 5],
  [0, 1, 2, 4, 5, 6],
  [1, 2, 3, 4, 5],
  [2, 3, 4],
];

export function createEmptyBoard(): Board {
  return Array.from({ length: MAX_ROWS }, () => Array<LanternColor | null>(COLS).fill(null));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

export function createInitialState(seed = 1): GameState {
  const normalizedSeed = normalizeSeed(seed);
  const board = createEmptyBoard();
  let rng = fillWave(board, normalizedSeed, activeColorCount(0), START_DEPTH, false);
  const [currentShot, nextSeed] = randomQueueColor(board, rng, activeColorCount(0));
  const [reserveShot, finalSeed] = randomQueueColor(board, nextSeed, activeColorCount(0));
  return {
    board,
    currentShot,
    reserveShot,
    score: 0,
    bestScore: 0,
    totalShots: 0,
    shotsUntilSink: shotsPerSink(0),
    largestDrop: 0,
    gameOver: false,
    rng: finalSeed,
  };
}

export function swapShots(state: GameState): GameState {
  return {
    ...state,
    currentShot: state.reserveShot,
    reserveShot: state.currentShot,
  };
}

export function activeColorCount(totalShots: number): number {
  return totalShots >= 18 ? 5 : 4;
}

export function shotsPerSink(totalShots: number): number {
  if (totalShots >= 36) return 3;
  if (totalShots >= 14) return 4;
  return 5;
}

export function countOccupied(board: Board): number {
  let count = 0;
  for (const row of board) {
    for (const color of row) {
      if (color) count += 1;
    }
  }
  return count;
}

export function maxOccupiedRow(board: Board): number {
  let result = -1;
  for (let row = 0; row < board.length; row += 1) {
    if (board[row]!.some(Boolean)) result = row;
  }
  return result;
}

export function listAttachableSlots(board: Board): Slot[] {
  const slots: Slot[] = [];
  for (let row = 0; row < MAX_ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (board[row]![col]) continue;
      if (row === 0 || neighborSlots(row, col).some((neighbor) => board[neighbor.row]?.[neighbor.col])) {
        slots.push({ row, col });
      }
    }
  }
  return slots;
}

export function isAttachable(board: Board, slot: Slot): boolean {
  return listAttachableSlots(board).some((candidate) => candidate.row === slot.row && candidate.col === slot.col);
}

export function neighborSlots(row: number, col: number): Slot[] {
  const deltas: ReadonlyArray<readonly [number, number]> =
    row % 2 === 0
      ? [
          [-1, -1],
          [-1, 0],
          [0, -1],
          [0, 1],
          [1, -1],
          [1, 0],
        ]
      : [
          [-1, 0],
          [-1, 1],
          [0, -1],
          [0, 1],
          [1, 0],
          [1, 1],
        ];
  return deltas
    .map(([dr, dc]) => ({ row: row + dr, col: col + dc }))
    .filter((slot) => slot.row >= 0 && slot.row < MAX_ROWS && slot.col >= 0 && slot.col < COLS);
}

export function applyShotAtSlot(state: GameState, slot: Slot): ShotResult {
  if (state.gameOver) throw new Error("[fruit-salad] cannot fire into a finished run");
  if (!isAttachable(state.board, slot)) throw new Error("[fruit-salad] invalid attachable slot");

  const placed: ResolvedLantern = { row: slot.row, col: slot.col, color: state.currentShot };
  let board = cloneBoard(state.board);
  board[slot.row]![slot.col] = state.currentShot;

  const resolution = resolvePlacement(board, placed);
  board = resolution.board;

  const nextTotalShots = state.totalShots + 1;
  const sinkEvery = shotsPerSink(nextTotalShots);
  let shotsUntilSink = Math.min(state.shotsUntilSink - 1 + resolution.bonusShots, sinkEvery + 2);
  let sankLine = false;
  let sinkSteps = 0;
  const boardBeforeSink = shotsUntilSink <= 0 ? cloneBoard(board) : null;

  while (shotsUntilSink <= 0) {
    sankLine = true;
    board = shiftBoardDown(board, SINK_ROWS);
    shotsUntilSink += sinkEvery;
    sinkSteps += SINK_ROWS;
  }

  let injectedWave = false;
  let rng = state.rng;
  let boardBeforeRefill: Board | null = null;

  if (sankLine) {
    board = pruneUnsupportedBoard(board);
    boardBeforeRefill = cloneBoard(board);
    injectedWave = true;
    rng = fillWave(board, rng, activeColorCount(nextTotalShots), SINK_ROWS, true);
  }

  if (countOccupied(board) < WAVE_CLEAR_THRESHOLD) {
    if (!boardBeforeRefill) {
      boardBeforeRefill = cloneBoard(board);
    }
    injectedWave = true;
    rng = fillWave(board, rng, activeColorCount(nextTotalShots), REFILL_DEPTH, true);
  }

  if (injectedWave && boardBeforeRefill) {
    board = pruneUnsupportedBoard(board);
    boardBeforeRefill = intersectBoards(boardBeforeRefill, board);
  }

  const gameOver = maxOccupiedRow(board) >= DANGER_ROW;
  const nextBest = Math.max(state.bestScore, state.score + resolution.scoreGain);
  const [reserveShot, nextSeed] = randomQueueColor(board, rng, activeColorCount(nextTotalShots));

  return {
    placed,
    popped: resolution.popped,
    dropped: resolution.dropped,
    scoreGain: resolution.scoreGain,
    bonusShots: resolution.bonusShots,
    sankLine,
    sinkSteps,
    boardBeforeSink,
    injectedWave,
    boardBeforeRefill,
    state: {
      board,
      currentShot: state.reserveShot,
      reserveShot,
      score: state.score + resolution.scoreGain,
      bestScore: nextBest,
      totalShots: nextTotalShots,
      shotsUntilSink,
      largestDrop: Math.max(state.largestDrop, resolution.dropped.length),
      gameOver,
      rng: nextSeed,
    },
  };
}

export function previewShotAtSlot(state: GameState, slot: Slot): ShotPreview {
  if (state.gameOver) throw new Error("[fruit-salad] cannot preview a finished run");
  if (!isAttachable(state.board, slot)) throw new Error("[fruit-salad] invalid attachable slot preview");

  const placed: ResolvedLantern = { row: slot.row, col: slot.col, color: state.currentShot };
  const board = cloneBoard(state.board);
  board[slot.row]![slot.col] = state.currentShot;

  const resolution = resolvePlacement(board, placed);
  const nextTotalShots = state.totalShots + 1;
  const sinkEvery = shotsPerSink(nextTotalShots);
  let shotsUntilSink = Math.min(state.shotsUntilSink - 1 + resolution.bonusShots, sinkEvery + 2);
  let sinkSteps = 0;

  while (shotsUntilSink <= 0) {
    shotsUntilSink += sinkEvery;
    sinkSteps += SINK_ROWS;
  }

  return {
    placed,
    popped: resolution.popped,
    dropped: resolution.dropped,
    bonusShots: resolution.bonusShots,
    sinkSteps,
    shotsUntilSinkAfter: shotsUntilSink,
    willSink: sinkSteps > 0,
  };
}

export function boardKinds(board: Board): string[][] {
  return board.map((row) => row.map((cell) => cell ?? "."));
}

function resolvePlacement(board: Board, placed: ResolvedLantern): {
  board: Board;
  popped: ResolvedLantern[];
  dropped: ResolvedLantern[];
  scoreGain: number;
  bonusShots: number;
} {
  const cluster = collectSameColorCluster(board, placed.row, placed.col);
  if (cluster.length < 3) {
    return {
      board,
      popped: [],
      dropped: [],
      scoreGain: 0,
      bonusShots: 0,
    };
  }

  // Branch attachments must be frozen from the impact board so a cleared
  // branch target cannot jump to a lower fruit and keep it alive mid-resolution.
  const impactAnchorTargets = snapshotAnchorSupportTargets(board);
  const popped = cluster.map(({ row, col }) => ({
    row,
    col,
    color: board[row]![col]!,
  }));

  for (const cell of cluster) {
    board[cell.row]![cell.col] = null;
  }

  const attached = collectSupportedCells(board, impactAnchorTargets);
  const dropped: ResolvedLantern[] = [];
  for (let row = 0; row < MAX_ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const color = board[row]![col];
      if (!color) continue;
      const key = slotKey({ row, col });
      if (!attached.has(key)) {
        dropped.push({ row, col, color });
        board[row]![col] = null;
      }
    }
  }

  const bonusShots =
    (dropped.length >= 4 ? 1 : 0) +
    (dropped.length >= 9 ? 1 : 0);

  const scoreGain =
    popped.length * 30 +
    dropped.length * 70 +
    Math.max(0, dropped.length - 2) * 22;

  return {
    board,
    popped,
    dropped,
    scoreGain,
    bonusShots,
  };
}

function collectSameColorCluster(board: Board, startRow: number, startCol: number): Slot[] {
  const target = board[startRow]![startCol];
  if (!target) return [];

  const queue: Slot[] = [{ row: startRow, col: startCol }];
  const visited = new Set<string>();
  const result: Slot[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = slotKey(current);
    if (visited.has(key)) continue;
    visited.add(key);
    if (board[current.row]![current.col] !== target) continue;
    result.push(current);
    for (const neighbor of neighborSlots(current.row, current.col)) {
      if (!visited.has(slotKey(neighbor)) && board[neighbor.row]![neighbor.col] === target) {
        queue.push(neighbor);
      }
    }
  }

  return result;
}

export function collectSupportedCells(board: Board, anchorTargets = snapshotAnchorSupportTargets(board)): Set<string> {
  const visited = new Set<string>();
  const queue = listSupportSeedSlots(board, anchorTargets);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const key = slotKey(current);
    if (visited.has(key)) continue;
    visited.add(key);
    for (const neighbor of neighborSlots(current.row, current.col)) {
      if (board[neighbor.row]![neighbor.col] && !visited.has(slotKey(neighbor))) {
        queue.push(neighbor);
      }
    }
  }

  return visited;
}

export function snapshotAnchorSupportTargets(board: Board): Array<Slot | null> {
  return ANCHOR_COLS.map((_, index) => findAnchorSupportTarget(board, index));
}

export function findAnchorSupportTarget(board: Board, anchorIndex: number): Slot | null {
  const anchorCol = ANCHOR_COLS[anchorIndex]!;
  let best: Slot | null = null;
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row]!.length; col += 1) {
      if (!board[row]![col]) continue;
      const distance = Math.abs(col - anchorCol);
      if (distance > 1) continue;
      if (!best || row < best.row || (row === best.row && distance < Math.abs(best.col - anchorCol))) {
        best = { row, col };
      }
    }
    if (best) break;
  }
  return best;
}

function listSupportSeedSlots(board: Board, anchorTargets: ReadonlyArray<Slot | null>): Slot[] {
  const seeds: Slot[] = [];

  for (let col = 0; col < COLS; col += 1) {
    if (board[0]![col]) seeds.push({ row: 0, col });
  }

  for (let row = 0; row < MAX_ROWS; row += 1) {
    const leftCol = leftFrameTouchCol(row);
    if (leftCol !== null && board[row]![leftCol]) {
      seeds.push({ row, col: leftCol });
    }

    const rightCol = rightFrameTouchCol(row);
    if (rightCol !== null && board[row]![rightCol]) {
      seeds.push({ row, col: rightCol });
    }
  }

  for (const target of anchorTargets) {
    if (target && board[target.row]![target.col]) seeds.push(target);
  }

  return seeds;
}

function pruneUnsupportedBoard(board: Board, anchorTargets = snapshotAnchorSupportTargets(board)): Board {
  const pruned = cloneBoard(board);
  const supported = collectSupportedCells(pruned, anchorTargets);
  for (let row = 0; row < MAX_ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (!pruned[row]![col]) continue;
      if (!supported.has(slotKey({ row, col }))) {
        pruned[row]![col] = null;
      }
    }
  }
  return pruned;
}

function intersectBoards(baseBoard: Board, finalBoard: Board): Board {
  const intersected = createEmptyBoard();
  for (let row = 0; row < MAX_ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const baseColor = baseBoard[row]![col];
      if (!baseColor) continue;
      if (finalBoard[row]![col] === baseColor) {
        intersected[row]![col] = baseColor;
      }
    }
  }
  return intersected;
}

function leftFrameTouchCol(row: number): number | null {
  return row % 2 === 0 ? 0 : null;
}

function rightFrameTouchCol(row: number): number | null {
  return row % 2 === 1 ? COLS - 1 : null;
}

function shiftBoardDown(board: Board, rows: number): Board {
  const shifted = createEmptyBoard();
  for (let row = MAX_ROWS - 1; row >= 0; row -= 1) {
    for (let col = 0; col < COLS; col += 1) {
      const color = board[row]![col];
      if (!color) continue;
      const nextRow = row + rows;
      if (nextRow >= MAX_ROWS) continue;
      shifted[nextRow]![col] = color;
    }
  }
  return shifted;
}

function fillWave(board: Board, seed: number, colorCount: number, depth: number, mergeExisting: boolean): number {
  const palette = COLORS.slice(0, colorCount);
  let rng = seed;
  const dominants: LanternColor[] = [];
  for (let anchor = 0; anchor < ANCHOR_COLS.length; anchor += 1) {
    const [pick, nextSeed] = randomInt(rng, palette.length);
    dominants.push(palette[pick]!);
    rng = nextSeed;
  }

  for (let row = 0; row < depth; row += 1) {
    const pattern = WAVE_PATTERNS[row] ?? WAVE_PATTERNS[WAVE_PATTERNS.length - 1]!;
    for (const col of pattern) {
      if (mergeExisting && board[row]![col]) continue;
      const anchorIndex = nearestAnchorIndex(col);
      const dominant = dominants[anchorIndex]!;
      const [roll, afterRoll] = randomInt(rng, 100);
      rng = afterRoll;
      let color = dominant;
      if (roll < 18) {
        const [variantIndex, afterVariant] = randomInt(rng, palette.length);
        color = palette[variantIndex]!;
        rng = afterVariant;
      } else if (roll < 28) {
        color = dominants[(anchorIndex + 1) % dominants.length]!;
      }
      board[row]![col] = color;
    }
  }
  return rng;
}

function randomQueueColor(board: Board, seed: number, colorCount: number): [LanternColor, number] {
  const palette = COLORS.slice(0, colorCount);
  const active = new Set<LanternColor>();
  for (const row of board) {
    for (const cell of row) {
      if (cell && palette.includes(cell)) active.add(cell);
    }
  }
  const source = active.size > 0 ? [...active] : palette;
  const [pick, nextSeed] = randomInt(seed, source.length);
  return [source[pick]!, nextSeed];
}

function nearestAnchorIndex(col: number): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < ANCHOR_COLS.length; index += 1) {
    const distance = Math.abs(col - ANCHOR_COLS[index]!);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }
  return bestIndex;
}

function randomInt(seed: number, maxExclusive: number): [number, number] {
  const nextSeed = (seed * 1664525 + 1013904223) >>> 0;
  return [nextSeed % maxExclusive, nextSeed];
}

function normalizeSeed(seed: number): number {
  const value = Math.abs(Math.floor(seed)) || 1;
  return value >>> 0;
}

function slotKey(slot: Slot): string {
  return `${slot.row}:${slot.col}`;
}
