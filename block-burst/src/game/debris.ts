export interface DebrisCountRange {
  min: number;
  max: number;
}

export const MAX_DEBRIS_PER_CLEAR = 220;
export const BOMB_WAVE_DELAY_MS = 300;
export const BOMB_CHAIN_STAGGER_MS = 120;
const BOMB_CLEAR_SPAWN_STEP_MS = 10;

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

export function bombDebrisMultiplier(bombTriggered: boolean, isBombCell: boolean): number {
  if (!bombTriggered) return 1;
  return isBombCell ? 4 : 2;
}

export function bombClearSpawnDelay(row: number, column: number): number {
  const safeRow = Math.max(0, Math.floor(row));
  const safeColumn = Math.max(0, Math.floor(column));
  return (safeRow + safeColumn) * BOMB_CLEAR_SPAWN_STEP_MS;
}

export function bombImpulseStrengthCells(distanceCells: number, chainIndex: number): number {
  const distance = Math.max(0, distanceCells);
  let strength: number;
  if (distance <= 2) strength = 13 - distance * 1.25;
  else if (distance <= 4) strength = 8.5 - (distance - 2) * 1.25;
  else strength = Math.max(2.4, 4.8 - (distance - 4) * 0.55);
  return strength * (1 + Math.min(Math.max(chainIndex, 0), 3) * 0.08);
}
