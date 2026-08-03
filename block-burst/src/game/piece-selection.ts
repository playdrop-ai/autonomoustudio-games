import { PIECES, type PieceDef } from "./constants";
import { lerp } from "./color";

export const MAX_ADJACENT_TRAY_SPAN_CELLS = 7;

export function trayNeighborsFit(a: PieceDef, b: PieceDef): boolean {
  return a.cols + b.cols <= MAX_ADJACENT_TRAY_SPAN_CELLS
    && a.rows + b.rows <= MAX_ADJACENT_TRAY_SPAN_CELLS;
}

export function traySetFits(pieces: readonly PieceDef[]): boolean {
  return pieces.length === 3
    && trayNeighborsFit(pieces[0]!, pieces[1]!)
    && trayNeighborsFit(pieces[1]!, pieces[2]!);
}

export function pickTrayPieceSet(
  difficulty: number,
  fill: number,
  random: () => number = Math.random,
): [PieceDef, PieceDef, PieceDef] {
  const first = pickPiece(difficulty, fill, PIECES, random);
  const second = pickPiece(
    difficulty,
    fill,
    PIECES.filter((piece) => trayNeighborsFit(first, piece)),
    random,
  );
  const third = pickPiece(
    difficulty,
    fill,
    PIECES.filter((piece) => trayNeighborsFit(second, piece)),
    random,
  );
  return [first, second, third];
}

function pickPiece(
  difficulty: number,
  fill: number,
  candidates: readonly PieceDef[],
  random: () => number,
): PieceDef {
  if (candidates.length === 0) throw new Error("[block-burst] No tray-compatible pieces available");

  let easyWeight = lerp(70, 15, difficulty);
  const mediumWeight = lerp(28, 50, difficulty);
  let hardWeight = lerp(2, 35, difficulty);
  if (fill > 0.55) {
    const pressure = (fill - 0.55) / 0.45;
    easyWeight *= 1 + 2.5 * pressure;
    hardWeight *= Math.max(0, 1 - 1.4 * pressure);
  }

  const pools = [0, 1, 2].map((tier) => candidates.filter((piece) => piece.tier === tier));
  const weights = [easyWeight, mediumWeight, hardWeight].map((weight, tier) => (
    pools[tier]!.length > 0 ? weight : 0
  ));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  if (totalWeight <= 0) throw new Error("[block-burst] Tray-compatible piece weights are empty");

  let roll = random() * totalWeight;
  let selectedTier = weights.length - 1;
  for (let tier = 0; tier < weights.length; tier++) {
    roll -= weights[tier]!;
    if (roll < 0) {
      selectedTier = tier;
      break;
    }
  }

  const pool = pools[selectedTier]!;
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  const piece = pool[index];
  if (!piece) throw new Error("[block-burst] Missing tray-compatible piece pick");
  return piece;
}
