export type Screen = "start" | "playing" | "gameover";
export type RunState = "playing" | "won" | "lost";
export type EnemyType = "scrapper" | "rammer" | "carrier";
export type DefeatReason = "blackout" | null;

export type Vec2 = {
  x: number;
  y: number;
};

export type Player = {
  position: Vec2;
  velocity: Vec2;
  aim: Vec2;
  radius: number;
  fireCooldownMs: number;
  jamMs: number;
  recoilMs: number;
  carryBattery: boolean;
};

export type Enemy = {
  id: number;
  type: EnemyType;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  hp: number;
  maxHp: number;
  damage: number;
  scoreValue: number;
  rotation: number;
};

export type Projectile = {
  id: number;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  damage: number;
  lifeMs: number;
};

export type Battery = {
  id: number;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  ttlMs: number;
};

export type SpawnWarning = {
  id: number;
  type: EnemyType;
  position: Vec2;
  ttlMs: number;
  maxTtlMs: number;
};

export type ParticleKind = "spark" | "pulse" | "impact";

export type Particle = {
  id: number;
  kind: ParticleKind;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  lifeMs: number;
  maxLifeMs: number;
  color: string;
};

export type SpawnTimers = {
  scrapperMs: number;
  rammerMs: number;
  carrierMs: number;
};

export type GameState = {
  seed: number;
  rngState: number;
  elapsedMs: number;
  rescueMs: number;
  beaconIntegrity: number;
  beaconMaxIntegrity: number;
  score: number;
  kills: number;
  deposits: number;
  runState: RunState;
  defeatReason: DefeatReason;
  player: Player;
  enemies: Enemy[];
  spawnWarnings: SpawnWarning[];
  projectiles: Projectile[];
  batteries: Battery[];
  particles: Particle[];
  nextId: number;
  spawn: SpawnTimers;
  beaconPulseMs: number;
  beaconHitFlashMs: number;
};

export type InputState = {
  moveX: number;
  moveY: number;
  aimX: number;
  aimY: number;
  firing: boolean;
};

export type DebugSnapshot = {
  seed: number;
  elapsedMs: number;
  timeRemainingMs: number;
  beaconIntegrity: number;
  score: number;
  kills: number;
  deposits: number;
  player: {
    x: number;
    y: number;
  };
  carryBattery: boolean;
  runState: RunState;
  enemies: Array<{
    type: EnemyType;
    x: number;
    y: number;
    hp: number;
  }>;
  batteries: Array<{
    x: number;
    y: number;
    ttlMs: number;
  }>;
};
