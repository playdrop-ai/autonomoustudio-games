export const BOARD_COLS = 8;
export const BOARD_ROWS = 10;
export const SAFE_REVEAL_SCORE = 10;

export type GameStatus = "ready" | "playing" | "cleared" | "failed";
export type ActionOutcome = "noop" | "continue" | "clear" | "failed";

export interface Cell {
  mine: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacent: number;
}

export interface BoardState {
  rows: number;
  cols: number;
  cells: Cell[];
  remainingSafe: number;
  explodedIndex: number | null;
}

export interface GameState {
  chamber: number;
  chambersCleared: number;
  score: number;
  status: GameStatus;
  board: BoardState;
  rngState: number;
  mineCount: number;
}

export interface ActionResult {
  state: GameState;
  outcome: ActionOutcome;
  revealed: number;
  revealedIndices: number[];
  scoreGained: number;
  clearBonus: number;
}

interface RandomStep {
  state: number;
  value: number;
}

interface GeneratedBoard {
  board: BoardState;
  rngState: number;
}

export function createInitialState(seed: number = 0x4f2a6c1d): GameState {
  const normalizedSeed = seed >>> 0 || 1;
  return {
    chamber: 1,
    chambersCleared: 0,
    score: 0,
    status: "ready",
    board: createEmptyBoard(),
    rngState: normalizedSeed,
    mineCount: mineCountForChamber(1),
  };
}

export function mineCountForChamber(chamber: number): number {
  return Math.min(10 + Math.max(0, chamber - 1), 18);
}

export function createNextChamber(state: GameState): GameState {
  if (state.status !== "cleared") return state;
  const nextChamber = state.chamber + 1;
  return {
    ...state,
    chamber: nextChamber,
    status: "ready",
    board: createEmptyBoard(),
    mineCount: mineCountForChamber(nextChamber),
  };
}

export function toggleFlag(state: GameState, index: number): GameState {
  if (state.status === "failed" || state.status === "cleared") return state;
  const target = state.board.cells[index];
  if (!target || target.revealed) return state;

  const cells = state.board.cells.slice();
  cells[index] = { ...target, flagged: !target.flagged };
  return {
    ...state,
    board: {
      ...state.board,
      cells,
    },
  };
}

export function uncoverCell(state: GameState, index: number): ActionResult {
  if (state.status === "failed" || state.status === "cleared") {
    return noop(state);
  }

  let working = state;
  if (working.status === "ready") {
    const generated = generateBoard(working.board, working.rngState, index, working.mineCount);
    working = {
      ...working,
      board: generated.board,
      rngState: generated.rngState,
      status: "playing",
    };
  }

  const target = working.board.cells[index];
  if (!target || target.flagged || target.revealed) return noop(working);

  if (target.mine) {
    return {
      state: triggerFailure(working, index),
      outcome: "failed",
      revealed: 0,
      revealedIndices: [],
      scoreGained: 0,
      clearBonus: 0,
    };
  }

  return revealSafeCells(working, [index]);
}

export function chordCell(state: GameState, index: number): ActionResult {
  if (state.status !== "playing") return noop(state);
  const target = state.board.cells[index];
  if (!target || !target.revealed || target.adjacent === 0) return noop(state);

  const neighbors = neighborIndices(index, state.board.rows, state.board.cols);
  const flaggedCount = neighbors.reduce((count, neighborIndex) => {
    const neighbor = state.board.cells[neighborIndex];
    return count + (neighbor?.flagged ? 1 : 0);
  }, 0);
  if (flaggedCount !== target.adjacent) return noop(state);

  const candidates = neighbors.filter((neighborIndex) => {
    const cell = state.board.cells[neighborIndex];
    if (!cell) return false;
    return !cell.flagged && !cell.revealed;
  });
  if (candidates.length === 0) return noop(state);

  if (candidates.some((neighborIndex) => state.board.cells[neighborIndex]?.mine)) {
    return {
      state: triggerFailure(state, candidates.find((neighborIndex) => state.board.cells[neighborIndex]?.mine) ?? null),
      outcome: "failed",
      revealed: 0,
      revealedIndices: [],
      scoreGained: 0,
      clearBonus: 0,
    };
  }

  return revealSafeCells(state, candidates);
}

export function neighborIndices(index: number, rows: number = BOARD_ROWS, cols: number = BOARD_COLS): number[] {
  const row = Math.floor(index / cols);
  const col = index % cols;
  const result: number[] = [];
  for (let rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
    for (let colOffset = -1; colOffset <= 1; colOffset += 1) {
      if (rowOffset === 0 && colOffset === 0) continue;
      const nextRow = row + rowOffset;
      const nextCol = col + colOffset;
      if (nextRow < 0 || nextCol < 0 || nextRow >= rows || nextCol >= cols) continue;
      result.push(nextRow * cols + nextCol);
    }
  }
  return result;
}

export function boardSnapshot(board: BoardState): string[] {
  const lines: string[] = [];
  for (let row = 0; row < board.rows; row += 1) {
    let line = "";
    for (let col = 0; col < board.cols; col += 1) {
      const cell = board.cells[row * board.cols + col];
      if (!cell) {
        line += ".";
        continue;
      }
      if (cell.mine) {
        line += "m";
      } else if (cell.adjacent > 0) {
        line += String(cell.adjacent);
      } else {
        line += ".";
      }
    }
    lines.push(line);
  }
  return lines;
}

export function countFlags(board: BoardState): number {
  return board.cells.reduce((count, cell) => count + (cell.flagged ? 1 : 0), 0);
}

function revealSafeCells(state: GameState, indices: number[]): ActionResult {
  const cells = state.board.cells.slice();
  const queue = [...indices];
  const seen = new Set<number>();
  let revealed = 0;
  const revealedIndices: number[] = [];
  let remainingSafe = state.board.remainingSafe;

  while (queue.length > 0) {
    const index = queue.pop()!;
    if (seen.has(index)) continue;
    seen.add(index);

    const current = cells[index];
    if (!current || current.flagged || current.revealed || current.mine) continue;

    cells[index] = { ...current, revealed: true };
    revealed += 1;
    revealedIndices.push(index);
    remainingSafe -= 1;

    if (current.adjacent === 0) {
      for (const neighborIndex of neighborIndices(index, state.board.rows, state.board.cols)) {
        const neighbor = cells[neighborIndex];
        if (!neighbor) continue;
        if (!neighbor.revealed && !neighbor.flagged && !neighbor.mine) {
          queue.push(neighborIndex);
        }
      }
    }
  }

  if (revealed === 0) return noop(state);

  const scoreGained = revealed * SAFE_REVEAL_SCORE;
  const clearBonus = remainingSafe === 0 ? 250 * state.chamber : 0;
  const nextStatus: GameStatus = remainingSafe === 0 ? "cleared" : "playing";

  return {
    state: {
      ...state,
      status: nextStatus,
      chambersCleared: remainingSafe === 0 ? state.chamber : state.chambersCleared,
      score: state.score + scoreGained + clearBonus,
      board: {
        ...state.board,
        cells,
        remainingSafe,
      },
    },
    outcome: remainingSafe === 0 ? "clear" : "continue",
    revealed,
    revealedIndices,
    scoreGained,
    clearBonus,
  };
}

function triggerFailure(state: GameState, explodedIndex: number | null): GameState {
  const cells = state.board.cells.map((cell, index) => {
    if (!cell.mine) return cell;
    return {
      ...cell,
      revealed: true,
      flagged: index === explodedIndex ? false : cell.flagged,
    };
  });
  return {
    ...state,
    status: "failed",
    board: {
      ...state.board,
      cells,
      explodedIndex,
    },
  };
}

function createEmptyBoard(): BoardState {
  const total = BOARD_COLS * BOARD_ROWS;
  return {
    rows: BOARD_ROWS,
    cols: BOARD_COLS,
    remainingSafe: total,
    explodedIndex: null,
    cells: Array.from({ length: total }, () => ({
      mine: false,
      revealed: false,
      flagged: false,
      adjacent: 0,
    })),
  };
}

function generateBoard(board: BoardState, rngState: number, safeIndex: number, mineCount: number): GeneratedBoard {
  const cells = board.cells.map((cell) => ({
    mine: false,
    revealed: false,
    flagged: cell.flagged,
    adjacent: 0,
  }));
  const safeZone = new Set<number>([safeIndex, ...neighborIndices(safeIndex, board.rows, board.cols)]);
  const candidates = cells
    .map((_, index) => index)
    .filter((index) => !safeZone.has(index));
  if (mineCount >= candidates.length) {
    throw new Error("[shardlight] Mine count leaves no safe tiles for guaranteed first reveal.");
  }

  let nextState = rngState;
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const random = nextRandom(nextState);
    nextState = random.state;
    const swapIndex = Math.floor(random.value * (i + 1));
    const current = candidates[i]!;
    candidates[i] = candidates[swapIndex]!;
    candidates[swapIndex] = current;
  }

  const mineSet = new Set<number>(candidates.slice(0, mineCount));
  for (let index = 0; index < cells.length; index += 1) {
    cells[index]!.mine = mineSet.has(index);
  }
  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index];
    if (!cell || cell.mine) continue;
    const adjacent = neighborIndices(index, board.rows, board.cols).reduce((count, neighborIndex) => {
      return count + (cells[neighborIndex]?.mine ? 1 : 0);
    }, 0);
    cell.adjacent = adjacent;
  }

  return {
    board: {
      rows: board.rows,
      cols: board.cols,
      cells,
      explodedIndex: null,
      remainingSafe: cells.length - mineCount,
    },
    rngState: nextState,
  };
}

function nextRandom(state: number): RandomStep {
  const nextState = (Math.imul(state, 1664525) + 1013904223) >>> 0;
  return {
    state: nextState,
    value: nextState / 0x100000000,
  };
}

function noop(state: GameState): ActionResult {
  return {
    state,
    outcome: "noop",
    revealed: 0,
    revealedIndices: [],
    scoreGained: 0,
    clearBonus: 0,
  };
}
