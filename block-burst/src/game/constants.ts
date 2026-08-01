export const COLS = 8;
export const ROWS = 8;
export const TEX = 120;
export const TRAY_SCALE = 0.52;

export const REVIVE_FREE = 1;
export const HAMMER_START = 2;
export const DANGER_FILL = 0.8;
export const HINT_IDLE = 8000;
export const PRAISE = ["Nice!", "Good!", "Great!", "Excellent!", "Amazing!", "Unbelievable!"];

export const PALETTE = {
  green: { face: 0x35c36f },
  yellow: { face: 0xf0c842 },
  orange: { face: 0xff8a38 },
  red: { face: 0xe84b5f },
  purple: { face: 0x965ee8 },
  blue: { face: 0x2d69d8 },
  teal: { face: 0x22bec6 },
} as const;

export type ColorKey = keyof typeof PALETTE;
export const COLOR_KEYS = Object.keys(PALETTE) as ColorKey[];

const SHAPES = [
  [[0, 0]],
  [[0, 0], [1, 0]],
  [[0, 0], [1, 0], [2, 0]],
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
  [[0, 0], [0, 1]],
  [[0, 0], [0, 1], [0, 2]],
  [[0, 0], [0, 1], [0, 2], [0, 3]],
  [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]],
  [[0, 0], [0, 1], [1, 1]],
  [[1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [1, 1]],
  [[0, 0], [1, 0], [0, 1]],
  [[0, 0], [0, 1], [0, 2], [1, 2]],
  [[1, 0], [1, 1], [1, 2], [0, 2]],
  [[0, 0], [1, 0], [2, 0], [0, 1]],
  [[0, 0], [1, 0], [2, 0], [2, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[1, 0], [0, 1], [1, 1], [2, 1]],
  [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
] as const;

export interface PieceDef {
  cells: Array<[number, number]>;
  cols: number;
  rows: number;
  n: number;
  tier: number;
}

export const PIECES: PieceDef[] = SHAPES.map((raw) => {
  const minx = Math.min(...raw.map((cell) => cell[0]));
  const miny = Math.min(...raw.map((cell) => cell[1]));
  const cells = raw.map((cell) => [cell[0] - minx, cell[1] - miny] as [number, number]);
  const cols = Math.max(...cells.map((cell) => cell[0])) + 1;
  const rows = Math.max(...cells.map((cell) => cell[1])) + 1;
  const n = cells.length;
  return { cells, cols, rows, n, tier: n <= 3 ? 0 : n >= 5 ? 2 : 1 };
});

export const PIECES_BY_TIER = [0, 1, 2].map((tier) => PIECES.filter((piece) => piece.tier === tier));
export const PIECES_BY_SIZE = [...PIECES].sort((a, b) => a.n - b.n);

export function computeDesign(): { dw: number; dh: number } {
  const winW = Math.max(320, window.innerWidth);
  const winH = Math.max(380, window.innerHeight);
  const aspect = winW / winH;
  if (aspect < 1) {
    const dh = 1280;
    return { dw: Math.max(480, Math.round(dh * aspect)), dh };
  }
  const dw = 1280;
  return { dw, dh: Math.max(560, Math.round(dw / aspect)) };
}
