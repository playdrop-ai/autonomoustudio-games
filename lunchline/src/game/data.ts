import type { IngredientDefinition, IngredientKey } from "./types";

export const COLS = 7;
export const ROWS = 10;
export const COMPLAINT_LIMIT = 3;
export const CLEAR_PHASE_MS = 120;
export const SETTLE_PHASE_MS = 180;
export const AUTOPLAY_TAP_DELAY_MS = 260;
export const SCORE_NEEDED_TILE = 60;
export const SCORE_OFF_TILE = 12;
export const SCORE_ORDER_BONUS = 320;
export const SCORE_STREAK_BONUS = 80;

export const INGREDIENTS: readonly IngredientDefinition[] = [
  {
    key: "salmon",
    label: "Salmon",
    color: "#ef7d58",
    accent: "#ffb494",
    glow: "rgba(239, 125, 88, 0.28)",
  },
  {
    key: "avocado",
    label: "Avocado",
    color: "#7ab96d",
    accent: "#cfe9bc",
    glow: "rgba(122, 185, 109, 0.24)",
  },
  {
    key: "egg",
    label: "Egg",
    color: "#f3c863",
    accent: "#fff0b0",
    glow: "rgba(243, 200, 99, 0.24)",
  },
  {
    key: "cucumber",
    label: "Cucumber",
    color: "#55a98d",
    accent: "#c9f0e0",
    glow: "rgba(85, 169, 141, 0.24)",
  },
] as const;

export const INGREDIENT_KEYS = INGREDIENTS.map((ingredient) => ingredient.key) as IngredientKey[];

export function ingredientDefinition(key: IngredientKey): IngredientDefinition {
  const found = INGREDIENTS.find((ingredient) => ingredient.key === key);
  if (!found) throw new Error(`[lunchline] Unknown ingredient: ${key}`);
  return found;
}
