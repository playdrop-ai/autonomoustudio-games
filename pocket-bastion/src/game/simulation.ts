import {
  ACHIEVEMENT_KEYS,
  AUTHORED_WAVES,
  BASE_HEALTH,
  DEFAULT_INTERMISSION,
  ENEMY_DEFINITIONS,
  FX_FRAMES,
  INITIAL_SPAWN_DELAY,
  LEADERBOARD_KEY,
  START_GOLD,
  TOWER_DEFINITIONS,
} from "./config";
import { PATH_TOTAL_LENGTH, PADS, WORLD_HEIGHT, WORLD_WIDTH, cellToWorld, pointAtDistance, rotationAtDistance } from "./level";
import type {
  AchievementKey,
  BuildOptionSnapshot,
  Enemy,
  EnemyDefinition,
  EnemyKind,
  GameSnapshot,
  GameState,
  MetaEvent,
  PadState,
  PlacementResult,
  PlatformUiSnapshot,
  Projectile,
  SelectionAnchorSnapshot,
  SelectionMode,
  Tower,
  TowerDefinition,
  TowerKind,
  UpgradeOptionSnapshot,
  VisualEvent,
  WavePlan,
  WaveSpawnEntry,
  WaveSpawnGroup,
} from "./types";

const DEFAULT_PLATFORM_SNAPSHOT: PlatformUiSnapshot = {
  available: false,
  authOptional: false,
  isLoggedIn: false,
  pendingMeta: false,
  busy: false,
  leaderboardLoaded: false,
  leaderboardRank: null,
  leaderboardBestScore: null,
  leaderboardBestDisplay: null,
  newHighScore: false,
};

function findPad(state: GameState, padId: string): PadState | undefined {
  return state.pads.find((pad) => pad.id === padId);
}

function findTowerById(state: GameState, towerId: number): Tower | undefined {
  return state.towers.find((tower) => tower.id === towerId);
}

function getProjectileOrigin(tower: Tower, definition: TowerDefinition) {
  const stats = getTowerLevel(definition, tower.level);
  const offsets = stats.muzzleOffsets.length > 0 ? stats.muzzleOffsets : [{ x: 0, y: 18 }];
  const offset = offsets[tower.nextMuzzleIndex % offsets.length];
  const lateral = offset?.x ?? 0;
  const forward = offset?.y ?? 18;
  const centerY = tower.y + definition.topYOffset;
  const cos = Math.cos(tower.rotation);
  const sin = Math.sin(tower.rotation);
  const rightCos = Math.cos(tower.rotation + Math.PI / 2);
  const rightSin = Math.sin(tower.rotation + Math.PI / 2);

  return {
    x: tower.x + cos * forward + rightCos * lateral,
    y: centerY + sin * forward + rightSin * lateral,
    barrelCount: offsets.length,
  };
}

export function getTowerDefinition(kind: TowerKind): TowerDefinition {
  return TOWER_DEFINITIONS[kind];
}

export function getEnemyDefinition(kind: EnemyKind): EnemyDefinition {
  return ENEMY_DEFINITIONS[kind];
}

export function getTowerLevel(definition: TowerDefinition, level: number) {
  const stats = definition.upgradeLevels[level - 1];
  if (!stats) {
    throw new Error(`[pocket-bastion] Missing ${definition.kind} level ${level}`);
  }
  return stats;
}

function createPads() {
  return PADS.map((pad) => ({
    ...pad,
    towerId: null,
  }));
}

function expandGroupsIntoEntries(groups: WaveSpawnGroup[], timeScale: number): WaveSpawnEntry[] {
  return groups
    .flatMap((group) =>
      Array.from({ length: group.count }, (_unused, index) => ({
        kind: group.kind,
        at: (group.at + index * group.spacing) * timeScale,
      })),
    )
    .sort((left, right) => left.at - right.at);
}

function createLoopWaveGroups(waveNumber: number): WaveSpawnGroup[] {
  const bonus = waveNumber - AUTHORED_WAVES.length;
  const walkerFront = 8 + bonus * 3;
  const walkerBack = 10 + bonus * 3;
  const walkerTail = 8 + bonus * 2;
  const tankA = 2 + Math.floor((bonus + 1) / 2);
  const tankB = 2 + Math.floor((bonus + 2) / 2);
  const walkerSpacing = Math.max(0.14, 0.28 - bonus * 0.012);
  const tankSpacing = Math.max(0.58, 0.82 - bonus * 0.04);

  return [
    { kind: "walker", at: 0, count: walkerFront, spacing: walkerSpacing },
    { kind: "tank", at: 1.25, count: tankA, spacing: tankSpacing },
    { kind: "walker", at: 2.05, count: walkerBack, spacing: Math.max(0.12, walkerSpacing - 0.04) },
    { kind: "tank", at: 4.2, count: tankB, spacing: Math.max(0.52, tankSpacing - 0.06) },
    { kind: "walker", at: 5.9, count: walkerTail, spacing: Math.max(0.12, walkerSpacing - 0.06) },
  ];
}

export function createWavePlan(waveNumber: number): WavePlan {
  const authored = AUTHORED_WAVES[waveNumber - 1];
  const groups = authored?.groups ?? createLoopWaveGroups(waveNumber);
  const timeScale = authored ? 0.68 : 0.6;
  const intermission = authored?.intermission ?? Math.max(1.1, DEFAULT_INTERMISSION - Math.max(0, waveNumber - 6) * 0.12);

  return {
    waveNumber,
    intermission,
    entries: expandGroupsIntoEntries(groups, timeScale),
  };
}

function queueVisualEvent(state: GameState, event: VisualEvent): void {
  state.queuedVisualEvents.push(event);
}

function queueMetaEvent(state: GameState, event: MetaEvent): void {
  state.queuedMetaEvents.push(event);
}

function grantAchievement(state: GameState, key: AchievementKey): void {
  if (state.grantedAchievements.has(key) || !ACHIEVEMENT_KEYS.includes(key)) {
    return;
  }

  state.grantedAchievements.add(key);
  queueMetaEvent(state, {
    type: "achievement",
    key,
  });
}

function createEnemy(state: GameState, kind: EnemyKind): Enemy {
  const definition = getEnemyDefinition(kind);
  const start = pointAtDistance(0);
  const loopBonus = Math.max(0, state.waveNumber - AUTHORED_WAVES.length);
  const healthScale = loopBonus === 0 ? 1 : 1 + loopBonus * 1.95;
  const speedScale = loopBonus === 0 ? 1 : 1 + loopBonus * 0.5;
  const defenseBonus = loopBonus * 3;
  const leakBonus = loopBonus === 0 ? 0 : 1 + Math.floor(loopBonus / 2);

  return {
    id: state.nextIds.enemy,
    kind,
    x: start.x,
    y: start.y,
    distance: 0,
    health: Math.round(definition.health * healthScale),
    maxHealth: Math.round(definition.health * healthScale),
    speed: definition.speed * speedScale,
    defense: definition.defense + defenseBonus,
    reward: Math.round(definition.reward * (1 + loopBonus * 0.18)),
    leakDamage: definition.leakDamage + leakBonus,
    rotation: rotationAtDistance(0),
  };
}

export function createInitialState(): GameState {
  return {
    now: 0,
    phase: "ready",
    gold: START_GOLD,
    baseHealth: BASE_HEALTH,
    maxBaseHealth: BASE_HEALTH,
    waveNumber: 0,
    highestWave: 0,
    wavePhase: "ready",
    waveClock: 0,
    wavePlan: null,
    waveCursor: 0,
    towers: [],
    enemies: [],
    projectiles: [],
    pads: createPads(),
    nextIds: {
      tower: 1,
      enemy: 1,
      projectile: 1,
    },
    totalKills: 0,
    totalLeaks: 0,
    queuedVisualEvents: [],
    queuedMetaEvents: [],
    grantedAchievements: new Set<AchievementKey>(),
  };
}

function startWave(state: GameState, waveNumber: number, initialDelay = 0): void {
  state.wavePlan = createWavePlan(waveNumber);
  state.waveNumber = waveNumber;
  state.highestWave = Math.max(state.highestWave, waveNumber);
  state.wavePhase = "spawning";
  state.waveClock = -initialDelay;
  state.waveCursor = 0;

  queueVisualEvent(state, {
    type: "wave-started",
    x: 0,
    y: 0,
    waveNumber,
  });
}

export function startGame(state: GameState): boolean {
  if (state.phase !== "ready") {
    return false;
  }

  state.phase = "playing";
  startWave(state, 1, INITIAL_SPAWN_DELAY);
  return true;
}

export function placeTowerOnPad(state: GameState, padId: string, kind: TowerKind): PlacementResult {
  if (state.phase !== "playing") {
    return { ok: false, message: "Press Play first." };
  }

  const pad = findPad(state, padId);
  if (!pad) {
    return { ok: false, message: "That tower slot does not exist." };
  }

  if (pad.towerId !== null) {
    return { ok: false, message: "That tower slot is already occupied." };
  }

  const definition = getTowerDefinition(kind);
  if (state.gold < definition.baseCost) {
    return { ok: false, message: `Need ${definition.baseCost - state.gold} more currency.` };
  }

  const position = cellToWorld(pad.cell);
  const levelStats = getTowerLevel(definition, 1);
  const tower: Tower = {
    id: state.nextIds.tower,
    kind,
    level: 1,
    padId,
    x: position.x,
    y: position.y,
    cooldown: levelStats.fireRate * 0.35,
    rotation: 0,
    nextMuzzleIndex: 0,
  };

  state.nextIds.tower += 1;
  state.gold -= definition.baseCost;
  state.towers.push(tower);
  pad.towerId = tower.id;

  grantAchievement(state, "first_tower_built");
  if (kind === "rocket") {
    grantAchievement(state, "first_rocket_built");
  }

  return { ok: true, message: `${definition.label} online.` };
}

export function upgradeTowerOnPad(state: GameState, padId: string): PlacementResult {
  if (state.phase !== "playing") {
    return { ok: false, message: "Press Play first." };
  }

  const pad = findPad(state, padId);
  if (!pad || pad.towerId === null) {
    return { ok: false, message: "No tower to upgrade here." };
  }

  const tower = findTowerById(state, pad.towerId);
  if (!tower) {
    return { ok: false, message: "Tower data missing." };
  }

  const definition = getTowerDefinition(tower.kind);
  if (tower.level >= definition.upgradeLevels.length) {
    return { ok: false, message: "Tower already maxed." };
  }

  const nextStats = definition.upgradeLevels[tower.level];
  if (!nextStats) {
    return { ok: false, message: "Upgrade data missing." };
  }

  if (state.gold < nextStats.upgradeCost) {
    return { ok: false, message: `Need ${nextStats.upgradeCost - state.gold} more currency.` };
  }

  state.gold -= nextStats.upgradeCost;
  tower.level += 1;
  tower.cooldown = Math.min(tower.cooldown, nextStats.fireRate * 0.6);

  if (tower.level >= definition.upgradeLevels.length) {
    grantAchievement(state, "max_upgrade_reached");
  }

  return { ok: true, message: `${definition.label} upgraded to ${tower.level}.` };
}

function spawnEnemy(state: GameState, kind: EnemyKind): void {
  const enemy = createEnemy(state, kind);
  state.nextIds.enemy += 1;
  state.enemies.push(enemy);
}

function updateWaveSpawns(state: GameState, dt: number): void {
  if (state.wavePhase !== "spawning" || !state.wavePlan) {
    return;
  }

  state.waveClock += dt;

  while (state.waveCursor < state.wavePlan.entries.length) {
    const entry = state.wavePlan.entries[state.waveCursor];
    if (!entry || entry.at > state.waveClock) {
      break;
    }

    spawnEnemy(state, entry.kind);
    state.waveCursor += 1;
  }
}

function updateWaveTransitions(state: GameState, dt: number): void {
  if (state.phase !== "playing" || !state.wavePlan) {
    return;
  }

  if (state.wavePhase === "spawning") {
    const spawnsFinished = state.waveCursor >= state.wavePlan.entries.length;
    if (spawnsFinished && state.enemies.length === 0) {
      queueVisualEvent(state, {
        type: "wave-cleared",
        x: 0,
        y: 0,
        waveNumber: state.waveNumber,
      });

      if (state.waveNumber >= 6) {
        grantAchievement(state, "survive_wave_6");
      }

      state.wavePhase = "intermission";
      state.waveClock = state.wavePlan.intermission;
    }
    return;
  }

  if (state.wavePhase === "intermission") {
    state.waveClock -= dt;
    if (state.waveClock <= 0) {
      startWave(state, state.waveNumber + 1);
    }
  }
}

function updateEnemies(state: GameState, dt: number): void {
  if (state.enemies.length === 0) {
    return;
  }

  const survivors: Enemy[] = [];

  for (const enemy of state.enemies) {
    enemy.distance += enemy.speed * dt;

    if (enemy.distance >= PATH_TOTAL_LENGTH) {
      state.baseHealth = Math.max(0, state.baseHealth - enemy.leakDamage);
      state.totalLeaks += 1;
      continue;
    }

    const point = pointAtDistance(enemy.distance);
    enemy.x = point.x;
    enemy.y = point.y;
    enemy.rotation = rotationAtDistance(enemy.distance);
    survivors.push(enemy);
  }

  state.enemies = survivors;

  if (state.baseHealth <= 0) {
    state.phase = "lost";
    state.projectiles = [];
    queueMetaEvent(state, {
      type: "leaderboard-score",
      key: LEADERBOARD_KEY,
      value: state.highestWave,
    });
  }
}

function acquireTarget(tower: Tower, state: GameState): Enemy | undefined {
  const stats = getTowerLevel(getTowerDefinition(tower.kind), tower.level);

  return state.enemies
    .filter((enemy) => Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= stats.range)
    .sort((left, right) => right.distance - left.distance)[0];
}

function towerHasActiveProjectile(state: GameState, towerId: number): boolean {
  return state.projectiles.some((projectile) => projectile.sourceTowerId === towerId);
}

function spawnProjectile(state: GameState, tower: Tower, target: Enemy): void {
  const definition = getTowerDefinition(tower.kind);
  const stats = getTowerLevel(definition, tower.level);
  const origin = getProjectileOrigin(tower, definition);

  const projectile: Projectile = {
    id: state.nextIds.projectile,
    kind: definition.projectileKind,
    sourceTowerId: tower.id,
    targetId: target.id,
    x: origin.x,
    y: origin.y,
    speed: stats.projectileSpeed,
    damage: stats.damage,
    splashRadius: stats.splashRadius,
    rotation: Math.atan2(target.y - origin.y, target.x - origin.x),
    rotationOffset: definition.projectileRotationOffset,
    frame: definition.projectileFrame,
    tint: definition.projectileTint,
    scale: definition.projectileScale,
  };

  state.nextIds.projectile += 1;
  state.projectiles.push(projectile);
  tower.nextMuzzleIndex = (tower.nextMuzzleIndex + 1) % origin.barrelCount;
  queueVisualEvent(state, {
    type: "shot",
    x: origin.x,
    y: origin.y,
    frame: FX_FRAMES.muzzle,
    tint: projectile.kind === "rocket" ? 0xffb15c : 0xfff4d5,
    scale: projectile.kind === "rocket" ? 0.6 : 0.42,
    rotation: projectile.rotation,
    towerKind: tower.kind,
    projectileKind: projectile.kind,
  });
}

function updateTowers(state: GameState, dt: number): void {
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    const target = acquireTarget(tower, state);

    if (!target) {
      continue;
    }

    tower.rotation = Math.atan2(target.y - tower.y, target.x - tower.x);
    const stats = getTowerLevel(getTowerDefinition(tower.kind), tower.level);

    if (tower.kind === "rocket") {
      if (tower.cooldown <= 0 && !towerHasActiveProjectile(state, tower.id)) {
        spawnProjectile(state, tower, target);
        tower.cooldown = stats.fireRate;
      }
      continue;
    }

    while (tower.cooldown <= 0) {
      spawnProjectile(state, tower, target);
      tower.cooldown += stats.fireRate;
    }
  }
}

function getEnemyById(state: GameState, enemyId: number): Enemy | undefined {
  return state.enemies.find((enemy) => enemy.id === enemyId);
}

export function resolveDamageAfterDefense(rawDamage: number, defense: number): number {
  return Math.max(1, rawDamage - defense);
}

function applyDamage(enemy: Enemy, rawDamage: number): number {
  const actualDamage = resolveDamageAfterDefense(rawDamage, enemy.defense);
  enemy.health -= actualDamage;
  return actualDamage;
}

function updateProjectiles(state: GameState, dt: number): void {
  if (state.projectiles.length === 0) {
    return;
  }

  const survivors: Projectile[] = [];

  for (const projectile of state.projectiles) {
    const target = getEnemyById(state, projectile.targetId);
    if (!target || target.health <= 0) {
      continue;
    }

    const dx = target.x - projectile.x;
    const dy = target.y - projectile.y;
    const distance = Math.hypot(dx, dy);
    const step = projectile.speed * dt;

    projectile.rotation = Math.atan2(dy, dx);

    if (distance <= step + 8) {
      const impactX = target.x;
      const impactY = target.y;
      const affectedEnemies =
        projectile.splashRadius > 0
          ? state.enemies.filter((enemy) => Math.hypot(enemy.x - impactX, enemy.y - impactY) <= projectile.splashRadius)
          : [target];

      for (const enemy of affectedEnemies) {
        applyDamage(enemy, projectile.damage);
      }

      queueVisualEvent(state, {
        type: "impact",
        x: impactX,
        y: impactY,
        radius: projectile.splashRadius || 18,
        frame: FX_FRAMES.hit,
        tint: projectile.kind === "rocket" ? 0xffa44c : 0xfff4d5,
        scale: projectile.kind === "rocket" ? 0.88 : 0.42,
        projectileKind: projectile.kind,
      });
      continue;
    }

    const ratio = distance === 0 ? 0 : step / distance;
    projectile.x += dx * ratio;
    projectile.y += dy * ratio;
    survivors.push(projectile);
  }

  state.projectiles = survivors;
}

function settleDefeatedEnemies(state: GameState): void {
  if (state.enemies.length === 0) {
    return;
  }

  const survivors: Enemy[] = [];

  for (const enemy of state.enemies) {
    if (enemy.health > 0) {
      survivors.push(enemy);
      continue;
    }

    state.gold += enemy.reward;
    state.totalKills += 1;

    if (enemy.kind === "tank") {
      grantAchievement(state, "first_tank_killed");
    }

    queueVisualEvent(state, {
      type: "enemy-killed",
      x: enemy.x,
      y: enemy.y,
      frame: FX_FRAMES.death,
      tint: enemy.kind === "tank" ? 0xf59d65 : 0xf3e4b7,
      scale: enemy.kind === "tank" ? 0.8 : 0.54,
    });
  }

  state.enemies = survivors;
}

export function advanceGame(state: GameState, dt: number): void {
  if (state.phase !== "playing") {
    return;
  }

  state.now += dt;
  updateWaveSpawns(state, dt);
  updateEnemies(state, dt);
  updateTowers(state, dt);
  updateProjectiles(state, dt);
  settleDefeatedEnemies(state);
  updateWaveTransitions(state, dt);
}

export function getBuildOptions(state: GameState): BuildOptionSnapshot[] {
  return (Object.keys(TOWER_DEFINITIONS) as TowerKind[]).map((kind) => {
    const definition = getTowerDefinition(kind);
    return {
      kind,
      label: definition.label,
      blurb: definition.blurb,
      cost: definition.baseCost,
      affordable: state.gold >= definition.baseCost,
    };
  });
}

export function getUpgradeOptions(state: GameState, padId: string): UpgradeOptionSnapshot[] {
  const pad = findPad(state, padId);
  if (!pad || pad.towerId === null) {
    return [];
  }

  const tower = findTowerById(state, pad.towerId);
  if (!tower) {
    return [];
  }

  const definition = getTowerDefinition(tower.kind);
  const nextStats = definition.upgradeLevels[tower.level];

  return [
    {
      kind: tower.kind,
      label: definition.label,
      blurb: definition.blurb,
      currentLevel: tower.level,
      nextLevel: nextStats?.level ?? null,
      cost: nextStats?.upgradeCost ?? null,
      affordable: nextStats ? state.gold >= nextStats.upgradeCost : false,
      maxed: !nextStats,
    },
  ];
}

export function getPadSelectionAnchor(padId: string): SelectionAnchorSnapshot | null {
  const pad = PADS.find((candidate) => candidate.id === padId);
  if (!pad) {
    return null;
  }

  const point = cellToWorld(pad.cell);
  return {
    padId,
    normalizedX: point.x / WORLD_WIDTH,
    normalizedY: point.y / WORLD_HEIGHT,
  };
}

export function getTowerOnPad(state: GameState, padId: string): Tower | undefined {
  const pad = findPad(state, padId);
  if (!pad || pad.towerId === null) {
    return undefined;
  }

  return findTowerById(state, pad.towerId);
}

export function isPadEmpty(state: GameState, padId: string): boolean {
  const pad = findPad(state, padId);
  return Boolean(pad && pad.towerId === null);
}

export function createGameSnapshot(
  state: GameState,
  selection:
    | {
        mode: SelectionMode;
        anchor: SelectionAnchorSnapshot;
        buildOptions: BuildOptionSnapshot[];
        upgradeOptions: UpgradeOptionSnapshot[];
      }
    | null = null,
  platform: PlatformUiSnapshot = DEFAULT_PLATFORM_SNAPSHOT,
): GameSnapshot {
  return {
    phase: state.phase,
    wavePhase: state.wavePhase,
    waveNumber: state.waveNumber,
    gold: state.gold,
    score: state.totalKills,
    highestWave: state.highestWave,
    baseHealth: state.baseHealth,
    maxBaseHealth: state.maxBaseHealth,
    enemiesAlive: state.enemies.length,
    towersBuilt: state.towers.length,
    canStart: state.phase === "ready",
    selectedPadMode: selection?.mode ?? null,
    selectedPadAnchor: selection?.anchor ?? null,
    buildOptions: selection?.buildOptions ?? [],
    upgradeOptions: selection?.upgradeOptions ?? [],
    platform,
  };
}

export function drainVisualEvents(state: GameState): VisualEvent[] {
  const events = [...state.queuedVisualEvents];
  state.queuedVisualEvents.length = 0;
  return events;
}

export function drainMetaEvents(state: GameState): MetaEvent[] {
  const events = [...state.queuedMetaEvents];
  state.queuedMetaEvents.length = 0;
  return events;
}
