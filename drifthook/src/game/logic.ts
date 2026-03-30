export const FISH_SPECIES = ["dartfin", "bloomkoi", "glassperch", "mooneel"] as const;
export type FishSpecies = (typeof FISH_SPECIES)[number];

export const ORDER_LENGTH = 3;
export const MAX_KNOTS = 4;
export const MAX_LURE_DEPTH = 1;
export const LURE_LOWER_RATE = 0.00042;
export const LURE_REEL_RATE = 0.00078;
export const PERFECT_CATCH_WINDOW = 0.03;

export type Screen = "start" | "playing" | "gameover";
export type EntityKind = "fish" | "snag";
export type DifficultyStage = 0 | 1 | 2 | 3;

export interface OrderSlotView {
  species: FishSpecies;
  status: "complete" | "current" | "pending";
}

export interface WaterEntity {
  id: number;
  kind: EntityKind;
  species: FishSpecies | null;
  spawnedAtMs: number;
  lifetimeMs: number;
  depthAnchor: number;
  depthAmplitude: number;
  depthPeriodMs: number;
  depthPhaseMs: number;
}

export interface GameState {
  screen: Screen;
  elapsedMs: number;
  score: number;
  bestScore: number;
  knots: number;
  completedOrders: number;
  orderProgress: number;
  orderCard: FishSpecies[];
  lureDepth: number;
  holding: boolean;
  spawnTimerMs: number;
  rngState: number;
  entities: WaterEntity[];
  nextEntityId: number;
  reelResolved: boolean;
  gameOver: boolean;
  lastEvent: GameEvent | null;
}

export interface VisibleEntity {
  id: number;
  kind: EntityKind;
  species: FishSpecies | null;
  depth: number;
  ageMs: number;
  lifetimeMs: number;
}

export type GameEvent =
  | {
      kind: "spawn";
      entityId: number;
      entityKind: EntityKind;
      species: FishSpecies | null;
      depth: number;
    }
  | {
      kind: "catch";
      entityId: number;
      entityKind: EntityKind;
      species: FishSpecies | null;
      result: "correct" | "wrong" | "snag";
      perfect: boolean;
      scoreDelta: number;
      orderProgress: number;
      knots: number;
    }
  | {
      kind: "order-complete";
      scoreDelta: number;
      repairedKnots: number;
      completedOrders: number;
      knots: number;
    }
  | {
      kind: "gameover";
      score: number;
      completedOrders: number;
    };

export interface GameUpdateResult {
  state: GameState;
  events: GameEvent[];
}

const TAU = Math.PI * 2;
const BASE_ORDER_WEIGHTS: readonly number[][] = [
  [5, 4, 3, 2],
  [4, 4, 3, 3],
  [3, 4, 4, 3],
  [2, 3, 4, 5],
];

const SPAWN_INTERVALS_MS: readonly number[] = [5600, 5000, 4300, 3600];
const SNAG_CHANCES: readonly number[] = [0.02, 0.03, 0.045, 0.06];
const ACTIVE_ENTITY_CAPS: readonly number[] = [3, 4, 5, 6];

const SPECIES_DEPTHS: Record<FishSpecies, number> = {
  dartfin: 0.24,
  bloomkoi: 0.42,
  glassperch: 0.63,
  mooneel: 0.82,
};

const SPECIES_AMPLITUDES: Record<FishSpecies, number> = {
  dartfin: 0.025,
  bloomkoi: 0.03,
  glassperch: 0.032,
  mooneel: 0.022,
};

const SPECIES_PERIODS: Record<FishSpecies, number> = {
  dartfin: 3600,
  bloomkoi: 4000,
  glassperch: 3200,
  mooneel: 4400,
};

const ORDER_BONUS_SCORE = 300;
const CORRECT_SCORE = 100;
const PERFECT_SCORE = 140;

export function createInitialState(seed = 1): GameState {
  const orderSeed = seed >>> 0;
  const { card, rngState } = createOrderCard(orderSeed, 0);
  return {
    screen: "start",
    elapsedMs: 0,
    score: 0,
    bestScore: 0,
    knots: MAX_KNOTS,
    completedOrders: 0,
    orderProgress: 0,
    orderCard: card,
    lureDepth: 0.08,
    holding: false,
    spawnTimerMs: 0,
    rngState,
    entities: [],
    nextEntityId: 1,
    reelResolved: false,
    gameOver: false,
    lastEvent: null,
  };
}

export function startRun(state: GameState, seed = state.rngState): GameState {
  const next = cloneState(state);
  next.screen = "playing";
  next.elapsedMs = 0;
  next.score = 0;
  next.knots = MAX_KNOTS;
  next.completedOrders = 0;
  next.orderProgress = 0;
  next.lureDepth = 0.08;
  next.holding = false;
  next.spawnTimerMs = 0;
  next.entities = [];
  next.nextEntityId = 1;
  next.reelResolved = false;
  next.gameOver = false;
  next.lastEvent = null;
  next.rngState = seed >>> 0;
  const order = createOrderCard(next.rngState, 0);
  next.orderCard = order.card;
  next.rngState = order.rngState;
  return next;
}

export function updateGame(state: GameState, elapsedMs: number, inputHeld: boolean): GameUpdateResult {
  if (elapsedMs <= 0) {
    return { state: cloneState(state), events: [] };
  }

  if (state.screen !== "playing" || state.gameOver) {
    const idle = cloneState(state);
    idle.holding = inputHeld;
    return { state: idle, events: [] };
  }

  const next = cloneState(state);
  const events: GameEvent[] = [];
  const now = next.elapsedMs + elapsedMs;
  const previousDepth = next.lureDepth;

  next.elapsedMs = now;
  next.holding = inputHeld;
  if (inputHeld) {
    next.reelResolved = false;
  }
  next.lureDepth = clamp(
    previousDepth + (inputHeld ? LURE_LOWER_RATE : -LURE_REEL_RATE) * elapsedMs,
    0,
    MAX_LURE_DEPTH,
  );

  pruneExpiredEntities(next, now);

  if (!inputHeld && !next.reelResolved && next.lureDepth < previousDepth) {
    const caught = findFirstCrossedEntity(next.entities, previousDepth, next.lureDepth, now);
    if (caught) {
      next.reelResolved = true;
      resolveCatch(next, caught, previousDepth, now, events);
    }
  }

  if (next.lureDepth <= 0) {
    next.reelResolved = false;
  }

  next.spawnTimerMs += elapsedMs;
  const stage = getDifficultyStage(next);
  const interval = getSpawnIntervalMs(stage);
  const cap = ACTIVE_ENTITY_CAPS[stage] ?? ACTIVE_ENTITY_CAPS[0]!;
  while (next.spawnTimerMs >= interval && next.entities.length < cap) {
    next.spawnTimerMs -= interval;
    const spawned = spawnEntity(next, now, stage);
    next.entities.push(spawned);
    events.push({
      kind: "spawn",
      entityId: spawned.id,
      entityKind: spawned.kind,
      species: spawned.species,
      depth: entityDepthAt(spawned, now),
    });
  }

  next.lastEvent = events.length > 0 ? events[events.length - 1] ?? null : null;
  if (next.knots <= 0) {
    next.knots = 0;
    next.gameOver = true;
    next.screen = "gameover";
    const gameoverEvent: GameEvent = {
      kind: "gameover",
      score: next.score,
      completedOrders: next.completedOrders,
    };
    next.lastEvent = gameoverEvent;
    events.push(gameoverEvent);
  }

  if (next.score > next.bestScore) {
    next.bestScore = next.score;
  }

  return { state: next, events };
}

export function getDifficultyStage(state: Pick<GameState, "completedOrders">): DifficultyStage {
  const stage = Math.min(3, Math.floor(state.completedOrders / 3));
  return stage as DifficultyStage;
}

export function getSpawnIntervalMs(stage: DifficultyStage): number {
  return SPAWN_INTERVALS_MS[stage] ?? SPAWN_INTERVALS_MS[0]!;
}

export function getCurrentTarget(state: Pick<GameState, "orderCard" | "orderProgress">): FishSpecies {
  return state.orderCard[state.orderProgress] ?? state.orderCard[0] ?? FISH_SPECIES[0];
}

export function getOrderSlots(state: Pick<GameState, "orderCard" | "orderProgress">): OrderSlotView[] {
  return state.orderCard.map((species, index) => ({
    species,
    status: index < state.orderProgress ? "complete" : index === state.orderProgress ? "current" : "pending",
  }));
}

export function getLineKnots(state: Pick<GameState, "knots">): boolean[] {
  return Array.from({ length: MAX_KNOTS }, (_, index) => index < state.knots);
}

export function getVisibleEntities(state: Pick<GameState, "elapsedMs" | "entities">): VisibleEntity[] {
  return state.entities.map((entity) => ({
    id: entity.id,
    kind: entity.kind,
    species: entity.species,
    depth: entityDepthAt(entity, state.elapsedMs),
    ageMs: Math.max(0, state.elapsedMs - entity.spawnedAtMs),
    lifetimeMs: entity.lifetimeMs,
  }));
}

export function summarizeBalance(state: GameState): {
  score: number;
  knots: number;
  completedOrders: number;
  target: FishSpecies;
  stage: DifficultyStage;
  lureDepth: number;
  visibleEntities: number;
} {
  return {
    score: state.score,
    knots: state.knots,
    completedOrders: state.completedOrders,
    target: getCurrentTarget(state),
    stage: getDifficultyStage(state),
    lureDepth: state.lureDepth,
    visibleEntities: state.entities.length,
  };
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    orderCard: state.orderCard.slice(),
    entities: state.entities.map((entity) => ({ ...entity })),
    lastEvent: state.lastEvent ? { ...state.lastEvent } : null,
  };
}

function createOrderCard(rngState: number, stage: DifficultyStage): { card: FishSpecies[]; rngState: number } {
  let nextRngState = rngState >>> 0;
  const weights = BASE_ORDER_WEIGHTS[stage] ?? BASE_ORDER_WEIGHTS[0]!;
  const card: FishSpecies[] = [];
  for (let slot = 0; slot < ORDER_LENGTH; slot += 1) {
    const pick = pickWeightedSpecies(weights, nextRngState, card[slot - 1] ?? null);
    card.push(pick.species);
    nextRngState = pick.rngState;
  }

  if (new Set(card).size === 1) {
    const reroll = pickWeightedSpecies(weights, nextRngState, card[1] ?? null);
    card[2] = reroll.species;
    nextRngState = reroll.rngState;
  }

  return { card, rngState: nextRngState };
}

function pickWeightedSpecies(
  weights: readonly number[],
  rngState: number,
  avoid: FishSpecies | null,
): { species: FishSpecies; rngState: number } {
  const weighted: Array<[FishSpecies, number]> = FISH_SPECIES.map((species, index) => [species, weights[index] ?? 1]);
  if (avoid) {
    const candidate = weighted.find(([species]) => species === avoid);
    if (candidate) candidate[1] = Math.max(1, candidate[1] - 1);
  }

  const total = weighted.reduce((sum, [, weight]) => sum + weight, 0);
  const roll = nextRandom(rngState);
  let cursor = roll.value * total;
  for (const [species, weight] of weighted) {
    if (cursor < weight) return { species, rngState: roll.rngState };
    cursor -= weight;
  }
  return { species: weighted[0]?.[0] ?? FISH_SPECIES[0], rngState: roll.rngState };
}

function spawnEntity(state: GameState, now: number, stage: DifficultyStage): WaterEntity {
  const target = getCurrentTarget(state);
  const futureTargets = state.orderCard.slice(state.orderProgress + 1);
  let rngState = state.rngState;

  const snagRoll = nextRandom(rngState);
  rngState = snagRoll.rngState;

  const fishChoice = chooseSpawnSpecies(rngState, target, futureTargets);
  rngState = fishChoice.rngState;

  const snagChance = SNAG_CHANCES[stage] ?? SNAG_CHANCES[0]!;
  const isSnag = snagRoll.value < snagChance;
  const species = isSnag ? null : fishChoice.species;
  const kind: EntityKind = isSnag ? "snag" : "fish";
  const depthRoll = nextRandom(rngState);
  rngState = depthRoll.rngState;
  const amplitudeRoll = nextRandom(rngState);
  rngState = amplitudeRoll.rngState;
  const periodRoll = nextRandom(rngState);
  rngState = periodRoll.rngState;
  const lifetimeRoll = nextRandom(rngState);
  rngState = lifetimeRoll.rngState;
  const phaseRoll = nextRandom(rngState);
  rngState = phaseRoll.rngState;

  const isTarget = !isSnag && species === target;
  const isFutureTarget = !isSnag && !isTarget && futureTargets.includes(species ?? FISH_SPECIES[0]);
  const baseDepth = isSnag
    ? 0.18 + 0.28 * depthRoll.value
    : isTarget
      ? 0.72 + 0.16 * depthRoll.value
      : isFutureTarget
        ? 0.46 + 0.14 * depthRoll.value
        : 0.08 + 0.20 * depthRoll.value;
  const amplitudeBase = isSnag
    ? 0.018
    : isTarget
      ? 0.016
      : isFutureTarget
        ? 0.02
        : SPECIES_AMPLITUDES[species ?? "dartfin"];
  const periodBase = isSnag ? 4200 : SPECIES_PERIODS[species ?? "dartfin"];
  const amplitude = amplitudeBase * (0.75 + 0.5 * amplitudeRoll.value);
  const periodMs = Math.max(1200, periodBase * (0.85 + 0.3 * periodRoll.value) * (1 - stage * 0.04));
  const lifetimeMs = 15000 + stage * 900 + Math.floor(lifetimeRoll.value * 6000);

  const entity: WaterEntity = {
    id: state.nextEntityId++,
    kind,
    species,
    spawnedAtMs: now,
    lifetimeMs,
    depthAnchor: clamp(baseDepth + (phaseRoll.value - 0.5) * 0.08, 0.12, 0.9),
    depthAmplitude: amplitude,
    depthPeriodMs: periodMs,
    depthPhaseMs: phaseRoll.value * periodMs,
  };

  state.rngState = rngState;

  state.lastEvent = {
    kind: "spawn",
    entityId: entity.id,
    entityKind: entity.kind,
    species: entity.species,
    depth: entityDepthAt(entity, now),
  };

  return entity;
}

function chooseSpawnSpecies(
  rngState: number,
  target: FishSpecies,
  futureTargets: FishSpecies[],
): { species: FishSpecies; rngState: number } {
  const weights = new Map<FishSpecies, number>(FISH_SPECIES.map((species) => [species, 1]));
  weights.set(target, (weights.get(target) ?? 1) + 4);
  for (const future of futureTargets) {
    weights.set(future, (weights.get(future) ?? 1) + 2);
  }

  const entries = Array.from(weights.entries());
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  const roll = nextRandom(rngState);
  let cursor = roll.value * total;
  for (const [species, weight] of entries) {
    if (cursor < weight) return { species, rngState: roll.rngState };
    cursor -= weight;
  }
  return { species: target, rngState: roll.rngState };
}

function pruneExpiredEntities(state: GameState, now: number): void {
  state.entities = state.entities.filter((entity) => now - entity.spawnedAtMs <= entity.lifetimeMs);
}

function findFirstCrossedEntity(
  entities: WaterEntity[],
  previousDepth: number,
  currentDepth: number,
  now: number,
): WaterEntity | null {
  let best: { entity: WaterEntity; depth: number } | null = null;
  for (const entity of entities) {
    const depth = entityDepthAt(entity, now);
    if (depth > previousDepth + 0.0001 || depth < currentDepth - 0.0001) continue;
    if (!best || depth < best.depth || (depth === best.depth && entity.id < best.entity.id)) {
      best = { entity, depth };
    }
  }
  return best?.entity ?? null;
}

function resolveCatch(
  state: GameState,
  entity: WaterEntity,
  previousDepth: number,
  now: number,
  events: GameEvent[],
): void {
  state.entities = state.entities.filter((candidate) => candidate.id !== entity.id);

  const target = getCurrentTarget(state);
  const caughtDepth = entityDepthAt(entity, now);
  const perfect = Math.abs(previousDepth - caughtDepth) <= PERFECT_CATCH_WINDOW;

  let scoreDelta = 0;
  let result: "correct" | "wrong" | "snag" = "wrong";

  if (entity.kind === "snag") {
    state.knots -= 1;
    result = "snag";
  } else if (entity.species === target) {
    scoreDelta = perfect ? PERFECT_SCORE : CORRECT_SCORE;
    state.score += scoreDelta;
    state.orderProgress += 1;
    result = "correct";

    if (state.orderProgress >= ORDER_LENGTH) {
      state.completedOrders += 1;
      const repair = state.knots < MAX_KNOTS ? 1 : 0;
      state.knots = Math.min(MAX_KNOTS, state.knots + repair);
      state.score += ORDER_BONUS_SCORE;
      scoreDelta += ORDER_BONUS_SCORE;
      state.orderProgress = 0;
      const nextOrder = createOrderCard(state.rngState, getDifficultyStage(state));
      state.orderCard = nextOrder.card;
      state.rngState = nextOrder.rngState;
      events.push({
        kind: "order-complete",
        scoreDelta: ORDER_BONUS_SCORE,
        repairedKnots: repair,
        completedOrders: state.completedOrders,
        knots: state.knots,
      });
    }
  } else {
    state.knots -= 1;
    result = "wrong";
    state.orderProgress = 0;
  }

  if (result !== "correct") {
    state.orderProgress = 0;
  }

  const catchEvent: GameEvent = {
    kind: "catch",
    entityId: entity.id,
    entityKind: entity.kind,
    species: entity.species,
    result,
    perfect,
    scoreDelta,
    orderProgress: state.orderProgress,
    knots: state.knots,
  };
  state.lastEvent = catchEvent;
  events.push(catchEvent);
}

function entityDepthAt(entity: WaterEntity, timeMs: number): number {
  const wave = Math.sin(((timeMs - entity.spawnedAtMs + entity.depthPhaseMs) / entity.depthPeriodMs) * TAU);
  return clamp(entity.depthAnchor + wave * entity.depthAmplitude, 0.08, 0.92);
}

function nextRandom(seed: number): { value: number; rngState: number } {
  let state = seed >>> 0;
  state = (state + 0x6d2b79f5) >>> 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, rngState: state };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
