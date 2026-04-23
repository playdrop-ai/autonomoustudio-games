import { getCell } from "./generator";
import type { GameState, LayoutMetrics } from "./types";

const OUTER_PADDING = 22;
const PANEL_PADDING = 18;
const HUD_RESERVE = 90;
const FLAG_RESERVE = 96;

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;

  private readonly context: CanvasRenderingContext2D;

  private metrics: LayoutMetrics = {
    viewportWidth: 0,
    viewportHeight: 0,
    dpr: 1,
    stageX: 0,
    stageY: 0,
    stageWidth: 0,
    stageHeight: 0,
    boardX: 0,
    boardY: 0,
    boardWidth: 0,
    boardHeight: 0,
    cellSize: 0,
    gap: 0,
  };

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("relayline_canvas_context_missing");
    }
    this.canvas = canvas;
    this.context = context;
  }

  resize(viewportWidth: number, viewportHeight: number, dpr: number, state: GameState): void {
    const nextDpr = Math.max(1, dpr);
    this.canvas.width = Math.round(viewportWidth * nextDpr);
    this.canvas.height = Math.round(viewportHeight * nextDpr);
    this.canvas.style.width = `${viewportWidth}px`;
    this.canvas.style.height = `${viewportHeight}px`;
    this.context.setTransform(nextDpr, 0, 0, nextDpr, 0, 0);
    this.metrics = computeLayout(viewportWidth, viewportHeight, nextDpr, state.width, state.height);
  }

  getLayout(): LayoutMetrics {
    return this.metrics;
  }

  pickCell(clientX: number, clientY: number, state: GameState): { col: number; row: number } | null {
    const { boardX, boardY, boardWidth, boardHeight, cellSize, gap } = this.metrics;
    if (clientX < boardX || clientY < boardY || clientX > boardX + boardWidth || clientY > boardY + boardHeight) {
      return null;
    }

    const x = clientX - boardX;
    const y = clientY - boardY;
    const col = Math.floor(x / (cellSize + gap));
    const row = Math.floor(y / (cellSize + gap));
    if (col < 0 || col >= state.width || row < 0 || row >= state.height) {
      return null;
    }
    return { col, row };
  }

  render(state: GameState): void {
    const ctx = this.context;
    const { viewportWidth, viewportHeight, stageX, stageY, stageWidth, stageHeight, boardX, boardY, cellSize, gap } =
      this.metrics;

    ctx.clearRect(0, 0, viewportWidth, viewportHeight);
    paintBackdrop(ctx, viewportWidth, viewportHeight);

    paintRoundedPanel(ctx, stageX, stageY, stageWidth, stageHeight, 42, "#0d1520", "#08111a");
    paintStageGlow(ctx, stageX, stageY, stageWidth, stageHeight);

    const boardWidth = state.width * cellSize + (state.width - 1) * gap;
    const boardHeight = state.height * cellSize + (state.height - 1) * gap;
    paintRoundedPanel(ctx, boardX - 12, boardY - 12, boardWidth + 24, boardHeight + 24, 28, "#121d2a", "#09111a");

    for (let row = 0; row < state.height; row += 1) {
      for (let col = 0; col < state.width; col += 1) {
        const x = boardX + col * (cellSize + gap);
        const y = boardY + row * (cellSize + gap);
        const index = row * state.width + col;
        paintCell(ctx, state, index, x, y, cellSize);
      }
    }
  }
}

function computeLayout(
  viewportWidth: number,
  viewportHeight: number,
  dpr: number,
  boardCols: number,
  boardRows: number,
): LayoutMetrics {
  const stageWidthCap = viewportWidth > viewportHeight ? Math.min(460, viewportWidth * 0.38) : 520;
  const stageWidth = Math.min(viewportWidth - OUTER_PADDING * 2, stageWidthCap);
  const stageHeight = Math.min(viewportHeight - OUTER_PADDING * 2, 920);
  const stageX = (viewportWidth - stageWidth) / 2;
  const stageY = (viewportHeight - stageHeight) / 2;
  const hudReserve = Math.min(HUD_RESERVE, Math.max(44, stageHeight * 0.19));
  const flagReserve = Math.min(FLAG_RESERVE, Math.max(40, stageHeight * 0.16));
  const boardAreaWidth = Math.max(48, stageWidth - PANEL_PADDING * 2);
  const boardAreaHeight = Math.max(48, stageHeight - hudReserve - flagReserve - PANEL_PADDING * 2);
  const gap = Math.max(2, Math.floor(Math.min(boardAreaWidth / 44, boardAreaHeight / 56)));
  const cellSize = Math.max(
    4,
    Math.min(
    (boardAreaWidth - gap * (boardCols - 1)) / boardCols,
    (boardAreaHeight - gap * (boardRows - 1)) / boardRows,
    ),
  );
  const boardWidth = boardCols * cellSize + (boardCols - 1) * gap;
  const boardHeight = boardRows * cellSize + (boardRows - 1) * gap;
  const boardX = stageX + (stageWidth - boardWidth) / 2;
  const boardY = stageY + hudReserve;

  return {
    viewportWidth,
    viewportHeight,
    dpr,
    stageX,
    stageY,
    stageWidth,
    stageHeight,
    boardX,
    boardY,
    boardWidth,
    boardHeight,
    cellSize,
    gap,
  };
}

function paintBackdrop(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#0b1420");
  gradient.addColorStop(1, "#04070c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const halo = ctx.createRadialGradient(width * 0.5, 0, 0, width * 0.5, 0, height * 0.7);
  halo.addColorStop(0, "rgba(74, 240, 255, 0.18)");
  halo.addColorStop(0.32, "rgba(74, 240, 255, 0.05)");
  halo.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, width, height);
}

function paintStageGlow(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  const glow = ctx.createRadialGradient(x + width / 2, y, 0, x + width / 2, y, height * 0.9);
  glow.addColorStop(0, "rgba(74, 240, 255, 0.12)");
  glow.addColorStop(0.45, "rgba(74, 240, 255, 0.03)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = glow;
  roundRectPath(ctx, x, y, width, height, 42);
  ctx.fill();
}

function paintCell(ctx: CanvasRenderingContext2D, state: GameState, index: number, x: number, y: number, size: number): void {
  if (size <= 0) {
    return;
  }
  const cell = getCell(state.cells, index);
  const radius = Math.max(2, Math.min(size / 2, size * 0.24));
  const isSource = index === state.sourceIndex;
  const isRelay = index === state.relayIndex;

  let fill = "#162338";
  let stroke = "rgba(160, 196, 255, 0.08)";

  if (cell.burnt) {
    fill = "#3b0f16";
    stroke = "rgba(255, 91, 102, 0.34)";
  } else if (isSource) {
    fill = "#ffbd45";
    stroke = "rgba(255, 189, 69, 0.48)";
  } else if (isRelay) {
    fill = "#4af0ff";
    stroke = "rgba(74, 240, 255, 0.48)";
  } else if (cell.connected) {
    fill = "#102533";
    stroke = "rgba(74, 240, 255, 0.36)";
  } else if (cell.revealed) {
    fill = "#101826";
    stroke = "rgba(160, 196, 255, 0.12)";
  } else if (cell.flagged) {
    fill = "#182232";
    stroke = "rgba(255, 154, 56, 0.24)";
  }

  paintRoundedPanel(ctx, x, y, size, size, radius, fill, fill);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  roundRectPath(ctx, x, y, size, size, radius);
  ctx.stroke();

  if (cell.connected || isRelay || isSource) {
    const alpha = Math.min(0.22, 0.08 + cell.connectPulse * 0.14 + (cell.connected ? 0.06 : 0));
    ctx.fillStyle = `rgba(74, 240, 255, ${alpha})`;
    roundRectPath(ctx, x + 1, y + 1, size - 2, size - 2, Math.max(0, radius - 1));
    ctx.fill();
  }

  if (cell.revealPulse > 0 || cell.burnPulse > 0) {
    const pulseColor = cell.burnPulse > 0 ? `rgba(255, 91, 102, ${cell.burnPulse * 0.22})` : `rgba(74, 240, 255, ${cell.revealPulse * 0.12})`;
    ctx.fillStyle = pulseColor;
    roundRectPath(ctx, x - 2, y - 2, size + 4, size + 4, radius + 1);
    ctx.fill();
  }

  if (cell.flagged && !cell.revealed) {
    ctx.fillStyle = "#ff9a38";
    ctx.font = `${Math.round(size * 0.46)}px "Avenir Next", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚑", x + size / 2, y + size / 2 + 1);
    return;
  }

  if (cell.burnt) {
    ctx.fillStyle = "#ffd3d8";
    ctx.font = `${Math.round(size * 0.36)}px "Avenir Next", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("✕", x + size / 2, y + size / 2 + 1);
    return;
  }

  if (isSource) {
    ctx.fillStyle = "#1b1300";
    ctx.font = `${Math.round(size * 0.34)}px "Avenir Next", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("⚡", x + size / 2, y + size / 2 + 1);
    return;
  }

  if (isRelay) {
    ctx.fillStyle = "#00161a";
    ctx.font = `${Math.round(size * 0.32)}px "Avenir Next", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("◉", x + size / 2, y + size / 2 + 1);
    return;
  }

  if (!cell.revealed || cell.clue === 0) {
    return;
  }

  ctx.fillStyle = clueColor(cell.clue);
  ctx.font = `900 ${Math.round(size * 0.4)}px "Avenir Next Condensed", "Trebuchet MS", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(cell.clue), x + size / 2, y + size / 2 + 1);
}

function clueColor(clue: number): string {
  switch (clue) {
    case 1:
      return "#6dc7ff";
    case 2:
      return "#78e7c6";
    case 3:
      return "#ffcb68";
    case 4:
      return "#ff8aa0";
    default:
      return "#ffdbe1";
  }
}

function paintRoundedPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  topColor: string,
  bottomColor: string,
): void {
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient;
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.fill();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  if (width <= 0 || height <= 0) {
    ctx.beginPath();
    return;
  }
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
