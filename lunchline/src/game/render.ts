import { COLS, INGREDIENTS, ROWS, ingredientDefinition } from "./data";
import type { CellCoord, GameState, IngredientKey, Tile } from "./types";

type Layout = {
  width: number;
  height: number;
  dpr: number;
  boardX: number;
  boardY: number;
  boardWidth: number;
  boardHeight: number;
  cellSize: number;
  gap: number;
};

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private layout: Layout = {
    width: 1,
    height: 1,
    dpr: 1,
    boardX: 0,
    boardY: 0,
    boardWidth: 1,
    boardHeight: 1,
    cellSize: 1,
    gap: 1,
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("[lunchline] Could not create 2D canvas context");
    this.ctx = ctx;
  }

  resize(width: number, height: number, dpr: number): void {
    const nextDpr = Math.max(1, dpr);
    this.canvas.width = Math.max(1, Math.round(width * nextDpr));
    this.canvas.height = Math.max(1, Math.round(height * nextDpr));
    this.canvas.style.width = `${Math.round(width)}px`;
    this.canvas.style.height = `${Math.round(height)}px`;

    const gap = Math.max(6, Math.round(Math.min(width, height) * 0.011));
    const cellSize = Math.floor(
      Math.min(
        (width - gap * (COLS - 1) - 24) / COLS,
        (height - gap * (ROWS - 1) - 24) / ROWS,
      ),
    );
    const boardWidth = cellSize * COLS + gap * (COLS - 1);
    const boardHeight = cellSize * ROWS + gap * (ROWS - 1);

    this.layout = {
      width,
      height,
      dpr: nextDpr,
      boardX: Math.floor((width - boardWidth) / 2),
      boardY: Math.floor((height - boardHeight) / 2),
      boardWidth,
      boardHeight,
      cellSize,
      gap,
    };
  }

  getLayout(): Layout {
    return this.layout;
  }

  pickCell(clientX: number, clientY: number): CellCoord | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const localX = x - this.layout.boardX;
    const localY = y - this.layout.boardY;
    if (localX < 0 || localY < 0 || localX > this.layout.boardWidth || localY > this.layout.boardHeight) return null;

    const stride = this.layout.cellSize + this.layout.gap;
    const col = Math.floor(localX / stride);
    const row = Math.floor(localY / stride);
    const offsetX = localX - col * stride;
    const offsetY = localY - row * stride;
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return null;
    if (offsetX > this.layout.cellSize || offsetY > this.layout.cellSize) return null;
    return { col, row };
  }

  render(state: GameState): void {
    const { ctx } = this;
    const { width, height, dpr } = this.layout;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const boardGradient = ctx.createLinearGradient(0, 0, 0, height);
    boardGradient.addColorStop(0, "rgba(255, 255, 255, 0.16)");
    boardGradient.addColorStop(1, "rgba(86, 46, 27, 0.04)");
    ctx.fillStyle = boardGradient;
    roundRect(ctx, this.layout.boardX - 12, this.layout.boardY - 12, this.layout.boardWidth + 24, this.layout.boardHeight + 24, 28);
    ctx.fill();

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        const x = this.layout.boardX + col * (this.layout.cellSize + this.layout.gap);
        const y = this.layout.boardY + row * (this.layout.cellSize + this.layout.gap);
        ctx.fillStyle = "rgba(142, 94, 62, 0.07)";
        roundRect(ctx, x, y, this.layout.cellSize, this.layout.cellSize, 16);
        ctx.fill();
        ctx.strokeStyle = "rgba(255, 255, 255, 0.32)";
        ctx.lineWidth = 1;
        roundRect(ctx, x + 0.5, y + 0.5, this.layout.cellSize - 1, this.layout.cellSize - 1, 16);
        ctx.stroke();
      }
    }

    for (let col = 0; col < state.columns.length; col += 1) {
      const column = state.columns[col];
      if (!column) continue;
      for (const tile of column) {
        this.drawTile(col, tile);
      }
    }
  }

  private drawTile(col: number, tile: Tile): void {
    const { ctx } = this;
    const definition = ingredientDefinition(tile.ingredient);
    const stride = this.layout.cellSize + this.layout.gap;
    const x = this.layout.boardX + col * stride;
    const y = this.layout.boardY + tile.displayRow * stride;
    const inset = 7;
    const size = this.layout.cellSize - inset * 2;
    const centerX = x + this.layout.cellSize / 2;
    const centerY = y + this.layout.cellSize / 2;
    const scale = 1 + tile.highlight * 0.06 - tile.clear01 * 0.28;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.globalAlpha = Math.max(0, tile.opacity);

    if (tile.highlight > 0.04) {
      ctx.save();
      ctx.fillStyle = definition.glow;
      ctx.shadowBlur = 16;
      ctx.shadowColor = definition.glow;
      roundRect(ctx, -size / 2 - 5, -size / 2 - 5, size + 10, size + 10, 22);
      ctx.fill();
      ctx.restore();
    }

    const gradient = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
    gradient.addColorStop(0, definition.accent);
    gradient.addColorStop(1, definition.color);
    ctx.fillStyle = gradient;
    roundRect(ctx, -size / 2, -size / 2, size, size, 20);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
    ctx.lineWidth = 2;
    roundRect(ctx, -size / 2 + 1, -size / 2 + 1, size - 2, size - 2, 19);
    ctx.stroke();

    drawIngredientGlyph(ctx, tile.ingredient, size);

    if (tile.clear01 > 0.01) {
      ctx.save();
      ctx.globalAlpha = 0.5 * (1 - tile.clear01);
      ctx.strokeStyle = definition.accent;
      ctx.lineWidth = 4;
      roundRect(ctx, -size / 2 - 4 * tile.clear01, -size / 2 - 4 * tile.clear01, size + 8 * tile.clear01, size + 8 * tile.clear01, 20);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }
}

function drawIngredientGlyph(ctx: CanvasRenderingContext2D, ingredient: IngredientKey, size: number): void {
  switch (ingredient) {
    case "salmon":
      drawSalmon(ctx, size);
      return;
    case "avocado":
      drawAvocado(ctx, size);
      return;
    case "egg":
      drawEgg(ctx, size);
      return;
    case "cucumber":
      drawCucumber(ctx, size);
      return;
  }
}

function drawSalmon(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.beginPath();
  ctx.roundRect(-size * 0.26, -size * 0.2, size * 0.52, size * 0.16, 999);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(-size * 0.26, size * 0.02, size * 0.52, size * 0.16, 999);
  ctx.fill();
  ctx.globalAlpha = 0.36;
  ctx.beginPath();
  ctx.roundRect(-size * 0.22, -size * 0.36, size * 0.44, size * 0.12, 999);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawAvocado(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = "rgba(224, 248, 203, 0.88)";
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.28);
  ctx.bezierCurveTo(size * 0.22, -size * 0.28, size * 0.28, -size * 0.04, size * 0.22, size * 0.18);
  ctx.bezierCurveTo(size * 0.16, size * 0.34, size * 0.04, size * 0.38, 0, size * 0.34);
  ctx.bezierCurveTo(-size * 0.04, size * 0.38, -size * 0.16, size * 0.34, -size * 0.22, size * 0.18);
  ctx.bezierCurveTo(-size * 0.28, -size * 0.04, -size * 0.22, -size * 0.28, 0, -size * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(117, 80, 46, 0.88)";
  ctx.beginPath();
  ctx.arc(0, size * 0.06, size * 0.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawEgg(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.beginPath();
  ctx.roundRect(-size * 0.28, -size * 0.24, size * 0.56, size * 0.48, 16);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 221, 118, 0.94)";
  ctx.beginPath();
  ctx.roundRect(-size * 0.2, -size * 0.12, size * 0.4, size * 0.24, 14);
  ctx.fill();
}

function drawCucumber(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.strokeStyle = "rgba(220, 253, 242, 0.92)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, size * 0.1, 0, Math.PI * 2);
  ctx.stroke();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}
