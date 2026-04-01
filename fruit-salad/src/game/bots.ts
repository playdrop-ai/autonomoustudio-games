import {
  applyShotAtSlot,
  listAttachableSlots,
  neighborSlots,
  swapShots,
  type GameState,
  type Slot,
} from "./logic.ts";

export interface BotChoice {
  slot: Slot;
  useReserve: boolean;
}

interface RankedChoice extends BotChoice {
  heuristic: number;
  popped: number;
  dropped: number;
}

export function chooseIdlePlacement(state: GameState): BotChoice | null {
  const slots = listAttachableSlots(state.board);
  const index = (state.rng + state.totalShots) % slots.length;
  return slots[index] ? { slot: slots[index], useReserve: false } : null;
}

export function chooseCasualPlacement(state: GameState): BotChoice | null {
  const currentChoices = rankCasualChoices(state, false);
  if (currentChoices.length === 0) return null;

  const popChoices = currentChoices.filter((choice) => choice.popped >= 3 || choice.dropped >= 1);
  const roll = ((state.rng >>> 8) + state.totalShots * 17) % 100;
  if (popChoices.length > 0 && roll < 12) {
    return popChoices[0] ?? null;
  }
  return chooseIdlePlacement(state);
}

export function chooseExpertPlacement(state: GameState): BotChoice | null {
  return bestChoice(state, 1.8, 4.5);
}

function rankCasualChoices(state: GameState, useReserve: boolean): RankedChoice[] {
  const slots = listAttachableSlots(state.board);
  const choices: RankedChoice[] = [];

  for (const slot of slots) {
    const adjacentSame = countAdjacentSameColor(state, slot);
    const result = applyShotAtSlot(state, slot);
    const heuristic =
      (result.popped.length >= 3 ? 90 : 0) +
      result.dropped.length * 24 +
      adjacentSame * 9 -
      slot.row * 4 -
      Math.abs(slot.col - 3) * 2 -
      (useReserve ? 12 : 0) -
      (result.state.gameOver ? 100000 : 0);

    choices.push({
      slot,
      useReserve,
      heuristic,
      popped: result.popped.length,
      dropped: result.dropped.length,
    });
  }

  return choices.sort((left, right) => right.heuristic - left.heuristic);
}

function countAdjacentSameColor(state: GameState, slot: Slot): number {
  let count = 0;
  for (const neighbor of neighborSlots(slot.row, slot.col)) {
    if (state.board[neighbor.row]?.[neighbor.col] === state.currentShot) count += 1;
  }
  return count;
}

function bestChoice(state: GameState, popWeight: number, dropWeight: number): BotChoice | null {
  const slots = listAttachableSlots(state.board);
  let best: BotChoice | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const useReserve of [false, true]) {
    const workingState = useReserve ? swapShots(state) : state;
    for (const slot of slots) {
      const result = applyShotAtSlot(workingState, slot);
      const score =
        result.popped.length * popWeight +
        result.dropped.length * dropWeight +
        result.bonusShots * 5 -
        Math.max(0, result.state.shotsUntilSink - 3) * 0.4 +
        result.state.score * 0.0001;
      if (score > bestScore) {
        bestScore = score;
        best = { slot, useReserve };
      }
    }
  }

  return best;
}
