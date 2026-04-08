import { DEFAULT_DIFFICULTY, DIFFICULTIES } from "./data";
import {
  createInitialState as createGeneratedState,
  createStateFromLayout as createLayoutState,
  getCell,
  indexFor,
  neighbors,
  syncConnected,
} from "./generator";
import type { DebugSnapshot, DifficultyKey, GameState } from "./types";

const PULSE_DECAY_PER_MS = 1 / 260;

export function createInitialState(difficultyKey: DifficultyKey = DEFAULT_DIFFICULTY, seed = Date.now()): GameState {
  return createGeneratedState(difficultyKey, seed);
}

export function createStateFromLayout(layout: string[], options?: { difficultyKey?: DifficultyKey }): GameState {
  return createLayoutState(layout, options);
}

export function stepGame(state: GameState, dtMs: number): void {
  if (state.runState === "playing") {
    state.elapsedMs += dtMs;
  }

  for (const cell of state.cells) {
    cell.revealPulse = Math.max(0, cell.revealPulse - dtMs * PULSE_DECAY_PER_MS);
    cell.connectPulse = Math.max(0, cell.connectPulse - dtMs * PULSE_DECAY_PER_MS);
    cell.burnPulse = Math.max(0, cell.burnPulse - dtMs * PULSE_DECAY_PER_MS);
  }
}

export function revealCell(state: GameState, col: number, row: number): boolean {
  if (state.runState !== "playing") return false;
  if (!isInBounds(state, col, row)) return false;

  const index = indexFor(state.width, col, row);
  const cell = getCell(state.cells, index);
  if (cell.revealed || cell.flagged) return false;

  if (cell.isHazard) {
    cell.revealed = true;
    cell.burnt = true;
    cell.burnPulse = 1;
    state.surgesUsed += 1;
    if (state.surgesUsed >= state.surgeLimit) {
      state.runState = "lost";
    }
    return true;
  }

  revealSafeIndex(state, index);
  state.revealedSafeCount = state.cells.filter((candidate) => !candidate.isHazard && candidate.revealed).length;
  syncConnected(state);
  return true;
}

export function toggleFlag(state: GameState, col: number, row: number): boolean {
  if (state.runState !== "playing") return false;
  if (!isInBounds(state, col, row)) return false;

  const index = indexFor(state.width, col, row);
  const cell = getCell(state.cells, index);
  if (cell.revealed) return false;
  cell.flagged = !cell.flagged;
  return true;
}

export function setFlagMode(state: GameState, next: boolean): void {
  state.flagMode = next;
}

export function toggleFlagMode(state: GameState): void {
  state.flagMode = !state.flagMode;
}

export function difficultyLabel(key: DifficultyKey): string {
  return DIFFICULTIES[key].label;
}

export function progressPercent(state: GameState): number {
  if (state.totalSafeCells === 0) return 0;
  return Math.round((state.connectedCount / state.totalSafeCells) * 100);
}

export function createDebugSnapshot(state: GameState): DebugSnapshot {
  return {
    difficultyKey: state.difficultyKey,
    elapsedMs: state.elapsedMs,
    surgesUsed: state.surgesUsed,
    surgeLimit: state.surgeLimit,
    runState: state.runState,
    flagMode: state.flagMode,
    connectedCount: state.connectedCount,
    revealedSafeCount: state.revealedSafeCount,
    totalSafeCells: state.totalSafeCells,
    width: state.width,
    height: state.height,
    source: {
      col: state.sourceIndex % state.width,
      row: Math.floor(state.sourceIndex / state.width),
    },
    relay: {
      col: state.relayIndex % state.width,
      row: Math.floor(state.relayIndex / state.width),
    },
    board: createBoardLabels(state),
  };
}

function createBoardLabels(state: GameState): string[][] {
  const rows: string[][] = [];
  for (let row = 0; row < state.height; row += 1) {
    const values: string[] = [];
    for (let col = 0; col < state.width; col += 1) {
      const index = indexFor(state.width, col, row);
      if (index === state.sourceIndex) {
        values.push(state.cells[index]?.connected ? "S*" : "S");
        continue;
      }
      if (index === state.relayIndex) {
        values.push(state.cells[index]?.connected ? "R*" : "R");
        continue;
      }
      const cell = getCell(state.cells, index);
      if (cell.flagged) {
        values.push("F");
      } else if (cell.burnt) {
        values.push("X");
      } else if (!cell.revealed) {
        values.push("·");
      } else if (cell.connected) {
        values.push(cell.clue === 0 ? "0*" : `${cell.clue}*`);
      } else {
        values.push(String(cell.clue));
      }
    }
    rows.push(values);
  }
  return rows;
}

function revealSafeIndex(state: GameState, startIndex: number): void {
  const queue = [startIndex];
  const seen = new Set<number>();

  while (queue.length > 0) {
    const index = queue.shift();
    if (index === undefined || seen.has(index)) continue;
    seen.add(index);

    const cell = getCell(state.cells, index);
    if (cell.flagged || cell.revealed || cell.isHazard) continue;

    cell.revealed = true;
    cell.revealPulse = 1;
    if (cell.clue !== 0) continue;

    for (const neighbor of neighbors(index, state.width, state.height)) {
      const nextCell = getCell(state.cells, neighbor);
      if (!nextCell.flagged && !nextCell.isHazard && !nextCell.revealed) {
        queue.push(neighbor);
      }
    }
  }
}

function isInBounds(state: GameState, col: number, row: number): boolean {
  return col >= 0 && col < state.width && row >= 0 && row < state.height;
}
