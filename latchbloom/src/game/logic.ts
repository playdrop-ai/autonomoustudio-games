export const LANE_COUNT = 4;
export const ROW_COUNT = 5;
export const BOUQUET_GOAL = 3;
export const STRIKE_LIMIT = 3;

export type BlossomKind = "rose" | "iris" | "sun" | "mint";
export type LatchState = "straight" | "cross";
export type Screen = "start" | "playing" | "gameover";

export interface SpawnPacket {
  kind: BlossomKind;
  lane: number;
}

export interface Blossom {
  id: number;
  kind: BlossomKind;
  fromLane: number;
  toLane: number;
  segment: number;
  progress: number;
  travelDuration: number;
}

export interface VaseState {
  target: BlossomKind;
  meter: number;
  burstTimer: number;
  wrongTimer: number;
}

export interface GameState {
  latches: LatchState[][];
  blossoms: Blossom[];
  nextSpawn: SpawnPacket;
  lastSpawn: SpawnPacket | null;
  vases: VaseState[];
  nextId: number;
  score: number;
  streak: number;
  totalCorrect: number;
  strikes: number;
  elapsedMs: number;
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
      strikes: number;
    }
  | {
      kind: "burst";
      blossom: BlossomKind;
      lane: number;
      bonus: number;
      clearedStrike: boolean;
      strikes: number;
    }
  | {
      kind: "gameover";
      lane: number;
      strikes: number;
    };

export const BLOSSOM_KINDS: BlossomKind[] = ["rose", "iris", "sun", "mint"];

export interface DifficultyTier {
  spawnInterval: number;
  travelDuration: number;
  sameLaneRepeatChance: number | null;
  sameKindRepeatChance: number | null;
  maxActiveBlossoms: number;
}

export const DIFFICULTY_TIERS: readonly DifficultyTier[] = [
  {
    spawnInterval: 4200,
    travelDuration: 6500,
    sameLaneRepeatChance: 0.9,
    sameKindRepeatChance: 0.75,
    maxActiveBlossoms: 1,
  },
  {
    spawnInterval: 3400,
    travelDuration: 5600,
    sameLaneRepeatChance: 0.82,
    sameKindRepeatChance: 0.6,
    maxActiveBlossoms: 1,
  },
  {
    spawnInterval: 3000,
    travelDuration: 5200,
    sameLaneRepeatChance: 0.75,
    sameKindRepeatChance: 0.5,
    maxActiveBlossoms: 2,
  },
  {
    spawnInterval: 2600,
    travelDuration: 4800,
    sameLaneRepeatChance: 0.55,
    sameKindRepeatChance: 0.3,
    maxActiveBlossoms: 3,
  },
] as const;

const DEFAULT_LATCHES: LatchState[][] = [
  ["cross", "straight"],
  ["cross"],
  ["straight", "cross"],
  ["straight"],
  ["cross", "straight"],
];

export function createInitialState(seed = Date.now() >>> 0): GameState {
  let rngState = seed >>> 0;
  const spawnPick = createSpawnPacket(rngState, null, 0);
  rngState = spawnPick.rngState;

  return {
    latches: DEFAULT_LATCHES.map((row) => row.slice()),
    blossoms: [],
    nextSpawn: spawnPick.packet,
    lastSpawn: null,
    vases: BLOSSOM_KINDS.map((target) => ({
      target,
      meter: 0,
      burstTimer: 0,
      wrongTimer: 0,
    })),
    nextId: 1,
    score: 0,
    streak: 0,
    totalCorrect: 0,
    strikes: 0,
    elapsedMs: 0,
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
    nextSpawn: { ...state.nextSpawn },
    lastSpawn: state.lastSpawn ? { ...state.lastSpawn } : null,
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

export function difficultyTierForElapsed(elapsedMs: number): DifficultyTier {
  if (elapsedMs < 20_000) return DIFFICULTY_TIERS[0]!;
  if (elapsedMs < 60_000) return DIFFICULTY_TIERS[1]!;
  if (elapsedMs < 120_000) return DIFFICULTY_TIERS[2]!;
  return DIFFICULTY_TIERS[3]!;
}

export function spawnIntervalForElapsed(elapsedMs: number): number {
  return difficultyTierForElapsed(elapsedMs).spawnInterval;
}

export function travelDurationForElapsed(elapsedMs: number): number {
  return difficultyTierForElapsed(elapsedMs).travelDuration;
}

export function updateGame(state: GameState, elapsedMs: number): { state: GameState; events: GameEvent[] } {
  if (elapsedMs <= 0) return { state, events: [] };

  const next = cloneState(state);
  const events: GameEvent[] = [];
  decayEffects(next, elapsedMs);

  if (next.gameOver) return { state: next, events };

  next.elapsedMs += elapsedMs;
  next.spawnTimer += elapsedMs;
  let tier = difficultyTierForElapsed(next.elapsedMs);
  let spawnInterval = tier.spawnInterval;
  while (next.spawnTimer >= spawnInterval && !next.gameOver) {
    if (next.blossoms.length >= tier.maxActiveBlossoms) break;
    next.spawnTimer -= spawnInterval;
    spawnBlossom(next, events);
    tier = difficultyTierForElapsed(next.elapsedMs);
    spawnInterval = tier.spawnInterval;
  }

  const survivors: Blossom[] = [];
  for (const blossom of next.blossoms) {
    let remaining = elapsedMs;
    let active = { ...blossom };
    let delivered = false;

    while (remaining > 0 && !delivered) {
      const segmentDuration = active.travelDuration / (ROW_COUNT + 1);
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
      vase.burstTimer = 1;
      const bonus = 360 + Math.min(240, state.totalCorrect * 4);
      state.score += bonus;
      const clearedStrike = state.strikes > 0;
      if (clearedStrike) state.strikes -= 1;
      events.push({ kind: "burst", blossom: blossom.kind, lane, bonus, clearedStrike, strikes: state.strikes });
    }
    return;
  }

  vase.wrongTimer = 1;
  state.streak = 0;
  state.strikes += 1;
  events.push({ kind: "wrong", blossom: blossom.kind, lane, strikes: state.strikes });
  if (state.strikes >= STRIKE_LIMIT) {
    state.gameOver = true;
    events.push({ kind: "gameover", lane, strikes: state.strikes });
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
  const packet = state.nextSpawn;
  const refillPick = createSpawnPacket(state.rngState, packet, state.elapsedMs);
  state.rngState = refillPick.rngState;
  state.lastSpawn = { ...packet };
  state.nextSpawn = refillPick.packet;

  const blossom: Blossom = {
    id: state.nextId,
    kind: packet.kind,
    fromLane: packet.lane,
    toLane: nextLaneForRow(packet.lane, 0, state.latches),
    segment: 0,
    progress: 0,
    travelDuration: travelDurationForElapsed(state.elapsedMs),
  };
  state.nextId += 1;
  state.blossoms.push(blossom);
  events.push({ kind: "spawn", blossom: packet.kind, lane: packet.lane });
}

function createSpawnPacket(
  rngState: number,
  previous: SpawnPacket | null,
  elapsedMs: number,
): { packet: SpawnPacket; rngState: number } {
  const tier = difficultyTierForElapsed(elapsedMs);
  const lanePick = randomChoiceWithRepeatBias(
    [0, 1, 2, 3] as const,
    previous?.lane,
    tier.sameLaneRepeatChance,
    rngState,
  );
  const kindPick = randomChoiceWithRepeatBias(
    BLOSSOM_KINDS,
    previous?.kind,
    tier.sameKindRepeatChance,
    lanePick.rngState,
  );
  return {
    packet: {
      kind: kindPick.value,
      lane: lanePick.value,
    },
    rngState: kindPick.rngState,
  };
}

function randomChoiceWithRepeatBias<T extends string | number>(
  choices: readonly T[],
  previous: T | undefined,
  repeatChance: number | null,
  rngState: number,
): { value: T; rngState: number } {
  const next = lcg(rngState);
  if (previous === undefined || repeatChance === null) {
    return { value: choices[next % choices.length]!, rngState: next };
  }

  if (next / 0x1_0000_0000 < repeatChance) {
    return { value: previous, rngState: next };
  }

  const alternatives = choices.filter((entry) => entry !== previous);
  const reroll = lcg(next);
  return { value: alternatives[reroll % alternatives.length]!, rngState: reroll };
}

function lcg(value: number): number {
  return (Math.imul(value, 1664525) + 1013904223) >>> 0;
}
