import {
  BATTERY_DEPOSIT_SCORE,
  BATTERY_PICKUP_SCORE,
  BATTERY_RADIUS,
  BATTERY_REPAIR_AMOUNT,
  BATTERY_TTL_MS,
  BEACON_CENTER,
  BEACON_DEPOSIT_RADIUS,
  BEACON_MAX_INTEGRITY,
  BEACON_RING_RADIUS,
  ENEMY_CONFIG,
  PARTICLE_LIFE_MS,
  PLAYER_ACCELERATION,
  PLAYER_FIRE_INTERVAL_MS,
  PLAYER_FRICTION,
  PLAYER_JAM_MS,
  PLAYER_MAX_SPEED,
  PLAYER_RADIUS,
  PROJECTILE_DAMAGE,
  PROJECTILE_LIFE_MS,
  PROJECTILE_RADIUS,
  PROJECTILE_SPEED,
  RESCUE_DURATION_MS,
  SPAWN_WARNING_MS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "./constants";
import type {
  Battery,
  DebugSnapshot,
  Enemy,
  EnemyType,
  GameState,
  InputState,
  Particle,
  Player,
  SpawnWarning,
  Vec2,
} from "./types";

export function createInputState(): InputState {
  return {
    moveX: 0,
    moveY: 0,
    aimX: BEACON_CENTER.x,
    aimY: BEACON_CENTER.y,
    firing: false,
  };
}

export function createInitialState(seed = Date.now()): GameState {
  const state = createBaseState(seed);
  state.player.position = { x: 820, y: 420 };
  state.player.aim = { x: 980, y: 360 };
  state.spawn.scrapperMs = 500;
  state.spawn.rammerMs = 38000;
  state.spawn.carrierMs = 12000;
  return state;
}

export function createPreviewState(seed = 7): GameState {
  const state = createBaseState(seed);
  state.elapsedMs = 0;
  state.score = 0;
  state.beaconIntegrity = BEACON_MAX_INTEGRITY;
  state.player.position = { x: 788, y: 412 };
  state.player.aim = { x: 1062, y: 396 };
  state.player.carryBattery = false;
  state.enemies = [
    spawnEnemyAt(state, "scrapper", { x: 370, y: 250 }),
    spawnEnemyAt(state, "carrier", { x: 924, y: 198 }),
    spawnEnemyAt(state, "rammer", { x: 1002, y: 520 }),
    spawnEnemyAt(state, "rammer", { x: 258, y: 548 }),
  ];
  state.batteries = [
    spawnBatteryAt(state, { x: 958, y: 276 }),
  ];
  state.projectiles = [
    createProjectile(state, state.player.position, state.player.aim),
  ];
  state.projectiles[0]!.position = { x: 880, y: 405 };
  state.projectiles[0]!.lifeMs = 90;
  state.projectiles.push(
    {
      ...createProjectile(state, state.player.position, { x: 920, y: 218 }),
      position: { x: 822, y: 404 },
      velocity: { x: 420, y: -320 },
      lifeMs: 110,
    },
    {
      ...createProjectile(state, state.player.position, { x: 1020, y: 322 }),
      position: { x: 800, y: 410 },
      velocity: { x: 530, y: 120 },
      lifeMs: 120,
    },
  );
  return state;
}

export function createShowcaseState(seed = 7): GameState {
  const state = createBaseState(seed);
  state.elapsedMs = 273000;
  state.score = 18450;
  state.beaconIntegrity = 8;
  state.player.position = { x: 788, y: 412 };
  state.player.aim = { x: 1062, y: 396 };
  state.player.carryBattery = true;
  state.enemies = [
    spawnEnemyAt(state, "scrapper", { x: 370, y: 250 }),
    spawnEnemyAt(state, "scrapper", { x: 975, y: 484 }),
    spawnEnemyAt(state, "rammer", { x: 1028, y: 252 }),
    spawnEnemyAt(state, "rammer", { x: 262, y: 542 }),
    spawnEnemyAt(state, "carrier", { x: 924, y: 198 }),
    spawnEnemyAt(state, "scrapper", { x: 968, y: 610 }),
  ];
  state.batteries = [
    spawnBatteryAt(state, { x: 958, y: 276 }),
    spawnBatteryAt(state, { x: 794, y: 448 }),
  ];
  state.spawnWarnings = [
    scheduleSpawnWarningAt(state, "scrapper", { x: 1088, y: 162 }, 620),
    scheduleSpawnWarningAt(state, "carrier", { x: 198, y: 584 }, 860),
  ];
  state.projectiles = [
    createProjectile(state, state.player.position, state.player.aim),
  ];
  state.projectiles[0]!.position = { x: 880, y: 405 };
  state.projectiles[0]!.lifeMs = 90;
  state.projectiles.push(
    {
      ...createProjectile(state, state.player.position, { x: 920, y: 218 }),
      position: { x: 822, y: 404 },
      velocity: { x: 420, y: -320 },
      lifeMs: 110,
    },
    {
      ...createProjectile(state, state.player.position, { x: 1020, y: 322 }),
      position: { x: 800, y: 410 },
      velocity: { x: 530, y: 120 },
      lifeMs: 120,
    },
  );
  state.spawn.scrapperMs = 220;
  state.spawn.rammerMs = 1400;
  state.spawn.carrierMs = 2200;
  return state;
}

export function createVictoryState(seed = 7): GameState {
  const state = createShowcaseState(seed);
  state.elapsedMs = state.rescueMs;
  state.score = 32640;
  state.deposits = 11;
  state.kills = 74;
  state.beaconIntegrity = 3;
  state.player.position = { x: 808, y: 424 };
  state.player.aim = { x: 998, y: 370 };
  state.player.carryBattery = false;
  state.runState = "won";
  state.projectiles = [];
  state.batteries = [];
  state.enemies = [
    spawnEnemyAt(state, "scrapper", { x: 370, y: 260 }),
    spawnEnemyAt(state, "carrier", { x: 922, y: 206 }),
  ];
  return state;
}

export function createTestState(seed = 1): GameState {
  const state = createInitialState(seed);
  state.enemies = [];
  state.spawnWarnings = [];
  state.projectiles = [];
  state.batteries = [];
  state.particles = [];
  state.elapsedMs = 0;
  state.score = 0;
  state.kills = 0;
  state.deposits = 0;
  state.spawn.scrapperMs = 999999;
  state.spawn.rammerMs = 999999;
  state.spawn.carrierMs = 999999;
  state.player.position = { x: 860, y: 360 };
  state.player.aim = { x: 1000, y: 360 };
  return state;
}

export function createDebugSnapshot(state: GameState): DebugSnapshot {
  return {
    seed: state.seed,
    elapsedMs: Math.round(state.elapsedMs),
    timeRemainingMs: Math.max(0, state.rescueMs - state.elapsedMs),
    beaconIntegrity: state.beaconIntegrity,
    score: state.score,
    kills: state.kills,
    deposits: state.deposits,
    player: {
      x: Math.round(state.player.position.x),
      y: Math.round(state.player.position.y),
    },
    carryBattery: state.player.carryBattery,
    runState: state.runState,
    enemies: state.enemies.map((enemy) => ({
      type: enemy.type,
      x: Math.round(enemy.position.x),
      y: Math.round(enemy.position.y),
      hp: enemy.hp,
    })),
    batteries: state.batteries.map((battery) => ({
      x: Math.round(battery.position.x),
      y: Math.round(battery.position.y),
      ttlMs: Math.round(battery.ttlMs),
    })),
  };
}

export function stepGame(state: GameState, input: InputState, dtMs: number): void {
  if (state.runState !== "playing") return;

  state.elapsedMs += dtMs;
  state.player.fireCooldownMs = Math.max(0, state.player.fireCooldownMs - dtMs);
  state.player.jamMs = Math.max(0, state.player.jamMs - dtMs);
  state.player.recoilMs = Math.max(0, state.player.recoilMs - dtMs);
  state.beaconPulseMs = Math.max(0, state.beaconPulseMs - dtMs);
  state.beaconHitFlashMs = Math.max(0, state.beaconHitFlashMs - dtMs);

  updatePlayer(state, input, dtMs);
  updateSpawning(state, dtMs);
  updateSpawnWarnings(state, dtMs);
  updateProjectiles(state, dtMs);
  updateEnemies(state, dtMs);
  updateBatteries(state, dtMs);
  resolveProjectileHits(state);
  resolveEnemyThreats(state);
  resolveBatteryInteractions(state);
  updateParticles(state, dtMs);

  if (state.beaconIntegrity <= 0) {
    state.beaconIntegrity = 0;
    state.runState = "lost";
    state.defeatReason = "blackout";
    return;
  }

  if (state.elapsedMs >= state.rescueMs) {
    state.runState = "won";
  }
}

export function spawnEnemyAt(state: GameState, type: EnemyType, position: Vec2): Enemy {
  const config = ENEMY_CONFIG[type];
  return {
    id: nextId(state),
    type,
    position: { ...position },
    velocity: { x: 0, y: 0 },
    radius: config.radius,
    hp: config.hp,
    maxHp: config.hp,
    damage: config.damage,
    scoreValue: config.scoreValue,
    rotation: angleTo(position, BEACON_CENTER),
  };
}

export function scheduleSpawnWarningAt(
  state: GameState,
  type: EnemyType,
  position: Vec2,
  ttlMs = SPAWN_WARNING_MS[type],
): SpawnWarning {
  const warning: SpawnWarning = {
    id: nextId(state),
    type,
    position: { ...position },
    ttlMs,
    maxTtlMs: ttlMs,
  };
  state.spawnWarnings.push(warning);
  return warning;
}

export function spawnBatteryAt(state: GameState, position: Vec2): Battery {
  return {
    id: nextId(state),
    position: { ...position },
    velocity: { x: 0, y: 0 },
    radius: BATTERY_RADIUS,
    ttlMs: BATTERY_TTL_MS,
  };
}

function createBaseState(seed: number): GameState {
  const normalizedSeed = sanitizeSeed(seed);
  return {
    seed: normalizedSeed,
    rngState: normalizedSeed,
    elapsedMs: 0,
    rescueMs: RESCUE_DURATION_MS,
    beaconIntegrity: BEACON_MAX_INTEGRITY,
    beaconMaxIntegrity: BEACON_MAX_INTEGRITY,
    score: 0,
    kills: 0,
    deposits: 0,
    runState: "playing",
    defeatReason: null,
    player: createPlayer(),
    enemies: [],
    spawnWarnings: [],
    projectiles: [],
    batteries: [],
    particles: [],
    nextId: 1,
    spawn: {
      scrapperMs: 900,
      rammerMs: 999999,
      carrierMs: 999999,
    },
    beaconPulseMs: 0,
    beaconHitFlashMs: 0,
  };
}

function createPlayer(): Player {
  return {
    position: { x: 820, y: 420 },
    velocity: { x: 0, y: 0 },
    aim: { x: 980, y: 360 },
    radius: PLAYER_RADIUS,
    fireCooldownMs: 0,
    jamMs: 0,
    recoilMs: 0,
    carryBattery: false,
  };
}

function updatePlayer(state: GameState, input: InputState, dtMs: number): void {
  const dt = dtMs / 1000;
  const player = state.player;
  const move = normalize({ x: input.moveX, y: input.moveY });
  const desiredVelocity = scale(move, PLAYER_MAX_SPEED);

  const accelBlend = 1 - Math.exp(-PLAYER_ACCELERATION * dt);
  const frictionBlend = 1 - Math.exp(-PLAYER_FRICTION * dt);
  const blend = move.x !== 0 || move.y !== 0 ? accelBlend : frictionBlend;

  player.velocity.x += (desiredVelocity.x - player.velocity.x) * blend;
  player.velocity.y += (desiredVelocity.y - player.velocity.y) * blend;

  player.position.x += player.velocity.x * dt;
  player.position.y += player.velocity.y * dt;
  player.position.x = clamp(player.position.x, 80, WORLD_WIDTH - 80);
  player.position.y = clamp(player.position.y, 80, WORLD_HEIGHT - 80);

  if (Number.isFinite(input.aimX) && Number.isFinite(input.aimY)) {
    player.aim = {
      x: clamp(input.aimX, 0, WORLD_WIDTH),
      y: clamp(input.aimY, 0, WORLD_HEIGHT),
    };
  }

  if (input.firing && player.jamMs <= 0 && player.fireCooldownMs <= 0) {
    state.projectiles.push(createProjectile(state, player.position, player.aim));
    player.fireCooldownMs = PLAYER_FIRE_INTERVAL_MS;
    player.recoilMs = 70;
  }
}

function updateSpawning(state: GameState, dtMs: number): void {
  if (state.elapsedMs >= state.rescueMs) return;

  const progress = clamp(state.elapsedMs / state.rescueMs, 0, 1);

  state.spawn.scrapperMs -= dtMs;
  while (state.spawn.scrapperMs <= 0) {
    scheduleSpawnWarning(state, "scrapper");
    state.spawn.scrapperMs += randomRange(state, lerp(1550, 620, progress) * 0.82, lerp(1550, 620, progress) * 1.18);
  }

  if (state.elapsedMs > 45000) {
    state.spawn.rammerMs -= dtMs;
    while (state.spawn.rammerMs <= 0) {
      scheduleSpawnWarning(state, "rammer");
      state.spawn.rammerMs += randomRange(state, lerp(12800, 5200, progress) * 0.82, lerp(12800, 5200, progress) * 1.18);
    }
  }

  state.spawn.carrierMs -= dtMs;
  while (state.spawn.carrierMs <= 0) {
    scheduleSpawnWarning(state, "carrier");
    state.spawn.carrierMs += randomRange(state, lerp(18500, 8400, progress) * 0.9, lerp(18500, 8400, progress) * 1.1);
  }
}

function updateSpawnWarnings(state: GameState, dtMs: number): void {
  for (let index = state.spawnWarnings.length - 1; index >= 0; index -= 1) {
    const warning = state.spawnWarnings[index];
    if (!warning) continue;
    warning.ttlMs -= dtMs;
    if (warning.ttlMs > 0) continue;
    state.enemies.push(spawnEnemyAt(state, warning.type, warning.position));
    state.spawnWarnings.splice(index, 1);
  }
}

function updateProjectiles(state: GameState, dtMs: number): void {
  const dt = dtMs / 1000;
  for (let index = state.projectiles.length - 1; index >= 0; index -= 1) {
    const projectile = state.projectiles[index];
    if (!projectile) continue;
    projectile.position.x += projectile.velocity.x * dt;
    projectile.position.y += projectile.velocity.y * dt;
    projectile.lifeMs -= dtMs;
    if (
      projectile.lifeMs <= 0 ||
      projectile.position.x < -120 ||
      projectile.position.x > WORLD_WIDTH + 120 ||
      projectile.position.y < -120 ||
      projectile.position.y > WORLD_HEIGHT + 120
    ) {
      state.projectiles.splice(index, 1);
    }
  }
}

function updateEnemies(state: GameState, dtMs: number): void {
  const dt = dtMs / 1000;
  for (const enemy of state.enemies) {
    const direction = normalize(subtract(BEACON_CENTER, enemy.position));
    enemy.velocity = scale(direction, ENEMY_CONFIG[enemy.type].speed);
    enemy.rotation = Math.atan2(direction.y, direction.x);
    enemy.position.x += enemy.velocity.x * dt;
    enemy.position.y += enemy.velocity.y * dt;
  }
}

function updateBatteries(state: GameState, dtMs: number): void {
  const dt = dtMs / 1000;
  for (let index = state.batteries.length - 1; index >= 0; index -= 1) {
    const battery = state.batteries[index];
    if (!battery) continue;
    battery.position.x += battery.velocity.x * dt;
    battery.position.y += battery.velocity.y * dt;
    battery.velocity.x *= 0.98;
    battery.velocity.y *= 0.98;
    battery.ttlMs -= dtMs;
    if (battery.ttlMs <= 0) {
      state.batteries.splice(index, 1);
    }
  }
}

function resolveProjectileHits(state: GameState): void {
  for (let projectileIndex = state.projectiles.length - 1; projectileIndex >= 0; projectileIndex -= 1) {
    const projectile = state.projectiles[projectileIndex];
    if (!projectile) continue;

    let consumed = false;
    for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
      const enemy = state.enemies[enemyIndex];
      if (!enemy) continue;
      const combinedRadius = projectile.radius + enemy.radius;
      if (distanceSquared(projectile.position, enemy.position) > combinedRadius * combinedRadius) {
        continue;
      }

      enemy.hp -= projectile.damage;
      state.projectiles.splice(projectileIndex, 1);
      spawnImpactParticles(state, projectile.position, "spark");
      consumed = true;

      if (enemy.hp <= 0) {
        state.score += enemy.scoreValue;
        state.kills += 1;
        if (enemy.type === "carrier") {
          const battery = spawnBatteryAt(state, enemy.position);
          battery.velocity = {
            x: randomRange(state, -50, 50),
            y: randomRange(state, -50, 50),
          };
          state.batteries.push(battery);
        }
        spawnImpactParticles(state, enemy.position, "impact");
        state.enemies.splice(enemyIndex, 1);
      }

      break;
    }

    if (consumed) {
      continue;
    }
  }
}

function resolveEnemyThreats(state: GameState): void {
  for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
    const enemy = state.enemies[index];
    if (!enemy) continue;

    const beaconDistance = distance(enemy.position, BEACON_CENTER);
    if (beaconDistance <= BEACON_DEPOSIT_RADIUS * 0.58 + enemy.radius) {
      state.beaconIntegrity = Math.max(0, state.beaconIntegrity - enemy.damage);
      state.beaconHitFlashMs = 240;
      spawnImpactParticles(state, enemy.position, "pulse");
      state.enemies.splice(index, 1);
      continue;
    }

    const playerDistance = distance(enemy.position, state.player.position);
    if (playerDistance <= enemy.radius + state.player.radius) {
      const pushNormal = normalize(subtract(state.player.position, enemy.position));
      state.player.position.x = clamp(state.player.position.x + pushNormal.x * 34, 80, WORLD_WIDTH - 80);
      state.player.position.y = clamp(state.player.position.y + pushNormal.y * 34, 80, WORLD_HEIGHT - 80);
      state.player.velocity.x += pushNormal.x * 120;
      state.player.velocity.y += pushNormal.y * 120;
      state.player.jamMs = Math.max(state.player.jamMs, PLAYER_JAM_MS);
      spawnImpactParticles(state, state.player.position, "spark");
    }
  }
}

function resolveBatteryInteractions(state: GameState): void {
  if (state.player.carryBattery && distance(state.player.position, BEACON_CENTER) <= BEACON_DEPOSIT_RADIUS) {
    state.player.carryBattery = false;
    state.deposits += 1;
    state.score += BATTERY_DEPOSIT_SCORE;
    state.beaconIntegrity = Math.min(state.beaconMaxIntegrity, state.beaconIntegrity + BATTERY_REPAIR_AMOUNT);
    state.beaconPulseMs = 520;
    spawnImpactParticles(state, BEACON_CENTER, "pulse");
  }

  if (state.player.carryBattery) {
    return;
  }

  for (let index = state.batteries.length - 1; index >= 0; index -= 1) {
    const battery = state.batteries[index];
    if (!battery) continue;
    const combinedRadius = battery.radius + state.player.radius;
    if (distanceSquared(battery.position, state.player.position) > combinedRadius * combinedRadius) {
      continue;
    }
    state.player.carryBattery = true;
    state.score += BATTERY_PICKUP_SCORE;
    state.batteries.splice(index, 1);
    spawnImpactParticles(state, state.player.position, "spark");
    return;
  }
}

function updateParticles(state: GameState, dtMs: number): void {
  const dt = dtMs / 1000;
  for (let index = state.particles.length - 1; index >= 0; index -= 1) {
    const particle = state.particles[index];
    if (!particle) continue;
    particle.position.x += particle.velocity.x * dt;
    particle.position.y += particle.velocity.y * dt;
    particle.lifeMs -= dtMs;
    if (particle.lifeMs <= 0) {
      state.particles.splice(index, 1);
    }
  }
}

function scheduleSpawnWarning(state: GameState, type: EnemyType): void {
  const angle = randomRange(state, 0, Math.PI * 2);
  const radius = BEACON_RING_RADIUS + randomRange(state, 36, 98);
  const position = {
    x: BEACON_CENTER.x + Math.cos(angle) * radius,
    y: BEACON_CENTER.y + Math.sin(angle) * radius,
  };
  scheduleSpawnWarningAt(state, type, position);
}

function createProjectile(state: GameState, origin: Vec2, aim: Vec2) {
  const direction = normalize(subtract(aim, origin), { x: 1, y: 0 });
  return {
    id: nextId(state),
    position: {
      x: origin.x + direction.x * 28,
      y: origin.y + direction.y * 28,
    },
    velocity: scale(direction, PROJECTILE_SPEED),
    radius: PROJECTILE_RADIUS,
    damage: PROJECTILE_DAMAGE,
    lifeMs: PROJECTILE_LIFE_MS,
  };
}

function spawnImpactParticles(state: GameState, position: Vec2, kind: Particle["kind"]): void {
  const count = kind === "pulse" ? 8 : 5;
  for (let index = 0; index < count; index += 1) {
    const angle = randomRange(state, 0, Math.PI * 2);
    const speed = kind === "pulse" ? randomRange(state, 20, 120) : randomRange(state, 40, 220);
    const particle: Particle = {
      id: nextId(state),
      kind,
      position: { ...position },
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      radius: kind === "pulse" ? randomRange(state, 6, 12) : randomRange(state, 2, 5),
      lifeMs: PARTICLE_LIFE_MS,
      maxLifeMs: PARTICLE_LIFE_MS,
      color: kind === "pulse" ? "#9fe6f7" : kind === "impact" ? "#f0695d" : "#f3b463",
    };
    state.particles.push(particle);
  }
}

function nextId(state: GameState): number {
  const value = state.nextId;
  state.nextId += 1;
  return value;
}

function sanitizeSeed(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const normalized = Math.abs(Math.floor(value)) >>> 0;
  return normalized === 0 ? 1 : normalized;
}

function nextRandom(state: GameState): number {
  let x = state.rngState >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.rngState = x >>> 0;
  return (state.rngState >>> 0) / 4294967296;
}

function randomRange(state: GameState, min: number, max: number): number {
  return min + nextRandom(state) * (max - min);
}

function subtract(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

function scale(vector: Vec2, value: number): Vec2 {
  return { x: vector.x * value, y: vector.y * value };
}

function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceSquared(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function angleTo(a: Vec2, b: Vec2): number {
  return Math.atan2(b.y - a.y, b.x - a.x);
}

function normalize(vector: Vec2, fallback: Vec2 = { x: 0, y: 0 }): Vec2 {
  const length = Math.hypot(vector.x, vector.y);
  if (length <= 0.00001) return { ...fallback };
  return { x: vector.x / length, y: vector.y / length };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
