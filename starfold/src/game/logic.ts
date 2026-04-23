export const BOARD_ROWS = 5;
export const BOARD_COLS = 5;
export const ASH_SPAWN_GAPS = [7, 6, 5, 4, 4, 3, 3, 3, 2, 2, 2, 2, 1] as const;
export const ASH_SPAWN_TURNS = buildAshSpawnTurns(ASH_SPAWN_GAPS);
export const ASH_ALWAYS_SPAWN_AFTER = ASH_SPAWN_TURNS[ASH_SPAWN_TURNS.length - 1] ?? 1;

export type SigilKind = "sun" | "moon" | "wave" | "leaf" | "ember";
export type AshKind = "ash5" | "ash4" | "ash3" | "ash2" | "ash1";
export type TileKind = SigilKind | AshKind;
export type TileStateKind = TileKind | `${SigilKind}*`;
export type Axis = "row" | "col";
export type Direction = -1 | 1;
export type GameOverReason = "no_moves";
export type ClearPulseKind = "none" | "shockwave" | "wipe";
export type AshStageAction = "recover" | "harden" | "contaminate" | "spawn";

export interface Position {
  row: number;
  col: number;
}

export interface Tile {
  id: number;
  kind: TileKind;
  contaminated: boolean;
}

export type TileSpec = TileKind | { kind: TileKind; contaminated?: boolean };
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
  groupCount: number;
  damaged: Position[];
  cleansed: Position[];
  restored: Position[];
  pulseTargets: Position[];
  majorMatchSize: number;
  pulseKind: ClearPulseKind;
  scoreGain: number;
  combo: number;
  comboPreviewBonus: number;
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
  action: AshStageAction;
  position: Position;
  positions: Position[];
}

export type TurnStage = ShiftStage | ClearStage | CollapseStage | AshStage;

export interface TurnResult {
  state: GameState;
  stages: TurnStage[];
  maxCombo: number;
  comboMultiplier: number;
  comboBonus: number;
  scoreGained: number;
}

const SIGIL_KINDS: SigilKind[] = ["sun", "moon", "wave", "leaf", "ember"];
const ASH_KINDS: AshKind[] = ["ash5", "ash4", "ash3", "ash2", "ash1"];
const MATCH_SCORE_PER_TILE = 90;
const ASH_CLEANSE_SCORE = 60;

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
        line.push({ id: nextId, kind: pick, contaminated: false });
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
    return { state, stages: [], maxCombo: 0, comboMultiplier: 1, comboBonus: 0, scoreGained: 0 };
  }
  if (!isPlayableMove(state.board, move)) {
    return { state, stages: [], maxCombo: 0, comboMultiplier: 1, comboBonus: 0, scoreGained: 0 };
  }

  let board = cloneBoard(state.board);
  const stages: TurnStage[] = [];
  let nextId = state.nextId;
  let rngState = state.rngState;
  let score = state.score;
  let totalGain = 0;
  let baseGain = 0;
  let maxCombo = 0;
  let finalRefillPositions: Position[] = [];
  const hitAshIds = new Set<number>();

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
    const { matched, damaged, cleansed, restored, sparseBoard, pulseTargets, majorMatchSize, pulseKind } = clearGroups(board, groups);
    const scoreGain = matched.length * MATCH_SCORE_PER_TILE + cleansed.length * ASH_CLEANSE_SCORE;
    const currentBaseGain = baseGain + scoreGain;
    stages.push({
      kind: "clear",
      board,
      matched,
      groupCount: groups.length,
      damaged,
      cleansed,
      restored,
      pulseTargets,
      majorMatchSize,
      pulseKind,
      scoreGain,
      combo,
      comboPreviewBonus: Math.round(currentBaseGain * (comboMultiplierForDepth(combo) - 1)),
    });
    addTileIdsToSet(hitAshIds, board, damaged);
    addTileIdsToSet(hitAshIds, board, cleansed);
    score += scoreGain;
    totalGain += scoreGain;
    baseGain += scoreGain;

    const collapsed = collapseSparseBoard(sparseBoard, nextId, rngState);
    stages.push({
      kind: "collapse",
      before: sparseBoard,
      after: collapsed.board,
    });
    board = collapsed.board;
    nextId = collapsed.nextId;
    rngState = collapsed.rngState;
    finalRefillPositions = collapsed.refillPositions;
  }

  const moves = state.moves + 1;
  const prePressureBoard = cloneBoard(board);

  const hardenedPositions = collectAllContaminatedPositions(board).map(decodePositionKey);
  if (hardenedPositions.length > 0) {
    const hardened = hardenContaminated(board, hardenedPositions);
    stages.push({
      kind: "ash",
      before: board,
      after: hardened.board,
      action: "harden",
      position: hardened.positions[0]!,
      positions: hardened.positions,
    });
    board = hardened.board;
  }

  const recovered = recoverUntouchedAsh(board, hitAshIds, new Set(hardenedPositions.map(positionKey)));
  if (recovered.positions.length > 0) {
    stages.push({
      kind: "ash",
      before: board,
      after: recovered.board,
      action: "recover",
      position: recovered.positions[0]!,
      positions: recovered.positions,
    });
    board = recovered.board;
  }

  const contamination = contaminateFromEligibleSources(board, prePressureBoard, hitAshIds, rngState);
  if (contamination) {
    stages.push({
      kind: "ash",
      before: board,
      after: contamination.board,
      action: "contaminate",
      position: contamination.position,
      positions: [contamination.position],
    });
    board = contamination.board;
    rngState = contamination.rngState;
  }

  if (shouldSpawnAshOnMove(moves)) {
    const spawned = spawnAshFromRefill(board, finalRefillPositions, rngState);
    if (spawned) {
      stages.push({
        kind: "ash",
        before: board,
        after: spawned.board,
        action: "spawn",
        position: spawned.position,
        positions: [spawned.position],
      });
      board = spawned.board;
      rngState = spawned.rngState;
    }
  }

  const comboMultiplier = comboMultiplierForDepth(maxCombo);
  const comboBonus = Math.round(baseGain * (comboMultiplier - 1));
  if (comboBonus > 0) {
    score += comboBonus;
    totalGain += comboBonus;
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
    comboMultiplier,
    comboBonus,
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
      if (tile.contaminated || isAshKind(tile.kind)) {
        count += 1;
      }
    }
  }
  return count;
}

export function shouldSpawnAshOnMove(moves: number): boolean {
  return moves >= ASH_ALWAYS_SPAWN_AFTER || ASH_SPAWN_TURNS.includes(moves);
}

export function findGroups(board: Board): Position[][] {
  const visited = Array.from({ length: BOARD_ROWS }, () => Array<boolean>(BOARD_COLS).fill(false));
  const groups: Position[][] = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      if (visited[row]![col]) continue;
      const tile = board[row]![col]!;
      visited[row]![col] = true;
      if (tile.contaminated || isAshKind(tile.kind)) continue;
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

export function boardStateKinds(board: Board): TileStateKind[][] {
  return board.map((row) =>
    row.map((tile) => {
      if (!tile.contaminated) {
        return tile.kind as TileStateKind;
      }
      if (isAshKind(tile.kind)) {
        throw new Error("Ash tiles cannot be contaminated");
      }
      return `${tile.kind}*` as TileStateKind;
    }),
  );
}

export function createBoardFromKinds(kinds: TileKind[][], nextId = 1): { board: Board; nextId: number } {
  return createBoardFromSpecs(kinds, nextId);
}

export function createBoardFromSpecs(specs: TileSpec[][], nextId = 1): { board: Board; nextId: number } {
  const board: Board = specs.map((row) =>
    row.map((spec) => {
      const normalized = normalizeTileSpec(spec);
      const tile = { id: nextId, ...normalized };
      nextId += 1;
      return tile;
    }),
  );
  return { board, nextId };
}

export function comboMultiplierForDepth(depth: number): number {
  if (depth <= 1) return 1;
  if (depth === 2) return 1.25;
  if (depth === 3) return 1.6;
  if (depth === 4) return 2;
  return 2.5;
}

function clearGroups(board: Board, groups: Position[][]): {
  matched: Position[];
  damaged: Position[];
  cleansed: Position[];
  restored: Position[];
  pulseTargets: Position[];
  majorMatchSize: number;
  pulseKind: ClearPulseKind;
  sparseBoard: SparseBoard;
} {
  const matched = flattenPositions(groups);
  const sparseBoard: SparseBoard = board.map((row) => row.slice());
  const matchedSet = toPositionKeySet(matched);
  const damagedSet = new Set<string>();
  const cleansedSet = new Set<string>();
  const restoredSet = new Set<string>();
  const pulseTargetSet = new Set<string>();
  let majorMatchSize = 0;
  let pulseKind: ClearPulseKind = "none";

  for (const pos of matched) {
    sparseBoard[pos.row]![pos.col] = null;
  }

  for (const group of groups) {
    majorMatchSize = Math.max(majorMatchSize, group.length);
    const touchedAsh = collectTouchedPositions(group, sparseBoard, matchedSet, isAshTileAtPosition);
    const touchedContaminated = collectTouchedPositions(group, sparseBoard, matchedSet, isContaminatedSigilAtPosition);

    if (group.length >= 6) {
      const allAsh = collectAllAshPositions(sparseBoard);
      const allContaminated = collectAllContaminatedPositions(sparseBoard);
      addKeysToSet(pulseTargetSet, allAsh);
      addKeysToSet(pulseTargetSet, allContaminated);
      purgeAshPositions(sparseBoard, allAsh, damagedSet, cleansedSet);
      restoreContaminatedPositions(sparseBoard, allContaminated, restoredSet);
      pulseKind = "wipe";
      continue;
    }

    const touchedDamage = group.length >= 4 ? 2 : 1;
    damageAshPositions(sparseBoard, touchedAsh, touchedDamage, damagedSet, cleansedSet);
    restoreContaminatedPositions(sparseBoard, touchedContaminated, restoredSet);

    if (group.length >= 5) {
      const remainingAsh = collectAllAshPositions(sparseBoard, new Set(touchedAsh));
      const allContaminated = collectAllContaminatedPositions(sparseBoard);
      addKeysToSet(pulseTargetSet, remainingAsh);
      addKeysToSet(pulseTargetSet, allContaminated);
      damageAshPositions(sparseBoard, remainingAsh, 1, damagedSet, cleansedSet);
      restoreContaminatedPositions(sparseBoard, allContaminated, restoredSet);
      if (pulseKind !== "wipe") {
        pulseKind = "shockwave";
      }
    }
  }

  return {
    matched,
    damaged: Array.from(damagedSet, decodePositionKey),
    cleansed: Array.from(cleansedSet, decodePositionKey),
    restored: Array.from(restoredSet, decodePositionKey),
    pulseTargets: Array.from(pulseTargetSet, decodePositionKey),
    majorMatchSize,
    pulseKind,
    sparseBoard,
  };
}

function collapseSparseBoard(
  sparseBoard: SparseBoard,
  nextId: number,
  rngState: number,
): { board: Board; nextId: number; rngState: number; refillPositions: Position[] } {
  const board: Board = Array.from({ length: BOARD_ROWS }, () => Array<Tile>(BOARD_COLS));
  const refillPositions: Position[] = [];
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
      board[row]![col] = { id: nextId, kind: result.kind, contaminated: false };
      refillPositions.push({ row, col });
      nextId += 1;
      row -= 1;
    }
  }
  return { board, nextId, rngState, refillPositions };
}

function hardenContaminated(board: Board, positions: Position[]): { board: Board; positions: Position[] } {
  if (positions.length === 0) {
    return { board, positions: [] };
  }
  const nextBoard = cloneBoard(board);
  const changed: Position[] = [];
  for (const position of positions) {
    const tile = nextBoard[position.row]![position.col]!;
    if (!tile.contaminated || isAshKind(tile.kind)) {
      continue;
    }
    nextBoard[position.row]![position.col] = { ...tile, kind: "ash1", contaminated: false };
    changed.push(position);
  }
  return { board: nextBoard, positions: changed };
}

function recoverUntouchedAsh(
  board: Board,
  hitAshIds: Set<number>,
  blockedKeys: Set<string>,
): { board: Board; positions: Position[] } {
  const nextBoard = cloneBoard(board);
  const changed: Position[] = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const tile = nextBoard[row]![col]!;
      if (!isAshKind(tile.kind)) {
        continue;
      }
      const key = positionKey({ row, col });
      if (hitAshIds.has(tile.id) || blockedKeys.has(key)) {
        continue;
      }
      const recoveredKind = recoverAsh(tile.kind);
      if (recoveredKind === tile.kind) {
        continue;
      }
      nextBoard[row]![col] = { ...tile, kind: recoveredKind };
      changed.push({ row, col });
    }
  }
  return { board: nextBoard, positions: changed };
}

function contaminateFromEligibleSources(
  board: Board,
  prePressureBoard: Board,
  hitAshIds: Set<number>,
  rngState: number,
): { board: Board; position: Position; rngState: number } | null {
  const pairs: Array<{ source: Position; target: Position }> = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const tileBeforePressure = prePressureBoard[row]![col]!;
      if (tileBeforePressure.kind !== "ash5" || hitAshIds.has(tileBeforePressure.id)) {
        continue;
      }
      const currentTile = board[row]![col]!;
      if (!isAshKind(currentTile.kind)) {
        continue;
      }
      for (const neighbor of neighbors(row, col)) {
        const neighborTile = board[neighbor.row]![neighbor.col]!;
        if (neighborTile.contaminated || isAshKind(neighborTile.kind)) {
          continue;
        }
        pairs.push({
          source: { row, col },
          target: neighbor,
        });
      }
    }
  }

  if (pairs.length === 0) {
    return null;
  }

  const selected = pickRandomItem(pairs, rngState);
  const nextBoard = cloneBoard(board);
  const tile = nextBoard[selected.item.target.row]![selected.item.target.col]!;
  nextBoard[selected.item.target.row]![selected.item.target.col] = { ...tile, contaminated: true };
  return {
    board: nextBoard,
    position: selected.item.target,
    rngState: selected.rngState,
  };
}

function spawnAshFromRefill(
  board: Board,
  refillPositions: Position[],
  rngState: number,
): { board: Board; position: Position; rngState: number } | null {
  if (refillPositions.length === 0) {
    return null;
  }
  const selected = pickRandomItem(refillPositions, rngState);
  const nextBoard = cloneBoard(board);
  const tile = nextBoard[selected.item.row]![selected.item.col]!;
  nextBoard[selected.item.row]![selected.item.col] = { ...tile, kind: "ash5", contaminated: false };
  return {
    board: nextBoard,
    position: selected.item,
    rngState: selected.rngState,
  };
}

function floodGroup(board: Board, visited: boolean[][], startRow: number, startCol: number, kind: SigilKind): Position[] {
  const queue: Position[] = [{ row: startRow, col: startCol }];
  const group: Position[] = [{ row: startRow, col: startCol }];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of neighbors(current.row, current.col)) {
      if (visited[neighbor.row]![neighbor.col]) continue;
      const tile = board[neighbor.row]![neighbor.col]!;
      if (tile.contaminated || tile.kind !== kind) continue;
      visited[neighbor.row]![neighbor.col] = true;
      group.push(neighbor);
      queue.push(neighbor);
    }
  }
  return group;
}

function collectTouchedPositions(
  group: Position[],
  sparseBoard: SparseBoard,
  matchedSet: Set<string>,
  predicate: (sparseBoard: SparseBoard, position: Position) => boolean,
): string[] {
  const touched = new Set<string>();
  for (const pos of group) {
    for (const neighbor of neighbors(pos.row, pos.col)) {
      const key = positionKey(neighbor);
      if (matchedSet.has(key) || touched.has(key)) {
        continue;
      }
      if (predicate(sparseBoard, neighbor)) {
        touched.add(key);
      }
    }
  }
  return Array.from(touched);
}

function collectAllAshPositions(sparseBoard: SparseBoard, excluded = new Set<string>()): string[] {
  const positions: string[] = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const key = positionKey({ row, col });
      if (excluded.has(key)) {
        continue;
      }
      if (isAshTileAtPosition(sparseBoard, { row, col })) {
        positions.push(key);
      }
    }
  }
  return positions;
}

function collectAllContaminatedPositions(sparseBoard: SparseBoard, excluded = new Set<string>()): string[] {
  const positions: string[] = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const key = positionKey({ row, col });
      if (excluded.has(key)) {
        continue;
      }
      if (isContaminatedSigilAtPosition(sparseBoard, { row, col })) {
        positions.push(key);
      }
    }
  }
  return positions;
}

function purgeAshPositions(
  sparseBoard: SparseBoard,
  positions: string[],
  damagedSet: Set<string>,
  cleansedSet: Set<string>,
): void {
  for (const key of positions) {
    const position = decodePositionKey(key);
    const tile = sparseBoard[position.row]![position.col];
    if (!tile || !isAshKind(tile.kind)) {
      continue;
    }
    damagedSet.add(key);
    cleansedSet.add(key);
    sparseBoard[position.row]![position.col] = null;
  }
}

function damageAshPositions(
  sparseBoard: SparseBoard,
  positions: string[],
  amount: number,
  damagedSet: Set<string>,
  cleansedSet: Set<string>,
): void {
  for (const key of positions) {
    const position = decodePositionKey(key);
    let tile = sparseBoard[position.row]![position.col];
    if (!tile || !isAshKind(tile.kind)) {
      continue;
    }
    damagedSet.add(key);
    const nextKind = damageAsh(tile.kind, amount);
    if (nextKind === null) {
      cleansedSet.add(key);
      sparseBoard[position.row]![position.col] = null;
      continue;
    }
    sparseBoard[position.row]![position.col] = {
      ...tile,
      kind: nextKind,
    };
  }
}

function restoreContaminatedPositions(
  sparseBoard: SparseBoard,
  positions: string[],
  restoredSet: Set<string>,
): void {
  for (const key of positions) {
    const position = decodePositionKey(key);
    const tile = sparseBoard[position.row]![position.col];
    if (!tile || isAshKind(tile.kind) || !tile.contaminated) {
      continue;
    }
    restoredSet.add(key);
    sparseBoard[position.row]![position.col] = {
      ...tile,
      contaminated: false,
    };
  }
}

function isAshTileAtPosition(sparseBoard: SparseBoard, position: Position): boolean {
  const tile = sparseBoard[position.row]![position.col];
  return Boolean(tile && isAshKind(tile.kind));
}

function isContaminatedSigilAtPosition(sparseBoard: SparseBoard, position: Position): boolean {
  const tile = sparseBoard[position.row]![position.col];
  return Boolean(tile && tile.contaminated && !isAshKind(tile.kind));
}

function isPlayableMove(board: Board, move: Move): boolean {
  return getPlayableMoves(board).some(
    (candidate) =>
      candidate.axis === move.axis && candidate.index === move.index && candidate.direction === move.direction,
  );
}

function damageAsh(kind: AshKind, amount: number): AshKind | null {
  let current: AshKind | null = kind;
  for (let hit = 0; hit < amount && current !== null; hit += 1) {
    current = damageAshOnce(current);
  }
  return current;
}

function damageAshOnce(kind: AshKind): AshKind | null {
  switch (kind) {
    case "ash5":
      return "ash4";
    case "ash4":
      return "ash3";
    case "ash3":
      return "ash2";
    case "ash2":
      return "ash1";
    case "ash1":
      return null;
  }
}

function recoverAsh(kind: AshKind): AshKind {
  switch (kind) {
    case "ash5":
      return "ash5";
    case "ash4":
      return "ash5";
    case "ash3":
      return "ash4";
    case "ash2":
      return "ash3";
    case "ash1":
      return "ash2";
  }
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

function pickRandomItem<T>(items: T[], rngState: number): { item: T; rngState: number } {
  const next = nextRandom(rngState);
  const index = Math.min(items.length - 1, Math.floor(next.value * items.length));
  return {
    item: items[index]!,
    rngState: next.rngState,
  };
}

function nextRandom(seed: number): { value: number; rngState: number } {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, rngState: (seed + 0x6d2b79f5) >>> 0 };
}

function createsGroupAt(existingRows: Tile[][], currentRow: Tile[], row: number, col: number, kind: SigilKind): boolean {
  const existingKinds = existingRows.map((existing) => existing.map((tile) => tile.kind as SigilKind));
  existingKinds[row] = currentRow.map((tile) => tile.kind as SigilKind);
  existingKinds[row]!.push(kind);
  const component = [{ row, col }];
  const seen = new Set<string>([positionKey({ row, col })]);
  const queue = component.slice();
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of neighbors(current.row, current.col)) {
      const rowKinds = existingKinds[neighbor.row];
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

function normalizeTileSpec(spec: TileSpec): { kind: TileKind; contaminated: boolean } {
  if (typeof spec === "string") {
    return { kind: spec, contaminated: false };
  }
  const normalized = {
    kind: spec.kind,
    contaminated: spec.contaminated ?? false,
  };
  if (normalized.contaminated && isAshKind(normalized.kind)) {
    throw new Error("Ash tile cannot be contaminated");
  }
  return normalized;
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

function addTileIdsToSet(target: Set<number>, board: Board, positions: Position[]): void {
  for (const position of positions) {
    const tile = board[position.row]?.[position.col];
    if (tile && isAshKind(tile.kind)) {
      target.add(tile.id);
    }
  }
}

function addKeysToSet(target: Set<string>, keys: string[]): void {
  for (const key of keys) {
    target.add(key);
  }
}

function buildAshSpawnTurns(gaps: readonly number[]): number[] {
  const turns: number[] = [];
  let total = 0;
  for (const gap of gaps) {
    total += gap;
    turns.push(total);
  }
  return turns;
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
