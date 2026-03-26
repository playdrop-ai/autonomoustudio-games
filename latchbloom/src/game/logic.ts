export const LANE_COUNT = 4;
export const ROW_COUNT = 5;
export const PREVIEW_COUNT = 2;
export const BOUQUET_GOAL = 3;
export const THORN_LIMIT = 3;
export const SPEED_STEP_DELIVERIES = 8;
export const MAX_SPEED_LEVEL = 8;

export type BlossomKind = "rose" | "iris" | "sun" | "mint";
export type LatchState = "straight" | "cross";
export type Screen = "start" | "playing" | "gameover";

export interface Blossom {
  id: number;
  kind: BlossomKind;
  fromLane: number;
  toLane: number;
  segment: number;
  progress: number;
}

export interface VaseState {
  target: BlossomKind;
  meter: number;
  thorns: number;
  burstTimer: number;
  wrongTimer: number;
}

export interface GameState {
  latches: LatchState[][];
  blossoms: Blossom[];
  queue: BlossomKind[];
  vases: VaseState[];
  nextId: number;
  score: number;
  streak: number;
  totalCorrect: number;
  spawnTimer: number;
  rngState: number;
  gameOver: boolean;
}

export type GameEvent =
  | {
      kind: "spawn";
      blossom: BlossomKind;
      lane: number;
    }
  | {
      kind: "correct";
      blossom: BlossomKind;
      lane: number;
      streak: number;
      scoreGain: number;
    }
  | {
      kind: "wrong";
      blossom: BlossomKind;
      lane: number;
    }
  | {
      kind: "burst";
      blossom: BlossomKind;
      lane: number;
      bonus: number;
    }
  | {
      kind: "gameover";
      lane: number;
    };

export const BLOSSOM_KINDS: BlossomKind[] = ["rose", "iris", "sun", "mint"];

const DEFAULT_LATCHES: LatchState[][] = [
  ["cross", "straight"],
  ["cross"],
  ["straight", "cross"],
  ["straight"],
  ["cross", "straight"],
];

export function createInitialState(seed = Date.now() >>> 0): GameState {
  let rngState = seed >>> 0;
  const queue: BlossomKind[] = [];
  for (let index = 0; index < PREVIEW_COUNT; index += 1) {
    const pick = randomKind(rngState);
    queue.push(pick.kind);
    rngState = pick.rngState;
  }

  return {
    latches: DEFAULT_LATCHES.map((row) => row.slice()),
    blossoms: [],
    queue,
    vases: BLOSSOM_KINDS.map((target) => ({
      target,
      meter: 0,
      thorns: 0,
      burstTimer: 0,
      wrongTimer: 0,
    })),
    nextId: 1,
    score: 0,
    streak: 0,
    totalCorrect: 0,
    spawnTimer: 0,
    rngState,
    gameOver: false,
  };
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    latches: state.latches.map((row) => row.slice()),
    blossoms: state.blossoms.map((blossom) => ({ ...blossom })),
    queue: state.queue.slice(),
    vases: state.vases.map((vase) => ({ ...vase })),
  };
}

export function activePairs(row: number): Array<readonly [number, number]> {
  return row % 2 === 0 ? [[0, 1], [2, 3]] : [[1, 2]];
}

export function toggleLatch(state: GameState, row: number, pairIndex: number): GameState {
  if (row < 0 || row >= state.latches.length) return state;
  if (pairIndex < 0 || pairIndex >= state.latches[row]!.length) return state;
  const next = cloneState(state);
  next.latches[row]![pairIndex] = next.latches[row]![pairIndex] === "cross" ? "straight" : "cross";
  return next;
}

export function nextLaneForRow(lane: number, row: number, latches: LatchState[][]): number {
  const pairs = activePairs(row);
  const states = latches[row]!;
  for (let index = 0; index < pairs.length; index += 1) {
    const [left, right] = pairs[index]!;
    if (lane !== left && lane !== right) continue;
    return states[index] === "cross" ? (lane === left ? right : left) : lane;
  }
  return lane;
}

export function targetLaneForKind(kind: BlossomKind): number {
  return BLOSSOM_KINDS.indexOf(kind);
}

export function spawnIntervalForCorrect(totalCorrect: number): number {
  const level = Math.min(MAX_SPEED_LEVEL, Math.floor(totalCorrect / SPEED_STEP_DELIVERIES));
  return Math.max(760, 1750 - level * 110);
}

export function travelDurationForCorrect(totalCorrect: number): number {
  const level = Math.min(MAX_SPEED_LEVEL, Math.floor(totalCorrect / SPEED_STEP_DELIVERIES));
  return Math.max(2500, 4300 - level * 170);
}

export function updateGame(state: GameState, elapsedMs: number): { state: GameState; events: GameEvent[] } {
  if (elapsedMs <= 0) return { state, events: [] };

  const next = cloneState(state);
  const events: GameEvent[] = [];
  decayEffects(next, elapsedMs);

  if (next.gameOver) return { state: next, events };

  next.spawnTimer += elapsedMs;
  const spawnInterval = spawnIntervalForCorrect(next.totalCorrect);
  while (next.spawnTimer >= spawnInterval && !next.gameOver) {
    next.spawnTimer -= spawnInterval;
    spawnBlossom(next, events);
  }

  const segmentDuration = travelDurationForCorrect(next.totalCorrect) / (ROW_COUNT + 1);
  const survivors: Blossom[] = [];
  for (const blossom of next.blossoms) {
    let remaining = elapsedMs;
    let active = { ...blossom };
    let delivered = false;

    while (remaining > 0 && !delivered) {
      const timeLeft = (1 - active.progress) * segmentDuration;
      if (remaining < timeLeft) {
        active.progress += remaining / segmentDuration;
        remaining = 0;
        break;
      }

      remaining -= timeLeft;
      active.progress = 1;

      if (active.segment === ROW_COUNT) {
        delivered = true;
        handleDelivery(next, active, events);
        break;
      }

      const laneAfterSegment = active.toLane;
      const nextSegment = active.segment + 1;
      active = {
        ...active,
        segment: nextSegment,
        fromLane: laneAfterSegment,
        toLane: nextSegment < ROW_COUNT ? nextLaneForRow(laneAfterSegment, nextSegment, next.latches) : laneAfterSegment,
        progress: 0,
      };
    }

    if (!delivered) survivors.push(active);
    if (next.gameOver) break;
  }

  next.blossoms = survivors;
  return { state: next, events };
}

function handleDelivery(state: GameState, blossom: Blossom, events: GameEvent[]): void {
  const lane = blossom.toLane;
  const targetLane = targetLaneForKind(blossom.kind);
  const vase = state.vases[lane]!;

  if (lane === targetLane) {
    const streak = state.streak + 1;
    const scoreGain = 120 + Math.min(5, streak - 1) * 24;
    vase.meter += 1;
    state.score += scoreGain;
    state.streak = streak;
    state.totalCorrect += 1;
    events.push({ kind: "correct", blossom: blossom.kind, lane, streak, scoreGain });

    if (vase.meter >= BOUQUET_GOAL) {
      vase.meter = 0;
      vase.thorns = 0;
      vase.burstTimer = 1;
      const bonus = 360 + Math.min(240, state.totalCorrect * 4);
      state.score += bonus;
      events.push({ kind: "burst", blossom: blossom.kind, lane, bonus });
    }
    return;
  }

  vase.thorns += 1;
  vase.wrongTimer = 1;
  state.streak = 0;
  events.push({ kind: "wrong", blossom: blossom.kind, lane });
  if (vase.thorns >= THORN_LIMIT) {
    state.gameOver = true;
    events.push({ kind: "gameover", lane });
  }
}

function decayEffects(state: GameState, elapsedMs: number): void {
  const burstDecay = elapsedMs / 420;
  const wrongDecay = elapsedMs / 520;
  for (const vase of state.vases) {
    vase.burstTimer = Math.max(0, vase.burstTimer - burstDecay);
    vase.wrongTimer = Math.max(0, vase.wrongTimer - wrongDecay);
  }
}

function spawnBlossom(state: GameState, events: GameEvent[]): void {
  const spawnedKind = state.queue.shift() ?? "rose";
  const lanePick = randomLane(state.rngState);
  state.rngState = lanePick.rngState;
  const refillPick = randomKind(state.rngState);
  state.rngState = refillPick.rngState;
  state.queue.push(refillPick.kind);

  const blossom: Blossom = {
    id: state.nextId,
    kind: spawnedKind,
    fromLane: lanePick.lane,
    toLane: nextLaneForRow(lanePick.lane, 0, state.latches),
    segment: 0,
    progress: 0,
  };
  state.nextId += 1;
  state.blossoms.push(blossom);
  events.push({ kind: "spawn", blossom: spawnedKind, lane: lanePick.lane });
}

function randomKind(rngState: number): { kind: BlossomKind; rngState: number } {
  const next = lcg(rngState);
  const index = next % BLOSSOM_KINDS.length;
  return { kind: BLOSSOM_KINDS[index]!, rngState: next };
}

function randomLane(rngState: number): { lane: number; rngState: number } {
  const next = lcg(rngState);
  return { lane: next % LANE_COUNT, rngState: next };
}

function lcg(value: number): number {
  return (Math.imul(value, 1664525) + 1013904223) >>> 0;
}
