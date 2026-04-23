import { DIFFICULTIES, SURGE_LIMIT } from "./data";
import type { CellState, DifficultyConfig, DifficultyKey, GameState } from "./types";

interface RNG {
  next(): number;
  int(maxExclusive: number): number;
}

export function createInitialState(difficultyKey: DifficultyKey, seed: number): GameState {
  const difficulty = DIFFICULTIES[difficultyKey];
  return createGeneratedState(difficulty, seed);
}

export function createStateFromLayout(
  layout: string[],
  options?: {
    difficultyKey?: DifficultyKey;
    source?: { col: number; row: number };
    relay?: { col: number; row: number };
    surgesUsed?: number;
  },
): GameState {
  if (layout.length === 0) {
    throw new Error("layout_missing");
  }

  const width = layout[0]?.length ?? 0;
  const height = layout.length;
  if (width === 0) {
    throw new Error("layout_width_missing");
  }

  const cells: CellState[] = [];
  for (let row = 0; row < height; row += 1) {
    const line = layout[row];
    if (!line || line.length !== width) {
      throw new Error("layout_width_mismatch");
    }
    for (let col = 0; col < width; col += 1) {
      const char = line[col];
      if (!char) {
        throw new Error("layout_cell_missing");
      }
      cells.push(createCell(char === "#"));
    }
  }

  const source = options?.source ?? { col: 0, row: 0 };
  const relay = options?.relay ?? { col: width - 1, row: height - 1 };
  const sourceIndex = indexFor(width, source.col, source.row);
  const relayIndex = indexFor(width, relay.col, relay.row);

  const sourceCell = getCell(cells, sourceIndex);
  const relayCell = getCell(cells, relayIndex);
  sourceCell.isHazard = false;
  relayCell.isHazard = false;
  sourceCell.revealed = true;
  relayCell.revealed = true;

  populateClues(cells, width, height);

  const state: GameState = {
    difficultyKey: options?.difficultyKey ?? "live",
    width,
    height,
    cells,
    sourceIndex,
    relayIndex,
    surgesUsed: options?.surgesUsed ?? 0,
    surgeLimit: SURGE_LIMIT,
    elapsedMs: 0,
    runState: "playing",
    flagMode: false,
    connectedCount: 0,
    revealedSafeCount: 0,
    totalSafeCells: cells.filter((cell) => !cell.isHazard).length,
    seed: 0,
  };

  syncConnected(state);
  state.revealedSafeCount = countRevealedSafeCells(state);
  return state;
}

export function hasUnderlyingSafeRoute(state: Pick<GameState, "width" | "height" | "cells" | "sourceIndex" | "relayIndex">): boolean {
  const visited = new Set<number>();
  const queue = [state.sourceIndex];
  visited.add(state.sourceIndex);

  while (queue.length > 0) {
    const index = queue.shift();
    if (index === undefined) {
      break;
    }
    if (index === state.relayIndex) {
      return true;
    }
    for (const next of orthogonalNeighbors(index, state.width, state.height)) {
      if (visited.has(next)) continue;
      const cell = getCell(state.cells, next);
      if (cell.isHazard) continue;
      visited.add(next);
      queue.push(next);
    }
  }

  return false;
}

export function syncConnected(state: GameState): void {
  const nextConnected = new Array<boolean>(state.cells.length).fill(false);
  const sourceCell = getCell(state.cells, state.sourceIndex);
  if (sourceCell.revealed && !sourceCell.isHazard) {
    const queue = [state.sourceIndex];
    nextConnected[state.sourceIndex] = true;

    while (queue.length > 0) {
      const index = queue.shift();
      if (index === undefined) break;
      for (const neighbor of orthogonalNeighbors(index, state.width, state.height)) {
        if (nextConnected[neighbor]) continue;
        const cell = getCell(state.cells, neighbor);
        if (!cell.revealed || cell.isHazard || cell.burnt) continue;
        nextConnected[neighbor] = true;
        queue.push(neighbor);
      }
    }
  }

  let connectedCount = 0;
  for (let index = 0; index < state.cells.length; index += 1) {
    const cell = getCell(state.cells, index);
    const nowConnected = nextConnected[index] ?? false;
    if (nowConnected && !cell.connected) {
      cell.connectPulse = 1;
    }
    cell.connected = nowConnected;
    if (nowConnected) {
      connectedCount += 1;
    }
  }
  state.connectedCount = connectedCount;
  if (getCell(state.cells, state.relayIndex).connected) {
    state.runState = "won";
  }
}

function createGeneratedState(difficulty: DifficultyConfig, seed: number): GameState {
  const source = { col: 0, row: 0 };
  const relay = { col: difficulty.width - 1, row: difficulty.height - 1 };

  for (let attempt = 0; attempt < 200; attempt += 1) {
    const rng = createRng(seed + attempt * 97);
    const path = buildRoutePath(difficulty.width, difficulty.height, source, relay, rng);
    const protectedCells = new Set<number>(path);
    protectedCells.add(indexFor(difficulty.width, source.col, source.row));
    protectedCells.add(indexFor(difficulty.width, relay.col, relay.row));

    const cells = Array.from({ length: difficulty.width * difficulty.height }, () => createCell(false));

    const hazardSlots: number[] = [];
    for (let index = 0; index < cells.length; index += 1) {
      if (!protectedCells.has(index)) {
        hazardSlots.push(index);
      }
    }

    shuffleInPlace(hazardSlots, rng);
    const hazardsToPlace = Math.min(difficulty.hazards, hazardSlots.length);
    for (let index = 0; index < hazardsToPlace; index += 1) {
      const hazardIndex = hazardSlots[index];
      if (hazardIndex === undefined) {
        throw new Error("hazard_index_missing");
      }
      getCell(cells, hazardIndex).isHazard = true;
    }

    const sourceIndex = indexFor(difficulty.width, source.col, source.row);
    const relayIndex = indexFor(difficulty.width, relay.col, relay.row);
    getCell(cells, sourceIndex).revealed = true;
    getCell(cells, relayIndex).revealed = true;
    populateClues(cells, difficulty.width, difficulty.height);

    const state: GameState = {
      difficultyKey: difficulty.key,
      width: difficulty.width,
      height: difficulty.height,
      cells,
      sourceIndex,
      relayIndex,
      surgesUsed: 0,
      surgeLimit: SURGE_LIMIT,
      elapsedMs: 0,
      runState: "playing",
      flagMode: false,
      connectedCount: 0,
      revealedSafeCount: 0,
      totalSafeCells: cells.filter((cell) => !cell.isHazard).length,
      seed,
    };

    syncConnected(state);
    state.revealedSafeCount = countRevealedSafeCells(state);

    if (hasUnderlyingSafeRoute(state) && state.connectedCount < 2) {
      return state;
    }
  }

  throw new Error("route_generation_failed");
}

function buildRoutePath(
  width: number,
  height: number,
  source: { col: number; row: number },
  relay: { col: number; row: number },
  rng: RNG,
): number[] {
  const path = [indexFor(width, source.col, source.row)];
  let row = source.row;
  let col = source.col;

  while (row < relay.row) {
    const remainingRows = relay.row - row;
    const horizontalDelta = relay.col - col;
    const shouldShift = horizontalDelta !== 0 && (Math.abs(horizontalDelta) >= remainingRows || rng.next() < 0.68);

    if (shouldShift) {
      const direction = Math.sign(horizontalDelta);
      col += direction;
      path.push(indexFor(width, col, row));
    }

    row += 1;
    path.push(indexFor(width, col, row));
  }

  while (col !== relay.col) {
    col += Math.sign(relay.col - col);
    path.push(indexFor(width, col, row));
  }

  return [...new Set(path)];
}

function createRng(seed: number): RNG {
  let state = (seed >>> 0) || 1;
  return {
    next() {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x1_0000_0000;
    },
    int(maxExclusive: number) {
      return Math.floor(this.next() * maxExclusive);
    },
  };
}

function shuffleInPlace<T>(values: T[], rng: RNG): void {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = rng.int(index + 1);
    const current = values[index];
    values[index] = values[swapIndex] as T;
    values[swapIndex] = current as T;
  }
}

function createCell(isHazard: boolean): CellState {
  return {
    isHazard,
    revealed: false,
    flagged: false,
    burnt: false,
    clue: 0,
    connected: false,
    revealPulse: 0,
    connectPulse: 0,
    burnPulse: 0,
  };
}

function populateClues(cells: CellState[], width: number, height: number): void {
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const index = indexFor(width, col, row);
      const cell = getCell(cells, index);
      if (cell.isHazard) {
        cell.clue = 0;
        continue;
      }
      let hazards = 0;
      for (const neighbor of neighbors(index, width, height)) {
        if (getCell(cells, neighbor).isHazard) {
          hazards += 1;
        }
      }
      cell.clue = hazards;
    }
  }
}

function countRevealedSafeCells(state: GameState): number {
  return state.cells.filter((cell) => !cell.isHazard && cell.revealed).length;
}

export function neighbors(index: number, width: number, height: number): number[] {
  const col = index % width;
  const row = Math.floor(index / width);
  const result: number[] = [];
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nextCol = col + dx;
      const nextRow = row + dy;
      if (nextCol < 0 || nextCol >= width || nextRow < 0 || nextRow >= height) continue;
      result.push(indexFor(width, nextCol, nextRow));
    }
  }
  return result;
}

export function orthogonalNeighbors(index: number, width: number, height: number): number[] {
  const col = index % width;
  const row = Math.floor(index / width);
  const result: number[] = [];
  if (col > 0) result.push(index - 1);
  if (col < width - 1) result.push(index + 1);
  if (row > 0) result.push(index - width);
  if (row < height - 1) result.push(index + width);
  return result;
}

export function indexFor(width: number, col: number, row: number): number {
  return row * width + col;
}

export function getCell(cells: CellState[], index: number): CellState {
  const cell = cells[index];
  if (!cell) {
    throw new Error(`cell_missing:${index}`);
  }
  return cell;
}
