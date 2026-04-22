export type Phase = "ready" | "playing" | "lost";
export type WavePhase = "ready" | "spawning" | "intermission";
export type TowerKind = "blaster" | "rocket";
export type EnemyKind = "walker" | "tank";
export type ProjectileKind = "bullet" | "rocket";
export type SelectionMode = "build" | "upgrade";
export type AchievementKey =
  | "first_tower_built"
  | "first_tank_killed"
  | "first_rocket_built"
  | "max_upgrade_reached"
  | "survive_wave_6";

export interface Vec2 {
  x: number;
  y: number;
}

export interface GridCell {
  x: number;
  y: number;
}

export interface PadDefinition {
  id: string;
  cell: GridCell;
}

export interface TowerLevelDefinition {
  level: number;
  upgradeCost: number;
  damage: number;
  fireRate: number;
  range: number;
  projectileSpeed: number;
  splashRadius: number;
  baseFrame: number;
  topFrame: number;
  muzzleOffsets: Vec2[];
}

export interface TowerDefinition {
  kind: TowerKind;
  label: string;
  blurb: string;
  baseCost: number;
  projectileKind: ProjectileKind;
  projectileFrame: number;
  projectileTint: number;
  projectileScale: number;
  projectileRotationOffset: number;
  baseScale: number;
  baseTint: number;
  topScale: number;
  topTint: number;
  topRotationOffset: number;
  topYOffset: number;
  upgradeLevels: TowerLevelDefinition[];
}

export interface EnemyDefinition {
  kind: EnemyKind;
  label: string;
  health: number;
  speed: number;
  defense: number;
  reward: number;
  leakDamage: number;
  frame: number;
  tint: number;
  scale: number;
}

export interface PadState extends PadDefinition {
  towerId: number | null;
}

export interface Tower {
  id: number;
  kind: TowerKind;
  level: number;
  padId: string;
  x: number;
  y: number;
  cooldown: number;
  rotation: number;
  nextMuzzleIndex: number;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  distance: number;
  health: number;
  maxHealth: number;
  speed: number;
  defense: number;
  reward: number;
  leakDamage: number;
  rotation: number;
}

export interface Projectile {
  id: number;
  kind: ProjectileKind;
  sourceTowerId: number;
  targetId: number;
  x: number;
  y: number;
  speed: number;
  damage: number;
  splashRadius: number;
  rotation: number;
  rotationOffset: number;
  frame: number;
  tint: number;
  scale: number;
}

export interface WaveSpawnGroup {
  kind: EnemyKind;
  at: number;
  count: number;
  spacing: number;
}

export interface WaveSpawnEntry {
  kind: EnemyKind;
  at: number;
}

export interface WavePlan {
  waveNumber: number;
  intermission: number;
  entries: WaveSpawnEntry[];
}

export interface BuildOptionSnapshot {
  kind: TowerKind;
  label: string;
  blurb: string;
  cost: number;
  affordable: boolean;
}

export interface UpgradeOptionSnapshot {
  kind: TowerKind;
  label: string;
  blurb: string;
  currentLevel: number;
  nextLevel: number | null;
  cost: number | null;
  affordable: boolean;
  maxed: boolean;
}

export interface SelectionAnchorSnapshot {
  padId: string;
  normalizedX: number;
  normalizedY: number;
}

export interface PlatformUiSnapshot {
  available: boolean;
  authOptional: boolean;
  isLoggedIn: boolean;
  pendingMeta: boolean;
  busy: boolean;
  leaderboardLoaded: boolean;
  leaderboardRank: number | null;
  leaderboardBestScore: number | null;
  leaderboardBestDisplay: string | null;
  newHighScore: boolean;
}

export interface GameSnapshot {
  phase: Phase;
  wavePhase: WavePhase;
  waveNumber: number;
  gold: number;
  score: number;
  highestWave: number;
  baseHealth: number;
  maxBaseHealth: number;
  enemiesAlive: number;
  towersBuilt: number;
  canStart: boolean;
  selectedPadMode: SelectionMode | null;
  selectedPadAnchor: SelectionAnchorSnapshot | null;
  buildOptions: BuildOptionSnapshot[];
  upgradeOptions: UpgradeOptionSnapshot[];
  platform: PlatformUiSnapshot;
}

export interface PlacementResult {
  ok: boolean;
  message: string;
}

export interface SelectionState {
  padId: string;
  mode: SelectionMode;
}

export interface VisualEvent {
  type: "shot" | "impact" | "enemy-killed" | "wave-cleared" | "wave-started";
  x: number;
  y: number;
  radius?: number;
  frame?: number;
  tint?: number;
  scale?: number;
  rotation?: number;
  waveNumber?: number;
  towerKind?: TowerKind;
  projectileKind?: ProjectileKind;
}

export interface MetaEvent {
  type: "achievement" | "leaderboard-score";
  key: AchievementKey | "highest_wave";
  value?: number;
}

export interface GameState {
  now: number;
  phase: Phase;
  gold: number;
  baseHealth: number;
  maxBaseHealth: number;
  waveNumber: number;
  highestWave: number;
  wavePhase: WavePhase;
  waveClock: number;
  wavePlan: WavePlan | null;
  waveCursor: number;
  towers: Tower[];
  enemies: Enemy[];
  projectiles: Projectile[];
  pads: PadState[];
  nextIds: {
    tower: number;
    enemy: number;
    projectile: number;
  };
  totalKills: number;
  totalLeaks: number;
  queuedVisualEvents: VisualEvent[];
  queuedMetaEvents: MetaEvent[];
  grantedAchievements: Set<AchievementKey>;
}
