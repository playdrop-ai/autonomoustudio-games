export type IngredientKey = "salmon" | "avocado" | "egg" | "cucumber";

export type AutoplayMode = "idle" | "casual" | "expert";

export type Screen = "start" | "playing" | "gameover";

export type CellCoord = {
  col: number;
  row: number;
};

export type IngredientDefinition = {
  key: IngredientKey;
  label: string;
  color: string;
  accent: string;
  glow: string;
};

export type Tile = {
  id: number;
  ingredient: IngredientKey;
  row: number;
  displayRow: number;
  targetRow: number;
  highlight: number;
  clear01: number;
  opacity: number;
};

export type OrderSlot = {
  ingredient: IngredientKey;
  need: number;
  filled: number;
};

export type ClusterPreview = {
  cells: CellCoord[];
  ingredient: IngredientKey;
  size: number;
  matchedOrder: boolean;
};

export type PendingResolve = {
  stage: "clearing" | "settling";
  timerMs: number;
  cells: CellCoord[];
  ingredient: IngredientKey;
  size: number;
  matchedOrder: boolean;
  completedOrder: boolean;
};

export type GameEvent =
  | {
      kind: "clear";
    }
  | {
      kind: "order-served";
    }
  | {
      kind: "complaint";
    }
  | {
      kind: "gameover";
    };

export type GameState = {
  seed: number;
  rng: number;
  nextTileId: number;
  columns: Tile[][];
  hoveredCluster: ClusterPreview | null;
  pendingResolve: PendingResolve | null;
  gameOver: boolean;
  complaints: number;
  score: number;
  streak: number;
  longestStreak: number;
  ordersServed: number;
  orderIndex: number;
  order: [OrderSlot, OrderSlot];
  patienceMs: number;
  maxPatienceMs: number;
  orderFlashMs: number;
  complaintFlashMs: number;
  autoplayCooldownMs: number;
  totalElapsedMs: number;
};

export type DebugSnapshot = {
  score: number;
  complaints: number;
  streak: number;
  longestStreak: number;
  ordersServed: number;
  orderIndex: number;
  patienceMs: number;
  maxPatienceMs: number;
  order: Array<{
    ingredient: IngredientKey;
    need: number;
    filled: number;
  }>;
  gameOver: boolean;
  hoveredCluster: ClusterPreview | null;
  board: IngredientKey[][];
};
