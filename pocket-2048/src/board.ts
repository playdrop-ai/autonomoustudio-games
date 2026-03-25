export const BOARD_SIZE = 4;

export type Direction = "up" | "down" | "left" | "right";

export interface Tile {
  id: number;
  value: number;
  row: number;
  col: number;
  isNew?: boolean;
  merged?: boolean;
}

export interface BoardState {
  size: number;
  tiles: Tile[];
  score: number;
  nextId: number;
  hasWon: boolean;
  isGameOver: boolean;
}

export interface SlideResult {
  state: BoardState;
  moved: boolean;
  scoreDelta: number;
  reached2048: boolean;
}

export interface MoveOutcome extends SlideResult {
  spawnedTile: Tile | null;
}

interface SpawnResult {
  state: BoardState;
  tile: Tile | null;
}

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

export function createInitialState(random: () => number = Math.random): BoardState {
  let state: BoardState = {
    size: BOARD_SIZE,
    tiles: [],
    score: 0,
    nextId: 1,
    hasWon: false,
    isGameOver: false,
  };

  state = spawnRandomTile(state, random).state;
  state = spawnRandomTile(state, random).state;
  return {
    ...state,
    isGameOver: !hasAvailableMoves(state),
  };
}

export function createStateFromMatrix(
  matrix: number[][],
  options: Partial<Pick<BoardState, "score" | "nextId" | "hasWon" | "isGameOver">> = {},
): BoardState {
  const tiles: Tile[] = [];
  let nextId = 1;

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const value = matrix[row]?.[col] ?? 0;
      if (!value) continue;
      tiles.push({
        id: nextId,
        value,
        row,
        col,
      });
      nextId += 1;
    }
  }

  return {
    size: BOARD_SIZE,
    tiles,
    score: options.score ?? 0,
    nextId: options.nextId ?? nextId,
    hasWon: options.hasWon ?? tiles.some((tile) => tile.value >= 2048),
    isGameOver: options.isGameOver ?? !hasAvailableMoves({ size: BOARD_SIZE, tiles, score: 0, nextId, hasWon: false, isGameOver: false }),
  };
}

export function toMatrix(state: BoardState): number[][] {
  const matrix = Array.from({ length: BOARD_SIZE }, () => Array<number>(BOARD_SIZE).fill(0));
  for (const tile of state.tiles) {
    const row = matrix[tile.row];
    if (!row) {
      throw new Error(`[board] Invalid tile row ${tile.row}`);
    }
    row[tile.col] = tile.value;
  }
  return matrix;
}

export function applyMove(
  state: BoardState,
  direction: Direction,
  random: () => number = Math.random,
): MoveOutcome {
  const slide = slideBoard(state, direction);

  if (!slide.moved) {
    return {
      state: clearTransientFlags(state),
      moved: false,
      scoreDelta: 0,
      reached2048: false,
      spawnedTile: null,
    };
  }

  const spawned = spawnRandomTile(slide.state, random);
  const finalState = {
    ...spawned.state,
    isGameOver: !hasAvailableMoves(spawned.state),
  };

  return {
    state: finalState,
    moved: true,
    scoreDelta: slide.scoreDelta,
    reached2048: slide.reached2048,
    spawnedTile: spawned.tile,
  };
}

export function slideBoard(state: BoardState, direction: Direction): SlideResult {
  const baseState = clearTransientFlags(state);
  const tileMap = new Map(baseState.tiles.map((tile) => [keyFor(tile.row, tile.col), tile]));
  const nextTiles: Tile[] = [];
  let moved = false;
  let scoreDelta = 0;
  let reached2048 = false;

  for (let lineIndex = 0; lineIndex < BOARD_SIZE; lineIndex += 1) {
    const coordinates = getLineCoordinates(direction, lineIndex);
    const compacted: Tile[] = [];

    for (const coordinate of coordinates) {
      const sourceTile = tileMap.get(keyFor(coordinate.row, coordinate.col));
      if (!sourceTile) continue;

      const previousTile = compacted[compacted.length - 1];
      if (previousTile && previousTile.value === sourceTile.value && !previousTile.merged) {
        previousTile.value *= 2;
        previousTile.merged = true;
        scoreDelta += previousTile.value;
        if (previousTile.value >= 2048) {
          reached2048 = true;
        }
        moved = true;
        continue;
      }

      const targetCoordinate = coordinates[compacted.length];
      if (!targetCoordinate) {
        throw new Error(`[board] Missing target coordinate for ${direction} line ${lineIndex}`);
      }
      const nextTile: Tile = {
        id: sourceTile.id,
        value: sourceTile.value,
        row: targetCoordinate.row,
        col: targetCoordinate.col,
      };

      if (sourceTile.row !== targetCoordinate.row || sourceTile.col !== targetCoordinate.col) {
        moved = true;
      }

      compacted.push(nextTile);
    }

    nextTiles.push(...compacted);
  }

  const nextState: BoardState = {
    size: BOARD_SIZE,
    tiles: nextTiles,
    score: baseState.score + scoreDelta,
    nextId: baseState.nextId,
    hasWon: baseState.hasWon || reached2048,
    isGameOver: false,
  };

  return {
    state: nextState,
    moved,
    scoreDelta,
    reached2048: reached2048 && !baseState.hasWon,
  };
}

export function hasAvailableMoves(state: BoardState): boolean {
  if (state.tiles.length < BOARD_SIZE * BOARD_SIZE) {
    return true;
  }

  const matrix = toMatrix(state);
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const rowValues = matrix[row];
      if (!rowValues) {
        throw new Error(`[board] Missing matrix row ${row}`);
      }
      const value = rowValues[col];
      if (!value) return true;
      const nextRowValues = matrix[row + 1];
      if (row + 1 < BOARD_SIZE && nextRowValues && nextRowValues[col] === value) return true;
      if (col + 1 < BOARD_SIZE && rowValues[col + 1] === value) return true;
    }
  }

  return false;
}

export function isDirection(value: string): value is Direction {
  return DIRECTIONS.includes(value as Direction);
}

function spawnRandomTile(state: BoardState, random: () => number): SpawnResult {
  const occupied = new Set(state.tiles.map((tile) => keyFor(tile.row, tile.col)));
  const emptyCells: Array<{ row: number; col: number }> = [];

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const key = keyFor(row, col);
      if (!occupied.has(key)) {
        emptyCells.push({ row, col });
      }
    }
  }

  if (emptyCells.length === 0) {
    return {
      state,
      tile: null,
    };
  }

  const cell = emptyCells[Math.floor(random() * emptyCells.length)] ?? emptyCells[0];
  if (!cell) {
    throw new Error("[board] Failed to choose a spawn cell");
  }
  const value = random() < 0.9 ? 2 : 4;
  const tile: Tile = {
    id: state.nextId,
    value,
    row: cell.row,
    col: cell.col,
    isNew: true,
  };

  return {
    state: {
      ...state,
      tiles: [...state.tiles, tile],
      nextId: state.nextId + 1,
    },
    tile,
  };
}

function clearTransientFlags(state: BoardState): BoardState {
  return {
    ...state,
    tiles: state.tiles.map((tile) => ({
      id: tile.id,
      value: tile.value,
      row: tile.row,
      col: tile.col,
    })),
  };
}

function getLineCoordinates(direction: Direction, lineIndex: number): Array<{ row: number; col: number }> {
  const coordinates: Array<{ row: number; col: number }> = [];

  for (let offset = 0; offset < BOARD_SIZE; offset += 1) {
    switch (direction) {
      case "left":
        coordinates.push({ row: lineIndex, col: offset });
        break;
      case "right":
        coordinates.push({ row: lineIndex, col: BOARD_SIZE - 1 - offset });
        break;
      case "up":
        coordinates.push({ row: offset, col: lineIndex });
        break;
      case "down":
        coordinates.push({ row: BOARD_SIZE - 1 - offset, col: lineIndex });
        break;
    }
  }

  return coordinates;
}

function keyFor(row: number, col: number): string {
  return `${row}:${col}`;
}
