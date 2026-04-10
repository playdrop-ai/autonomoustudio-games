import type { EnemyType, Vec2 } from "./types";

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;

export const BEACON_CENTER: Vec2 = { x: WORLD_WIDTH * 0.5, y: WORLD_HEIGHT * 0.5 };
export const BEACON_CORE_RADIUS = 38;
export const BEACON_DEPOSIT_RADIUS = 104;
export const BEACON_RING_RADIUS = 345;
export const BEACON_MAX_INTEGRITY = 12;
export const RESCUE_DURATION_MS = 6 * 60 * 1000;

export const PLAYER_RADIUS = 22;
export const PLAYER_MAX_SPEED = 320;
export const PLAYER_ACCELERATION = 12;
export const PLAYER_FRICTION = 10;
export const PLAYER_FIRE_INTERVAL_MS = 105;
export const PLAYER_JAM_MS = 560;

export const PROJECTILE_SPEED = 860;
export const PROJECTILE_DAMAGE = 1;
export const PROJECTILE_RADIUS = 5;
export const PROJECTILE_LIFE_MS = 520;

export const BATTERY_RADIUS = 18;
export const BATTERY_TTL_MS = 14000;
export const BATTERY_REPAIR_AMOUNT = 2;
export const BATTERY_DEPOSIT_SCORE = 250;
export const BATTERY_PICKUP_SCORE = 25;

export const PARTICLE_LIFE_MS = 420;

export const SPAWN_WARNING_MS: Record<EnemyType, number> = {
  scrapper: 720,
  rammer: 920,
  carrier: 980,
};

export const DEBRIS_PATCHES = [
  { x: 176, y: 182, rx: 44, ry: 16, angle: 0.02 },
  { x: 294, y: 582, rx: 54, ry: 20, angle: 0.02 },
  { x: 1000, y: 580, rx: 42, ry: 14, angle: -0.02 },
  { x: 1044, y: 136, rx: 52, ry: 18, angle: -0.1 },
] as const;

export const ENEMY_CONFIG: Record<
  EnemyType,
  { radius: number; hp: number; speed: number; damage: number; scoreValue: number }
> = {
  scrapper: {
    radius: 22,
    hp: 1,
    speed: 94,
    damage: 1,
    scoreValue: 65,
  },
  rammer: {
    radius: 30,
    hp: 2,
    speed: 142,
    damage: 2,
    scoreValue: 150,
  },
  carrier: {
    radius: 30,
    hp: 4,
    speed: 78,
    damage: 1,
    scoreValue: 180,
  },
};
