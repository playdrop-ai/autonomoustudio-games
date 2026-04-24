import { applyMove, createInitialState, type GameState, type Move } from "../src/game/logic.ts";

type PolicyName = "random" | "greedy";

interface Options {
  games: number;
  maxMoves: number;
  policy: PolicyName;
}

interface RunResult {
  seed: number;
  moves: number;
  score: number;
  ashCount: number;
  gameOver: boolean;
  capped: boolean;
}

const ALL_MOVES: Move[] = [
  ...Array.from({ length: 6 }, (_, index) => ({ axis: "row" as const, index, direction: -1 as const })),
  ...Array.from({ length: 6 }, (_, index) => ({ axis: "row" as const, index, direction: 1 as const })),
  ...Array.from({ length: 5 }, (_, index) => ({ axis: "col" as const, index, direction: -1 as const })),
  ...Array.from({ length: 5 }, (_, index) => ({ axis: "col" as const, index, direction: 1 as const })),
];

const options = parseArgs(process.argv.slice(2));
const results: RunResult[] = [];

for (let game = 0; game < options.games; game += 1) {
  const seed = 20260326 + game * 7919;
  results.push(runGame(seed, options.maxMoves, options.policy));
}

process.stdout.write(
  JSON.stringify(
    {
      policy: options.policy,
      games: options.games,
      maxMoves: options.maxMoves,
      averageMoves: average(results.map((result) => result.moves)),
      medianMoves: percentile(results.map((result) => result.moves), 0.5),
      p90Moves: percentile(results.map((result) => result.moves), 0.9),
      maxObservedMoves: Math.max(...results.map((result) => result.moves)),
      cappedRuns: results.filter((result) => result.capped).length,
      averageScore: average(results.map((result) => result.score)),
      medianScore: percentile(results.map((result) => result.score), 0.5),
      p90Score: percentile(results.map((result) => result.score), 0.9),
      maxObservedScore: Math.max(...results.map((result) => result.score)),
      averageAshAtEnd: average(results.map((result) => result.ashCount)),
      sampleWorstRuns: results
        .slice()
        .sort((left, right) => left.moves - right.moves)
        .slice(0, 5),
      sampleLongestRuns: results
        .slice()
        .sort((left, right) => right.moves - left.moves)
        .slice(0, 5),
    },
    null,
    2,
  ) + "\n",
);

function parseArgs(argv: string[]): Options {
  const parsed: Options = {
    games: 200,
    maxMoves: 800,
    policy: "greedy",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]!;
    const next = argv[index + 1];
    switch (arg) {
      case "--games":
        parsed.games = parseIntArg(next, "--games");
        index += 1;
        break;
      case "--max-moves":
        parsed.maxMoves = parseIntArg(next, "--max-moves");
        index += 1;
        break;
      case "--policy":
        if (next !== "random" && next !== "greedy") {
          throw new Error("Expected --policy random|greedy");
        }
        parsed.policy = next;
        index += 1;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function parseIntArg(value: string | undefined, flag: string): number {
  if (!value) throw new Error(`Missing value for ${flag}`);
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid integer for ${flag}: ${value}`);
  return parsed;
}

function runGame(seed: number, maxMoves: number, policy: PolicyName): RunResult {
  let state = createInitialState(seed);
  let moveCount = 0;
  let rngState = seed ^ 0x9e3779b9;
  let previousAxis: Move["axis"] | null = null;

  while (!state.gameOver && moveCount < maxMoves) {
    const chosen =
      policy === "random" ? randomMove(rngState) : chooseGreedyMove(state, previousAxis);
    if (policy === "random") {
      rngState = nextRng(rngState);
    }

    const result = applyMove(state, chosen);
    state = result.state;
    previousAxis = chosen.axis;
    moveCount += 1;
  }

  return {
    seed,
    moves: moveCount,
    score: state.score,
    ashCount: state.ashCount,
    gameOver: state.gameOver,
    capped: !state.gameOver && moveCount >= maxMoves,
  };
}

function randomMove(rngState: number): Move {
  const next = nextRng(rngState);
  return ALL_MOVES[next % ALL_MOVES.length]!;
}

function chooseGreedyMove(state: GameState, previousAxis: Move["axis"] | null): Move {
  let best: { move: Move; heuristic: number } | null = null;

  for (const move of ALL_MOVES) {
    const result = applyMove(state, move);
    const clears = result.stages.filter((stage) => stage.kind === "clear").length;
    const ashReduction = state.ashCount - result.state.ashCount;
    const spawnedAsh = result.stages.some((stage) => stage.kind === "ash");
    const heuristic =
      result.scoreGained * 12 +
      clears * 500 +
      result.maxCombo * 1300 +
      ashReduction * 4200 -
      result.state.ashCount * 500 -
      (result.state.gameOver ? 100000 : 0) +
      (move.axis !== previousAxis ? 40 : 0) -
      (spawnedAsh ? 100 : 0);

    if (!best || heuristic > best.heuristic) {
      best = { move, heuristic };
    }
  }

  return best!.move;
}

function nextRng(state: number): number {
  let next = state >>> 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  return next >>> 0;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values: number[], ratio: number): number {
  const sorted = values.slice().sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
  return sorted[index]!;
}
