import { TILE_SIZE } from "./config";
import type { GridCell, PadDefinition, Vec2 } from "./types";

export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 10;
export const WORLD_WIDTH = GRID_WIDTH * TILE_SIZE;
export const WORLD_HEIGHT = GRID_HEIGHT * TILE_SIZE;

function cellsInRect(origin: GridCell, width: number, height: number): GridCell[] {
  const cells: GridCell[] = [];

  for (let y = origin.y; y < origin.y + height; y += 1) {
    for (let x = origin.x; x < origin.x + width; x += 1) {
      cells.push({ x, y });
    }
  }

  return cells;
}

const PATH_WAYPOINTS: Vec2[] = [
  { x: 0, y: TILE_SIZE * 7 },
  { x: TILE_SIZE * 7, y: TILE_SIZE * 7 },
  { x: TILE_SIZE * 7, y: TILE_SIZE * 3 },
  { x: TILE_SIZE * 13, y: TILE_SIZE * 3 },
  { x: TILE_SIZE * 13, y: TILE_SIZE * 8 },
  { x: TILE_SIZE * 19, y: TILE_SIZE * 8 },
  { x: TILE_SIZE * 19, y: TILE_SIZE * 5 },
  { x: WORLD_WIDTH, y: TILE_SIZE * 5 },
];

export const PADS: PadDefinition[] = [
  { id: "p1", cell: { x: 2, y: 4 } },
  { id: "p2", cell: { x: 9, y: 4 } },
  { id: "p3", cell: { x: 15, y: 6 } },
  { id: "p4", cell: { x: 14, y: 2 } },
];

export const DECORATIONS: Array<{ cell: GridCell; tileNumber: number; scale: number }> = [
  { cell: { x: 0, y: 0 }, tileNumber: 132, scale: 0.84 },
  { cell: { x: 3, y: 1 }, tileNumber: 135, scale: 0.76 },
  { cell: { x: 3, y: 9 }, tileNumber: 137, scale: 0.78 },
  { cell: { x: 8, y: 0 }, tileNumber: 133, scale: 0.78 },
  { cell: { x: 9, y: 9 }, tileNumber: 136, scale: 0.74 },
  { cell: { x: 10, y: 5 }, tileNumber: 132, scale: 0.72 },
  { cell: { x: 14, y: 0 }, tileNumber: 138, scale: 0.76 },
  { cell: { x: 18, y: 1 }, tileNumber: 131, scale: 0.72 },
  { cell: { x: 19, y: 9 }, tileNumber: 136, scale: 0.68 },
];

export function cellKey(cell: GridCell): string {
  return `${cell.x},${cell.y}`;
}

const PATH_CELL_KEYS = new Set(
  [
    ...cellsInRect({ x: 0, y: 6 }, 8, 2),
    ...cellsInRect({ x: 6, y: 2 }, 2, 6),
    ...cellsInRect({ x: 6, y: 2 }, 8, 2),
    ...cellsInRect({ x: 12, y: 2 }, 2, 7),
    ...cellsInRect({ x: 12, y: 7 }, 8, 2),
    ...cellsInRect({ x: 18, y: 4 }, 2, 5),
  ].map(cellKey),
);

export const PATH_CELLS: GridCell[] = Array.from(PATH_CELL_KEYS, (key) => {
  const parts = key.split(",");
  const x = Number(parts[0]);
  const y = Number(parts[1]);
  return { x, y };
});

export const PATH_LOOKUP = new Set(PATH_CELLS.map(cellKey));

export const PATH_OUTFLOWS = [
  {
    direction: "west" as const,
    cells: [
      { x: 0, y: 6 },
      { x: 0, y: 7 },
    ],
  },
  {
    direction: "east" as const,
    cells: [
      { x: GRID_WIDTH - 1, y: 4 },
      { x: GRID_WIDTH - 1, y: 5 },
    ],
  },
];

if (PATH_CELLS.length === 0) {
  throw new Error("[pocket-bastion] Level path is incomplete");
}

export const SPAWN_CELL: GridCell = { x: 0, y: 6 };
export const BASE_CELL: GridCell = { x: GRID_WIDTH - 1, y: 4 };

export function cellToWorld(cell: GridCell): Vec2 {
  return {
    x: cell.x * TILE_SIZE + TILE_SIZE / 2,
    y: cell.y * TILE_SIZE + TILE_SIZE / 2,
  };
}

function requirePoint(point: Vec2 | undefined, label: string): Vec2 {
  if (!point) {
    throw new Error(`[pocket-bastion] Missing path point: ${label}`);
  }
  return point;
}

const FIRST_PATH_POINT = requirePoint(PATH_WAYPOINTS[0], "first");
const LAST_PATH_POINT = requirePoint(PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1], "last");

const SEGMENTS = PATH_WAYPOINTS.slice(0, -1).map((point, index) => {
  const next = PATH_WAYPOINTS[index + 1];
  if (!next) {
    throw new Error("[pocket-bastion] Missing path segment endpoint");
  }

  const dx = next.x - point.x;
  const dy = next.y - point.y;
  const length = Math.hypot(dx, dy);

  return {
    from: point,
    to: next,
    dx,
    dy,
    length,
  };
});

const CUMULATIVE_LENGTHS: number[] = [0];

for (const segment of SEGMENTS) {
  const previous = CUMULATIVE_LENGTHS[CUMULATIVE_LENGTHS.length - 1];
  if (previous === undefined) {
    throw new Error("[pocket-bastion] Missing cumulative path length");
  }
  CUMULATIVE_LENGTHS.push(previous + segment.length);
}

export const PATH_TOTAL_LENGTH = CUMULATIVE_LENGTHS[CUMULATIVE_LENGTHS.length - 1] ?? 0;

export function pointAtDistance(distance: number): Vec2 {
  if (distance <= 0) {
    return FIRST_PATH_POINT;
  }

  if (distance >= PATH_TOTAL_LENGTH) {
    return LAST_PATH_POINT;
  }

  for (let index = 0; index < SEGMENTS.length; index += 1) {
    const segment = SEGMENTS[index];
    const start = CUMULATIVE_LENGTHS[index];
    const end = CUMULATIVE_LENGTHS[index + 1];

    if (segment && start !== undefined && end !== undefined && distance <= end) {
      const local = distance - start;
      const ratio = segment.length === 0 ? 0 : local / segment.length;
      return {
        x: segment.from.x + segment.dx * ratio,
        y: segment.from.y + segment.dy * ratio,
      };
    }
  }

  return LAST_PATH_POINT;
}

export function rotationAtDistance(distance: number): number {
  const current = pointAtDistance(distance);
  const future = pointAtDistance(Math.min(distance + 4, PATH_TOTAL_LENGTH));
  return Math.atan2(future.y - current.y, future.x - current.x);
}
