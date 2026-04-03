export type SuitKey = "moon" | "rose" | "sun" | "blade";
export type SpreadLabel = "Past" | "Present" | "Future";

export type Card = {
  id: string;
  rank: number;
  suit: SuitKey;
};

export type SpreadState = {
  label: SpreadLabel;
  omenSuit: SuitKey;
  tableau: Array<Card | null>;
  active: Card;
  stock: Card[];
  reserveCard: Card | null;
  reserveCharged: boolean;
  chainLength: number;
  lastClearedSuit: SuitKey | null;
};

export type ChainSettlement = {
  spread: SpreadState;
  points: number;
  omenTriggered: boolean;
};

export const SUITS: SuitKey[] = ["moon", "rose", "sun", "blade"];
export const SPREAD_LABELS: SpreadLabel[] = ["Past", "Present", "Future"];
export const TABLEAU_CARD_COUNT = 21;
export const STOCK_CARD_COUNT = 14;
export const BASE_CARD_POINTS = 100;
export const CHAIN_STEP_POINTS = 40;
export const OMEN_BONUS_POINTS = 300;
export const SPREAD_CLEAR_POINTS = 1000;
export const FLAWLESS_READING_POINTS = 2000;

export function createSpread(seed: number, label: SpreadLabel): SpreadState {
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const deck = createDeck(seed + attempt * 101);
    const active = deck[0]!;
    const tableau = deck.slice(1, 1 + TABLEAU_CARD_COUNT);
    const stockStart = 1 + TABLEAU_CARD_COUNT;
    const stock = deck.slice(stockStart, stockStart + STOCK_CARD_COUNT);
    const omenSuit = deck[stockStart + STOCK_CARD_COUNT]?.suit ?? SUITS[(seed + attempt) % SUITS.length]!;
    const spread: SpreadState = {
      label,
      omenSuit,
      tableau,
      active,
      stock,
      reserveCard: null,
      reserveCharged: true,
      chainLength: 0,
      lastClearedSuit: null,
    };
    if (getPlayableIndices(spread).length > 0) return spread;
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

export function isPlayable(active: Card, candidate: Card): boolean {
  const diff = Math.abs(active.rank - candidate.rank);
  return diff === 1 || diff === 12;
}

export function getPlayableIndices(spread: SpreadState): number[] {
  return spread.tableau.flatMap((card, index) =>
    card && isPlayable(spread.active, card) ? [index] : [],
  );
}

export function playCard(spread: SpreadState, index: number): { spread: SpreadState; points: number } {
  const card = spread.tableau[index];
  if (!card) throw new Error("[velvet-arcana] tried to play an empty tableau slot");
  if (!isPlayable(spread.active, card)) throw new Error("[velvet-arcana] tried to play an illegal card");

  const next = cloneSpread(spread);
  next.tableau[index] = null;
  next.active = card;
  next.chainLength += 1;
  next.lastClearedSuit = card.suit;

  const points = BASE_CARD_POINTS + Math.max(0, next.chainLength - 1) * CHAIN_STEP_POINTS;
  return { spread: next, points };
}

export function drawFromStock(spread: SpreadState): ChainSettlement {
  if (spread.stock.length === 0) throw new Error("[velvet-arcana] tried to draw with an empty stock");

  const settled = settleChain(spread);
  settled.spread.active = settled.spread.stock.shift()!;
  return settled;
}

export function canUseReserve(spread: SpreadState): boolean {
  if (!spread.reserveCharged) return false;
  return Boolean(spread.reserveCard) || spread.stock.length > 0;
}

export function useReserve(spread: SpreadState): SpreadState {
  if (!canUseReserve(spread)) throw new Error("[velvet-arcana] tried to use reserve without a charge");

  const next = cloneSpread(spread);

  if (next.reserveCard) {
    const current = next.active;
    next.active = next.reserveCard;
    next.reserveCard = current;
    next.reserveCharged = false;
    return next;
  }

  next.reserveCard = next.active;
  next.active = next.stock.shift()!;
  next.reserveCharged = false;
  return next;
}

export function settleChain(spread: SpreadState): ChainSettlement {
  const next = cloneSpread(spread);
  let points = 0;
  let omenTriggered = false;

  if (next.chainLength >= 3 && next.lastClearedSuit === next.omenSuit) {
    points += OMEN_BONUS_POINTS;
    next.reserveCharged = true;
    omenTriggered = true;
  }

  next.chainLength = 0;
  next.lastClearedSuit = null;

  return { spread: next, points, omenTriggered };
}

export function isSpreadCleared(spread: SpreadState): boolean {
  return spread.tableau.every((card) => card === null);
}

export function isHardStuck(spread: SpreadState): boolean {
  if (getPlayableIndices(spread).length > 0) return false;
  if (spread.stock.length > 0) return false;
  if (!spread.reserveCharged || !spread.reserveCard) return true;

  return !isPlayable(spread.reserveCard, spread.active) &&
    spread.tableau.every((card) => !card || !isPlayable(spread.reserveCard!, card));
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
    tableau: spread.tableau.map((card) => (card ? { ...card } : null)),
    active: { ...spread.active },
    stock: spread.stock.map((card) => ({ ...card })),
    reserveCard: spread.reserveCard ? { ...spread.reserveCard } : null,
  };
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
