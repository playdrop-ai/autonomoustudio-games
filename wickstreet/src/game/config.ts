export interface Vec2 {
  x: number;
  y: number;
}

export interface Cell {
  x: number;
  y: number;
}

export type SigilKind = 'SUN' | 'DROP' | 'LEAF' | 'STAR';

export interface HouseDefinition {
  id: number;
  label: string;
  sigil: SigilKind;
  color: string;
  accent: string;
  doorstep: Cell;
  body: { x: number; y: number; w: number; h: number };
}

export const GRID_WIDTH = 15;
export const GRID_HEIGHT = 11;
export const PLAYER_RADIUS = 0.24;
export const PLAYER_SPEED = 4.2;
export const DELIVERIES_PER_PHASE = 4;
export const MAX_STRIKES = 3;
export const INITIAL_TIMER_SECONDS = 10;
export const MIN_TIMER_SECONDS = 6.2;
export const STORAGE_KEY = 'wickstreet-progress-v1';

export const ROAD_COLUMNS = [3, 7, 11] as const;
export const ROAD_ROWS = [2, 5, 8] as const;

export const DEPOT_CELL: Cell = { x: 7, y: 5 };
export const PLAYER_SPAWN: Vec2 = { x: 7.5, y: 6.5 };

export const HOUSES: HouseDefinition[] = [
  {
    id: 0,
    label: 'SUN',
    sigil: 'SUN',
    color: '#f0a53d',
    accent: '#ffe8b5',
    doorstep: { x: 3, y: 1 },
    body: { x: 1.0, y: 0.35, w: 2.2, h: 1.65 },
  },
  {
    id: 1,
    label: 'DROP',
    sigil: 'DROP',
    color: '#43d3df',
    accent: '#d9ffff',
    doorstep: { x: 11, y: 1 },
    body: { x: 10.0, y: 0.35, w: 2.2, h: 1.65 },
  },
  {
    id: 2,
    label: 'LEAF',
    sigil: 'LEAF',
    color: '#72d97c',
    accent: '#defadc',
    doorstep: { x: 3, y: 9 },
    body: { x: 1.0, y: 8.0, w: 2.2, h: 1.65 },
  },
  {
    id: 3,
    label: 'STAR',
    sigil: 'STAR',
    color: '#f073c2',
    accent: '#ffe3f5',
    doorstep: { x: 11, y: 9 },
    body: { x: 10.0, y: 8.0, w: 2.2, h: 1.65 },
  },
];

export function isRoadCell(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= GRID_WIDTH || y >= GRID_HEIGHT) {
    return false;
  }
  return ROAD_COLUMNS.includes(x as (typeof ROAD_COLUMNS)[number]) || ROAD_ROWS.includes(y as (typeof ROAD_ROWS)[number]);
}

export function cellKey(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}

export function keyToCell(key: string): Cell {
  const [xRaw, yRaw] = key.split(',');
  return {
    x: Number(xRaw),
    y: Number(yRaw),
  };
}

export function cellCenter(cell: Cell): Vec2 {
  return { x: cell.x + 0.5, y: cell.y + 0.5 };
}

export const RESERVED_KEYS = new Set<string>([
  cellKey(DEPOT_CELL),
  ...HOUSES.map(house => cellKey(house.doorstep)),
]);

export const BARRIER_CANDIDATES: Cell[] = buildBarrierCandidates();

function buildBarrierCandidates(): Cell[] {
  const candidates: Cell[] = [];
  for (let y = 0; y < GRID_HEIGHT; y += 1) {
    for (let x = 0; x < GRID_WIDTH; x += 1) {
      if (!isRoadCell(x, y)) {
        continue;
      }
      const key = cellKey({ x, y });
      if (RESERVED_KEYS.has(key)) {
        continue;
      }
      const isIntersection = ROAD_COLUMNS.includes(x as (typeof ROAD_COLUMNS)[number]) && ROAD_ROWS.includes(y as (typeof ROAD_ROWS)[number]);
      if (isIntersection) {
        continue;
      }
      const closeToDepot = Math.abs(x - DEPOT_CELL.x) + Math.abs(y - DEPOT_CELL.y) <= 1;
      const closeToHouse = HOUSES.some(house => Math.abs(x - house.doorstep.x) + Math.abs(y - house.doorstep.y) <= 1);
      if (closeToDepot || closeToHouse) {
        continue;
      }
      candidates.push({ x, y });
    }
  }
  return candidates;
}
