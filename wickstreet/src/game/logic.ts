import {
  BARRIER_CANDIDATES,
  DELIVERIES_PER_PHASE,
  DEPOT_CELL,
  GRID_HEIGHT,
  GRID_WIDTH,
  HOUSES,
  INITIAL_TIMER_SECONDS,
  MAX_STRIKES,
  MIN_TIMER_SECONDS,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  cellCenter,
  cellKey,
  isRoadCell,
  keyToCell,
  type Cell,
  type Vec2,
} from './config';

export type ScreenState = 'start' | 'playing' | 'gameover';
export type PolicyName = 'idle' | 'casual' | 'expert';

export interface ProgressData {
  bestScore: number;
  bestStreak: number;
}

export interface PlayerState {
  position: Vec2;
  heading: Vec2;
  movePulse: number;
}

export interface EffectsState {
  pickup: number;
  delivery: number;
  miss: number;
  houseGlow: number;
}

export interface GameState extends ProgressData {
  screen: ScreenState;
  player: PlayerState;
  score: number;
  currentStreak: number;
  strikes: number;
  deliveries: number;
  phase: number;
  timer: number;
  timerMax: number;
  activeRequest: number;
  nextRequest: number;
  carrying: number | null;
  barriers: Set<string>;
  guidePath: Cell[];
  effects: EffectsState;
  rng: number;
  elapsed: number;
}

const EPSILON = 1e-6;

export function createInitialState(progress: ProgressData, seed = 0x51f4c9ab): GameState {
  return {
    screen: 'start',
    player: {
      position: { x: 7.5, y: 6.5 },
      heading: { x: 0, y: -1 },
      movePulse: 0,
    },
    score: 0,
    bestScore: progress.bestScore,
    bestStreak: progress.bestStreak,
    currentStreak: 0,
    strikes: 0,
    deliveries: 0,
    phase: 0,
    timer: INITIAL_TIMER_SECONDS,
    timerMax: INITIAL_TIMER_SECONDS,
    activeRequest: 0,
    nextRequest: 1,
    carrying: null,
    barriers: new Set<string>(),
    guidePath: [],
    effects: {
      pickup: 0,
      delivery: 0,
      miss: 0,
      houseGlow: 0,
    },
    rng: seed >>> 0,
    elapsed: 0,
  };
}

export function startRun(state: GameState): void {
  state.screen = 'playing';
  state.player.position = { x: 7.5, y: 6.5 };
  state.player.heading = { x: 0, y: -1 };
  state.player.movePulse = 0;
  state.score = 0;
  state.currentStreak = 0;
  state.strikes = 0;
  state.deliveries = 0;
  state.phase = 0;
  state.carrying = null;
  state.timerMax = timerForPhase(0);
  state.timer = state.timerMax;
  state.effects.pickup = 0;
  state.effects.delivery = 0;
  state.effects.houseGlow = 0;
  state.effects.miss = 0;
  state.elapsed = 0;
  state.activeRequest = pickHouse(state, null);
  state.nextRequest = pickHouse(state, state.activeRequest);
  state.barriers = generateBarrierLayout(state, cellFromWorld(state.player.position));
  refreshGuidePath(state);
}

export function restartRun(state: GameState): void {
  startRun(state);
}

export function stepGame(state: GameState, movement: Vec2, deltaSeconds: number): void {
  if (state.screen !== 'playing') {
    return;
  }

  state.elapsed += deltaSeconds;
  tickEffects(state, deltaSeconds);
  movePlayer(state, movement, deltaSeconds);

  if (state.carrying === null && intersectsCell(state.player.position, DEPOT_CELL, 0.34)) {
    state.carrying = state.activeRequest;
    state.effects.pickup = 0.24;
  }

  const activeHouse = HOUSES[state.activeRequest];
  if (state.carrying === state.activeRequest && activeHouse && intersectsCell(state.player.position, activeHouse.doorstep, 0.34)) {
    resolveDelivery(state);
  }

  state.timer -= deltaSeconds;
  if (state.timer <= 0) {
    resolveMiss(state);
  }

  refreshGuidePath(state);
}

export function computeAutopilotVector(state: GameState, policy: PolicyName): Vec2 {
  if (state.screen !== 'playing' || policy === 'idle') {
    return { x: 0, y: 0 };
  }
  if (state.effects.delivery > 0 && policy === 'casual') {
    return { x: 0, y: 0 };
  }
  const path = state.guidePath;
  const targetCell = path.length > 1 ? path[1] : path[0];
  const fallbackHouse = getHouse(state.activeRequest);
  const target = targetCell
    ? cellCenter(targetCell)
    : state.carrying === null
      ? cellCenter(DEPOT_CELL)
      : cellCenter(fallbackHouse.doorstep);
  const vector = {
    x: target.x - state.player.position.x,
    y: target.y - state.player.position.y,
  };
  const normalized = normalize(vector);
  if (policy === 'casual') {
    const timeBucket = Math.floor(state.elapsed * 4);
    const hesitation = pseudoRandomFloat((state.deliveries + 1) * 7919 + timeBucket) < 0.24;
    if (hesitation) {
      return { x: 0, y: 0 };
    }
    const driftSeed = (state.deliveries + 3) * 1931 + timeBucket * 17;
    if (state.carrying !== null && pseudoRandomFloat(driftSeed + 37) < 0.2) {
      const previewHouse = getHouse(state.nextRequest);
      return scale(normalize({
        x: cellCenter(previewHouse.doorstep).x - state.player.position.x,
        y: cellCenter(previewHouse.doorstep).y - state.player.position.y,
      }), 0.64);
    }
    if (path.length > 2 && pseudoRandomFloat(driftSeed) < 0.28) {
      const drift = pseudoRandomFloat(driftSeed + 11) < 0.5 ? -0.52 : 0.52;
      return scale(normalize({
        x: normalized.x - normalized.y * drift,
        y: normalized.y + normalized.x * drift,
      }), 0.64);
    }
    return scale(normalized, state.carrying === null ? 0.58 : 0.64);
  }
  return normalized;
}

export interface SimulationResult {
  policy: PolicyName;
  duration: number;
  score: number;
  deliveries: number;
  strikes: number;
}

export function simulatePolicyRun(seed: number, policy: PolicyName, maxDuration = 360): SimulationResult {
  const state = createInitialState({ bestScore: 0, bestStreak: 0 }, seed);
  startRun(state);
  const delta = 1 / 30;
  while (state.screen === 'playing' && state.elapsed < maxDuration) {
    const movement = computeAutopilotVector(state, policy);
    stepGame(state, movement, delta);
  }
  return {
    policy,
    duration: state.elapsed,
    score: state.score,
    deliveries: state.deliveries,
    strikes: state.strikes,
  };
}

export function pathExistsToAllHomes(barriers: Set<string>): boolean {
  return HOUSES.every(house => findPath(DEPOT_CELL, house.doorstep, barriers).length > 0);
}

export function describeHouse(houseId: number): string {
  return HOUSES[houseId]?.label ?? 'UNKNOWN';
}

function movePlayer(state: GameState, movement: Vec2, deltaSeconds: number): void {
  const direction = normalize(movement);
  if (Math.abs(direction.x) > EPSILON || Math.abs(direction.y) > EPSILON) {
    state.player.heading = direction;
    state.player.movePulse += deltaSeconds * 10;
  }
  const step = scale(direction, PLAYER_SPEED * deltaSeconds);
  if (Math.abs(step.x) < EPSILON && Math.abs(step.y) < EPSILON) {
    return;
  }
  const nextX = { x: state.player.position.x + step.x, y: state.player.position.y };
  if (isWalkablePosition(nextX, state.barriers)) {
    state.player.position = nextX;
  }
  const nextY = { x: state.player.position.x, y: state.player.position.y + step.y };
  if (isWalkablePosition(nextY, state.barriers)) {
    state.player.position = nextY;
  }
}

function resolveDelivery(state: GameState): void {
  const speedBonus = Math.round((state.timer / state.timerMax) * 80);
  const streakBonus = Math.min(state.currentStreak, 6) * 25;
  state.score += 100 + speedBonus + streakBonus;
  state.currentStreak += 1;
  state.deliveries += 1;
  state.phase = Math.floor(state.deliveries / DELIVERIES_PER_PHASE);
  state.carrying = null;
  state.effects.delivery = 0.36;
  state.effects.houseGlow = 0.5;
  state.bestScore = Math.max(state.bestScore, state.score);
  state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
  state.activeRequest = state.nextRequest;
  state.nextRequest = pickHouse(state, state.activeRequest);
  state.timerMax = timerForPhase(state.phase);
  state.timer = state.timerMax;
  state.barriers = generateBarrierLayout(state, cellFromWorld(state.player.position));
}

function resolveMiss(state: GameState): void {
  state.strikes += 1;
  state.currentStreak = 0;
  state.carrying = null;
  state.effects.miss = 0.48;
  state.activeRequest = state.nextRequest;
  state.nextRequest = pickHouse(state, state.activeRequest);
  state.timerMax = timerForPhase(state.phase);
  state.timer = state.timerMax;
  state.bestScore = Math.max(state.bestScore, state.score);
  state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
  if (state.strikes >= MAX_STRIKES) {
    state.screen = 'gameover';
    return;
  }
  state.barriers = generateBarrierLayout(state, cellFromWorld(state.player.position));
}

function tickEffects(state: GameState, deltaSeconds: number): void {
  state.effects.pickup = Math.max(0, state.effects.pickup - deltaSeconds);
  state.effects.delivery = Math.max(0, state.effects.delivery - deltaSeconds);
  state.effects.houseGlow = Math.max(0, state.effects.houseGlow - deltaSeconds);
  state.effects.miss = Math.max(0, state.effects.miss - deltaSeconds);
}

function refreshGuidePath(state: GameState): void {
  if (state.screen !== 'playing') {
    state.guidePath = [];
    return;
  }
  const start = cellFromWorld(state.player.position);
  const goal = state.carrying === null ? DEPOT_CELL : getHouse(state.activeRequest).doorstep;
  const path = findPath(start, goal, state.barriers);
  state.guidePath = path.length > 0 ? path : [goal];
}

function pickHouse(state: GameState, exclude: number | null): number {
  let choice = Math.floor(nextRandom(state) * HOUSES.length);
  if (exclude !== null && HOUSES.length > 1) {
    while (choice === exclude) {
      choice = Math.floor(nextRandom(state) * HOUSES.length);
    }
  }
  return choice;
}

function generateBarrierLayout(state: GameState, reservedCell: Cell): Set<string> {
  const count = Math.min(9, 2 + state.phase * 2);
  const reserved = new Set<string>([
    cellKey(reservedCell),
    cellKey(DEPOT_CELL),
    ...HOUSES.map(house => cellKey(house.doorstep)),
  ]);
  const candidates = shuffle(BARRIER_CANDIDATES, state).filter(cell => !reserved.has(cellKey(cell)));
  const barriers = new Set<string>();
  for (const candidate of candidates) {
    if (barriers.size >= count) {
      break;
    }
    barriers.add(cellKey(candidate));
    if (!pathExistsToAllHomes(barriers)) {
      barriers.delete(cellKey(candidate));
    }
  }
  return barriers;
}

export function timerForPhase(phase: number): number {
  return Math.max(MIN_TIMER_SECONDS, INITIAL_TIMER_SECONDS - phase * 0.75);
}

function isWalkablePosition(position: Vec2, barriers: Set<string>): boolean {
  const minX = Math.floor(position.x - PLAYER_RADIUS);
  const maxX = Math.floor(position.x + PLAYER_RADIUS);
  const minY = Math.floor(position.y - PLAYER_RADIUS);
  const maxY = Math.floor(position.y + PLAYER_RADIUS);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (isCellBlocked({ x, y }, barriers)) {
        const closestX = clamp(position.x, x, x + 1);
        const closestY = clamp(position.y, y, y + 1);
        const dx = position.x - closestX;
        const dy = position.y - closestY;
        if (dx * dx + dy * dy < PLAYER_RADIUS * PLAYER_RADIUS) {
          return false;
        }
      }
    }
  }
  return true;
}

function isCellBlocked(cell: Cell, barriers: Set<string>): boolean {
  if (!isRoadCell(cell.x, cell.y)) {
    return true;
  }
  return barriers.has(cellKey(cell));
}

export function cellFromWorld(position: Vec2): Cell {
  const x = clamp(Math.floor(position.x), 0, GRID_WIDTH - 1);
  const y = clamp(Math.floor(position.y), 0, GRID_HEIGHT - 1);
  return { x, y };
}

function intersectsCell(position: Vec2, cell: Cell, radius: number): boolean {
  const center = cellCenter(cell);
  return distance(position, center) <= radius;
}

export function findPath(start: Cell, goal: Cell, barriers: Set<string>): Cell[] {
  const startKey = cellKey(start);
  const goalKey = cellKey(goal);
  if (startKey === goalKey) {
    return [start];
  }
  const frontier: Cell[] = [start];
  const cameFrom = new Map<string, string>();
  const visited = new Set<string>([startKey]);

  while (frontier.length > 0) {
    const current = frontier.shift();
    if (!current) {
      break;
    }
    for (const neighbor of neighbors(current)) {
      const key = cellKey(neighbor);
      if (visited.has(key) || isCellBlocked(neighbor, barriers)) {
        continue;
      }
      visited.add(key);
      cameFrom.set(key, cellKey(current));
      if (key === goalKey) {
        return rebuildPath(goalKey, startKey, cameFrom);
      }
      frontier.push(neighbor);
    }
  }
  return [];
}

function rebuildPath(goalKey: string, startKey: string, cameFrom: Map<string, string>): Cell[] {
  const path: Cell[] = [keyToCell(goalKey)];
  let currentKey = goalKey;
  while (currentKey !== startKey) {
    const parent = cameFrom.get(currentKey);
    if (!parent) {
      break;
    }
    path.unshift(keyToCell(parent));
    currentKey = parent;
  }
  return path;
}

function neighbors(cell: Cell): Cell[] {
  const result: Cell[] = [];
  const deltas = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  for (const delta of deltas) {
    const x = cell.x + delta.x;
    const y = cell.y + delta.y;
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
      continue;
    }
    result.push({ x, y });
  }
  return result;
}

function shuffle<T>(values: readonly T[], state: GameState): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(nextRandom(state) * (index + 1));
    const value = copy[index] as T;
    copy[index] = copy[swap] as T;
    copy[swap] = value;
  }
  return copy;
}

function nextRandom(state: GameState): number {
  state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
  return state.rng / 4294967296;
}

function pseudoRandomFloat(seed: number): number {
  let value = seed >>> 0;
  value = (Math.imul(value ^ (value >>> 15), 2246822519) ^ Math.imul(value ^ (value >>> 13), 3266489917)) >>> 0;
  return value / 4294967296;
}

function normalize(vector: Vec2): Vec2 {
  const length = Math.hypot(vector.x, vector.y);
  if (length < EPSILON) {
    return { x: 0, y: 0 };
  }
  return {
    x: vector.x / length,
    y: vector.y / length,
  };
}

function scale(vector: Vec2, magnitude: number): Vec2 {
  return {
    x: vector.x * magnitude,
    y: vector.y * magnitude,
  };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getHouse(index: number) {
  const house = HOUSES[index];
  if (!house) {
    throw new Error(`wickstreet_house_missing:${index}`);
  }
  return house;
}
