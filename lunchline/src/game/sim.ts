import {
  AUTOPLAY_TAP_DELAY_MS,
  CLEAR_PHASE_MS,
  COLS,
  COMPLAINT_LIMIT,
  INGREDIENT_KEYS,
  ROWS,
  SCORE_NEEDED_TILE,
  SCORE_OFF_TILE,
  SCORE_ORDER_BONUS,
  SCORE_STREAK_BONUS,
  SETTLE_PHASE_MS,
} from "./data";
import type {
  AutoplayMode,
  CellCoord,
  ClusterPreview,
  DebugSnapshot,
  GameEvent,
  GameState,
  IngredientKey,
  OrderSlot,
  PendingResolve,
  Tile,
} from "./types";

type MutableRandomState = {
  rng: number;
};

function nextRandom(state: MutableRandomState): number {
  state.rng = (state.rng + 0x6d2b79f5) | 0;
  let t = Math.imul(state.rng ^ (state.rng >>> 15), 1 | state.rng);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function randomInt(state: MutableRandomState, minInclusive: number, maxExclusive: number): number {
  return minInclusive + Math.floor(nextRandom(state) * (maxExclusive - minInclusive));
}

function choice<T>(state: MutableRandomState, values: readonly T[]): T {
  const value = values[randomInt(state, 0, values.length)];
  if (value === undefined) throw new Error("[lunchline] Cannot choose from an empty list");
  return value;
}

function normalizedSeed(seed: number): number {
  const normalized = Number.isFinite(seed) ? Math.trunc(seed) : Date.now();
  return (normalized >>> 0) || 1;
}

function tileAt(columns: Tile[][], col: number, row: number): Tile | null {
  const column = columns[col];
  if (!column) return null;
  const tile = column[row];
  return tile ?? null;
}

function tileKey(cell: CellCoord): string {
  return `${cell.col}:${cell.row}`;
}

function createTile(
  state: Pick<GameState, "nextTileId">,
  ingredient: IngredientKey,
  row: number,
  displayRow: number,
): Tile {
  return {
    id: state.nextTileId++,
    ingredient,
    row,
    displayRow,
    targetRow: row,
    highlight: 0,
    clear01: 0,
    opacity: 1,
  };
}

function ingredientForPosition(
  randomState: MutableRandomState,
  left: IngredientKey | null,
  up: IngredientKey | null,
): IngredientKey {
  const roll = nextRandom(randomState);
  if (left && up && left === up && roll < 0.58) return left;
  if (left && roll < 0.28) return left;
  if (up && roll < 0.5) return up;
  return choice(randomState, INGREDIENT_KEYS);
}

function buildInitialColumns(randomState: MutableRandomState, nextTileId: Pick<GameState, "nextTileId">): Tile[][] {
  const columns: Tile[][] = Array.from({ length: COLS }, () => []);
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const left = col > 0 ? columns[col - 1]?.[row]?.ingredient ?? null : null;
      const up = row > 0 ? columns[col]?.[row - 1]?.ingredient ?? null : null;
      const ingredient = ingredientForPosition(randomState, left, up);
      columns[col]?.push(createTile(nextTileId, ingredient, row, row));
    }
  }
  return columns;
}

function clusterFrom(columns: Tile[][], col: number, row: number): ClusterPreview | null {
  const start = tileAt(columns, col, row);
  if (!start) return null;

  const visited = new Set<string>();
  const queue: CellCoord[] = [{ col, row }];
  const cells: CellCoord[] = [];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) continue;
    const key = tileKey(current);
    if (visited.has(key)) continue;
    visited.add(key);

    const tile = tileAt(columns, current.col, current.row);
    if (!tile || tile.ingredient !== start.ingredient) continue;

    cells.push(current);

    queue.push({ col: current.col + 1, row: current.row });
    queue.push({ col: current.col - 1, row: current.row });
    queue.push({ col: current.col, row: current.row + 1 });
    queue.push({ col: current.col, row: current.row - 1 });
  }

  if (cells.length < 2) return null;
  return {
    cells,
    ingredient: start.ingredient,
    size: cells.length,
    matchedOrder: false,
  };
}

function hasClusterFor(columns: Tile[][], ingredient: IngredientKey): boolean {
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const tile = tileAt(columns, col, row);
      if (!tile || tile.ingredient !== ingredient) continue;
      const cluster = clusterFrom(columns, col, row);
      if (cluster && cluster.ingredient === ingredient) return true;
    }
  }
  return false;
}

function allClusters(columns: Tile[][]): ClusterPreview[] {
  const seen = new Set<string>();
  const clusters: ClusterPreview[] = [];

  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cluster = clusterFrom(columns, col, row);
      if (!cluster) continue;
      const identity = cluster.cells
        .map((cell) => tileKey(cell))
        .sort()
        .join("|");
      if (seen.has(identity)) continue;
      seen.add(identity);
      clusters.push(cluster);
    }
  }

  return clusters;
}

function forceCluster(columns: Tile[][], ingredient: IngredientKey, randomState: MutableRandomState): void {
  const col = randomInt(randomState, 0, COLS - 1);
  const row = randomInt(randomState, 0, ROWS - 1);
  const first = tileAt(columns, col, row);
  const second = tileAt(columns, col + 1, row) ?? tileAt(columns, col, row + 1) ?? tileAt(columns, col - 1, row);
  if (!first || !second) return;
  first.ingredient = ingredient;
  second.ingredient = ingredient;
}

function ensurePlayableBoard(state: GameState): void {
  if (allClusters(state.columns).length === 0) {
    forceCluster(state.columns, choice(state, INGREDIENT_KEYS), state);
  }

  for (const slot of state.order) {
    if (!hasClusterFor(state.columns, slot.ingredient)) {
      forceCluster(state.columns, slot.ingredient, state);
    }
  }
}

function difficultyNeedA(orderIndex: number, randomState: MutableRandomState): number {
  return 4 + Math.floor(orderIndex / 4) + randomInt(randomState, 0, 2);
}

function difficultyNeedB(orderIndex: number, randomState: MutableRandomState): number {
  return 3 + Math.floor(orderIndex / 5) + randomInt(randomState, 0, 2);
}

function patienceForOrder(orderIndex: number): number {
  return Math.max(1400, 5200 - orderIndex * 30);
}

function createOrder(state: GameState): [OrderSlot, OrderSlot] {
  const available = Array.from(
    new Set(
      allClusters(state.columns)
        .map((cluster) => cluster.ingredient)
        .filter((ingredient) => ingredient !== undefined),
    ),
  ) as IngredientKey[];

  const pool = available.length >= 2 ? available : [...INGREDIENT_KEYS];
  const first = choice(state, pool);
  const secondPool = pool.filter((ingredient) => ingredient !== first);
  const second = choice(state, secondPool.length > 0 ? secondPool : INGREDIENT_KEYS.filter((ingredient) => ingredient !== first));

  return [
    {
      ingredient: first,
      need: difficultyNeedA(state.orderIndex, state),
      filled: 0,
    },
    {
      ingredient: second,
      need: difficultyNeedB(state.orderIndex, state),
      filled: 0,
    },
  ];
}

function advanceOrder(state: GameState): void {
  state.orderIndex += 1;
  state.order = createOrder(state);
  state.maxPatienceMs = patienceForOrder(state.orderIndex);
  state.patienceMs = state.maxPatienceMs;
  state.orderFlashMs = 260;
  state.hoveredCluster = null;
  ensurePlayableBoard(state);
}

function orderSlotForIngredient(state: GameState, ingredient: IngredientKey): OrderSlot | null {
  return state.order.find((slot) => slot.ingredient === ingredient) ?? null;
}

function orderIsComplete(state: GameState): boolean {
  return state.order.every((slot) => slot.filled >= slot.need);
}

function applyPendingClear(state: GameState, pending: PendingResolve): PendingResolve {
  const removedByColumn = new Map<number, Set<number>>();
  for (const cell of pending.cells) {
    if (!removedByColumn.has(cell.col)) removedByColumn.set(cell.col, new Set<number>());
    removedByColumn.get(cell.col)?.add(cell.row);
  }

  const slot = orderSlotForIngredient(state, pending.ingredient);
  if (slot) {
    slot.filled = Math.min(slot.need, slot.filled + pending.size);
    state.score += pending.size * SCORE_NEEDED_TILE + Math.max(0, pending.size - 1) * 18;
  } else {
    state.score += pending.size * SCORE_OFF_TILE;
  }

  for (let col = 0; col < COLS; col += 1) {
    const rowsToRemove = removedByColumn.get(col);
    if (!rowsToRemove) continue;

    const column = state.columns[col];
    if (!column) continue;

    const survivors = column.filter((tile) => !rowsToRemove.has(tile.row));
    const spawnCount = ROWS - survivors.length;
    const anchoredStartRow = spawnCount;

    for (let index = 0; index < survivors.length; index += 1) {
      const tile = survivors[index];
      if (!tile) continue;
      tile.row = anchoredStartRow + index;
      tile.targetRow = tile.row;
      tile.clear01 = 0;
      tile.opacity = 1;
    }

    const spawned: Tile[] = [];
    for (let index = 0; index < spawnCount; index += 1) {
      const ingredient = choice(state, INGREDIENT_KEYS);
      const tile = createTile(state, ingredient, index, -(spawnCount - index));
      spawned.push(tile);
    }

    state.columns[col] = [...spawned, ...survivors];
  }

  ensurePlayableBoard(state);

  return {
    ...pending,
    stage: "settling",
    timerMs: 0,
    completedOrder: orderIsComplete(state),
  };
}

export function createInitialState(seed: number): GameState {
  const normalized = normalizedSeed(seed);
  const state: GameState = {
    seed: normalized,
    rng: normalized,
    nextTileId: 1,
    columns: [],
    hoveredCluster: null,
    pendingResolve: null,
    gameOver: false,
    complaints: 0,
    score: 0,
    streak: 0,
    longestStreak: 0,
    ordersServed: 0,
    orderIndex: 0,
    order: [
      { ingredient: "salmon", need: 4, filled: 0 },
      { ingredient: "egg", need: 3, filled: 0 },
    ],
    patienceMs: 0,
    maxPatienceMs: 0,
    orderFlashMs: 0,
    complaintFlashMs: 0,
    autoplayCooldownMs: 0,
    totalElapsedMs: 0,
  };

  state.columns = buildInitialColumns(state, state);
  state.order = createOrder(state);
  state.maxPatienceMs = patienceForOrder(state.orderIndex);
  state.patienceMs = state.maxPatienceMs;
  ensurePlayableBoard(state);
  return state;
}

export function createStateFromIngredientGrid(grid: IngredientKey[][], orderIngredients: [IngredientKey, IngredientKey]): GameState {
  if (grid.length !== ROWS) throw new Error(`[lunchline] Expected ${ROWS} rows in test grid`);
  if (grid.some((row) => row.length !== COLS)) throw new Error(`[lunchline] Expected ${COLS} columns in test grid`);

  const state = createInitialState(1);
  state.columns = Array.from({ length: COLS }, (_, col) =>
    Array.from({ length: ROWS }, (_, row) => createTile(state, grid[row]?.[col] ?? "salmon", row, row)),
  );
  state.order = [
    { ingredient: orderIngredients[0], need: 4, filled: 0 },
    { ingredient: orderIngredients[1], need: 3, filled: 0 },
  ];
  state.maxPatienceMs = 8000;
  state.patienceMs = state.maxPatienceMs;
  state.score = 0;
  state.complaints = 0;
  state.streak = 0;
  state.longestStreak = 0;
  state.ordersServed = 0;
  state.orderIndex = 0;
  state.pendingResolve = null;
  state.hoveredCluster = null;
  state.gameOver = false;
  ensurePlayableBoard(state);
  return state;
}

export function previewCluster(state: GameState, col: number, row: number): ClusterPreview | null {
  const cluster = clusterFrom(state.columns, col, row);
  if (!cluster) return null;
  const slot = orderSlotForIngredient(state, cluster.ingredient);
  return {
    ...cluster,
    matchedOrder: Boolean(slot && slot.filled < slot.need),
  };
}

export function setHoveredCluster(state: GameState, cluster: ClusterPreview | null): void {
  state.hoveredCluster = cluster;
}

export function canAcceptInput(state: GameState): boolean {
  return !state.gameOver && state.pendingResolve === null;
}

export function performMove(state: GameState, col: number, row: number): boolean {
  if (!canAcceptInput(state)) return false;
  const cluster = previewCluster(state, col, row);
  if (!cluster) return false;

  state.pendingResolve = {
    stage: "clearing",
    timerMs: 0,
    cells: cluster.cells,
    ingredient: cluster.ingredient,
    size: cluster.size,
    matchedOrder: cluster.matchedOrder,
    completedOrder: false,
  };
  state.hoveredCluster = cluster;
  state.autoplayCooldownMs = AUTOPLAY_TAP_DELAY_MS;
  return true;
}

export function stepGame(state: GameState, dtMs: number): GameEvent[] {
  const events: GameEvent[] = [];
  state.totalElapsedMs += dtMs;
  state.autoplayCooldownMs = Math.max(0, state.autoplayCooldownMs - dtMs);
  state.orderFlashMs = Math.max(0, state.orderFlashMs - dtMs);
  state.complaintFlashMs = Math.max(0, state.complaintFlashMs - dtMs);
  if (!state.gameOver) {
    state.patienceMs = Math.max(0, state.patienceMs - dtMs);
  }

  const hoverSet = new Set(state.hoveredCluster?.cells.map((cell) => tileKey(cell)) ?? []);
  const clearSet = new Set(
    state.pendingResolve?.stage === "clearing" ? state.pendingResolve.cells.map((cell) => tileKey(cell)) : [],
  );

  for (let col = 0; col < state.columns.length; col += 1) {
    const column = state.columns[col];
    if (!column) continue;
    for (const tile of column) {
      const key = `${col}:${tile.row}`;
      const targetHighlight = hoverSet.has(key) ? 1 : 0;
      tile.highlight += (targetHighlight - tile.highlight) * Math.min(1, dtMs * 0.018);
      tile.displayRow += (tile.targetRow - tile.displayRow) * Math.min(1, dtMs * 0.018);

      if (clearSet.has(key) && state.pendingResolve) {
        tile.clear01 = Math.min(1, state.pendingResolve.timerMs / CLEAR_PHASE_MS);
        tile.opacity = 1 - tile.clear01;
      } else {
        tile.clear01 = Math.max(0, tile.clear01 - dtMs * 0.01);
        tile.opacity += (1 - tile.opacity) * Math.min(1, dtMs * 0.03);
      }
    }
  }

  if (state.pendingResolve) {
    state.pendingResolve.timerMs += dtMs;

    if (state.pendingResolve.stage === "clearing" && state.pendingResolve.timerMs >= CLEAR_PHASE_MS) {
      state.pendingResolve = applyPendingClear(state, state.pendingResolve);
    } else if (state.pendingResolve.stage === "settling" && state.pendingResolve.timerMs >= SETTLE_PHASE_MS) {
      const completedOrder = state.pendingResolve.completedOrder;
      state.pendingResolve = null;
      state.hoveredCluster = null;
      if (completedOrder) {
        state.ordersServed += 1;
        state.streak += 1;
        state.longestStreak = Math.max(state.longestStreak, state.streak);
        state.score += SCORE_ORDER_BONUS + state.streak * SCORE_STREAK_BONUS;
        advanceOrder(state);
        events.push({ kind: "order-served" });
      }
    }
    return events;
  }

  if (state.gameOver) {
    return events;
  }

  if (state.patienceMs <= 0) {
    state.complaints += 1;
    state.complaintFlashMs = 520;
    state.streak = 0;
    events.push({ kind: "complaint" });
    if (state.complaints >= COMPLAINT_LIMIT) {
      state.gameOver = true;
      events.push({ kind: "gameover" });
    } else {
      advanceOrder(state);
    }
  }

  return events;
}

export function createDebugSnapshot(state: GameState): DebugSnapshot {
  return {
    score: state.score,
    complaints: state.complaints,
    streak: state.streak,
    longestStreak: state.longestStreak,
    ordersServed: state.ordersServed,
    orderIndex: state.orderIndex,
    patienceMs: Math.round(state.patienceMs),
    maxPatienceMs: Math.round(state.maxPatienceMs),
    order: state.order.map((slot) => ({ ...slot })),
    gameOver: state.gameOver,
    hoveredCluster: state.hoveredCluster ? { ...state.hoveredCluster, cells: [...state.hoveredCluster.cells] } : null,
    board: Array.from({ length: ROWS }, (_, row) =>
      Array.from({ length: COLS }, (_, col) => tileAt(state.columns, col, row)?.ingredient ?? "salmon"),
    ),
  };
}

export function chooseAutoplayMove(state: GameState, mode: AutoplayMode | null): CellCoord | null {
  if (mode === null || mode === "idle" || state.pendingResolve || state.gameOver) return null;

  const clusters = allClusters(state.columns).map((cluster) => {
    const slot = orderSlotForIngredient(state, cluster.ingredient);
    const remaining = slot ? Math.max(0, slot.need - slot.filled) : 0;
    const matchedOrder = remaining > 0;
    const overshoot = matchedOrder ? Math.max(0, cluster.size - remaining) : cluster.size;
    const exactness = matchedOrder ? Math.abs(cluster.size - remaining) : cluster.size;

    const score =
      mode === "expert"
        ? matchedOrder
          ? cluster.size * 180 + Math.min(cluster.size, remaining) * 120 - overshoot * 18 - exactness * 6
          : cluster.size * 12
        : matchedOrder
          ? cluster.size * 80 + Math.min(cluster.size, remaining) * 40 - overshoot * 6
          : cluster.size * 28;

    return {
      cluster: {
        ...cluster,
        matchedOrder,
      },
      score,
    };
  });

  if (clusters.length === 0) return null;
  clusters.sort((left, right) => right.score - left.score || right.cluster.size - left.cluster.size);
  const pickIndex =
    mode === "casual"
      ? Math.min(clusters.length - 1, randomInt(state, 0, Math.min(5, clusters.length)))
      : 0;
  const picked = clusters[pickIndex]?.cluster;
  const first = picked?.cells[0];
  return first ? { col: first.col, row: first.row } : null;
}
