import {
  ANCHOR_COLS,
  COLS,
  type Board,
  type LanternColor,
  type Slot,
} from "./logic";
import { GAME_COPY, fruitPalette, type ThemeAssets } from "./theme";

export interface Layout {
  width: number;
  height: number;
  dpr: number;
  cell: number;
  radius: number;
  rowStep: number;
  boardX: number;
  boardY: number;
  launcherX: number;
  launcherY: number;
  reserveRect: DOMRectLike;
  primaryButtonRect: DOMRectLike;
  dangerY: number;
}

export interface DOMRectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderBurst {
  x: number;
  y: number;
  age01: number;
  color: LanternColor;
}

export interface RenderFalling {
  x: number;
  y: number;
  age01: number;
  color: LanternColor;
}

export interface RenderShot {
  x: number;
  y: number;
  color: LanternColor;
}

export interface RenderModel {
  board: Board;
  score: number;
  bestScore: number;
  largestDrop: number;
  shotsUntilSink: number;
  currentShot: LanternColor;
  reserveShot: LanternColor;
  screen: "start" | "playing" | "gameover";
  aimTo: { x: number; y: number } | null;
  activeShot: RenderShot | null;
  popBursts: RenderBurst[];
  falling: RenderFalling[];
  dropLabel: { text: string; age01: number } | null;
}

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly assets: ThemeAssets;
  private layout: Layout;

  constructor(canvas: HTMLCanvasElement, assets: ThemeAssets) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("[fruit-salad] 2d canvas unavailable");
    this.canvas = canvas;
    this.ctx = context;
    this.assets = assets;
    this.layout = this.computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    this.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  }

  resize(width: number, height: number, dpr: number): void {
    this.layout = this.computeLayout(width, height, dpr);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  getLayout(): Layout {
    return this.layout;
  }

  cellCenter(row: number, col: number): { x: number; y: number } {
    const offset = row % 2 === 1 ? this.layout.cell / 2 : 0;
    return {
      x: this.layout.boardX + offset + col * this.layout.cell + this.layout.cell / 2,
      y: this.layout.boardY + row * this.layout.rowStep + this.layout.cell / 2,
    };
  }

  render(model: RenderModel): void {
    const ctx = this.ctx;
    const { width, height } = this.layout;
    ctx.clearRect(0, 0, width, height);
    this.drawBackground();
    this.drawAnchors(model.board);
    this.drawBoard(model.board);
    this.drawFalling(model.falling);
    this.drawBursts(model.popBursts);
    if (model.screen === "playing") {
      this.drawDangerLine(model.shotsUntilSink);
      if (model.aimTo && !model.activeShot) this.drawAimGuide(model.aimTo);
      if (model.activeShot) this.drawFruit(model.activeShot.x, model.activeShot.y, this.layout.radius * 0.93, model.activeShot.color, 1);
      this.drawLauncher(model.currentShot, model.reserveShot);
      this.drawHud(model);
      if (model.dropLabel) this.drawDropLabel(model.dropLabel.text, model.dropLabel.age01);
    }
    if (model.screen === "start") this.drawStartOverlay();
    if (model.screen === "gameover") this.drawGameOverOverlay(model);
  }

  private computeLayout(width: number, height: number, dpr: number): Layout {
    const portrait = height >= width * 1.08;
    const cell = portrait ? Math.min(76, Math.max(58, width * 0.102)) : Math.min(72, Math.max(58, height * 0.08));
    const rowStep = cell * 0.86;
    const boardWidth = cell * COLS + cell / 2;
    const boardX = (width - boardWidth) / 2;
    const boardY = portrait ? 148 : 86;
    const reserveRect = portrait
      ? { x: width / 2 - 156, y: height - 146, width: 116, height: 116 }
      : { x: width / 2 - 192, y: height - 176, width: 116, height: 116 };
    const primaryButtonRect = portrait
      ? { x: width / 2 - 220, y: height - 126, width: 440, height: 86 }
      : { x: width / 2 - 170, y: height - 102, width: 340, height: 78 };
    return {
      width,
      height,
      dpr,
      cell,
      radius: cell * 0.39,
      rowStep,
      boardX,
      boardY,
      launcherX: width / 2,
      launcherY: portrait ? height - 82 : height - 94,
      reserveRect,
      primaryButtonRect,
      dangerY: portrait ? height - 162 : height - 144,
    };
  }

  private drawBackground(): void {
    const { ctx } = this;
    const { width, height, boardY } = this.layout;
    drawCoverImage(ctx, this.assets.background, width, height);

    const veil = ctx.createLinearGradient(0, 0, 0, height);
    veil.addColorStop(0, "rgba(17, 41, 24, 0.16)");
    veil.addColorStop(0.45, "rgba(26, 41, 18, 0.14)");
    veil.addColorStop(1, "rgba(12, 20, 11, 0.52)");
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, width, height);

    drawGlowCircle(ctx, width * 0.22, height * 0.14, width * 0.17, "rgba(255, 198, 106, 0.18)");
    drawGlowCircle(ctx, width * 0.78, height * 0.24, width * 0.19, "rgba(132, 227, 120, 0.13)");
    drawGlowCircle(ctx, width * 0.64, height * 0.78, width * 0.25, "rgba(255, 151, 95, 0.11)");

    ctx.strokeStyle = "rgba(84, 50, 26, 0.96)";
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-20, boardY - 52);
    ctx.bezierCurveTo(width * 0.18, boardY - 76, width * 0.42, boardY - 14, width * 0.64, boardY - 40);
    ctx.bezierCurveTo(width * 0.8, boardY - 58, width * 0.9, boardY - 18, width + 24, boardY - 48);
    ctx.stroke();

    ctx.strokeStyle = "rgba(142, 177, 86, 0.6)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, boardY - 66);
    ctx.bezierCurveTo(width * 0.3, boardY - 102, width * 0.6, boardY - 6, width, boardY - 72);
    ctx.stroke();

    ctx.fillStyle = "rgba(17, 34, 17, 0.82)";
    ctx.beginPath();
    ctx.moveTo(0, height * 0.82);
    ctx.bezierCurveTo(width * 0.16, height * 0.77, width * 0.3, height * 0.86, width * 0.48, height * 0.81);
    ctx.bezierCurveTo(width * 0.66, height * 0.75, width * 0.82, height * 0.86, width, height * 0.8);
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    const sparkles: ReadonlyArray<readonly [number, number, number]> = [
      [0.14, 0.09, 2.6],
      [0.26, 0.17, 2.2],
      [0.68, 0.13, 2.4],
      [0.84, 0.25, 2.2],
      [0.18, 0.58, 2],
      [0.9, 0.68, 2.4],
    ];
    for (const [x, y, radius] of sparkles) {
      ctx.fillStyle = "rgba(255, 240, 193, 0.82)";
      ctx.beginPath();
      ctx.arc(width * x, height * y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawDangerLine(shotsUntilSink: number): void {
    const { ctx } = this;
    const portrait = this.layout.height > this.layout.width * 1.08;
    const chipWidth = portrait ? 132 : 158;
    const chipHeight = 44;
    const chipX = this.layout.width - chipWidth - 16;
    ctx.strokeStyle = "#ff8e56";
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 14]);
    ctx.beginPath();
    ctx.moveTo(this.layout.boardX - 24, this.layout.dangerY);
    ctx.lineTo(this.layout.width - this.layout.boardX + 24, this.layout.dangerY);
    ctx.stroke();
    ctx.setLineDash([]);

    this.drawChip(
      chipX,
      this.layout.dangerY - 48,
      chipWidth,
      chipHeight,
      "rgba(75, 35, 17, 0.82)",
      `${shotsUntilSink} ${GAME_COPY.dangerLabel}`,
      undefined,
      true,
    );
  }

  private drawAnchors(board: Board): void {
    const topY = this.layout.boardY - 48;
    ANCHOR_COLS.forEach((col, index) => {
      const anchorX = this.cellCenter(0, col).x;
      const target = this.findAnchorTarget(board, index) ?? this.cellCenter(0, col);
      this.ctx.strokeStyle = "rgba(73, 117, 51, 0.96)";
      this.ctx.lineWidth = 6;
      this.ctx.lineCap = "round";
      this.ctx.beginPath();
      this.ctx.moveTo(anchorX, topY + 16);
      this.ctx.bezierCurveTo(anchorX - 8, topY + 70, target.x - 16, target.y - 62, target.x, target.y - 40);
      this.ctx.stroke();

      this.ctx.strokeStyle = "rgba(104, 65, 34, 0.8)";
      this.ctx.lineWidth = 2.5;
      this.ctx.beginPath();
      this.ctx.moveTo(anchorX - 11, topY + 7);
      this.ctx.quadraticCurveTo(anchorX - 24, topY - 2, anchorX - 16, topY - 14);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(anchorX + 8, topY + 9);
      this.ctx.quadraticCurveTo(anchorX + 21, topY, anchorX + 14, topY - 12);
      this.ctx.stroke();

      this.ctx.fillStyle = "#6f4c2a";
      this.ctx.beginPath();
      this.ctx.arc(anchorX, topY, 18, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = "#94c15a";
      this.ctx.beginPath();
      this.ctx.ellipse(anchorX - 8, topY - 8, 10, 6, -0.5, 0, Math.PI * 2);
      this.ctx.ellipse(anchorX + 9, topY - 9, 10, 6, 0.45, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.fillStyle = "rgba(255, 244, 218, 0.72)";
      this.ctx.beginPath();
      this.ctx.arc(anchorX, topY, 5.5, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  private findAnchorTarget(board: Board, anchorIndex: number): { x: number; y: number } | null {
    const anchorCol = ANCHOR_COLS[anchorIndex]!;
    let best: Slot | null = null;
    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board[row]!.length; col += 1) {
        if (!board[row]![col]) continue;
        const distance = Math.abs(col - anchorCol);
        if (distance > 1) continue;
        if (!best || row < best.row || (row === best.row && distance < Math.abs(best.col - anchorCol))) {
          best = { row, col };
        }
      }
      if (best) break;
    }
    return best ? this.cellCenter(best.row, best.col) : null;
  }

  private drawBoard(board: Board): void {
    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board[row]!.length; col += 1) {
        const color = board[row]![col];
        if (!color) continue;
        const center = this.cellCenter(row, col);
        this.drawFruit(center.x, center.y, this.layout.radius, color, 1);
      }
    }
  }

  private drawFalling(items: RenderFalling[]): void {
    for (const item of items) {
      const alpha = 1 - item.age01 * 0.45;
      this.drawFruit(item.x, item.y, this.layout.radius * 0.84, item.color, alpha);
    }
  }

  private drawBursts(items: RenderBurst[]): void {
    for (const item of items) {
      const { ctx } = this;
      const tone = fruitPalette[item.color];
      const radius = this.layout.radius * (0.8 + item.age01 * 1.4);
      ctx.strokeStyle = hexToRgba(tone.glow, 1 - item.age01);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(item.x, item.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = hexToRgba(tone.accent, 0.55 - item.age01 * 0.4);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(item.x, item.y, radius * 1.24, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawAimGuide(target: { x: number; y: number }): void {
    const { ctx } = this;
    ctx.strokeStyle = "rgba(255, 242, 204, 0.82)";
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(this.layout.launcherX, this.layout.launcherY);
    ctx.lineTo(target.x, target.y);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawLauncher(currentShot: LanternColor, reserveShot: LanternColor): void {
    const { ctx } = this;
    const baseRadius = this.layout.cell * 0.58;
    const bowl = ctx.createRadialGradient(
      this.layout.launcherX - 10,
      this.layout.launcherY - 12,
      this.layout.cell * 0.18,
      this.layout.launcherX,
      this.layout.launcherY,
      baseRadius,
    );
    bowl.addColorStop(0, "rgba(255, 248, 228, 0.95)");
    bowl.addColorStop(1, "rgba(88, 43, 16, 0.94)");
    ctx.fillStyle = "rgba(35, 27, 15, 0.82)";
    ctx.beginPath();
    ctx.arc(this.layout.launcherX, this.layout.launcherY + 8, baseRadius * 1.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bowl;
    ctx.beginPath();
    ctx.arc(this.layout.launcherX, this.layout.launcherY, baseRadius, 0, Math.PI * 2);
    ctx.fill();
    this.drawFruit(this.layout.launcherX, this.layout.launcherY - 3, this.layout.radius * 0.95, currentShot, 1);

    ctx.fillStyle = "rgba(18, 42, 20, 0.88)";
    roundRect(ctx, this.layout.reserveRect.x, this.layout.reserveRect.y, this.layout.reserveRect.width, this.layout.reserveRect.height, 28);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 247, 229, 0.68)";
    ctx.font = '12px "Avenir Next", "Trebuchet MS", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(GAME_COPY.reserveLabel, this.layout.reserveRect.x + this.layout.reserveRect.width / 2, this.layout.reserveRect.y + 26);
    this.drawFruit(
      this.layout.reserveRect.x + this.layout.reserveRect.width / 2,
      this.layout.reserveRect.y + this.layout.reserveRect.height / 2 + 10,
      this.layout.radius * 0.62,
      reserveShot,
      1,
    );
  }

  private drawHud(model: RenderModel): void {
    const portrait = this.layout.height > this.layout.width * 1.08;
    const chipWidth = portrait ? 136 : 180;
    const chipHeight = portrait ? 56 : 66;
    const topY = 16;
    this.drawChip(16, topY, chipWidth, chipHeight, "rgba(17, 45, 21, 0.88)", `${model.score}`, GAME_COPY.scoreLabel, portrait);
  }

  private drawDropLabel(text: string, age01: number): void {
    const alpha = 1 - age01;
    this.ctx.fillStyle = `rgba(255, 245, 213, ${alpha})`;
    this.ctx.font = '700 22px "Avenir Next", "Trebuchet MS", sans-serif';
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, this.layout.width / 2, this.layout.height > this.layout.width * 1.08 ? 152 : 70);
  }

  private drawStartOverlay(): void {
    const portrait = this.layout.height > this.layout.width * 1.08;
    if (portrait) {
      this.ctx.fillStyle = "rgba(13, 30, 15, 0.68)";
      roundRect(this.ctx, 18, this.layout.height - 292, this.layout.width - 36, 228, 34);
      this.ctx.fill();
    }
    this.ctx.fillStyle = "rgba(255, 247, 226, 0.98)";
    this.ctx.font = '700 56px "Avenir Next", "Trebuchet MS", sans-serif';
    this.ctx.textAlign = "center";
    this.ctx.fillText(GAME_COPY.title, this.layout.width / 2, portrait ? this.layout.height - 212 : this.layout.height - 210);
    this.ctx.fillStyle = "rgba(255, 247, 226, 0.82)";
    this.ctx.font = '24px "Avenir Next", "Trebuchet MS", sans-serif';
    this.ctx.fillText(
      portrait ? GAME_COPY.subtitlePortrait : GAME_COPY.subtitleLandscape,
      this.layout.width / 2,
      portrait ? this.layout.height - 176 : this.layout.height - 172,
    );
    this.drawPrimaryButton(GAME_COPY.startButton);
  }

  private drawGameOverOverlay(model: RenderModel): void {
    const portrait = this.layout.height > this.layout.width * 1.08;
    const panel = portrait
      ? { x: 82, y: 196, width: this.layout.width - 164, height: 882 }
      : { x: 398, y: 110, width: this.layout.width - 796, height: 660 };
    this.ctx.fillStyle = "rgba(12, 30, 15, 0.76)";
    roundRect(this.ctx, panel.x, panel.y, panel.width, panel.height, 44);
    this.ctx.fill();
    this.ctx.fillStyle = "rgba(22, 46, 25, 0.94)";
    roundRect(this.ctx, panel.x + 18, panel.y + 18, panel.width - 36, panel.height - 36, 34);
    this.ctx.fill();

    this.ctx.fillStyle = "#fff7e1";
    this.ctx.font = '700 48px "Avenir Next", "Trebuchet MS", sans-serif';
    this.ctx.textAlign = "center";
    this.ctx.fillText(GAME_COPY.gameOverTitle, panel.x + panel.width / 2, panel.y + 128);
    this.ctx.fillStyle = "rgba(255, 247, 226, 0.82)";
    this.ctx.font = '24px "Avenir Next", "Trebuchet MS", sans-serif';
    this.ctx.fillText(
      portrait ? GAME_COPY.gameOverPortrait : GAME_COPY.gameOverLandscape,
      panel.x + panel.width / 2,
      panel.y + 178,
    );
    this.drawStat(panel.x + panel.width * 0.32, panel.y + 320, GAME_COPY.runScoreLabel, `${model.score}`, true);
    this.drawStat(panel.x + panel.width * 0.68, panel.y + 320, GAME_COPY.bestDropLabel, `${model.largestDrop}`, true);
    this.drawStat(panel.x + panel.width / 2, panel.y + (portrait ? 676 : 470), GAME_COPY.bestLabel, `${model.bestScore}`, true);
    this.drawPrimaryButton(GAME_COPY.replayButton);
  }

  private drawStat(x: number, y: number, label: string, value: string, compact: boolean): void {
    this.ctx.fillStyle = "rgba(255, 247, 226, 0.56)";
    this.ctx.font = '14px "Avenir Next", "Trebuchet MS", sans-serif';
    this.ctx.textAlign = "center";
    this.ctx.fillText(label, x, y);
    this.ctx.fillStyle = "#fff7e1";
    this.ctx.font = compact
      ? '700 34px "Avenir Next", "Trebuchet MS", sans-serif'
      : '700 52px "Avenir Next", "Trebuchet MS", sans-serif';
    this.ctx.fillText(value, x, y + (compact ? 44 : 68));
  }

  private drawPrimaryButton(label: string): void {
    const rect = this.layout.primaryButtonRect;
    const gradient = this.ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
    gradient.addColorStop(0, "#ffe486");
    gradient.addColorStop(1, "#ff9e38");
    this.ctx.fillStyle = gradient;
    roundRect(this.ctx, rect.x, rect.y, rect.width, rect.height, 28);
    this.ctx.fill();
    this.ctx.fillStyle = "#553113";
    this.ctx.font = '700 32px "Avenir Next", "Trebuchet MS", sans-serif';
    this.ctx.textAlign = "center";
    this.ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2 + 11);
  }

  private drawChip(
    x: number,
    y: number,
    width: number,
    height: number,
    fill: string,
    value: string,
    label?: string,
    compact = false,
  ): void {
    roundRect(this.ctx, x, y, width, height, 24);
    this.ctx.fillStyle = fill;
    this.ctx.fill();
    if (label) {
      this.ctx.fillStyle = "rgba(255, 247, 226, 0.58)";
      this.ctx.font = '12px "Avenir Next", "Trebuchet MS", sans-serif';
      this.ctx.textAlign = "left";
      this.ctx.fillText(label, x + 18, y + 22);
    }
    this.ctx.fillStyle = "#fff7e1";
    this.ctx.font = compact ? '700 22px "Avenir Next", "Trebuchet MS", sans-serif' : '700 24px "Avenir Next", "Trebuchet MS", sans-serif';
    this.ctx.textAlign = "left";
    this.ctx.fillText(value, x + 18, y + height - (compact ? 14 : 16));
  }

  private drawFruit(x: number, y: number, radius: number, colorKey: LanternColor, alpha: number): void {
    const { ctx } = this;
    const sprite = this.assets.fruits[colorKey];
    const palette = fruitPalette[colorKey];
    const spriteSize = radius * 2.55;
    drawGlowCircle(ctx, x, y, radius + 12, hexToRgba(palette.glow, 0.2 * alpha));
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(19, 13, 10, 0.34)";
    ctx.beginPath();
    ctx.ellipse(x, y + radius * 0.96, radius * 0.92, radius * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(sprite, x - spriteSize / 2, y - spriteSize / 2, spriteSize, spriteSize);
    ctx.restore();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawGlowCircle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number): void {
  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;
  if (naturalWidth === 0 || naturalHeight === 0) throw new Error("[fruit-salad] background image has invalid size");
  const scale = Math.max(width / naturalWidth, height / naturalHeight);
  const drawWidth = naturalWidth * scale;
  const drawHeight = naturalHeight * scale;
  const x = (width - drawWidth) / 2;
  const y = (height - drawHeight) / 2;
  ctx.drawImage(image, x, y, drawWidth, drawHeight);
}

function hexToRgba(hex: string, alpha: number): string {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) throw new Error(`[fruit-salad] expected 6-digit hex color, received ${hex}`);
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
