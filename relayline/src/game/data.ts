import type { DifficultyConfig, DifficultyKey } from "./types";

export const SURGE_LIMIT = 3;

export const DIFFICULTIES: Record<DifficultyKey, DifficultyConfig> = {
  warm: {
    key: "warm",
    label: "Warm",
    width: 8,
    height: 10,
    hazards: 10,
  },
  live: {
    key: "live",
    label: "Live",
    width: 9,
    height: 13,
    hazards: 20,
  },
  deep: {
    key: "deep",
    label: "Deep",
    width: 10,
    height: 16,
    hazards: 32,
  },
};

export const DEFAULT_DIFFICULTY: DifficultyKey = "live";
