import type {
  AchievementKey,
  EnemyDefinition,
  EnemyKind,
  TowerDefinition,
  TowerKind,
  WaveSpawnGroup,
} from "./types";

export const TILE_SIZE = 64;
export const TEXTURE_TILE_SIZE = 128;
export const TEXTURE_SCALE = TILE_SIZE / TEXTURE_TILE_SIZE;
export const START_GOLD = 72;
export const BASE_HEALTH = 3;
export const INITIAL_SPAWN_DELAY = 0.9;
export const DEFAULT_INTERMISSION = 1.2;
export const LOOP_WAVE_GROWTH = 1;
export const LEADERBOARD_KEY = "highest_wave";

export const ACHIEVEMENT_KEYS: AchievementKey[] = [
  "first_tower_built",
  "first_tank_killed",
  "first_rocket_built",
  "max_upgrade_reached",
  "survive_wave_6",
];

export function frame(tileNumber: number): number {
  return tileNumber - 1;
}

export const TERRAIN_PATH_FRAMES = {
  fill: frame(225),
  turnNE: frame(234),
  turnNW: frame(235),
  turnSE: frame(211),
  turnSW: frame(212),
  innerCornerNE: frame(254),
  innerCornerNW: frame(256),
  innerCornerSE: frame(208),
  innerCornerSW: frame(210),
  edgeN: frame(255),
  edgeE: frame(231),
  edgeS: frame(209),
  edgeW: frame(233),
};

export const TERRAIN_GRASS_FRAME = frame(232);

export const PAD_TILE_FRAMES = {
  available: frame(43),
  selected: frame(44),
  occupied: frame(182),
};

export const FX_FRAMES = {
  muzzle: frame(267),
  hit: frame(262),
  death: frame(268),
};

export const TOWER_DEFINITIONS: Record<TowerKind, TowerDefinition> = {
  blaster: {
    kind: "blaster",
    label: "Blaster",
    blurb: "Cheap rapid-fire lane control.",
    baseCost: 30,
    projectileKind: "bullet",
    projectileFrame: frame(274),
    projectileTint: 0xffffff,
    projectileScale: 0.56,
    projectileRotationOffset: 0,
    baseScale: 1,
    baseTint: 0xffffff,
    topScale: 1,
    topTint: 0xffffff,
    topRotationOffset: Math.PI / 2,
    topYOffset: -6,
    upgradeLevels: [
      {
        level: 1,
        upgradeCost: 0,
        damage: 12,
        fireRate: 0.45,
        range: 176,
        projectileSpeed: 440,
        splashRadius: 0,
        baseFrame: frame(184),
        topFrame: frame(250),
        muzzleOffsets: [{ x: 0, y: 18 }],
      },
      {
        level: 2,
        upgradeCost: 44,
        damage: 16,
        fireRate: 0.36,
        range: 190,
        projectileSpeed: 460,
        splashRadius: 0,
        baseFrame: frame(183),
        topFrame: frame(204),
        muzzleOffsets: [
          { x: -8, y: 16 },
          { x: 8, y: 16 },
        ],
      },
      {
        level: 3,
        upgradeCost: 72,
        damage: 22,
        fireRate: 0.31,
        range: 204,
        projectileSpeed: 500,
        splashRadius: 0,
        baseFrame: frame(182),
        topFrame: frame(251),
        muzzleOffsets: [
          { x: -10, y: 18 },
          { x: 10, y: 18 },
        ],
      },
    ],
  },
  rocket: {
    kind: "rocket",
    label: "Rocket",
    blurb: "Slow splash turret for heavy waves.",
    baseCost: 62,
    projectileKind: "rocket",
    projectileFrame: frame(252),
    projectileTint: 0xffffff,
    projectileScale: 0.84,
    projectileRotationOffset: Math.PI / 2,
    baseScale: 1,
    baseTint: 0xffffff,
    topScale: 1,
    topTint: 0xffffff,
    topRotationOffset: Math.PI / 2,
    topYOffset: -6,
    upgradeLevels: [
      {
        level: 1,
        upgradeCost: 0,
        damage: 28,
        fireRate: 1.35,
        range: 184,
        projectileSpeed: 236,
        splashRadius: 48,
        baseFrame: frame(184),
        topFrame: frame(230),
        muzzleOffsets: [{ x: 0, y: 16 }],
      },
      {
        level: 2,
        upgradeCost: 84,
        damage: 36,
        fireRate: 1.15,
        range: 198,
        projectileSpeed: 256,
        splashRadius: 60,
        baseFrame: frame(183),
        topFrame: frame(228),
        muzzleOffsets: [
          { x: -9, y: 16 },
          { x: 9, y: 16 },
        ],
      },
      {
        level: 3,
        upgradeCost: 128,
        damage: 48,
        fireRate: 1,
        range: 214,
        projectileSpeed: 288,
        splashRadius: 72,
        baseFrame: frame(182),
        topFrame: frame(229),
        muzzleOffsets: [
          { x: -11, y: 16 },
          { x: 11, y: 16 },
        ],
      },
    ],
  },
};

export const ENEMY_DEFINITIONS: Record<EnemyKind, EnemyDefinition> = {
  walker: {
    kind: "walker",
    label: "Walker",
    health: 36,
    speed: 62,
    defense: 0,
    reward: 8,
    leakDamage: 1,
    frame: frame(248),
    tint: 0xffffff,
    scale: 0.72,
  },
  tank: {
    kind: "tank",
    label: "Tank",
    health: 130,
    speed: 36,
    defense: 10,
    reward: 20,
    leakDamage: 2,
    frame: frame(249),
    tint: 0xffffff,
    scale: 0.78,
  },
};

export const AUTHORED_WAVES: Array<{
  groups: WaveSpawnGroup[];
  intermission?: number;
}> = [
  {
    groups: [{ kind: "walker", at: 0, count: 6, spacing: 1.05 }],
  },
  {
    groups: [{ kind: "walker", at: 0, count: 8, spacing: 0.92 }],
  },
  {
    groups: [
      { kind: "walker", at: 0, count: 4, spacing: 0.62 },
      { kind: "walker", at: 3.1, count: 5, spacing: 0.54 },
    ],
  },
  {
    groups: [
      { kind: "walker", at: 0, count: 5, spacing: 0.54 },
      { kind: "tank", at: 1.6, count: 1, spacing: 1 },
      { kind: "walker", at: 3.4, count: 6, spacing: 0.48 },
    ],
  },
  {
    groups: [
      { kind: "walker", at: 0, count: 6, spacing: 0.48 },
      { kind: "tank", at: 1.4, count: 1, spacing: 1 },
      { kind: "walker", at: 2.6, count: 6, spacing: 0.42 },
      { kind: "tank", at: 5.3, count: 1, spacing: 1 },
    ],
  },
  {
    groups: [
      { kind: "walker", at: 0, count: 6, spacing: 0.44 },
      { kind: "tank", at: 1.1, count: 1, spacing: 1 },
      { kind: "walker", at: 2.1, count: 8, spacing: 0.38 },
      { kind: "tank", at: 4.7, count: 2, spacing: 1.05 },
      { kind: "walker", at: 7.3, count: 5, spacing: 0.32 },
    ],
  },
];
