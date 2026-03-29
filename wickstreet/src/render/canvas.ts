import {
  DEPOT_CELL,
  GRID_HEIGHT,
  GRID_WIDTH,
  HOUSES,
  ROAD_COLUMNS,
  ROAD_ROWS,
  cellCenter,
  type Cell,
  type HouseDefinition,
  type SigilKind,
  type Vec2,
} from '../game/config';
import type { GameState } from '../game/logic';

export interface RenderMetrics {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private metrics: RenderMetrics;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('wickstreet_canvas_context_missing');
    }
    this.canvas = canvas;
    this.context = context;
    this.metrics = {
      width: 1,
      height: 1,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    };
  }

  resize(width: number, height: number, devicePixelRatio: number): void {
    const dpr = Math.max(1, devicePixelRatio);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = Math.min(width / (GRID_WIDTH + 0.6), height / (GRID_HEIGHT + 0.6));
    this.metrics = {
      width,
      height,
      scale,
      offsetX: (width - GRID_WIDTH * scale) / 2,
      offsetY: (height - GRID_HEIGHT * scale) / 2,
    };
  }

  getPlayerScreenPosition(position: Vec2): Vec2 {
    return worldToScreen(position, this.metrics);
  }

  getMetricsSnapshot(): RenderMetrics {
    return { ...this.metrics };
  }

  render(state: GameState): void {
    const ctx = this.context;
    const { width, height } = this.metrics;
    ctx.clearRect(0, 0, width, height);

    const background = ctx.createLinearGradient(0, 0, 0, height);
    background.addColorStop(0, '#13223b');
    background.addColorStop(1, '#08101f');
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);

    drawBlocks(ctx, this.metrics);
    drawRoads(ctx, this.metrics);
    drawBarrierTiles(ctx, this.metrics, state.barriers);
    drawHouses(ctx, this.metrics, state);
    drawDepot(ctx, this.metrics, state);
    drawGuidePath(ctx, this.metrics, state.guidePath);
    drawCourier(ctx, this.metrics, state);
    drawRain(ctx, width, height, state.elapsed);
    if (state.effects.miss > 0) {
      ctx.fillStyle = `rgba(255, 96, 74, ${state.effects.miss * 0.16})`;
      ctx.fillRect(0, 0, width, height);
    }
  }
}

function drawBlocks(ctx: CanvasRenderingContext2D, metrics: RenderMetrics): void {
  const boxes = [
    { x: 0.4, y: 0.3, w: 2.0, h: 2.0 },
    { x: 4.1, y: 0.3, w: 2.2, h: 2.0 },
    { x: 8.2, y: 0.3, w: 2.0, h: 2.0 },
    { x: 12.0, y: 0.3, w: 2.4, h: 2.0 },
    { x: 0.5, y: 3.2, w: 1.8, h: 2.0 },
    { x: 4.3, y: 3.1, w: 2.0, h: 2.2 },
    { x: 8.1, y: 3.1, w: 2.2, h: 2.2 },
    { x: 12.1, y: 3.1, w: 2.0, h: 2.0 },
    { x: 0.5, y: 8.4, w: 2.2, h: 2.1 },
    { x: 4.2, y: 8.3, w: 2.1, h: 2.2 },
    { x: 8.2, y: 8.3, w: 2.1, h: 2.2 },
    { x: 12.2, y: 8.2, w: 2.2, h: 2.3 },
  ];
  const colors = ['#314b6b', '#2d415d', '#334e70', '#273a55'];
  boxes.forEach((box, index) => {
    const rect = toRect(box, metrics);
    fillRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18, colors[index % colors.length] ?? colors[0]!);
  });
}

function drawRoads(ctx: CanvasRenderingContext2D, metrics: RenderMetrics): void {
  ctx.fillStyle = '#2c3642';
  ROAD_ROWS.forEach(row => {
    const rect = toRect({ x: 0.1, y: row + 0.1, w: GRID_WIDTH - 0.2, h: 0.8 }, metrics);
    fillRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 16, '#2c3642');
  });
  ROAD_COLUMNS.forEach(column => {
    const rect = toRect({ x: column + 0.1, y: 0.1, w: 0.8, h: GRID_HEIGHT - 0.2 }, metrics);
    fillRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 16, '#2c3642');
  });

  ctx.strokeStyle = '#50657c';
  ctx.lineWidth = Math.max(1.5, metrics.scale * 0.025);
  ctx.setLineDash([metrics.scale * 0.18, metrics.scale * 0.18]);
  ROAD_ROWS.forEach(row => {
    const y = worldToScreen({ x: 0, y: row + 0.5 }, metrics).y;
    ctx.beginPath();
    ctx.moveTo(metrics.offsetX + metrics.scale * 0.25, y);
    ctx.lineTo(metrics.offsetX + metrics.scale * (GRID_WIDTH - 0.25), y);
    ctx.stroke();
  });
  ROAD_COLUMNS.forEach(column => {
    const x = worldToScreen({ x: column + 0.5, y: 0 }, metrics).x;
    ctx.beginPath();
    ctx.moveTo(x, metrics.offsetY + metrics.scale * 0.25);
    ctx.lineTo(x, metrics.offsetY + metrics.scale * (GRID_HEIGHT - 0.25));
    ctx.stroke();
  });
  ctx.setLineDash([]);
}

function drawBarrierTiles(ctx: CanvasRenderingContext2D, metrics: RenderMetrics, barriers: Set<string>): void {
  barriers.forEach(key => {
    const cell = parseCell(key);
    const rect = toRect({ x: cell.x + 0.16, y: cell.y + 0.22, w: 0.68, h: 0.46 }, metrics);
    fillRoundRect(ctx, rect.x, rect.y, rect.w, rect.h, 10, '#d86d46');
    ctx.strokeStyle = '#ffe9c4';
    ctx.lineWidth = Math.max(1.5, metrics.scale * 0.02);
    ctx.beginPath();
    ctx.moveTo(rect.x + rect.w * 0.28, rect.y + rect.h * 0.28);
    ctx.lineTo(rect.x + rect.w * 0.72, rect.y + rect.h * 0.72);
    ctx.moveTo(rect.x + rect.w * 0.28, rect.y + rect.h * 0.72);
    ctx.lineTo(rect.x + rect.w * 0.72, rect.y + rect.h * 0.28);
    ctx.stroke();
  });
}

function drawHouses(ctx: CanvasRenderingContext2D, metrics: RenderMetrics, state: GameState): void {
  HOUSES.forEach((house, index) => {
    const body = toRect(house.body, metrics);
    if (state.activeRequest === index) {
      glowRect(ctx, body.x, body.y, body.w, body.h, 24, withAlpha(house.color, 0.38));
    }
    fillRoundRect(ctx, body.x, body.y, body.w, body.h, 18, '#1c2d44');
    ctx.strokeStyle = state.activeRequest === index ? house.color : '#3f5877';
    ctx.lineWidth = Math.max(2, metrics.scale * 0.03);
    strokeRoundRect(ctx, body.x, body.y, body.w, body.h, 18);
    drawWindows(ctx, body, state.activeRequest === index ? house.accent : '#7f90a8');
    const anchor = worldToScreen({ x: house.doorstep.x + 0.5, y: house.doorstep.y + (index < 2 ? 0.08 : 0.92) }, metrics);
    drawSigil(ctx, house.sigil, anchor.x, anchor.y, metrics.scale * 0.18, house.color);
    if (state.effects.houseGlow > 0 && state.activeRequest === index) {
      const pulse = withAlpha(house.accent, state.effects.houseGlow * 0.2);
      ctx.fillStyle = pulse;
      ctx.beginPath();
      ctx.arc(anchor.x, anchor.y, metrics.scale * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawWindows(ctx: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }, color: string): void {
  const offsets = [
    { x: 0.28, y: 0.28 },
    { x: 0.56, y: 0.28 },
    { x: 0.28, y: 0.56 },
    { x: 0.56, y: 0.56 },
  ];
  offsets.forEach(offset => {
    const x = rect.x + rect.w * offset.x - rect.w * 0.06;
    const y = rect.y + rect.h * offset.y - rect.h * 0.06;
    fillRoundRect(ctx, x, y, rect.w * 0.12, rect.h * 0.12, 6, color);
  });
}

function drawDepot(ctx: CanvasRenderingContext2D, metrics: RenderMetrics, state: GameState): void {
  const center = worldToScreen(cellCenter(DEPOT_CELL), metrics);
  glowCircle(ctx, center.x, center.y, metrics.scale * 0.44, '#ffd879', 0.18 + state.effects.pickup * 0.4);
  fillRoundRect(ctx, center.x - metrics.scale * 0.38, center.y - metrics.scale * 0.28, metrics.scale * 0.76, metrics.scale * 0.56, 18, '#27476a');
  ctx.strokeStyle = '#ffd879';
  ctx.lineWidth = Math.max(2, metrics.scale * 0.025);
  strokeRoundRect(ctx, center.x - metrics.scale * 0.38, center.y - metrics.scale * 0.28, metrics.scale * 0.76, metrics.scale * 0.56, 18);
  ctx.fillStyle = '#fff0b4';
  ctx.font = `700 ${Math.max(12, metrics.scale * 0.18)}px ui-sans-serif, system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DEPOT', center.x, center.y);
}

function drawGuidePath(ctx: CanvasRenderingContext2D, metrics: RenderMetrics, path: Cell[]): void {
  if (path.length < 2) {
    return;
  }
  const screenPoints = path.map(cell => worldToScreen(cellCenter(cell), metrics));
  ctx.lineWidth = Math.max(3, metrics.scale * 0.045);
  ctx.strokeStyle = 'rgba(216, 254, 255, 0.85)';
  ctx.shadowBlur = metrics.scale * 0.18;
  ctx.shadowColor = 'rgba(106, 242, 255, 0.45)';
  ctx.beginPath();
  ctx.moveTo(screenPoints[0]!.x, screenPoints[0]!.y);
  for (let index = 1; index < screenPoints.length; index += 1) {
    ctx.lineTo(screenPoints[index]!.x, screenPoints[index]!.y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawCourier(ctx: CanvasRenderingContext2D, metrics: RenderMetrics, state: GameState): void {
  const position = worldToScreen(state.player.position, metrics);
  const bob = Math.sin(state.player.movePulse) * metrics.scale * 0.015;
  const carryingHouse = state.carrying === null ? null : HOUSES[state.carrying] ?? null;
  const glowColor = carryingHouse ? carryingHouse.color : '#f1cb56';
  const satchelColor = carryingHouse ? carryingHouse.color : '#ffe3a8';
  glowCircle(ctx, position.x, position.y, metrics.scale * 0.3, glowColor, 0.42 + state.effects.delivery * 0.25);
  ctx.fillStyle = '#f1cb56';
  ctx.beginPath();
  ctx.arc(position.x, position.y + bob, metrics.scale * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#faf3da';
  fillRoundRect(ctx, position.x - metrics.scale * 0.1, position.y - metrics.scale * 0.05 + bob, metrics.scale * 0.22, metrics.scale * 0.18, 10, '#faf3da');
  fillRoundRect(ctx, position.x + metrics.scale * 0.02, position.y - metrics.scale * 0.14 + bob, metrics.scale * 0.16, metrics.scale * 0.16, 8, satchelColor);
}

function drawRain(ctx: CanvasRenderingContext2D, width: number, height: number, elapsed: number): void {
  ctx.strokeStyle = 'rgba(220, 232, 255, 0.12)';
  ctx.lineWidth = 1;
  for (let index = 0; index < 70; index += 1) {
    const x = ((index * 73 + elapsed * 95) % (width + 50)) - 25;
    const y = ((index * 47 + elapsed * 180) % (height + 50)) - 25;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 6, y + 16);
    ctx.stroke();
  }
}

function drawSigil(ctx: CanvasRenderingContext2D, sigil: SigilKind, x: number, y: number, size: number, color: string): void {
  ctx.save();
  ctx.fillStyle = color;
  if (sigil === 'SUN') {
    ctx.beginPath();
    ctx.arc(x, y, size * 0.44, 0, Math.PI * 2);
    ctx.fill();
  } else if (sigil === 'DROP') {
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.6);
    ctx.lineTo(x + size * 0.34, y - size * 0.08);
    ctx.lineTo(x + size * 0.16, y + size * 0.46);
    ctx.lineTo(x - size * 0.16, y + size * 0.46);
    ctx.lineTo(x - size * 0.34, y - size * 0.08);
    ctx.closePath();
    ctx.fill();
  } else if (sigil === 'LEAF') {
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.5, size * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#16301f';
    ctx.lineWidth = Math.max(1, size * 0.12);
    ctx.beginPath();
    ctx.moveTo(x - size * 0.24, y + size * 0.14);
    ctx.lineTo(x + size * 0.2, y - size * 0.14);
    ctx.stroke();
  } else {
    ctx.beginPath();
    for (let index = 0; index < 10; index += 1) {
      const angle = -Math.PI / 2 + index * (Math.PI / 5);
      const radius = size * (index % 2 === 0 ? 0.5 : 0.22);
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (index === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function worldToScreen(point: Vec2, metrics: RenderMetrics): Vec2 {
  return {
    x: metrics.offsetX + point.x * metrics.scale,
    y: metrics.offsetY + point.y * metrics.scale,
  };
}

function toRect(rect: { x: number; y: number; w: number; h: number }, metrics: RenderMetrics) {
  return {
    x: metrics.offsetX + rect.x * metrics.scale,
    y: metrics.offsetY + rect.y * metrics.scale,
    w: rect.w * metrics.scale,
    h: rect.h * metrics.scale,
  };
}

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.fill();
}

function strokeRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.stroke();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function glowRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, blur: number, color: string): void {
  ctx.save();
  ctx.shadowBlur = blur;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width, height);
  ctx.restore();
}

function glowCircle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number): void {
  ctx.save();
  ctx.shadowBlur = radius * 0.9;
  ctx.shadowColor = withAlpha(color, alpha);
  ctx.fillStyle = withAlpha(color, alpha);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function withAlpha(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  const channel = (index: number) => parseInt(cleaned.slice(index, index + 2), 16);
  return `rgba(${channel(0)}, ${channel(2)}, ${channel(4)}, ${Math.max(0, Math.min(1, alpha))})`;
}

function parseCell(key: string): Cell {
  const [x, y] = key.split(',');
  return { x: Number(x), y: Number(y) };
}
