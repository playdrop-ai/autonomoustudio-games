import {
  ROW_COUNT,
  activePairs,
  targetLaneForKind,
  toggleLatch,
  type Blossom,
  type GameState,
} from "./logic";

export type AutoplayMode = "casual" | "expert";

export function applyCasualToggle(state: GameState): GameState {
  const target = sortByImminence(state.blossoms)[0];
  if (!target) return state;
  return applySingleHelpfulToggle(state, [candidateFromBlossom(target)]);
}

export function applyExpertToggle(state: GameState): GameState {
  let bestAction: { row: number; pairIndex: number } | null = null;
  let bestScore = evaluateExpertState(state);

  for (let row = 0; row < state.latches.length; row += 1) {
    const pairCount = state.latches[row]?.length ?? 0;
    for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
      const toggled = toggleLatch(state, row, pairIndex);
      const score = evaluateExpertState(toggled);
      if (score < bestScore) {
        bestScore = score;
        bestAction = { row, pairIndex };
      }
    }
  }

  return bestAction ? toggleLatch(state, bestAction.row, bestAction.pairIndex) : state;
}

function applySingleHelpfulToggle(
  state: GameState,
  candidates: Array<{ blossom?: Blossom; startRow: number; currentLane: number; targetLane: number }>,
): GameState {
  for (const candidate of candidates) {
    const plan = findBestPlan(state, candidate);
    if (!plan) continue;
    const action = plan.find((step) => state.latches[step.row]?.[step.pairIndex] !== step.state);
    if (!action) continue;
    return toggleLatch(state, action.row, action.pairIndex);
  }
  return state;
}

function candidateFromBlossom(blossom: Blossom) {
  return {
    blossom,
    startRow: Math.min(ROW_COUNT, blossom.segment + 1),
    currentLane: blossom.toLane,
    targetLane: targetLaneForKind(blossom.kind),
  };
}

function sortByImminence(blossoms: Blossom[]): Blossom[] {
  return [...blossoms].sort((left, right) => right.segment + right.progress - (left.segment + left.progress));
}

function findBestPlan(state: GameState, candidate: { startRow: number; currentLane: number; targetLane: number }) {
  const plans: Array<Array<{ row: number; pairIndex: number; state: "straight" | "cross" }>> = [];
  collectPlans(candidate.startRow, candidate.currentLane, candidate.targetLane, [], plans);
  if (plans.length === 0) return null;

  plans.sort((left, right) => {
    const mismatchDelta = countMismatches(state, left) - countMismatches(state, right);
    if (mismatchDelta !== 0) return mismatchDelta;
    const earliestDelta = earliestMismatchRow(state, left) - earliestMismatchRow(state, right);
    if (earliestDelta !== 0) return earliestDelta;
    return left.length - right.length;
  });

  return plans[0]!;
}

function collectPlans(
  row: number,
  lane: number,
  targetLane: number,
  plan: Array<{ row: number; pairIndex: number; state: "straight" | "cross" }>,
  plans: Array<Array<{ row: number; pairIndex: number; state: "straight" | "cross" }>>,
): void {
  if (row >= ROW_COUNT) {
    if (lane === targetLane) plans.push(plan);
    return;
  }

  const pairs = activePairs(row);
  for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
    const [left, right] = pairs[pairIndex]!;
    if (lane !== left && lane !== right) continue;
    collectPlans(row + 1, lane, targetLane, [...plan, { row, pairIndex, state: "straight" }], plans);
    collectPlans(
      row + 1,
      lane === left ? right : left,
      targetLane,
      [...plan, { row, pairIndex, state: "cross" }],
      plans,
    );
    return;
  }

  collectPlans(row + 1, lane, targetLane, plan, plans);
}

function countMismatches(
  state: GameState,
  plan: Array<{ row: number; pairIndex: number; state: "straight" | "cross" }>,
): number {
  return plan.filter((step) => state.latches[step.row]?.[step.pairIndex] !== step.state).length;
}

function earliestMismatchRow(
  state: GameState,
  plan: Array<{ row: number; pairIndex: number; state: "straight" | "cross" }>,
): number {
  const mismatch = plan.find((step) => state.latches[step.row]?.[step.pairIndex] !== step.state);
  return mismatch ? mismatch.row : Number.POSITIVE_INFINITY;
}

function evaluateExpertState(state: GameState): number {
  let score = 0;
  for (const blossom of state.blossoms) {
    const candidate = candidateFromBlossom(blossom);
    const plan = findBestPlan(state, candidate);
    if (!plan) return Number.POSITIVE_INFINITY;
    const mismatchCount = countMismatches(state, plan);
    const mismatch = plan.find((step) => state.latches[step.row]?.[step.pairIndex] !== step.state);
    const deadlineMs = mismatch ? timeUntilRow(blossom, mismatch.row) : Number.POSITIVE_INFINITY;
    score += mismatchCount * 600;
    score += deadlinePenalty(deadlineMs);
  }

  const previewPlan = findBestPlan(state, {
    startRow: 0,
    currentLane: state.nextSpawn.lane,
    targetLane: targetLaneForKind(state.nextSpawn.kind),
  });
  if (!previewPlan) return Number.POSITIVE_INFINITY;
  score += countMismatches(state, previewPlan) * 40;
  return score;
}

function deadlinePenalty(deadlineMs: number): number {
  if (!Number.isFinite(deadlineMs)) return 0;
  if (deadlineMs < 120) return 2500;
  if (deadlineMs < 240) return 1200;
  if (deadlineMs < 400) return 500;
  if (deadlineMs < 700) return 200;
  if (deadlineMs < 1000) return 80;
  return 0;
}

function timeUntilRow(blossom: Blossom, row: number): number {
  const segmentDuration = blossom.travelDuration / (ROW_COUNT + 1);
  const remainingCurrentSegmentMs = (1 - blossom.progress) * segmentDuration;
  const fullSegmentsAfterCurrent = Math.max(0, row - (blossom.segment + 1));
  return remainingCurrentSegmentMs + fullSegmentsAfterCurrent * segmentDuration;
}
