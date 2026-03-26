import {
  ASH_LIMIT,
  BOARD_COLS,
  BOARD_ROWS,
  type Axis,
  type Board,
  type ClearStage,
  type CollapseStage,
  type Direction,
  type GameState,
  type Move,
  type Position,
  type Tile,
  type TileKind,
  type TurnStage,
} from "./logic";

type OverlayMode = "start" | "gameover" | null;

export interface Layout {
  width: number;
  height: number;
  dpr: number;
  boardX: number;
  boardY: number;
  cellSize: number;
  gap: number;
  boardWidth: number;
  boardHeight: number;
}

export interface RenderModel {
  board: Board;
  score: number;
  ashCount: number;
  bestScore: number;
  stage: ActiveStage | null;
  overlay: OverlayMode;
  comboLabel: ComboLabel | null;
}

export interface ActiveStage {
  stage: TurnStage;
  progress: number;
}

export interface ComboLabel {
  text: string;
  opacity: number;
}

const COLORS: Record<TileKind, { fill: string; glow: string }> = {
  sun: { fill: "#f7b64d", glow: "#ffe6a7" },
  moon: { fill: "#8b8dff", glow: "#d3d5ff" },
  wave: { fill: "#3fc7e9", glow: "#b6f3ff" },
  leaf: { fill: "#58d388", glow: "#c6ffd7" },
  ember: { fill: "#ff6c66", glow: "#ffc0ab" },
  ash: { fill: "#40384a", glow: "#7b5f63" },
};

export class CanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly stars: Array<{ x: number; y: number; radius: number; alpha: number }>;
  private layout: Layout;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.layout = this.computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    this.stars = createStars();
    this.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  }

  resize(width: number, height: number, dpr: number): Layout {
    this.layout = this.computeLayout(width, height, dpr);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return this.layout;
  }

  getLayout(): Layout {
    return this.layout;
  }

  render(model: RenderModel): void {
    const { ctx, layout } = this;
    ctx.clearRect(0, 0, layout.width, layout.height);
    this.drawBackground();
    this.drawBoardFrame();

    if (model.stage?.stage.kind === "shift") {
      this.drawShiftStage(model.stage.stage, model.stage.progress);
    } else if (model.stage?.stage.kind === "clear") {
      this.drawBoard(model.stage.stage.board, {
        clearStage: model.stage.stage,
        clearProgress: model.stage.progress,
      });
    } else if (model.stage?.stage.kind === "collapse") {
      this.drawCollapseStage(model.stage.stage, model.stage.progress);
    } else if (model.stage?.stage.kind === "ash") {
      this.drawAshStage(model.stage.stage, model.stage.progress);
    } else {
      this.drawBoard(model.board);
    }

    this.drawHud(model.score, model.ashCount, model.comboLabel);

    if (model.overlay === "start") {
      this.drawStartOverlay();
    } else if (model.overlay === "gameover") {
      this.drawGameOverOverlay(model.score, model.bestScore);
    }
  }

  private computeLayout(width: number, height: number, dpr: number): Layout {
    const portrait = height >= width;
    const safeWidth = portrait ? width - 56 : Math.min(width * 0.38, 520);
    const safeHeight = portrait ? height - 320 : height - 260;
    const cellSize = Math.floor(
      Math.min((safeWidth - 16) / BOARD_COLS - 12, (safeHeight - 20) / BOARD_ROWS - 10),
    );
    const gap = portrait ? 12 : 10;
    const boardWidth = BOARD_COLS * cellSize + gap * (BOARD_COLS - 1);
    const boardHeight = BOARD_ROWS * cellSize + gap * (BOARD_ROWS - 1);
    const boardX = Math.round((width - boardWidth) / 2);
    const boardY = portrait ? Math.round((height - boardHeight) / 2 + 36) : Math.round((height - boardHeight) / 2);
    return { width, height, dpr, boardX, boardY, cellSize, gap, boardWidth, boardHeight };
  }

  private drawBackground(): void {
    const { ctx, layout } = this;
    const gradient = ctx.createLinearGradient(0, 0, layout.width, layout.height);
    gradient.addColorStop(0, "#0c0a16");
    gradient.addColorStop(0.55, "#140f27");
    gradient.addColorStop(1, "#1f1324");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, layout.width, layout.height);

    drawGlow(ctx, layout.width * 0.16, layout.height * 0.18, layout.width * 0.2, "#3a2d7d", 0.42);
    drawGlow(ctx, layout.width * 0.86, layout.height * 0.24, layout.width * 0.18, "#6b2b47", 0.28);
    drawGlow(ctx, layout.width * 0.68, layout.height * 0.8, layout.width * 0.26, "#1b4f6b", 0.2);
    for (const star of this.stars) {
      ctx.beginPath();
      ctx.fillStyle = `rgba(247, 223, 184, ${star.alpha})`;
      ctx.arc(layout.width * star.x, layout.height * star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBoardFrame(): void {
    const { ctx, layout } = this;
    const outerX = layout.boardX - 12;
    const outerY = layout.boardY - 12;
    const outerW = layout.boardWidth + 24;
    const outerH = layout.boardHeight + 24;

    ctx.save();
    ctx.shadowColor = "rgba(17, 12, 32, 0.6)";
    ctx.shadowBlur = 28;
    fillRoundedRect(ctx, outerX, outerY, outerW, outerH, 34, "#1e1537");
    ctx.restore();

    const frame = ctx.createLinearGradient(outerX, outerY, outerX + outerW, outerY + outerH);
    frame.addColorStop(0, "#f0c875");
    frame.addColorStop(1, "#7d5b2a");
    fillRoundedRect(ctx, outerX + 2, outerY + 2, outerW - 4, outerH - 4, 34, frame);

    const board = ctx.createLinearGradient(0, layout.boardY, 0, layout.boardY + layout.boardHeight);
    board.addColorStop(0, "#261d44");
    board.addColorStop(1, "#120e24");
    fillRoundedRect(ctx, layout.boardX, layout.boardY, layout.boardWidth, layout.boardHeight, 28, board);
  }

  private drawShiftStage(stage: Extract<TurnStage, { kind: "shift" }>, progress: number): void {
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        if (stage.move.axis === "row" && row === stage.move.index) continue;
        if (stage.move.axis === "col" && col === stage.move.index) continue;
        const tile = stage.before[row]![col]!;
        const x = this.layout.boardX + col * (this.layout.cellSize + this.layout.gap);
        const y = this.layout.boardY + row * (this.layout.cellSize + this.layout.gap);
        this.drawToken(tile, x, y, this.layout.cellSize, false, 1);
      }
    }
    const distance = this.layout.cellSize + this.layout.gap;
    const offset = easeInOut(progress) * distance * stage.move.direction;
    if (stage.move.axis === "row") {
      const row = stage.before[stage.move.index]!;
      for (let col = 0; col < BOARD_COLS; col += 1) {
        const tile = row[col]!;
        const baseX = this.layout.boardX + col * (this.layout.cellSize + this.layout.gap);
        const y = this.layout.boardY + stage.move.index * (this.layout.cellSize + this.layout.gap);
        this.drawToken(tile, baseX + offset, y, this.layout.cellSize, false, 1);
        if (stage.move.direction === 1 && col === BOARD_COLS - 1) {
          this.drawToken(tile, baseX + offset - (this.layout.boardWidth + this.layout.gap), y, this.layout.cellSize, false, 1);
        }
        if (stage.move.direction === -1 && col === 0) {
          this.drawToken(tile, baseX + offset + this.layout.boardWidth + this.layout.gap, y, this.layout.cellSize, false, 1);
        }
      }
    } else {
      for (let row = 0; row < BOARD_ROWS; row += 1) {
        const tile = stage.before[row]![stage.move.index]!;
        const x = this.layout.boardX + stage.move.index * (this.layout.cellSize + this.layout.gap);
        const baseY = this.layout.boardY + row * (this.layout.cellSize + this.layout.gap);
        this.drawToken(tile, x, baseY + offset, this.layout.cellSize, false, 1);
        if (stage.move.direction === 1 && row === BOARD_ROWS - 1) {
          this.drawToken(tile, x, baseY + offset - (this.layout.boardHeight + this.layout.gap), this.layout.cellSize, false, 1);
        }
        if (stage.move.direction === -1 && row === 0) {
          this.drawToken(tile, x, baseY + offset + this.layout.boardHeight + this.layout.gap, this.layout.cellSize, false, 1);
        }
      }
    }
  }

  private drawCollapseStage(stage: CollapseStage, progress: number): void {
    const positionMap = new Map<number, Position>();
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        const tile = stage.before[row]![col];
        if (tile) positionMap.set(tile.id, { row, col });
      }
    }

    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        const tile = stage.after[row]![col]!;
        const before = positionMap.get(tile.id);
        const fromRow = before?.row ?? -1;
        const fromCol = before?.col ?? col;
        const x = lerp(
          this.layout.boardX + fromCol * (this.layout.cellSize + this.layout.gap),
          this.layout.boardX + col * (this.layout.cellSize + this.layout.gap),
          easeInOut(progress),
        );
        const y = lerp(
          this.layout.boardY + fromRow * (this.layout.cellSize + this.layout.gap),
          this.layout.boardY + row * (this.layout.cellSize + this.layout.gap),
          easeInOut(progress),
        );
        this.drawToken(tile, x, y, this.layout.cellSize, false, 1);
      }
    }
  }

  private drawAshStage(stage: Extract<TurnStage, { kind: "ash" }>, progress: number): void {
    this.drawBoard(stage.after);
    const x = this.layout.boardX + stage.position.col * (this.layout.cellSize + this.layout.gap);
    const y = this.layout.boardY + stage.position.row * (this.layout.cellSize + this.layout.gap);
    const pulse = 1 + Math.sin(progress * Math.PI) * 0.14;
    const tile = stage.after[stage.position.row]![stage.position.col]!;
    this.drawToken(tile, x, y, this.layout.cellSize * pulse, true, 0.92);
  }

  private drawBoard(board: Board, options: { clearStage?: ClearStage; clearProgress?: number } = {}): void {
    const clearSet = options.clearStage
      ? new Set([...options.clearStage.matched, ...options.clearStage.cleansed].map((position) => `${position.row}:${position.col}`))
      : null;
    const clearProgress = options.clearProgress ?? 0;

    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        const tile = board[row]![col]!;
        const x = this.layout.boardX + col * (this.layout.cellSize + this.layout.gap);
        const y = this.layout.boardY + row * (this.layout.cellSize + this.layout.gap);
        const isClearing = clearSet?.has(`${row}:${col}`) ?? false;
        const scale = isClearing ? 1 + Math.sin(clearProgress * Math.PI) * 0.1 : 1;
        const alpha = isClearing ? 1 - clearProgress * 0.86 : 1;
        this.drawToken(tile, x, y, this.layout.cellSize * scale, isClearing, alpha);
      }
    }
  }

  private drawToken(tile: Tile, x: number, y: number, size: number, highlight: boolean, alpha: number): void {
    const { ctx } = this;
    const radius = size * 0.22;
    const palette = COLORS[tile.kind];
    const shadowY = 8;

    ctx.save();
    ctx.globalAlpha = alpha;
    fillRoundedRect(ctx, x, y + shadowY, size, size, radius, "rgba(5, 4, 11, 0.46)");
    fillRoundedRect(ctx, x, y, size, size, radius, "#1f1a33");

    const fill = ctx.createLinearGradient(x, y, x + size, y + size);
    fill.addColorStop(0, lighten(palette.fill, 0.18));
    fill.addColorStop(1, darken(palette.fill, 0.08));
    fillRoundedRect(ctx, x + 4, y + 4, size - 8, size - 8, radius * 0.9, fill);

    if (highlight) {
      ctx.strokeStyle = palette.glow;
      ctx.lineWidth = 4;
      strokeRoundedRect(ctx, x - 4, y - 4, size + 8, size + 8, radius * 1.1);
    }

    const iconSize = size * 0.44;
    const iconX = x + size / 2;
    const iconY = y + size / 2;
    ctx.translate(iconX, iconY);
    ctx.scale(iconSize / 100, iconSize / 100);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    drawIcon(ctx, tile.kind);
    ctx.restore();
  }

  private drawHud(score: number, ashCount: number, comboLabel: ComboLabel | null): void {
    const { ctx, layout } = this;
    const topY = layout.height >= layout.width ? 104 : 92;
    drawLabel(ctx, "SCORE", layout.boardX + 4, topY, "left");
    drawValue(ctx, formatScore(score), layout.boardX + 4, topY + 36, "left");
    drawLabel(ctx, "ASH", layout.boardX + layout.boardWidth - 4, topY, "right");
    drawValue(ctx, `${ashCount} / ${ASH_LIMIT}`, layout.boardX + layout.boardWidth - 4, topY + 36, "right");

    if (comboLabel) {
      ctx.save();
      ctx.globalAlpha = comboLabel.opacity;
      ctx.fillStyle = "#ffe7a6";
      ctx.font = "800 26px 'Avenir Next', 'Trebuchet MS', sans-serif";
      ctx.textAlign = "center";
      ctx.letterSpacing = "4px";
      ctx.fillText(comboLabel.text, layout.boardX + layout.boardWidth / 2, layout.boardY - 34);
      ctx.restore();
    }
  }

  private drawStartOverlay(): void {
    const { ctx, layout } = this;
    ctx.fillStyle = "#f0c875";
    ctx.font = "700 18px 'Avenir Next', 'Trebuchet MS', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("CONSTELLATION SWIPE", layout.boardX, 84);

    ctx.fillStyle = "#fff6de";
    ctx.font = "800 60px 'Avenir Next', 'Trebuchet MS', sans-serif";
    ctx.fillText("Starfold", layout.boardX, 142);

    ctx.fillStyle = "#dddae8";
    ctx.font = "500 22px 'Avenir Next', 'Trebuchet MS', sans-serif";
    ctx.fillText("Swipe the shrine. Trigger chains. Keep the ash back.", layout.boardX, 176);
    ctx.fillText("Tap anywhere to begin.", layout.boardX, 206);
  }

  private drawGameOverOverlay(score: number, bestScore: number): void {
    const { ctx, layout } = this;
    const panelWidth = Math.min(520, layout.width - 84);
    const panelHeight = Math.min(420, layout.height - 160);
    const x = (layout.width - panelWidth) / 2;
    const y = (layout.height - panelHeight) / 2;
    fillRoundedRect(ctx, x, y, panelWidth, panelHeight, 34, "rgba(15, 11, 31, 0.82)");
    strokeRoundedRect(ctx, x + 2, y + 2, panelWidth - 4, panelHeight - 4, 34, "rgba(240, 200, 117, 0.7)", 2);

    ctx.fillStyle = "#fff6de";
    ctx.textAlign = "center";
    ctx.font = "800 42px 'Avenir Next', 'Trebuchet MS', sans-serif";
    ctx.fillText("Ash Took The Shrine", layout.width / 2, y + 88);

    ctx.fillStyle = "#d6d3e0";
    ctx.font = "500 21px 'Avenir Next', 'Trebuchet MS', sans-serif";
    ctx.fillText("One more line could have saved it.", layout.width / 2, y + 128);

    drawLabel(ctx, "RUN SCORE", layout.width / 2, y + 206, "center");
    ctx.fillStyle = "#fff6de";
    ctx.font = "800 54px 'Avenir Next', 'Trebuchet MS', sans-serif";
    ctx.fillText(formatScore(score), layout.width / 2, y + 262);

    drawLabel(ctx, "BEST", layout.width / 2, y + 324, "center");
    ctx.font = "800 38px 'Avenir Next', 'Trebuchet MS', sans-serif";
    ctx.fillText(formatScore(bestScore), layout.width / 2, y + 366);

    ctx.fillStyle = "#dddae8";
    ctx.font = "600 18px 'Avenir Next', 'Trebuchet MS', sans-serif";
    ctx.fillText("Tap to fold again.", layout.width / 2, y + panelHeight - 34);
  }
}

function drawIcon(ctx: CanvasRenderingContext2D, kind: TileKind): void {
  ctx.save();
  switch (kind) {
    case "sun":
      ctx.strokeStyle = "#fff8df";
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.stroke();
      for (const [x1, y1, x2, y2] of [
        [0, -44, 0, -28],
        [0, 28, 0, 44],
        [-44, 0, -28, 0],
        [28, 0, 44, 0],
        [-31, -31, -19, -19],
        [19, 19, 31, 31],
        [-31, 31, -19, 19],
        [19, -19, 31, -31],
      ]) {
        ctx.beginPath();
        ctx.moveTo(x1!, y1!);
        ctx.lineTo(x2!, y2!);
        ctx.stroke();
      }
      break;
    case "moon":
      ctx.fillStyle = "#f4f2ff";
      ctx.beginPath();
      ctx.arc(-4, -4, 26, Math.PI * 0.45, Math.PI * 1.55, true);
      ctx.arc(8, -6, 22, Math.PI * 1.42, Math.PI * 0.58, false);
      ctx.closePath();
      ctx.fill();
      break;
    case "wave":
      ctx.strokeStyle = "#ecfdff";
      ctx.lineWidth = 8;
      for (const y of [-12, 12]) {
        ctx.beginPath();
        ctx.moveTo(-42, y);
        ctx.bezierCurveTo(-22, y - 14, -6, y - 14, 14, y);
        ctx.bezierCurveTo(34, y + 14, 50, y + 14, 42, y);
        ctx.stroke();
      }
      break;
    case "leaf":
      ctx.fillStyle = "#effff4";
      ctx.beginPath();
      ctx.moveTo(-20, 30);
      ctx.bezierCurveTo(-38, 4, -18, -34, 20, -34);
      ctx.bezierCurveTo(34, -34, 48, -22, 48, -8);
      ctx.bezierCurveTo(48, 20, 20, 40, -8, 40);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#58d388";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(-10, 22);
      ctx.lineTo(30, -18);
      ctx.stroke();
      break;
    case "ember":
      ctx.fillStyle = "#fff2d9";
      ctx.beginPath();
      ctx.moveTo(0, -44);
      ctx.bezierCurveTo(22, -16, 28, -2, 28, 16);
      ctx.bezierCurveTo(28, 34, 10, 44, 0, 54);
      ctx.bezierCurveTo(-10, 44, -28, 34, -28, 16);
      ctx.bezierCurveTo(-28, -2, -22, -16, 0, -44);
      ctx.fill();
      ctx.fillStyle = "#ff8462";
      ctx.beginPath();
      ctx.moveTo(0, -22);
      ctx.bezierCurveTo(12, -6, 16, 4, 16, 16);
      ctx.bezierCurveTo(16, 24, 8, 34, 0, 42);
      ctx.bezierCurveTo(-8, 34, -16, 24, -16, 16);
      ctx.bezierCurveTo(-16, 4, -12, -6, 0, -22);
      ctx.fill();
      break;
    case "ash":
      ctx.fillStyle = "#6b5a68";
      ctx.beginPath();
      ctx.moveTo(-34, -24);
      ctx.lineTo(-12, -40);
      ctx.lineTo(18, -32);
      ctx.lineTo(36, -8);
      ctx.lineTo(26, 24);
      ctx.lineTo(-6, 34);
      ctx.lineTo(-28, 18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ff9f66";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(-18, -12);
      ctx.lineTo(6, 2);
      ctx.lineTo(-10, 24);
      ctx.moveTo(6, 2);
      ctx.lineTo(24, 16);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

function createStars(): Array<{ x: number; y: number; radius: number; alpha: number }> {
  return [
    { x: 0.12, y: 0.1, radius: 2.2, alpha: 0.76 },
    { x: 0.24, y: 0.32, radius: 1.8, alpha: 0.54 },
    { x: 0.78, y: 0.12, radius: 2.4, alpha: 0.82 },
    { x: 0.9, y: 0.3, radius: 1.7, alpha: 0.56 },
    { x: 0.7, y: 0.64, radius: 2.1, alpha: 0.62 },
    { x: 0.18, y: 0.72, radius: 1.9, alpha: 0.58 },
    { x: 0.42, y: 0.84, radius: 2.3, alpha: 0.66 },
    { x: 0.85, y: 0.88, radius: 2.1, alpha: 0.62 },
  ];
}

function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, applyAlpha(color, alpha));
  gradient.addColorStop(1, applyAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawLabel(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign): void {
  ctx.fillStyle = "#f0c875";
  ctx.textAlign = align;
  ctx.font = "700 18px 'Avenir Next', 'Trebuchet MS', sans-serif";
  ctx.fillText(text, x, y);
}

function drawValue(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, align: CanvasTextAlign): void {
  ctx.fillStyle = "#fff6de";
  ctx.textAlign = align;
  ctx.font = "800 34px 'Avenir Next', 'Trebuchet MS', sans-serif";
  ctx.fillText(text, x, y);
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string | CanvasGradient,
): void {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  stroke = "rgba(240, 200, 117, 0.6)",
  lineWidth = 4,
): void {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function formatScore(score: number): string {
  return new Intl.NumberFormat("en-US").format(score);
}

function easeInOut(value: number): number {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

function lighten(hex: string, amount: number): string {
  return tint(hex, amount);
}

function darken(hex: string, amount: number): string {
  return shade(hex, amount);
}

function tint(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgb(${mix(r, 255, amount)} ${mix(g, 255, amount)} ${mix(b, 255, amount)})`;
}

function shade(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgb(${mix(r, 0, amount)} ${mix(g, 0, amount)} ${mix(b, 0, amount)})`;
}

function applyAlpha(hex: string, alpha: number): string {
  const { r, g, b } = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function mix(from: number, to: number, amount: number): number {
  return Math.round(from + (to - from) * amount);
}
