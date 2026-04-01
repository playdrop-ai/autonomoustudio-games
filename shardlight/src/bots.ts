import { BOARD_COLS, chordCell, countFlags, neighborIndices, toggleFlag, uncoverCell, type ActionResult, type GameState } from "./game";

export type BotMode = "idle" | "casual" | "expert";

export interface BotAction {
  kind: "uncover" | "flag" | "chord";
  index: number;
}

export const BOT_ACTION_DELAY_MS: Record<BotMode, number> = {
  idle: 1800,
  casual: 1600,
  expert: 920,
};

const START_INDEX = BOARD_COLS + 1;

export function chooseBotAction(state: GameState, mode: BotMode): BotAction | null {
  if (state.status === "failed" || state.status === "cleared") {
    return null;
  }
  if (state.status === "ready") {
    return {
      kind: "uncover",
      index: START_INDEX,
    };
  }

  const deductions = listDeterministicActions(state);
  if (deductions.flag.length > 0) {
    return {
      kind: "flag",
      index: deductions.flag[0]!,
    };
  }
  if (deductions.chord.length > 0 && mode !== "idle") {
    return {
      kind: "chord",
      index: deductions.chord[0]!,
    };
  }
  if (deductions.safe.length > 0) {
    return {
      kind: "uncover",
      index: deductions.safe[0]!,
    };
  }

  const candidates = listGuessCandidates(state);
  if (candidates.length === 0) {
    return null;
  }

  if (mode === "idle") {
    return {
      kind: "uncover",
      index: candidates[candidates.length - 1]!.index,
    };
  }

  const bestRisk = candidates[0]!.risk;
  const tied = candidates.filter((candidate) => Math.abs(candidate.risk - bestRisk) < 0.0001);
  if (mode === "expert") {
    const safeGuess = candidates.find((candidate) => !state.board.cells[candidate.index]?.mine);
    return {
      kind: "uncover",
      index: (safeGuess ?? tied[0])!.index,
    };
  }

  const shortlist = candidates.filter((candidate) => candidate.risk <= bestRisk + 0.08);
  const pick = shortlist[Math.min(1, shortlist.length - 1)] ?? candidates[0]!;
  return {
    kind: "uncover",
    index: pick.index,
  };
}

export function applyBotAction(state: GameState, action: BotAction): ActionResult {
  if (action.kind === "flag") {
    return {
      state: toggleFlag(state, action.index),
      outcome: "continue",
      revealed: 0,
      revealedIndices: [],
      scoreGained: 0,
      clearBonus: 0,
    };
  }
  if (action.kind === "chord") {
    return chordCell(state, action.index);
  }
  return uncoverCell(state, action.index);
}

interface GuessCandidate {
  index: number;
  risk: number;
  constrained: boolean;
}

function listDeterministicActions(state: GameState): { flag: number[]; safe: number[]; chord: number[] } {
  const flag = new Set<number>();
  const safe = new Set<number>();
  const chord = new Set<number>();

  for (let index = 0; index < state.board.cells.length; index += 1) {
    const cell = state.board.cells[index];
    if (!cell?.revealed || cell.adjacent === 0) continue;

    const neighbors = neighborIndices(index, state.board.rows, state.board.cols);
    const hidden = neighbors.filter((neighborIndex) => {
      const neighbor = state.board.cells[neighborIndex];
      return neighbor && !neighbor.revealed && !neighbor.flagged;
    });
    const flaggedCount = neighbors.reduce((count, neighborIndex) => {
      return count + (state.board.cells[neighborIndex]?.flagged ? 1 : 0);
    }, 0);
    const minesNeeded = cell.adjacent - flaggedCount;

    if (hidden.length > 0 && minesNeeded === hidden.length) {
      for (const hiddenIndex of hidden) {
        flag.add(hiddenIndex);
      }
    }
    if (hidden.length > 0 && minesNeeded === 0) {
      chord.add(index);
      for (const hiddenIndex of hidden) {
        safe.add(hiddenIndex);
      }
    }
  }

  return {
    flag: [...flag].sort((left, right) => left - right),
    safe: [...safe].sort((left, right) => left - right),
    chord: [...chord].sort((left, right) => left - right),
  };
}

function listGuessCandidates(state: GameState): GuessCandidate[] {
  const remainingMines = Math.max(0, state.mineCount - countFlags(state.board));
  const hiddenCells = state.board.cells
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => cell && !cell.revealed && !cell.flagged);
  if (hiddenCells.length === 0) {
    return [];
  }

  const baseRisk = remainingMines / hiddenCells.length;
  const candidates = hiddenCells.map(({ index }) => {
    const localEstimates: number[] = [];
    for (const neighborIndex of neighborIndices(index, state.board.rows, state.board.cols)) {
      const neighbor = state.board.cells[neighborIndex];
      if (!neighbor?.revealed || neighbor.adjacent === 0) continue;
      const neighborHidden = neighborIndices(neighborIndex, state.board.rows, state.board.cols).filter((candidateIndex) => {
        const candidate = state.board.cells[candidateIndex];
        return candidate && !candidate.revealed && !candidate.flagged;
      });
      if (neighborHidden.length === 0) continue;
      const flaggedCount = neighborIndices(neighborIndex, state.board.rows, state.board.cols).reduce((count, candidateIndex) => {
        return count + (state.board.cells[candidateIndex]?.flagged ? 1 : 0);
      }, 0);
      const minesNeeded = Math.max(0, neighbor.adjacent - flaggedCount);
      localEstimates.push(minesNeeded / neighborHidden.length);
    }

    return {
      index,
      risk: localEstimates.length > 0 ? Math.max(baseRisk, ...localEstimates) : baseRisk + 0.04,
      constrained: localEstimates.length > 0,
    };
  });

  return candidates.sort((left, right) => {
    if (left.risk !== right.risk) return left.risk - right.risk;
    if (left.constrained !== right.constrained) return Number(right.constrained) - Number(left.constrained);
    return left.index - right.index;
  });
}
