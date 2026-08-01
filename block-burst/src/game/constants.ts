export const COLS = 8;
export const ROWS = 8;
export const TEX = 256;
export const TRAY_SCALE = 0.72;

export const REVIVES_PER_GAME = 1;
export const HAMMER_START = 2;
export const DANGER_FILL = 0.8;
export const HINT_IDLE = 8000;
export const PALETTE = {
  green: { face: 0x2dbc5e, top: 0x4ede7b, left: 0x3acf66, right: 0x249646, bottom: 0x1a7434 },
  yellow: { face: 0xf1bf34, top: 0xfce557, left: 0xfdd73f, right: 0xc59926, bottom: 0x9a7219 },
  orange: { face: 0xfc812d, top: 0xfca445, left: 0xfb9638, right: 0xc46421, bottom: 0x9c4a0e },
  red: { face: 0xe84652, top: 0xfb6571, left: 0xfa5664, right: 0xb8373d, bottom: 0x912329 },
  purple: { face: 0x9c52ee, top: 0xbd79fa, left: 0xa963f6, right: 0x743fac, bottom: 0x5b2e87 },
  blue: { face: 0x2363d4, top: 0x3e80f9, left: 0x2e72ee, right: 0x1c4ba0, bottom: 0x143879 },
  teal: { face: 0x19b8bb, top: 0x34dfe1, left: 0x24cfce, right: 0x189391, bottom: 0x19746f },
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
  const renderScale = Math.min(window.devicePixelRatio || 1, 2);
  if (aspect < 1) {
    const dh = Math.round(1280 * renderScale);
    return { dw: Math.max(Math.round(480 * renderScale), Math.round(dh * aspect)), dh };
  }
  const dw = Math.round(1280 * renderScale);
  return { dw, dh: Math.max(Math.round(560 * renderScale), Math.round(dw / aspect)) };
}
