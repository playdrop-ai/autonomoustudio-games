import {
  COURIER_Y,
  DISTRICTS,
  type AutoplayMode,
  type DebugSnapshot,
  type District,
  type GameEvent,
  type GameState,
  type Gate,
  type Obstacle,
  type ObstacleKind,
  type Particle,
  type StepResult,
} from "./types";

const BASE_SPEED = 0.26;
const SPEED_STEP = 0.016;
const MAX_SPEED = 0.58;
const PASSIVE_STORM_PER_SECOND = 0.018;
const STORM_REWARD = 0.115;
const STORM_PENALTY = 0.085;
const STORM_COLLISION = 0.14;
const GATE_HIT_WINDOW = 0.044;
const OBSTACLE_HIT_WINDOW = 0.05;
const SEGMENT_BASE_INTERVAL_MS = 1060;
const SEGMENT_MIN_INTERVAL_MS = 620;
const SPAWN_Y = -0.12;
const GATE_LANES = [-0.76, -0.34, 0.08, 0.5, 0.82] as const;
const OBSTACLE_LANES = [-0.84, -0.5, -0.12, 0.28, 0.7] as const;

export function createInitialState(seed = (Date.now() >>> 0) || 1): GameState {
  let state: GameState = {
    rng: seed >>> 0,
    elapsedMs: 0,
    score: 0,
    streak: 0,
    bestRunStreak: 0,
    deliveries: 0,
    speed: BASE_SPEED,
    speedTier: 0,
    storm01: 0.18,
    courierX: -0.06,
    targetX: -0.06,
    courierLean: 0,
    activeParcel: "amber",
    nextParcel: "coral",
    gates: [],
    obstacles: [],
    particles: [],
    nextEntityId: 1,
    nextSegmentId: 1,
    spawnTimerMs: 560,
    gameOver: false,
  };

  state.activeParcel = randomDistrict(state);
  state.nextParcel = randomDistrict(state);
  seedVisibleSegments(state);
  return state;
}

export function stepGame(state: GameState, dtMs: number, steerTarget: number | null): StepResult {
  const events: GameEvent[] = [];
  if (state.gameOver) return { state, events };

  state.elapsedMs += dtMs;
  if (steerTarget !== null) {
    state.targetX = clamp(steerTarget, -0.94, 0.94);
  }

  const follow = clamp01(dtMs * 0.0058);
  const previousX = state.courierX;
  state.courierX = lerp(state.courierX, state.targetX, follow);
  const deltaX = state.courierX - previousX;
  state.courierLean = lerp(state.courierLean, clamp(deltaX * 12, -0.95, 0.95), clamp01(dtMs * 0.01));

  state.speedTier = Math.floor(state.deliveries / 8);
  const targetSpeed = Math.min(MAX_SPEED, BASE_SPEED + state.speedTier * SPEED_STEP);
  state.speed = lerp(state.speed, targetSpeed, clamp01(dtMs * 0.0024));

  state.storm01 = clamp01(
    state.storm01 + PASSIVE_STORM_PER_SECOND * (0.9 + state.speedTier * 0.06) * (dtMs / 1000),
  );

  const deltaY = state.speed * (dtMs / 1000);
  for (const gate of state.gates) gate.y += deltaY;
  for (const obstacle of state.obstacles) obstacle.y += deltaY;
  for (const particle of state.particles) {
    particle.ageMs += dtMs;
    particle.x += particle.vx * (dtMs / 1000);
    particle.y += particle.vy * (dtMs / 1000);
  }

  state.particles = state.particles.filter((particle) => particle.ageMs < particle.lifeMs);

  state.spawnTimerMs -= dtMs;
  while (state.spawnTimerMs <= 0) {
    spawnSegment(state, SPAWN_Y);
    state.spawnTimerMs += currentSpawnInterval(state);
  }

  resolveGates(state, events);
  resolveMissedSegments(state);
  resolveObstacles(state, events);

  state.gates = state.gates.filter((gate) => gate.y < 1.14);
  state.obstacles = state.obstacles.filter((obstacle) => obstacle.y < 1.16 && !obstacle.hit);

  if (state.storm01 >= 1) {
    state.gameOver = true;
    events.push({
      kind: "gameover",
      streak: state.streak,
      score: state.score,
      storm01: 1,
    });
  }

  return { state, events };
}

export function chooseAutoplayTarget(state: GameState, mode: AutoplayMode): number {
  if (mode === "idle") return 0;

  const loomingObstacles = state.obstacles
    .filter((obstacle) => obstacle.y > COURIER_Y - 0.2 && obstacle.y < COURIER_Y + 0.08)
    .sort((a, b) => b.y - a.y);

  const matchingGates = state.gates
    .filter((gate) => !gate.resolved && gate.district === state.activeParcel && gate.y > COURIER_Y - 0.34)
    .sort((a, b) => a.y - b.y);

  if (matchingGates.length > 0) {
    const bestGate = matchingGates.reduce((best, gate) => {
      const baseDistance = Math.abs(gate.lane - state.courierX);
      const obstacleRisk = loomingObstacles.some(
        (obstacle) => Math.abs(obstacle.lane - gate.lane) < 0.2 && obstacle.y > gate.y - 0.08,
      )
        ? mode === "expert"
          ? 0.16
          : 0.28
        : 0;
      const score = baseDistance + obstacleRisk + gate.y * 0.04;
      return score < best.score ? { score, lane: gate.lane } : best;
    }, { score: Number.POSITIVE_INFINITY, lane: state.targetX });

    return bestGate.lane;
  }

  if (loomingObstacles.length > 0) {
    const obstacle = loomingObstacles[0]!;
    const dodge = obstacle.lane >= state.courierX ? -0.3 : 0.3;
    return clamp(obstacle.lane + dodge, -0.92, 0.92);
  }

  return mode === "expert" ? state.targetX : lerp(state.targetX, 0, 0.14);
}

export function createDebugSnapshot(state: GameState): DebugSnapshot {
  return {
    score: state.score,
    streak: state.streak,
    bestRunStreak: state.bestRunStreak,
    deliveries: state.deliveries,
    speed: Number(state.speed.toFixed(3)),
    speedTier: state.speedTier,
    storm01: Number(state.storm01.toFixed(3)),
    courierX: Number(state.courierX.toFixed(3)),
    targetX: Number(state.targetX.toFixed(3)),
    activeParcel: state.activeParcel,
    nextParcel: state.nextParcel,
    gates: state.gates
      .filter((gate) => !gate.resolved)
      .slice(0, 8)
      .map((gate) => ({
        y: Number(gate.y.toFixed(3)),
        lane: Number(gate.lane.toFixed(3)),
        district: gate.district,
        segmentId: gate.segmentId,
      })),
    obstacles: state.obstacles.slice(0, 8).map((obstacle) => ({
      y: Number(obstacle.y.toFixed(3)),
      lane: Number(obstacle.lane.toFixed(3)),
      kind: obstacle.kind,
    })),
    gameOver: state.gameOver,
  };
}

function seedVisibleSegments(state: GameState): void {
  spawnSegment(state, 0.18);
  spawnSegment(state, 0.38);
  spawnSegment(state, 0.58);
}

function spawnSegment(state: GameState, y: number): void {
  const gateCount = state.deliveries >= 24 ? 3 : 2;
  const gateLanes = pickDistinctLanes(state, GATE_LANES, gateCount);
  const correctGateIndex = randomInt(state, 0, gateLanes.length);
  const segmentId = state.nextSegmentId++;

  for (let index = 0; index < gateLanes.length; index += 1) {
    const district =
      index === correctGateIndex ? state.activeParcel : randomDistrictExcept(state, state.activeParcel);
    state.gates.push({
      id: state.nextEntityId++,
      segmentId,
      y,
      lane: gateLanes[index]!,
      district,
      scale: 0.86 + randomFloat(state, 0, 0.2),
      resolved: false,
    });
  }

  const obstacleCount = state.deliveries >= 24 ? 2 : 1;
  const obstacleLanes = pickDistinctLanes(state, OBSTACLE_LANES, obstacleCount);
  for (let index = 0; index < obstacleLanes.length; index += 1) {
    state.obstacles.push({
      id: state.nextEntityId++,
      y: y + 0.12 + index * 0.12 + randomFloat(state, -0.025, 0.025),
      lane: obstacleLanes[index]!,
      kind: randomObstacleKind(state),
      scale: 0.84 + randomFloat(state, 0, 0.22),
      hit: false,
    });
  }
}

function resolveGates(state: GameState, events: GameEvent[]): void {
  const candidates = state.gates
    .filter((gate) => !gate.resolved && Math.abs(gate.y - COURIER_Y) <= GATE_HIT_WINDOW)
    .sort((a, b) => a.y - b.y);

  for (const gate of candidates) {
    if (gate.resolved) continue;
    if (Math.abs(gate.lane - state.courierX) > gateHitWidth(gate)) continue;

    const segmentGates = state.gates.filter((candidate) => candidate.segmentId === gate.segmentId);
    for (const sibling of segmentGates) sibling.resolved = true;

    if (gate.district === state.activeParcel) {
      state.deliveries += 1;
      state.streak += 1;
      state.bestRunStreak = Math.max(state.bestRunStreak, state.streak);
      state.score += 120 + Math.min(6, state.streak - 1) * 36;
      state.storm01 = clamp01(state.storm01 - (STORM_REWARD + Math.min(0.06, state.streak * 0.006)));
      emitGateParticles(state, gate.lane, gate.y, "#ffe9b2");
      events.push({
        kind: "correct",
        streak: state.streak,
        score: state.score,
        storm01: state.storm01,
        district: gate.district,
      });
    } else {
      state.streak = 0;
      state.storm01 = clamp01(state.storm01 + STORM_PENALTY);
      emitGateParticles(state, gate.lane, gate.y, "#ff9b82");
      events.push({
        kind: "wrong",
        streak: state.streak,
        score: state.score,
        storm01: state.storm01,
        district: gate.district,
      });
    }

    state.activeParcel = state.nextParcel;
    state.nextParcel = randomDistrict(state);
  }
}

function resolveMissedSegments(state: GameState): void {
  const segmentIds = new Set(state.gates.map((gate) => gate.segmentId));
  for (const segmentId of segmentIds) {
    const segmentGates = state.gates.filter((gate) => gate.segmentId === segmentId);
    if (segmentGates.length === 0) continue;
    const alreadyResolved = segmentGates.some((gate) => gate.resolved);
    if (alreadyResolved) continue;
    if (segmentGates.every((gate) => gate.y > COURIER_Y + 0.08)) {
      for (const gate of segmentGates) gate.resolved = true;
    }
  }
}

function resolveObstacles(state: GameState, events: GameEvent[]): void {
  for (const obstacle of state.obstacles) {
    if (obstacle.hit) continue;
    if (Math.abs(obstacle.y - COURIER_Y) > OBSTACLE_HIT_WINDOW) continue;
    if (Math.abs(obstacle.lane - state.courierX) > obstacleHitWidth(obstacle)) continue;

    obstacle.hit = true;
    state.streak = 0;
    state.speed = Math.max(BASE_SPEED, state.speed - 0.028);
    state.storm01 = clamp01(state.storm01 + STORM_COLLISION);
    emitObstacleParticles(state, obstacle.lane, obstacle.y, obstacle.kind);
    events.push({
      kind: "collision",
      streak: 0,
      score: state.score,
      storm01: state.storm01,
      obstacleKind: obstacle.kind,
    });
  }
}

function emitGateParticles(state: GameState, lane: number, y: number, color: string): void {
  for (let index = 0; index < 10; index += 1) {
    state.particles.push({
      id: state.nextEntityId++,
      x: lane + randomFloat(state, -0.07, 0.07),
      y: y + randomFloat(state, -0.04, 0.04),
      vx: randomFloat(state, -0.1, 0.1),
      vy: randomFloat(state, -0.16, -0.05),
      radius: randomFloat(state, 0.005, 0.014),
      ageMs: 0,
      lifeMs: randomFloat(state, 260, 520),
      color,
    });
  }
}

function emitObstacleParticles(state: GameState, lane: number, y: number, obstacleKind: ObstacleKind): void {
  const color = obstacleKind === "rock" ? "#c2d6ea" : obstacleKind === "ice" ? "#dff2ff" : "#f4fbff";
  for (let index = 0; index < 14; index += 1) {
    state.particles.push({
      id: state.nextEntityId++,
      x: lane + randomFloat(state, -0.04, 0.04),
      y: y + randomFloat(state, -0.02, 0.02),
      vx: randomFloat(state, -0.16, 0.16),
      vy: randomFloat(state, -0.14, 0.08),
      radius: randomFloat(state, 0.004, 0.011),
      ageMs: 0,
      lifeMs: randomFloat(state, 280, 500),
      color,
    });
  }
}

function currentSpawnInterval(state: GameState): number {
  return Math.max(SEGMENT_MIN_INTERVAL_MS, SEGMENT_BASE_INTERVAL_MS - state.speedTier * 54);
}

function gateHitWidth(gate: Gate): number {
  return 0.19 + gate.scale * 0.03;
}

function obstacleHitWidth(obstacle: Obstacle): number {
  if (obstacle.kind === "rock") return 0.11;
  if (obstacle.kind === "ice") return 0.14;
  return 0.1;
}

function pickDistinctLanes<T extends number>(state: GameState, lanes: readonly T[], count: number): T[] {
  const copy = lanes.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(state, 0, index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex]!, copy[index]!];
  }
  return copy.slice(0, count);
}

function randomObstacleKind(state: GameState): ObstacleKind {
  const roll = randomFloat(state, 0, 1);
  return roll < 0.44 ? "tree" : roll < 0.78 ? "rock" : "ice";
}

function randomDistrict(state: GameState): District {
  return DISTRICTS[randomInt(state, 0, DISTRICTS.length)]!;
}

function randomDistrictExcept(state: GameState, blocked: District): District {
  let district = randomDistrict(state);
  while (district === blocked) district = randomDistrict(state);
  return district;
}

function randomFloat(state: GameState, min: number, max: number): number {
  state.rng = (state.rng * 1664525 + 1013904223) >>> 0;
  return min + (state.rng / 0x100000000) * (max - min);
}

function randomInt(state: GameState, min: number, maxExclusive: number): number {
  return Math.floor(randomFloat(state, min, maxExclusive));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}
