export type DifficultyKey = "warm" | "live" | "deep";

export interface DifficultyConfig {
  key: DifficultyKey;
  label: string;
  width: number;
  height: number;
  hazards: number;
}

export interface CellState {
  isHazard: boolean;
  revealed: boolean;
  flagged: boolean;
  burnt: boolean;
  clue: number;
  connected: boolean;
  revealPulse: number;
  connectPulse: number;
  burnPulse: number;
}

export type RunState = "playing" | "won" | "lost";

export interface GameState {
  difficultyKey: DifficultyKey;
  width: number;
  height: number;
  cells: CellState[];
  sourceIndex: number;
  relayIndex: number;
  surgesUsed: number;
  surgeLimit: number;
  elapsedMs: number;
  runState: RunState;
  flagMode: boolean;
  connectedCount: number;
  revealedSafeCount: number;
  totalSafeCells: number;
  seed: number;
}

export interface DebugSnapshot {
  difficultyKey: DifficultyKey;
  elapsedMs: number;
  surgesUsed: number;
  surgeLimit: number;
  runState: RunState;
  flagMode: boolean;
  connectedCount: number;
  revealedSafeCount: number;
  totalSafeCells: number;
  width: number;
  height: number;
  source: { col: number; row: number };
  relay: { col: number; row: number };
  board: string[][];
}

export interface LayoutMetrics {
  viewportWidth: number;
  viewportHeight: number;
  dpr: number;
  stageX: number;
  stageY: number;
  stageWidth: number;
  stageHeight: number;
  boardX: number;
  boardY: number;
  boardWidth: number;
  boardHeight: number;
  cellSize: number;
  gap: number;
}
