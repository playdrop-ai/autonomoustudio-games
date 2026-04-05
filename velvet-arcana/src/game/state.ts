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

export const SUITS: SuitKey[] = ["moon", "rose", "sun", "blade"];
export const SPREAD_LABELS: SpreadLabel[] = ["Past", "Present", "Future"];
export const COLUMN_COUNT = 7;
export const COLUMN_DEPTH = 5;
export const TABLEAU_CARD_COUNT = COLUMN_COUNT * COLUMN_DEPTH;
export const STOCK_CARD_COUNT = 17;
export const CARD_PLAY_POINTS = 100;
export const SPREAD_CLEAR_POINTS = 1000;
export const RUN_CLEAR_POINTS = 2000;

export function createSpread(seed: number, label: SpreadLabel): SpreadState {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const deck = createDeck(seed + attempt * 101);
    const tableau = deck.slice(0, TABLEAU_CARD_COUNT);
    const stock = deck.slice(TABLEAU_CARD_COUNT, TABLEAU_CARD_COUNT + STOCK_CARD_COUNT);
    const options = spreadOptionsFor(label);
    const spread: SpreadState = {
      label,
      ...options,
      columns: dealColumns(tableau, options.showBuriedFaces),
      active: null,
      activeTrail: [],
      stock,
    };

    if (getPlayableIndices(drawFromStock(spread)).length > 0) return spread;
  }

  throw new Error("[velvet-arcana] failed to create a playable spread");
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

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), value | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}
