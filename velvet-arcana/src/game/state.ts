export type SuitKey = "moon" | "rose" | "sun" | "blade";
export type SpreadLabel = "Past" | "Present" | "Future";

export type Card = {
  id: string;
  rank: number;
  suit: SuitKey;
};

export type ColumnCard = {
  card: Card;
  faceUp: boolean;
};

export type ColumnState = ColumnCard[];

export type SpreadState = {
  label: SpreadLabel;
  showNextStockPreview: boolean;
  showBuriedFaces: boolean;
  columns: ColumnState[];
  active: Card | null;
  activeTrail: Card[];
  stock: Card[];
};

export type PlayResult = {
  spread: SpreadState;
  points: number;
  revealedCardId: string | null;
};

export type SpreadAnalysis = {
  winnable: boolean;
  statesExplored: number;
  bestRemainingStockOnWin: number | null;
  branchingFactor: number;
  difficultyBand: "impossible" | "hard" | "medium" | "easy";
};

export type DifficultyBand = SpreadAnalysis["difficultyBand"];

export const SUITS: SuitKey[] = ["moon", "rose", "sun", "blade"];
export const SPREAD_LABELS: SpreadLabel[] = ["Past", "Present", "Future"];
export const COLUMN_COUNT = 7;
export const COLUMN_DEPTH = 5;
export const TABLEAU_CARD_COUNT = COLUMN_COUNT * COLUMN_DEPTH;
export const STOCK_CARD_COUNT = 17;
export const CARD_PLAY_POINTS = 100;
export const SPREAD_CLEAR_POINTS = 1000;
export const RUN_CLEAR_POINTS = 2000;
const MAX_SPREAD_ATTEMPTS = 512;
const HEIGHT_BASES = [1, 6, 36, 216, 1296, 7776, 46656] as const;
const HEIGHT_CODE_SPACE = 279936;

export function createSpread(seed: number, label: SpreadLabel): SpreadState {
  return createSpreadFromAcceptedSeed(resolveAcceptedSpreadSeed(seed, label), label);
}

export function createSpreadFromAcceptedSeed(seed: number, label: SpreadLabel): SpreadState {
  const deck = createDeck(seed >>> 0);
  const tableau = deck.slice(0, TABLEAU_CARD_COUNT);
  const stock = deck.slice(TABLEAU_CARD_COUNT, TABLEAU_CARD_COUNT + STOCK_CARD_COUNT);
  const options = spreadOptionsFor(label);

  return {
    label,
    ...options,
    columns: dealColumns(tableau, options.showBuriedFaces),
    active: null,
    activeTrail: [],
    stock,
  };
}

export function resolveAcceptedSpreadSeed(
  seed: number,
  label: SpreadLabel,
  targetDifficulty?: Exclude<DifficultyBand, "impossible">,
): number {
  const requireSolvable = label === "Past" || label === "Present";

  for (let attempt = 0; attempt < MAX_SPREAD_ATTEMPTS; attempt += 1) {
    const candidateSeed = (seed + attempt * 101) >>> 0;
    const spread = createSpreadFromAcceptedSeed(candidateSeed, label);
    if (!hasPlayableFirstReveal(spread)) continue;

    if (targetDifficulty) {
      if (analyzeSpread(spread).difficultyBand !== targetDifficulty) continue;
      return candidateSeed;
    }

    if (requireSolvable && !analyzeSpread(spread).winnable) continue;
    return candidateSeed;
  }

  const requirementLabel = targetDifficulty ?? (requireSolvable ? "winnable" : "playable");
  throw new Error(`[velvet-arcana] failed to create a ${requirementLabel} ${label} spread`);
}

export function createDeck(seed: number): Card[] {
  const deck: Card[] = [];
  let id = 0;
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank += 1) {
      deck.push({ id: `${suit}-${rank}-${id}`, rank, suit });
      id += 1;
    }
  }

  return shuffle(deck, seed);
}

export function spreadOptionsFor(label: SpreadLabel) {
  if (label === "Past") {
    return { showNextStockPreview: true, showBuriedFaces: true };
  }

  if (label === "Present") {
    return { showNextStockPreview: false, showBuriedFaces: true };
  }

  return { showNextStockPreview: false, showBuriedFaces: false };
}

export function isPlayable(active: Card | null, candidate: Card): boolean {
  if (!active) return false;
  const diff = Math.abs(active.rank - candidate.rank);
  return diff === 1 || diff === 12;
}

export function getPlayableIndices(spread: SpreadState): number[] {
  return spread.columns.flatMap((column, index) => {
    const top = getTopColumnCard(column);
    return top && top.faceUp && isPlayable(spread.active, top.card) ? [index] : [];
  });
}

export function getTopColumnCard(column: ColumnState): ColumnCard | null {
  return column[column.length - 1] ?? null;
}

export function getTopCard(column: ColumnState): Card | null {
  return getTopColumnCard(column)?.card ?? null;
}

export function playCard(spread: SpreadState, index: number): PlayResult {
  const next = cloneSpread(spread);
  const column = next.columns[index];
  if (!column) throw new Error(`[velvet-arcana] tried to play missing column ${index}`);

  const top = column[column.length - 1];
  if (!top) throw new Error("[velvet-arcana] tried to play an empty column");
  if (!top.faceUp) throw new Error("[velvet-arcana] tried to play a hidden card");
  if (!next.active) throw new Error("[velvet-arcana] tried to play without an active reading");
  if (!isPlayable(next.active, top.card)) throw new Error("[velvet-arcana] tried to play an illegal card");

  const played = column.pop()!;
  next.activeTrail.push({ ...next.active });
  next.active = played.card;

  const nextTop = column[column.length - 1] ?? null;
  let revealedCardId: string | null = null;
  if (nextTop && !nextTop.faceUp) {
    nextTop.faceUp = true;
    revealedCardId = nextTop.card.id;
  }

  return {
    spread: next,
    points: CARD_PLAY_POINTS,
    revealedCardId,
  };
}

export function drawFromStock(spread: SpreadState): SpreadState {
  if (spread.stock.length === 0) throw new Error("[velvet-arcana] tried to draw with an empty stock");

  const next = cloneSpread(spread);
  if (next.active) {
    next.activeTrail.push({ ...next.active });
  }
  next.active = next.stock.shift()!;
  return next;
}

export function isSpreadCleared(spread: SpreadState): boolean {
  return spread.columns.every((column) => column.length === 0);
}

export function isHardStuck(spread: SpreadState): boolean {
  return getPlayableIndices(spread).length === 0 && spread.stock.length === 0;
}

export function formatCard(card: Card | null): string {
  if (!card) return "empty";
  return `${rankLabel(card.rank)}-${card.suit}`;
}

export function rankLabel(rank: number): string {
  if (rank === 1) return "A";
  if (rank === 11) return "J";
  if (rank === 12) return "Q";
  if (rank === 13) return "K";
  return String(rank);
}

export function cloneSpread(spread: SpreadState): SpreadState {
  return {
    ...spread,
    columns: spread.columns.map((column) =>
      column.map((entry) => ({
        faceUp: entry.faceUp,
        card: { ...entry.card },
      })),
    ),
    active: spread.active ? { ...spread.active } : null,
    activeTrail: spread.activeTrail.map((card) => ({ ...card })),
    stock: spread.stock.map((card) => ({ ...card })),
  };
}

export function analyzeSpread(spread: SpreadState): SpreadAnalysis {
  const columnRanks = spread.columns.map((column) => column.map((entry) => entry.card.rank));
  const stockRanks = spread.stock.map((card) => card.rank);
  const initialHeightCode = spread.columns.reduce(
    (code, column, index) => code + column.length * HEIGHT_BASES[index]!,
    0,
  );
  const memo = new Map<number, number>();
  let statesExplored = 0;
  let totalChoices = 0;

  const solve = (activeRank: number, stockIndex: number, heightCode: number): number => {
    if (heightCode === 0) return stockRanks.length - stockIndex;

    const key = ((stockIndex * 14 + activeRank) * HEIGHT_CODE_SPACE) + heightCode;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    statesExplored += 1;
    let bestRemainingStock = -1;
    let actions = 0;

    if (activeRank === 0) {
      if (stockIndex < stockRanks.length) {
        actions = 1;
        bestRemainingStock = solve(stockRanks[stockIndex]!, stockIndex + 1, heightCode);
      }
    } else {
      for (let columnIndex = 0; columnIndex < columnRanks.length; columnIndex += 1) {
        const height = Math.floor(heightCode / HEIGHT_BASES[columnIndex]!) % 6;
        if (height <= 0) continue;

        const topRank = columnRanks[columnIndex]?.[height - 1];
        if (topRank === undefined || !areAdjacentRanks(activeRank, topRank)) continue;

        actions += 1;
        const solvedRemainingStock = solve(topRank, stockIndex, heightCode - HEIGHT_BASES[columnIndex]!);
        if (solvedRemainingStock > bestRemainingStock) {
          bestRemainingStock = solvedRemainingStock;
        }
      }

      if (stockIndex < stockRanks.length) {
        actions += 1;
        const solvedRemainingStock = solve(stockRanks[stockIndex]!, stockIndex + 1, heightCode);
        if (solvedRemainingStock > bestRemainingStock) {
          bestRemainingStock = solvedRemainingStock;
        }
      }
    }

    totalChoices += actions;
    memo.set(key, bestRemainingStock);
    return bestRemainingStock;
  };

  const bestRemainingStockOnWin = solve(spread.active?.rank ?? 0, 0, initialHeightCode);
  const branchingFactor = statesExplored === 0 ? 0 : totalChoices / statesExplored;

  return {
    winnable: bestRemainingStockOnWin >= 0,
    statesExplored,
    bestRemainingStockOnWin: bestRemainingStockOnWin >= 0 ? bestRemainingStockOnWin : null,
    branchingFactor,
    difficultyBand:
      bestRemainingStockOnWin < 0
        ? "impossible"
        : bestRemainingStockOnWin >= 8
          ? "easy"
          : bestRemainingStockOnWin >= 4
            ? "medium"
            : "hard",
  };
}

function dealColumns(cards: Card[], showBuriedFaces: boolean): ColumnState[] {
  return Array.from({ length: COLUMN_COUNT }, (_, columnIndex) => {
    const start = columnIndex * COLUMN_DEPTH;
    return cards.slice(start, start + COLUMN_DEPTH).map((card, depthIndex) => ({
      card,
      faceUp: showBuriedFaces || depthIndex === COLUMN_DEPTH - 1,
    }));
  });
}

function shuffle<T>(items: T[], seed: number): T[] {
  const next = [...items];
  const random = mulberry32(seed);
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    const current = next[index]!;
    next[index] = next[swapIndex]!;
    next[swapIndex] = current;
  }
  return next;
}

function areAdjacentRanks(activeRank: number, candidateRank: number): boolean {
  const diff = Math.abs(activeRank - candidateRank);
  return diff === 1 || diff === 12;
}

function hasPlayableFirstReveal(spread: SpreadState) {
  return getPlayableIndices(drawFromStock(spread)).length > 0;
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), value | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}
