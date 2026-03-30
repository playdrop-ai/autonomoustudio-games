import { RIBBON_COUNT, RIBBON_DEPTH, type Ribbon, type Screen } from "./logic.ts";

export interface Layout {
  width: number;
  height: number;
  dpr: number;
  boardX: number;
  boardY: number;
  boardWidth: number;
  boardHeight: number;
  ribbonWidth: number;
  ribbonGap: number;
  frontHeight: number;
  previewHeight: number;
  tileGap: number;
}

export interface RenderModel {
  ribbons: Ribbon[];
  screen: Screen;
  pulls: number[];
  previewWord: string;
  accent: number;
  invalidFlash: number;
  lastThreatRibbon: number | null;
}

const PAPER = "#f6edd6";
const INK_DARK = "#101726";
const COPPER = "#d7894e";
const GOLD = "#d3af68";

export class CanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private layout: Layout;
  private readonly dust = createDust();

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("[wordbraid] Canvas 2D context unavailable");
    this.ctx = ctx;
    this.layout = this.computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    this.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  }

  resize(width: number, height: number, dpr: number): Layout {
    this.layout = this.computeLayout(width, height, dpr);
    this.canvas.width = Math.round(this.layout.width * this.layout.dpr);
    this.canvas.height = Math.round(this.layout.height * this.layout.dpr);
    this.canvas.style.width = `${this.layout.width}px`;
    this.canvas.style.height = `${this.layout.height}px`;
    this.ctx.setTransform(this.layout.dpr, 0, 0, this.layout.dpr, 0, 0);
    return this.layout;
  }

  getLayout(): Layout {
    return this.layout;
  }

  locateRibbon(clientX: number, clientY: number): number | null {
    const { boardX, boardY, ribbonWidth, ribbonGap, boardHeight } = this.layout;
    if (clientX < boardX || clientX > boardX + this.layout.boardWidth) return null;
    if (clientY < boardY || clientY > boardY + boardHeight) return null;

    for (let index = 0; index < RIBBON_COUNT; index += 1) {
      const x = boardX + index * (ribbonWidth + ribbonGap);
      if (clientX >= x && clientX <= x + ribbonWidth) return index;
    }
    return null;
  }

  render(model: RenderModel): void {
    const { ctx, layout } = this;
    ctx.clearRect(0, 0, layout.width, layout.height);
    this.drawBackdrop(model);
    this.drawBoardShell();
    this.drawThreads(model);
    this.drawRibbons(model);

    if (model.invalidFlash > 0) {
      ctx.save();
      ctx.globalAlpha = model.invalidFlash * 0.22;
      fillRoundedRect(ctx, layout.boardX - 10, layout.boardY - 10, layout.boardWidth + 20, layout.boardHeight + 20, 34, "#8d2f2c");
      ctx.restore();
    }
  }

  private computeLayout(width: number, height: number, dpr: number): Layout {
    const portrait = height >= width;
    const ribbonGap = portrait ? 10 : 14;
    const boardWidth = Math.min(width - (portrait ? 28 : 84), portrait ? 470 : 780);
    const ribbonWidth = Math.floor((boardWidth - ribbonGap * (RIBBON_COUNT - 1)) / RIBBON_COUNT);
    const tileGap = portrait ? 10 : 12;
    const frontHeight = portrait ? 108 : 118;
    const maxBoardHeight = portrait ? Math.min(height - 268, 760) : Math.min(height - 134, 680);
    const previewHeight = Math.max(40, Math.floor((maxBoardHeight - frontHeight - tileGap * (RIBBON_DEPTH - 1)) / (RIBBON_DEPTH - 1)));
    const boardHeight = frontHeight + previewHeight * (RIBBON_DEPTH - 1) + tileGap * (RIBBON_DEPTH - 1);
    const boardX = Math.round((width - boardWidth) / 2);
    const boardY = portrait ? Math.round(Math.max(116, (height - boardHeight) / 2 + 10)) : Math.round(Math.max(58, (height - boardHeight) / 2));

    return {
      width,
      height,
      dpr,
      boardX,
      boardY,
      boardWidth,
      boardHeight,
      ribbonWidth,
      ribbonGap,
      frontHeight,
      previewHeight,
      tileGap,
    };
  }

  private drawBackdrop(model: RenderModel): void {
    const { ctx, layout } = this;
    const wash = ctx.createLinearGradient(0, 0, layout.width, layout.height);
    wash.addColorStop(0, "#09111f");
    wash.addColorStop(0.55, "#102136");
    wash.addColorStop(1, "#171620");
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, layout.width, layout.height);

    drawGlow(ctx, layout.width * 0.14, layout.height * 0.15, layout.width * 0.24, "#214660", 0.36);
    drawGlow(ctx, layout.width * 0.82, layout.height * 0.19, layout.width * 0.2, "#642c2a", 0.22);
    drawGlow(ctx, layout.width * 0.52, layout.height * 0.82, layout.width * 0.28, "#5b4325", 0.16);

    ctx.save();
    for (const speck of this.dust) {
      ctx.globalAlpha = speck.alpha;
      ctx.fillStyle = "#f1e7cf";
      ctx.fillRect(layout.width * speck.x, layout.height * speck.y, speck.size, speck.size);
    }
    ctx.restore();

    if (model.screen !== "playing") {
      ctx.save();
      ctx.globalAlpha = model.screen === "start" ? 0.12 : 0.2;
      fillRoundedRect(ctx, 0, 0, layout.width, layout.height, 0, "#05070d");
      ctx.restore();
    }
  }

  private drawBoardShell(): void {
    const { ctx, layout } = this;
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
    ctx.shadowBlur = 34;
    fillRoundedRect(ctx, layout.boardX - 16, layout.boardY - 18, layout.boardWidth + 32, layout.boardHeight + 36, 40, "#0f1928");
    ctx.restore();

    const rim = ctx.createLinearGradient(layout.boardX, layout.boardY, layout.boardX + layout.boardWidth, layout.boardY + layout.boardHeight);
    rim.addColorStop(0, "#e4c07f");
    rim.addColorStop(1, "#8f6538");
    fillRoundedRect(ctx, layout.boardX - 4, layout.boardY - 4, layout.boardWidth + 8, layout.boardHeight + 8, 34, rim);

    const board = ctx.createLinearGradient(layout.boardX, layout.boardY, layout.boardX, layout.boardY + layout.boardHeight);
    board.addColorStop(0, "#162538");
    board.addColorStop(1, "#0c1421");
    fillRoundedRect(ctx, layout.boardX, layout.boardY, layout.boardWidth, layout.boardHeight, 30, board);
  }

  private drawThreads(model: RenderModel): void {
    const { ctx, layout } = this;
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(215, 175, 104, 0.38)";
    for (let index = 0; index < RIBBON_COUNT; index += 1) {
      const x = layout.boardX + index * (layout.ribbonWidth + layout.ribbonGap) + layout.ribbonWidth / 2;
      const weave = Math.sin(index * 1.1) * 10;
      ctx.beginPath();
      ctx.moveTo(x - 18, layout.boardY - 28);
      ctx.bezierCurveTo(
        x + weave,
        layout.boardY + layout.frontHeight * 0.2,
        x - weave,
        layout.boardY + layout.boardHeight * 0.48,
        x + 12,
        layout.boardY + layout.boardHeight + 22,
      );
      ctx.stroke();
    }

    if (model.previewWord) {
      ctx.globalAlpha = 0.16 + model.accent * 0.18;
      ctx.fillStyle = GOLD;
      ctx.font = '700 18px "Avenir Next", "Gill Sans", sans-serif';
      ctx.textAlign = "center";
      ctx.fillText(model.previewWord.toUpperCase(), layout.boardX + layout.boardWidth / 2, layout.boardY - 24);
    }
    ctx.restore();
  }

  private drawRibbons(model: RenderModel): void {
    for (let ribbonIndex = 0; ribbonIndex < model.ribbons.length; ribbonIndex += 1) {
      const ribbon = model.ribbons[ribbonIndex]!;
      const pullCount = model.pulls.filter((value) => value === ribbonIndex).length;
      this.drawRibbon(ribbonIndex, ribbon, pullCount, model);
    }
  }

  private drawRibbon(index: number, ribbon: Ribbon, pullCount: number, model: RenderModel): void {
    const { ctx, layout } = this;
    const x = layout.boardX + index * (layout.ribbonWidth + layout.ribbonGap);

    ctx.save();
    const columnFill = ctx.createLinearGradient(x, layout.boardY, x + layout.ribbonWidth, layout.boardY + layout.boardHeight);
    columnFill.addColorStop(0, "rgba(247, 240, 219, 0.06)");
    columnFill.addColorStop(1, "rgba(13, 19, 30, 0.52)");
    fillRoundedRect(ctx, x, layout.boardY, layout.ribbonWidth, layout.boardHeight, 24, columnFill);
    ctx.restore();

    for (let depth = 0; depth < ribbon.length; depth += 1) {
      const tile = ribbon[depth]!;
      const tileHeight = depth === 0 ? layout.frontHeight : layout.previewHeight;
      const tileY =
        depth === 0
          ? layout.boardY
          : layout.boardY + layout.frontHeight + layout.tileGap + (depth - 1) * (layout.previewHeight + layout.tileGap);
      this.drawTile(x + 6, tileY + 6, layout.ribbonWidth - 12, tileHeight - 12, tile, {
        front: depth === 0,
        selected: depth < pullCount,
        threatened: model.lastThreatRibbon === index && depth === ribbon.findIndex((entry) => entry.kind === "ink"),
        accent: model.accent,
      });
    }
  }

  private drawTile(
    x: number,
    y: number,
    width: number,
    height: number,
    tile: Ribbon[number],
    options: { front: boolean; selected: boolean; threatened: boolean; accent: number },
  ): void {
    const { ctx } = this;
    const radius = options.front ? 22 : 18;

    if (tile.kind === "ink") {
      ctx.save();
      ctx.shadowColor = "rgba(147, 46, 42, 0.36)";
      ctx.shadowBlur = options.threatened ? 18 : 8;
      const fill = ctx.createLinearGradient(x, y, x + width, y + height);
      fill.addColorStop(0, "#3a1d24");
      fill.addColorStop(1, "#15070c");
      fillRoundedRect(ctx, x, y, width, height, radius, fill);
      ctx.restore();
      ctx.save();
      ctx.fillStyle = "rgba(210, 86, 74, 0.6)";
      drawInkBlot(ctx, x + width / 2, y + height / 2, Math.min(width, height) * 0.26);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
    ctx.shadowBlur = options.front ? 18 : 10;
    fillRoundedRect(ctx, x, y + 6, width, height, radius, "rgba(7, 9, 14, 0.36)");
    ctx.restore();

    const tileFill = ctx.createLinearGradient(x, y, x + width, y + height);
    tileFill.addColorStop(0, lighten(PAPER, 0.04));
    tileFill.addColorStop(1, darken(PAPER, 0.08));
    fillRoundedRect(ctx, x, y, width, height, radius, tileFill);

    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = GOLD;
    fillRoundedRect(ctx, x + 5, y + 5, width - 10, 9, 9, GOLD);
    ctx.restore();

    if (options.selected) {
      ctx.save();
      ctx.strokeStyle = `rgba(215, 137, 78, ${0.46 + options.accent * 0.26})`;
      ctx.lineWidth = 4;
      strokeRoundedRect(ctx, x - 4, y - 4, width + 8, height + 8, radius + 4);
      ctx.restore();
    }

    ctx.fillStyle = INK_DARK;
    ctx.font = options.front ? '800 50px "Avenir Next", "Gill Sans", sans-serif' : '700 34px "Avenir Next", "Gill Sans", sans-serif';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tile.letter.toUpperCase(), x + width / 2, y + height / 2 + (options.front ? 2 : 1));
  }
}

function fillRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string | CanvasGradient,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
}

function strokeRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.stroke();
}

function lighten(hex: string, amount: number): string {
  return shiftColor(hex, amount);
}

function darken(hex: string, amount: number): string {
  return shiftColor(hex, -amount);
}

function shiftColor(hex: string, amount: number): string {
  const value = hex.replace("#", "");
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
  const shifted = channels.map((channel) => Math.max(0, Math.min(255, Math.round(channel + 255 * amount))));
  return `#${shifted.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  alpha: number,
): void {
  ctx.save();
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function createDust(): Array<{ x: number; y: number; size: number; alpha: number }> {
  const values: Array<{ x: number; y: number; size: number; alpha: number }> = [];
  let seed = 17;
  for (let index = 0; index < 90; index += 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const x = seed / 0xffffffff;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const y = seed / 0xffffffff;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const alpha = 0.04 + (seed / 0xffffffff) * 0.08;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const size = 1 + Math.floor((seed / 0xffffffff) * 2);
    values.push({ x, y, size, alpha });
  }
  return values;
}

function drawInkBlot(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
  ctx.beginPath();
  for (let step = 0; step <= 10; step += 1) {
    const angle = (step / 10) * Math.PI * 2;
    const pulse = 0.76 + Math.sin(angle * 3) * 0.18 + Math.cos(angle * 5) * 0.07;
    const drawX = x + Math.cos(angle) * radius * pulse;
    const drawY = y + Math.sin(angle) * radius * pulse;
    if (step === 0) {
      ctx.moveTo(drawX, drawY);
    } else {
      ctx.lineTo(drawX, drawY);
    }
  }
  ctx.closePath();
  ctx.fill();
}
