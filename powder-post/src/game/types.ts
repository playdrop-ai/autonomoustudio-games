export const DISTRICTS = ["amber", "coral", "teal"] as const;
export const OBSTACLE_KINDS = ["tree", "rock", "ice"] as const;
export const COURIER_Y = 0.78;

export type District = (typeof DISTRICTS)[number];
export type ObstacleKind = (typeof OBSTACLE_KINDS)[number];
export type Screen = "start" | "playing" | "gameover";
export type AutoplayMode = "idle" | "casual" | "expert";

export interface Gate {
  id: number;
  segmentId: number;
  y: number;
  lane: number;
  district: District;
  scale: number;
  resolved: boolean;
}

export interface Obstacle {
  id: number;
  y: number;
  lane: number;
  kind: ObstacleKind;
  scale: number;
  hit: boolean;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  ageMs: number;
  lifeMs: number;
  color: string;
}

export interface GameState {
  rng: number;
  elapsedMs: number;
  score: number;
  streak: number;
  bestRunStreak: number;
  deliveries: number;
  speed: number;
  speedTier: number;
  storm01: number;
  courierX: number;
  targetX: number;
  courierLean: number;
  activeParcel: District;
  nextParcel: District;
  gates: Gate[];
  obstacles: Obstacle[];
  particles: Particle[];
  nextEntityId: number;
  nextSegmentId: number;
  spawnTimerMs: number;
  gameOver: boolean;
}

export interface GameEvent {
  kind: "correct" | "wrong" | "collision" | "gameover";
  streak: number;
  score: number;
  storm01: number;
  district?: District;
  obstacleKind?: ObstacleKind;
}

export interface StepResult {
  state: GameState;
  events: GameEvent[];
}

export interface DebugSnapshot {
  score: number;
  streak: number;
  bestRunStreak: number;
  deliveries: number;
  speed: number;
  speedTier: number;
  storm01: number;
  courierX: number;
  targetX: number;
  activeParcel: District;
  nextParcel: District;
  gates: Array<{ y: number; lane: number; district: District; segmentId: number }>;
  obstacles: Array<{ y: number; lane: number; kind: ObstacleKind }>;
  gameOver: boolean;
}
