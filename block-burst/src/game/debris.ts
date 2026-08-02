export interface DebrisCountRange {
  min: number;
  max: number;
}

export const MAX_DEBRIS_PER_CLEAR = 220;

export function debrisCountRange(combo: number): DebrisCountRange {
  if (combo >= 5) return { min: 4, max: 6 };
  if (combo >= 4) return { min: 3, max: 6 };
  if (combo >= 3) return { min: 2, max: 6 };
  if (combo >= 2) return { min: 2, max: 5 };
  return { min: 2, max: 4 };
}

export function boundedDebrisCountRange(combo: number, clearedCells: number): DebrisCountRange {
  const requested = debrisCountRange(combo);
  const safeCells = Math.max(1, Math.floor(clearedCells));
  const eventMaximum = Math.max(2, Math.floor(MAX_DEBRIS_PER_CLEAR / safeCells));
  const max = Math.min(requested.max, eventMaximum);
  return { min: Math.min(requested.min, max), max };
}
