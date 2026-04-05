import {
  add,
  angleToVector,
  clamp,
  clamp01,
  dot,
  formatTime,
  length,
  normalize,
  scale,
  smoothstep,
  subtract,
  turnToward,
  vectorToAngle,
  wrapAngle,
  type Vec2,
} from "./math";
import { createRandom, type RandomSource } from "./random";

export type GameMode = "attract" | "running" | "ended";
export type EnemyKind = "basic" | "heavy";
export type PropKind = "cone" | "box";
export type PolicyName = "idle" | "casual" | "expert";

export interface ControlInput {
  moveX: number;
  moveY: number;
  dashPressed: boolean;
}

export interface SimEvent {
  type: "dash" | "hit" | "pickup" | "ko" | "spawn" | "battery-low" | "prop-spawn";
  x: number;
  y: number;
  intensity?: number;
  kind?: EnemyKind | PropKind;
}

interface SpawnPreview {
  kind: EnemyKind;
  eta: number;
  point: Vec2;
}

interface VehicleState {
  id: number;
  kind: "player" | EnemyKind;
  position: Vec2;
  velocity: Vec2;
  heading: number;
  radius: number;
  mass: number;
  hp: number;
  maxHp: number;
  dashTimer: number;
  dashCooldown: number;
  stunTimer: number;
  flashTimer: number;
  lifeTimer: number;
}

interface PickupState {
  id: number;
  position: Vec2;
  velocity: Vec2;
  value: number;
  lifeTimer: number;
}

export interface PropState {
  id: number;
  kind: PropKind;
  position: Vec2;
  width: number;
  height: number;
  angle: number;
}

export interface GameSummary {
  score: number;
  time: number;
  destroyed: number;
  collected: number;
  comboBest: number;
  newBest: boolean;
}

export interface SimulationSnapshot {
  mode: GameMode;
  arenaWidth: number;
  arenaHeight: number;
  player: {
    position: Vec2;
    velocity: Vec2;
    heading: number;
    dashTimer: number;
    dashCooldown: number;
    battery: number;
    lowBatteryPulse: number;
  };
  enemies: Array<{
    id: number;
    kind: EnemyKind;
    position: Vec2;
    velocity: Vec2;
    heading: number;
    radius: number;
    hp: number;
    maxHp: number;
    flashTimer: number;
    stunTimer: number;
  }>;
  pickups: Array<{
    id: number;
    position: Vec2;
    value: number;
    lifeTimer: number;
  }>;
  props: PropState[];
  nextSpawn: SpawnPreview | null;
  score: number;
  time: number;
  battery: number;
  bestScore: number;
  dashCooldown: number;
  combo: number;
  comboTimer: number;
  destroyed: number;
  collected: number;
  summary: GameSummary | null;
  hudThreat: string;
  hudTime: string;
  targetSurface: "mobileLandscape" | "desktop";
}

export interface SimulationState {
  mode: GameMode;
  targetSurface: "mobileLandscape" | "desktop";
  rng: RandomSource;
  seed: number;
  arenaWidth: number;
  arenaHeight: number;
  player: VehicleState;
  enemies: VehicleState[];
  pickups: PickupState[];
  props: PropState[];
  nextVehicleId: number;
  nextPickupId: number;
  nextPropId: number;
  nextSpawn: SpawnPreview | null;
  nextPropAt: number;
  time: number;
  score: number;
  bestScore: number;
  battery: number;
  batteryLowLatched: boolean;
  combo: number;
  comboTimer: number;
  destroyed: number;
  collected: number;
  summary: GameSummary | null;
  frameEvents: SimEvent[];
  attractTimer: number;
}

const ARENA_WIDTH = 14.2;
const ARENA_HEIGHT = 8.8;
const MAX_BATTERY = 100;
const PLAYER_RADIUS = 0.56;
const BASIC_RADIUS = 0.52;
const HEAVY_RADIUS = 0.76;
const EPSILON = 1e-6;

function makePlayer(): VehicleState {
  return {
    id: 1,
    kind: "player",
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    heading: 0,
    radius: PLAYER_RADIUS,
    mass: 1,
    hp: MAX_BATTERY,
    maxHp: MAX_BATTERY,
    dashTimer: 0,
    dashCooldown: 0,
    stunTimer: 0,
    flashTimer: 0,
    lifeTimer: 0,
  };
}

function createEnemy(id: number, kind: EnemyKind, point: Vec2, heading: number): VehicleState {
  const heavy = kind === "heavy";
  return {
    id,
    kind,
    position: { ...point },
    velocity: scale(angleToVector(heading), heavy ? 2.7 : 3.4),
    heading,
    radius: heavy ? HEAVY_RADIUS : BASIC_RADIUS,
    mass: heavy ? 1.9 : 1.05,
    hp: heavy ? 34 : 16,
    maxHp: heavy ? 34 : 16,
    dashTimer: 0,
    dashCooldown: 0,
    stunTimer: 0,
    flashTimer: 0,
    lifeTimer: 0,
  };
}

function initialProps(): PropState[] {
  return [
    { id: 1, kind: "cone", position: { x: -3.6, y: 2.1 }, width: 0.44, height: 0.44, angle: 0.1 },
    { id: 2, kind: "cone", position: { x: 3.9, y: -2.2 }, width: 0.44, height: 0.44, angle: -0.2 },
    { id: 3, kind: "box", position: { x: 0.7, y: -2.8 }, width: 0.78, height: 0.62, angle: 0.28 },
  ];
}

export function createSimulation(options: {
  seed: number;
  bestScore: number;
  mode?: "attract" | "running";
  targetSurface?: "mobileLandscape" | "desktop";
}): SimulationState {
  const rng = createRandom(options.seed);
  const player = makePlayer();

  const state: SimulationState = {
    mode: options.mode ?? "running",
    targetSurface: options.targetSurface ?? "mobileLandscape",
    rng,
    seed: options.seed,
    arenaWidth: ARENA_WIDTH,
    arenaHeight: ARENA_HEIGHT,
    player,
    enemies: [],
    pickups: [],
    props: initialProps(),
    nextVehicleId: 2,
    nextPickupId: 1,
    nextPropId: 4,
    nextSpawn: null,
    nextPropAt: 32,
    time: 0,
    score: 0,
    bestScore: options.bestScore,
    battery: options.mode === "attract" ? MAX_BATTERY : 88,
    batteryLowLatched: false,
    combo: 0,
    comboTimer: 0,
    destroyed: 0,
    collected: 0,
    summary: null,
    frameEvents: [],
    attractTimer: 0,
  };

  if (state.mode === "attract") {
    state.battery = MAX_BATTERY;
    state.score = 280;
  }

  spawnEnemy(state, "basic", state.mode === "attract");
  scheduleNextSpawn(state);
  return state;
}

export function createRestart(state: SimulationState, options?: { mode?: "attract" | "running" }): SimulationState {
  return createSimulation({
    seed: ((Math.random() * 0xffffffff) | 0) >>> 0,
    bestScore: state.bestScore,
    mode: options?.mode ?? "running",
    targetSurface: state.targetSurface,
  });
}

export function createPolicyInput(state: SimulationState, policy: PolicyName): ControlInput {
  if (policy === "idle") {
    return { moveX: 0, moveY: 0, dashPressed: false };
  }

  const player = state.player;
  const nearestPickup = [...state.pickups].sort((a, b) => {
    return length(subtract(a.position, player.position)) - length(subtract(b.position, player.position));
  })[0] ?? null;

  const sortedEnemies = [...state.enemies].sort((a, b) => {
    return length(subtract(a.position, player.position)) - length(subtract(b.position, player.position));
  });
  const nearestEnemy = sortedEnemies[0] ?? null;

  let target = angleToVector(player.heading);
  let dashPressed = false;
  const pickupThreshold = policy === "expert" ? 92 : 42;

  if (nearestPickup && state.battery < pickupThreshold) {
    target = normalize(subtract(nearestPickup.position, player.position));
  } else if (nearestEnemy) {
    const enemyDistance = length(subtract(nearestEnemy.position, player.position));
    const pursuitLead = policy === "expert" ? 0.24 : 0.16;
    const predicted = add(nearestEnemy.position, scale(nearestEnemy.velocity, pursuitLead));
    if (policy === "expert") {
      const enemyForward = angleToVector(nearestEnemy.heading);
      const sideNormal = { x: -enemyForward.y, y: enemyForward.x };
      const side = dot(sideNormal, subtract(player.position, nearestEnemy.position)) > 0 ? 1 : -1;
      const flankPoint = add(predicted, scale(sideNormal, side * (nearestEnemy.kind === "heavy" ? 1.25 : 0.9)));
      const attackPoint = enemyDistance > 1.75 ? flankPoint : add(predicted, scale(enemyForward, -0.35));
      target = normalize(subtract(attackPoint, player.position));
      if (
        player.dashCooldown <= 0 &&
        enemyDistance > 1.15 &&
        enemyDistance < 2.55 &&
        dot(angleToVector(player.heading), normalize(subtract(predicted, player.position))) > 0.82
      ) {
        dashPressed = true;
      }
    } else {
      target = normalize(subtract(predicted, player.position));
    }
  }

  return {
    moveX: target.x,
    moveY: target.y,
    dashPressed,
  };
}

export function runPolicySample(options: {
  seed: number;
  bestScore?: number;
  policy: PolicyName;
  seconds: number;
}): GameSummary {
  let sim = createSimulation({
    seed: options.seed,
    bestScore: options.bestScore ?? 0,
  });

  const fixedDt = 1 / 60;
  const steps = Math.ceil(options.seconds / fixedDt);

  for (let index = 0; index < steps; index += 1) {
    stepSimulation(sim, createBalancePolicyInput(sim, options.policy), fixedDt);
    if (sim.mode === "ended") {
      break;
    }
  }

  return (
    sim.summary ?? {
      score: Math.round(sim.score),
      time: sim.time,
      destroyed: sim.destroyed,
      collected: sim.collected,
      comboBest: sim.combo,
      newBest: false,
    }
  );
}

function createBalancePolicyInput(state: SimulationState, policy: PolicyName): ControlInput {
  if (policy === "idle") {
    return { moveX: 0, moveY: 0, dashPressed: false };
  }

  if (policy === "expert") {
    return createPolicyInput(state, "expert");
  }

  const player = state.player;
  const nearestPickup = [...state.pickups].sort((a, b) => {
    return length(subtract(a.position, player.position)) - length(subtract(b.position, player.position));
  })[0] ?? null;

  if (nearestPickup && state.battery < 12) {
    const toPickup = normalize(subtract(nearestPickup.position, player.position));
    return {
      moveX: toPickup.x * 0.4,
      moveY: toPickup.y * 0.4,
      dashPressed: false,
    };
  }

  return {
    moveX: 0,
    moveY: 0,
    dashPressed: false,
  };
}

export function stepSimulation(state: SimulationState, input: ControlInput, dtRaw: number): void {
  const dt = clamp(dtRaw, 1 / 120, 1 / 20);
  state.frameEvents.length = 0;

  if (state.mode === "ended") {
    return;
  }

  if (state.mode === "attract") {
    state.attractTimer += dt;
    input = createPolicyInput(state, "expert");
  }

  state.time += dt;
  state.player.lifeTimer += dt;

  if (state.comboTimer > 0) {
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer === 0) {
      state.combo = 0;
    }
  }

  updateTimers(state.player, dt);
  for (const enemy of state.enemies) {
    updateTimers(enemy, dt);
    enemy.lifeTimer += dt;
  }

  if (state.mode !== "attract") {
    const drainRate = 0.76 + state.time * 0.003 + state.enemies.length * 0.075;
    applyBatteryDelta(state, -drainRate * dt);
    if (!state.batteryLowLatched && state.battery <= 24) {
      state.batteryLowLatched = true;
      state.frameEvents.push({ type: "battery-low", x: state.player.position.x, y: state.player.position.y });
    }
    if (state.battery > 32) {
      state.batteryLowLatched = false;
    }
  }

  updatePlayer(state, input, dt);
  updateEnemies(state, dt);
  updatePickups(state, dt);
  updateSpawn(state, dt);
  updatePropGrowth(state);

  resolveVehicleCollisions(state);
  resolveWalls(state, state.player);
  for (const enemy of state.enemies) {
    resolveWalls(state, enemy);
  }

  resolveProps(state, state.player);
  for (const enemy of state.enemies) {
    resolveProps(state, enemy);
  }

  collectPickups(state);
  cleanup(state);

  if (state.mode === "attract") {
    if (state.attractTimer >= 18 || state.enemies.length === 0 || state.score > 680) {
      const restart = createRestart(state, { mode: "attract" });
      Object.assign(state, restart);
    }
    return;
  }

  state.score += dt * (7 + Math.min(14, state.time * 0.04));

  if (state.battery <= 0) {
    endRun(state);
  }
}

export function drainFrameEvents(state: SimulationState): SimEvent[] {
  return state.frameEvents.splice(0, state.frameEvents.length);
}

export function getSnapshot(state: SimulationState): SimulationSnapshot {
  return {
    mode: state.mode,
    arenaWidth: state.arenaWidth,
    arenaHeight: state.arenaHeight,
    player: {
      position: { ...state.player.position },
      velocity: { ...state.player.velocity },
      heading: state.player.heading,
      dashTimer: state.player.dashTimer,
      dashCooldown: state.player.dashCooldown,
      battery: state.battery,
      lowBatteryPulse: smoothstep(0, 24, 24 - state.battery),
    },
    enemies: state.enemies.map((enemy) => ({
      id: enemy.id,
      kind: enemy.kind === "heavy" ? "heavy" : "basic",
      position: { ...enemy.position },
      velocity: { ...enemy.velocity },
      heading: enemy.heading,
      radius: enemy.radius,
      hp: enemy.hp,
      maxHp: enemy.maxHp,
      flashTimer: enemy.flashTimer,
      stunTimer: enemy.stunTimer,
    })),
    pickups: state.pickups.map((pickup) => ({
      id: pickup.id,
      position: { ...pickup.position },
      value: pickup.value,
      lifeTimer: pickup.lifeTimer,
    })),
    props: state.props.map((prop) => ({ ...prop, position: { ...prop.position } })),
    nextSpawn: state.nextSpawn ? { ...state.nextSpawn, point: { ...state.nextSpawn.point } } : null,
    score: Math.round(state.score),
    time: state.time,
    battery: state.battery,
    bestScore: state.bestScore,
    dashCooldown: state.player.dashCooldown,
    combo: state.combo,
    comboTimer: state.comboTimer,
    destroyed: state.destroyed,
    collected: state.collected,
    summary: state.summary,
    hudThreat: state.nextSpawn ? `${state.nextSpawn.kind === "heavy" ? "Heavy" : "Rival"} · ${state.nextSpawn.eta.toFixed(1)}s` : "Clear lane",
    hudTime: formatTime(state.time),
    targetSurface: state.targetSurface,
  };
}

function updateTimers(vehicle: VehicleState, dt: number): void {
  vehicle.dashTimer = Math.max(0, vehicle.dashTimer - dt);
  vehicle.dashCooldown = Math.max(0, vehicle.dashCooldown - dt);
  vehicle.stunTimer = Math.max(0, vehicle.stunTimer - dt);
  vehicle.flashTimer = Math.max(0, vehicle.flashTimer - dt);
}

function updatePlayer(state: SimulationState, input: ControlInput, dt: number): void {
  const player = state.player;
  const rawMove = { x: input.moveX, y: input.moveY };
  const magnitude = clamp(length(rawMove), 0, 1);

  if (magnitude > 0.1) {
    const desiredHeading = vectorToAngle(normalize(rawMove));
    const agility = 3.7 + magnitude * 2.2;
    player.heading = turnToward(player.heading, desiredHeading, agility * dt);
  }

  if (input.dashPressed && player.dashCooldown <= 0) {
    player.dashCooldown = 2.2;
    player.dashTimer = 0.33;
    state.frameEvents.push({ type: "dash", x: player.position.x, y: player.position.y, intensity: 1.1 });
  }

  const forward = angleToVector(player.heading);
  const boostFactor = player.dashTimer > 0 ? 1.85 : 1;
  const acceleration = 11.2 * boostFactor;
  const drag = player.dashTimer > 0 ? 0.992 : 0.974;
  const maxSpeed = player.dashTimer > 0 ? 8.8 : 5.35;

  player.velocity = add(player.velocity, scale(forward, acceleration * dt));
  applyGrip(player, drag, 0.16, maxSpeed);
  player.position = add(player.position, scale(player.velocity, dt));
}

function updateEnemies(state: SimulationState, dt: number): void {
  const player = state.player;

  for (const enemy of state.enemies) {
    const heavy = enemy.kind === "heavy";
    const aggressionLead = heavy ? 0.22 : 0.14;
    let desiredTarget = add(player.position, scale(player.velocity, aggressionLead));

    if (state.battery < 25 && heavy) {
      desiredTarget = add(player.position, scale(angleToVector(player.heading + Math.PI * 0.4), 0.9));
    }

    if (length(subtract(desiredTarget, enemy.position)) < 1.1) {
      desiredTarget = add(
        player.position,
        scale(angleToVector(player.heading + (heavy ? 0.8 : -0.55)), heavy ? 1.1 : 0.85),
      );
    }

    const desired = normalize(subtract(desiredTarget, enemy.position));
    if (length(desired) > EPSILON) {
      const turnRate = heavy ? 2.2 : 3.4;
      enemy.heading = turnToward(enemy.heading, vectorToAngle(desired), turnRate * dt);
    }

    const forward = angleToVector(enemy.heading);
    const accel = heavy ? 6.6 : 7.5;
    const maxSpeed = heavy ? 3.95 : 4.55;
    enemy.velocity = add(enemy.velocity, scale(forward, accel * dt));
    applyGrip(enemy, heavy ? 0.972 : 0.968, heavy ? 0.18 : 0.12, maxSpeed);
    if (enemy.stunTimer > 0) {
      enemy.velocity = scale(enemy.velocity, 0.92);
    }
    enemy.position = add(enemy.position, scale(enemy.velocity, dt));
  }
}

function updatePickups(state: SimulationState, dt: number): void {
  for (const pickup of state.pickups) {
    pickup.lifeTimer += dt;
    pickup.velocity = scale(pickup.velocity, 0.985);
    pickup.position = add(pickup.position, scale(pickup.velocity, dt));
  }
}

function updateSpawn(state: SimulationState, dt: number): void {
  if (!state.nextSpawn) {
    scheduleNextSpawn(state);
    return;
  }

  if (state.enemies.length >= maxEnemyCount(state.time)) {
    state.nextSpawn.eta = Math.max(0.8, state.nextSpawn.eta - dt * 0.2);
    return;
  }

  state.nextSpawn.eta -= dt;
  if (state.nextSpawn.eta > 0) {
    return;
  }

  const preview = state.nextSpawn;
  state.nextSpawn = null;
  const angle = vectorToAngle(subtract(state.player.position, preview.point));
  const enemy = createEnemy(state.nextVehicleId, preview.kind, preview.point, angle);
  state.nextVehicleId += 1;
  state.enemies.push(enemy);
  state.frameEvents.push({
    type: "spawn",
    x: preview.point.x,
    y: preview.point.y,
    kind: preview.kind,
    intensity: preview.kind === "heavy" ? 1.35 : 1,
  });
  scheduleNextSpawn(state);
}

function updatePropGrowth(state: SimulationState): void {
  if (state.mode !== "running") {
    return;
  }

  if (state.time < state.nextPropAt || state.props.length >= 6) {
    return;
  }

  const prop = createExtraProp(state);
  state.props.push(prop);
  state.nextPropAt += 28;
  state.frameEvents.push({ type: "prop-spawn", x: prop.position.x, y: prop.position.y, kind: prop.kind });
}

function resolveVehicleCollisions(state: SimulationState): void {
  const entities = [state.player, ...state.enemies];

  for (let i = 0; i < entities.length; i += 1) {
    const a = entities[i];
    if (!a) {
      continue;
    }
    for (let j = i + 1; j < entities.length; j += 1) {
      const b = entities[j];
      if (!b) {
        continue;
      }
      const delta = subtract(b.position, a.position);
      const dist = length(delta);
      const minDist = a.radius + b.radius;
      if (dist >= minDist || dist <= EPSILON) {
        continue;
      }

      const normal = scale(delta, 1 / dist);
      const overlap = minDist - dist;
      a.position = add(a.position, scale(normal, -overlap * (b.mass / (a.mass + b.mass))));
      b.position = add(b.position, scale(normal, overlap * (a.mass / (a.mass + b.mass))));

      const relativeVelocity = subtract(b.velocity, a.velocity);
      const speedAlongNormal = dot(relativeVelocity, normal);
      if (speedAlongNormal > 0) {
        continue;
      }

      const restitution = 0.72;
      const impulse = (-(1 + restitution) * speedAlongNormal) / (1 / a.mass + 1 / b.mass);
      const impulseVector = scale(normal, impulse);
      a.velocity = add(a.velocity, scale(impulseVector, -1 / a.mass));
      b.velocity = add(b.velocity, scale(impulseVector, 1 / b.mass));

      handleVehicleDamage(state, a, b, normal, Math.abs(speedAlongNormal));
    }
  }
}

function handleVehicleDamage(
  state: SimulationState,
  a: VehicleState,
  b: VehicleState,
  normal: Vec2,
  impactSpeed: number,
): void {
  if (impactSpeed < 0.8) {
    return;
  }

  const pairIncludesPlayer = a.kind === "player" || b.kind === "player";
  let player: VehicleState | null = null;
  let enemy: VehicleState | null = null;

  if (a.kind === "player" && b.kind !== "player") {
    player = a;
    enemy = b;
  } else if (b.kind === "player" && a.kind !== "player") {
    player = b;
    enemy = a;
    normal = scale(normal, -1);
  }

  if (!pairIncludesPlayer || !player || !enemy) {
    a.flashTimer = 0.14;
    b.flashTimer = 0.14;
    return;
  }

  const playerForward = angleToVector(player.heading);
  const enemyForward = angleToVector(enemy.heading);
  const playerAngle = clamp(dot(playerForward, normal), -1, 1);
  const enemyAngle = clamp(dot(enemyForward, scale(normal, -1)), -1, 1);
  const playerSpeed = length(player.velocity);
  const enemySpeed = length(enemy.velocity);
  const dashBonus = player.dashTimer > 0 ? 1.8 : 1;

  const enemyDamage = impactSpeed * (4.8 + playerSpeed * 0.78) * clamp(0.35 + playerAngle, 0.22, 1.7) * dashBonus;
  const playerDamage =
    impactSpeed *
    (0.85 + enemySpeed * 0.2) *
    clamp(0.18 + enemyAngle * 0.28, 0.12, 0.62) *
    (player.dashTimer > 0 ? 0.28 : 1) *
    (playerAngle > 0.82 ? 0.45 : 1);

  enemy.hp -= enemyDamage;
  enemy.flashTimer = 0.18;
  enemy.stunTimer = Math.max(enemy.stunTimer, 0.22 + impactSpeed * 0.06 + (player.dashTimer > 0 ? 0.08 : 0));
  player.flashTimer = 0.16;
  applyBatteryDelta(state, -playerDamage * 0.38);

  state.frameEvents.push({
    type: "hit",
    x: (player.position.x + enemy.position.x) * 0.5,
    y: (player.position.y + enemy.position.y) * 0.5,
    intensity: clamp(impactSpeed / 4.5, 0.25, 1.8),
  });

  if (enemy.hp <= 0) {
    destroyEnemy(state, enemy, playerAngle > 0.78);
  }
}

function resolveWalls(state: SimulationState, vehicle: VehicleState): void {
  const halfWidth = state.arenaWidth * 0.5 - vehicle.radius;
  const halfHeight = state.arenaHeight * 0.5 - vehicle.radius;
  let hit = false;
  let wallNormal: Vec2 = { x: 0, y: 0 };

  if (vehicle.position.x < -halfWidth) {
    vehicle.position.x = -halfWidth;
    vehicle.velocity.x = Math.abs(vehicle.velocity.x) * 0.72;
    hit = true;
    wallNormal = { x: 1, y: 0 };
  } else if (vehicle.position.x > halfWidth) {
    vehicle.position.x = halfWidth;
    vehicle.velocity.x = -Math.abs(vehicle.velocity.x) * 0.72;
    hit = true;
    wallNormal = { x: -1, y: 0 };
  }

  if (vehicle.position.y < -halfHeight) {
    vehicle.position.y = -halfHeight;
    vehicle.velocity.y = Math.abs(vehicle.velocity.y) * 0.72;
    hit = true;
    wallNormal = { x: 0, y: 1 };
  } else if (vehicle.position.y > halfHeight) {
    vehicle.position.y = halfHeight;
    vehicle.velocity.y = -Math.abs(vehicle.velocity.y) * 0.72;
    hit = true;
    wallNormal = { x: 0, y: -1 };
  }

  if (!hit) {
    return;
  }

  const impact = Math.max(Math.abs(dot(vehicle.velocity, wallNormal)), length(vehicle.velocity) * 0.35);
  if (impact < 2.2) {
    return;
  }

  state.frameEvents.push({
    type: "hit",
    x: vehicle.position.x + wallNormal.x * vehicle.radius,
    y: vehicle.position.y + wallNormal.y * vehicle.radius,
    intensity: clamp(impact / 5.5, 0.25, 1.5),
  });

  if (vehicle.kind === "player") {
    applyBatteryDelta(state, -impact * 0.18);
  } else {
    vehicle.hp -= impact * 1.4;
    vehicle.flashTimer = 0.14;
    if (vehicle.hp <= 0) {
      destroyEnemy(state, vehicle, true);
    }
  }
}

function resolveProps(state: SimulationState, vehicle: VehicleState): void {
  for (const prop of state.props) {
    const local = rotate(subtract(vehicle.position, prop.position), -prop.angle);
    const halfWidth = prop.width * 0.5 + vehicle.radius;
    const halfHeight = prop.height * 0.5 + vehicle.radius;
    if (Math.abs(local.x) > halfWidth || Math.abs(local.y) > halfHeight) {
      continue;
    }

    const overlapX = halfWidth - Math.abs(local.x);
    const overlapY = halfHeight - Math.abs(local.y);
    let normalLocal: Vec2;

    if (overlapX < overlapY) {
      normalLocal = { x: Math.sign(local.x || 1), y: 0 };
      local.x = Math.sign(local.x || 1) * halfWidth;
      vehicle.velocity = add(vehicle.velocity, rotate({ x: -normalLocal.x * 2.1, y: 0 }, prop.angle));
    } else {
      normalLocal = { x: 0, y: Math.sign(local.y || 1) };
      local.y = Math.sign(local.y || 1) * halfHeight;
      vehicle.velocity = add(vehicle.velocity, rotate({ x: 0, y: -normalLocal.y * 2.1 }, prop.angle));
    }

    vehicle.position = add(prop.position, rotate(local, prop.angle));
    vehicle.flashTimer = 0.1;
    state.frameEvents.push({
      type: "hit",
      x: vehicle.position.x,
      y: vehicle.position.y,
      intensity: prop.kind === "box" ? 0.65 : 0.42,
    });

    if (vehicle.kind === "player") {
      applyBatteryDelta(state, 0);
    } else {
      vehicle.hp -= prop.kind === "box" ? 0.7 : 0.2;
      if (vehicle.hp <= 0) {
        destroyEnemy(state, vehicle, false);
      }
    }
  }
}

function collectPickups(state: SimulationState): void {
  const player = state.player;
  state.pickups = state.pickups.filter((pickup) => {
    if (pickup.lifeTimer > 7.6) {
      return false;
    }

    const distance = length(subtract(pickup.position, player.position));
    if (distance > player.radius + 0.42) {
      return true;
    }

    state.collected += 1;
    applyBatteryDelta(state, pickup.value);
    state.score += 28 + pickup.value * 6 + Math.min(55, state.combo * 8);
    if (state.comboTimer > 0) {
      state.combo += 1;
    } else {
      state.combo = 1;
    }
    state.comboTimer = 2.2;
    state.frameEvents.push({ type: "pickup", x: pickup.position.x, y: pickup.position.y, intensity: pickup.value / 10 });
    return false;
  });
}

function cleanup(state: SimulationState): void {
  state.enemies = state.enemies.filter((enemy) => enemy.hp > 0);
}

function destroyEnemy(state: SimulationState, enemy: VehicleState, wallKill: boolean): void {
  if (enemy.hp <= -1000) {
    return;
  }
  enemy.hp = -9999;
  state.destroyed += 1;
  state.score += enemy.kind === "heavy" ? 180 : 92;
  state.comboTimer = 2.6;
  state.frameEvents.push({
    type: "ko",
    x: enemy.position.x,
    y: enemy.position.y,
    intensity: enemy.kind === "heavy" ? 1.45 : 1,
    kind: enemy.kind === "heavy" ? "heavy" : "basic",
  });

  const shardCount = enemy.kind === "heavy" ? 4 : 3;
  for (let index = 0; index < shardCount; index += 1) {
    const angle = (Math.PI * 2 * index) / shardCount + state.rng.range(-0.24, 0.24);
    const speed = state.rng.range(1.4, wallKill ? 2.9 : 2.4);
    state.pickups.push({
      id: state.nextPickupId,
      position: { ...enemy.position },
      velocity: scale(angleToVector(angle), speed),
      value: enemy.kind === "heavy" ? 10 : 7,
      lifeTimer: 0,
    });
    state.nextPickupId += 1;
  }
}

function applyGrip(vehicle: VehicleState, drag: number, lateralGrip: number, maxSpeed: number): void {
  const forward = angleToVector(vehicle.heading);
  const forwardSpeed = dot(vehicle.velocity, forward);
  const forwardVector = scale(forward, forwardSpeed);
  const lateralVector = subtract(vehicle.velocity, forwardVector);
  const dampedForward = scale(forwardVector, drag);
  const dampedLateral = scale(lateralVector, 1 - lateralGrip);
  vehicle.velocity = add(dampedForward, dampedLateral);

  const speed = length(vehicle.velocity);
  if (speed > maxSpeed) {
    vehicle.velocity = scale(vehicle.velocity, maxSpeed / speed);
  }
}

function applyBatteryDelta(state: SimulationState, delta: number): void {
  state.battery = clamp(state.battery + delta, 0, MAX_BATTERY);
}

function scheduleNextSpawn(state: SimulationState): void {
  const heavyUnlocked = state.time > 52;
  const heavyChance = clamp01((state.time - 68) / 150);
  const kind: EnemyKind = heavyUnlocked && state.rng.next() < heavyChance ? "heavy" : "basic";
  const etaBase = kind === "heavy" ? 8.8 : 6.6;
  const eta = clamp(etaBase - state.time * 0.008, kind === "heavy" ? 5.4 : 3.6, etaBase) + state.rng.range(-0.35, 0.45);
  state.nextSpawn = {
    kind,
    eta,
    point: randomSpawnPoint(state),
  };
}

function randomSpawnPoint(state: SimulationState): Vec2 {
  const inset = 0.72;
  const side = state.rng.int(0, 4);
  if (side === 0) {
    return { x: -state.arenaWidth * 0.5 + inset, y: state.rng.range(-3.1, 3.1) };
  }
  if (side === 1) {
    return { x: state.arenaWidth * 0.5 - inset, y: state.rng.range(-3.1, 3.1) };
  }
  if (side === 2) {
    return { x: state.rng.range(-5.6, 5.6), y: -state.arenaHeight * 0.5 + inset };
  }
  return { x: state.rng.range(-5.6, 5.6), y: state.arenaHeight * 0.5 - inset };
}

function spawnEnemy(state: SimulationState, kind: EnemyKind, farFromPlayer: boolean): void {
  const point = farFromPlayer
    ? { x: state.rng.range(-5.2, 5.2), y: state.rng.range(-3.2, 3.2) }
    : randomSpawnPoint(state);
  const heading = vectorToAngle(subtract(state.player.position, point));
  state.enemies.push(createEnemy(state.nextVehicleId, kind, point, heading));
  state.nextVehicleId += 1;
}

function maxEnemyCount(time: number): number {
  return Math.min(5, 2 + Math.floor(time / 55));
}

function createExtraProp(state: SimulationState): PropState {
  for (let attempt = 0; attempt < 18; attempt += 1) {
    const kind: PropKind = state.rng.next() > 0.5 ? "box" : "cone";
    const prop: PropState = {
      id: state.nextPropId,
      kind,
      position: {
        x: state.rng.range(-4.7, 4.7),
        y: state.rng.range(-2.9, 2.9),
      },
      width: kind === "box" ? state.rng.range(0.68, 0.88) : 0.42,
      height: kind === "box" ? state.rng.range(0.58, 0.78) : 0.42,
      angle: state.rng.range(-0.7, 0.7),
    };

    const closeToPlayer = length(subtract(prop.position, state.player.position)) < 1.8;
    const closeToSpawn = state.nextSpawn ? length(subtract(prop.position, state.nextSpawn.point)) < 1.8 : false;
    const overlaps = state.props.some((existing) => {
      return length(subtract(prop.position, existing.position)) < 1.05;
    });

    if (!closeToPlayer && !closeToSpawn && !overlaps) {
      state.nextPropId += 1;
      return prop;
    }
  }

  const fallback: PropState = {
    id: state.nextPropId,
    kind: "box",
    position: { x: 4.7, y: 0 },
    width: 0.8,
    height: 0.68,
    angle: 0.24,
  };
  state.nextPropId += 1;
  return fallback;
}

function endRun(state: SimulationState): void {
  state.mode = "ended";
  const score = Math.round(state.score);
  const newBest = score > state.bestScore;
  if (newBest) {
    state.bestScore = score;
  }
  state.summary = {
    score,
    time: state.time,
    destroyed: state.destroyed,
    collected: state.collected,
    comboBest: Math.max(state.combo, state.collected > 0 ? 1 : 0),
    newBest,
  };
}

function rotate(point: Vec2, angle: number): Vec2 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  };
}
