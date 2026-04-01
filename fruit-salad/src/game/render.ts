import {
  ANCHOR_COLS,
  COLS,
  type Board,
  findAnchorSupportTarget,
  type LanternColor,
  neighborSlots,
  type ResolvedLantern,
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
  shotLeftBound: number;
  shotRightBound: number;
  launcherX: number;
  launcherY: number;
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

export interface RenderAppearing extends Slot {
  age01: number;
  color: LanternColor;
}

export interface RenderShot {
  x: number;
  y: number;
  color: LanternColor;
}

export interface RenderSinkSlide {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  to: Slot;
  age01: number;
  color: LanternColor;
}

export interface RenderPrediction {
  placed: ResolvedLantern;
  popped: ResolvedLantern[];
  dropped: ResolvedLantern[];
  willSink: boolean;
}

export interface RenderModel {
  board: Board;
  score: number;
  bestScore: number;
  largestDrop: number;
  shotsUntilSink: number;
  currentShot: LanternColor;
  screen: "start" | "playing" | "gameover";
  aimPath: Array<{ x: number; y: number }> | null;
  activeShot: RenderShot | null;
  popBursts: RenderBurst[];
  falling: RenderFalling[];
  appearing: RenderAppearing[];
  sinkSlides: RenderSinkSlide[];
  prediction: RenderPrediction | null;
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
    this.drawBounceWalls();
    this.drawAnchors(model.board);
    this.drawSupportLinks(model.board, model.prediction);
    const hidden = new Set(model.sinkSlides.map((item) => slotKey(item.to)));
    for (const item of model.appearing) hidden.add(slotKey(item));
    this.drawBoard(model.board, hidden);
    this.drawPrediction(model.prediction);
    this.drawSinkSlides(model.sinkSlides);
    this.drawAppearing(model.appearing);
    this.drawFalling(model.falling);
    this.drawBursts(model.popBursts);
    if (model.screen === "playing") {
      if (model.aimPath && !model.activeShot) this.drawAimGuide(model.aimPath);
      if (model.activeShot) this.drawFruit(model.activeShot.x, model.activeShot.y, this.layout.radius * 0.93, model.activeShot.color, 1);
      this.drawLauncher(model.currentShot);
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
    const shotLeftBound = boardX + cell * 0.18;
    const shotRightBound = boardX + cell * COLS + cell * 0.32;
    const portraitButtonWidth = Math.min(360, width - 36);
    const primaryButtonRect = portrait
      ? { x: width / 2 - portraitButtonWidth / 2, y: height - 106, width: portraitButtonWidth, height: 72 }
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
      shotLeftBound,
      shotRightBound,
      launcherX: width / 2,
      launcherY: portrait ? height - 82 : height - 94,
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

  private drawBounceWalls(): void {
    const { ctx } = this;
    const portrait = this.layout.height > this.layout.width * 1.08;
    const top = this.layout.boardY - this.layout.cell * 0.82;
    const bottom = Math.min(this.layout.dangerY + this.layout.cell * 0.6, this.layout.launcherY + this.layout.cell * 0.52);
    const wallHeight = bottom - top;
    const walls: ReadonlyArray<readonly [number, number]> = [
      [this.layout.shotLeftBound, 1],
      [this.layout.shotRightBound, -1],
    ];

    for (const [wallX, insideDirection] of walls) {
      const visualX = wallX + insideDirection * this.layout.cell * (portrait ? 0.11 : 0.08);
      const sway = this.layout.cell * 0.06 * insideDirection;
      const glow = ctx.createLinearGradient(0, top, 0, bottom);
      glow.addColorStop(0, portrait ? "rgba(236, 248, 190, 0.42)" : "rgba(225, 243, 176, 0.3)");
      glow.addColorStop(0.55, portrait ? "rgba(255, 233, 168, 0.26)" : "rgba(255, 228, 160, 0.18)");
      glow.addColorStop(1, portrait ? "rgba(236, 248, 190, 0.12)" : "rgba(225, 243, 176, 0.08)");
      const stripWidth = this.layout.cell * (portrait ? 0.34 : 0.24);
      const innerGlow = ctx.createLinearGradient(visualX, 0, visualX + insideDirection * stripWidth, 0);
      innerGlow.addColorStop(0, portrait ? "rgba(255, 244, 196, 0.2)" : "rgba(255, 244, 196, 0.13)");
      innerGlow.addColorStop(0.45, portrait ? "rgba(184, 223, 126, 0.12)" : "rgba(184, 223, 126, 0.08)");
      innerGlow.addColorStop(1, "rgba(184, 223, 126, 0)");

      ctx.fillStyle = innerGlow;
      ctx.fillRect(
        insideDirection > 0 ? visualX : visualX - stripWidth,
        top + 12,
        stripWidth,
        wallHeight - 24,
      );

      ctx.strokeStyle = portrait ? "rgba(94, 62, 35, 0.88)" : "rgba(82, 54, 29, 0.8)";
      ctx.lineWidth = Math.max(portrait ? 6 : 5, this.layout.cell * (portrait ? 0.095 : 0.085));
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(visualX, top);
      ctx.bezierCurveTo(
        visualX + sway,
        top + wallHeight * 0.28,
        visualX - sway,
        top + wallHeight * 0.7,
        visualX,
        bottom,
      );
      ctx.stroke();

      ctx.strokeStyle = glow;
      ctx.lineWidth = Math.max(2, this.layout.cell * 0.03);
      ctx.beginPath();
      ctx.moveTo(visualX - insideDirection * 1.5, top + 4);
      ctx.bezierCurveTo(
        visualX + sway,
        top + wallHeight * 0.28,
        visualX - sway,
        top + wallHeight * 0.7,
        visualX - insideDirection * 1.5,
        bottom - 4,
      );
      ctx.stroke();

      const leafYs = [0.18, 0.44, 0.72].map((progress) => top + wallHeight * progress);
      for (const leafY of leafYs) {
        ctx.fillStyle = portrait ? "rgba(140, 194, 88, 0.86)" : "rgba(130, 182, 83, 0.72)";
        ctx.beginPath();
        ctx.ellipse(
          visualX + insideDirection * this.layout.cell * (portrait ? 0.22 : 0.16),
          leafY,
          this.layout.cell * (portrait ? 0.13 : 0.12),
          this.layout.cell * (portrait ? 0.08 : 0.07),
          insideDirection * 0.8,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  }

  private drawAnchors(board: Board): void {
    const topY = this.layout.boardY - 48;
    ANCHOR_COLS.forEach((col, index) => {
      const anchorX = this.cellCenter(0, col).x;
      const supportTarget = findAnchorSupportTarget(board, index);
      const target = supportTarget ? this.cellCenter(supportTarget.row, supportTarget.col) : this.cellCenter(0, col);
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

  private drawSupportLinks(board: Board, prediction: RenderPrediction | null): void {
    const popped = new Set((prediction?.popped ?? []).map((cell) => slotKey(cell)));
    const dropped = new Set((prediction?.dropped ?? []).map((cell) => slotKey(cell)));
    const { ctx } = this;

    for (let col = 0; col < board[0]!.length; col += 1) {
      if (!board[0]![col]) continue;
      const center = this.cellCenter(0, col);
      ctx.strokeStyle = "rgba(121, 167, 76, 0.5)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(center.x, this.layout.boardY - 44);
      ctx.lineTo(center.x, center.y - this.layout.radius * 0.92);
      ctx.stroke();
      ctx.strokeStyle = "rgba(101, 66, 35, 0.55)";
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(center.x, this.layout.boardY - 44);
      ctx.lineTo(center.x, center.y - this.layout.radius * 0.92);
      ctx.stroke();
    }

    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board[row]!.length; col += 1) {
        const color = board[row]![col];
        if (!color) continue;
        const key = slotKey({ row, col });
        const center = this.cellCenter(row, col);
        for (const neighbor of neighborSlots(row, col)) {
          if (neighbor.row < row || (neighbor.row === row && neighbor.col <= col)) continue;
          if (!board[neighbor.row]![neighbor.col]) continue;
          const neighborKey = slotKey(neighbor);
          const neighborCenter = this.cellCenter(neighbor.row, neighbor.col);
          const highlightsDrop = dropped.has(key) || dropped.has(neighborKey);
          const highlightsPop = popped.has(key) || popped.has(neighborKey);

          ctx.strokeStyle = highlightsDrop
            ? "rgba(255, 200, 112, 0.56)"
            : highlightsPop
              ? "rgba(255, 245, 214, 0.58)"
              : "rgba(96, 143, 57, 0.48)";
          ctx.lineWidth = highlightsDrop ? 5 : 4.6;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(center.x, center.y);
          ctx.lineTo(neighborCenter.x, neighborCenter.y);
          ctx.stroke();

          ctx.strokeStyle = highlightsDrop
            ? "rgba(115, 71, 29, 0.68)"
            : "rgba(108, 72, 41, 0.58)";
          ctx.lineWidth = highlightsDrop ? 2.2 : 1.9;
          ctx.beginPath();
          ctx.moveTo(center.x, center.y);
          ctx.lineTo(neighborCenter.x, neighborCenter.y);
          ctx.stroke();
        }
      }
    }
  }

  private drawBoard(board: Board, hidden = new Set<string>()): void {
    for (let row = 0; row < board.length; row += 1) {
      for (let col = 0; col < board[row]!.length; col += 1) {
        if (hidden.has(slotKey({ row, col }))) continue;
        const color = board[row]![col];
        if (!color) continue;
        const center = this.cellCenter(row, col);
        this.drawFruit(center.x, center.y, this.layout.radius, color, 1);
      }
    }
  }

  private drawPrediction(prediction: RenderPrediction | null): void {
    if (!prediction) return;

    const pulse = 0.4 + ((Math.sin(performance.now() / 120) + 1) * 0.5) * 0.35;
    const target = this.cellCenter(prediction.placed.row, prediction.placed.col);

    this.drawFruit(target.x, target.y, this.layout.radius * 0.96, prediction.placed.color, 0.38);

    this.ctx.strokeStyle = `rgba(255, 246, 216, ${0.5 + pulse * 0.3})`;
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.arc(target.x, target.y, this.layout.radius * 0.96, 0, Math.PI * 2);
    this.ctx.stroke();

    for (const cell of prediction.popped) {
      const center = this.cellCenter(cell.row, cell.col);
      this.ctx.strokeStyle = `rgba(255, 244, 208, ${0.62 + pulse * 0.18})`;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, this.layout.radius * 1.05, 0, Math.PI * 2);
      this.ctx.stroke();
    }

    for (const cell of prediction.dropped) {
      const center = this.cellCenter(cell.row, cell.col);
      this.ctx.strokeStyle = `rgba(255, 194, 92, ${0.54 + pulse * 0.18})`;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(center.x, center.y, this.layout.radius * 1.08, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.strokeStyle = `rgba(255, 223, 159, ${0.48 + pulse * 0.14})`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(center.x, center.y + this.layout.radius * 1.15);
      this.ctx.lineTo(center.x, center.y + this.layout.radius * 1.62);
      this.ctx.stroke();
    }

    const cue = prediction.dropped.length > 0 ? `${GAME_COPY.dropPrefix} x${prediction.dropped.length}` : prediction.willSink ? "ROW DROPS" : null;
    if (cue) {
      this.ctx.fillStyle = "rgba(255, 244, 212, 0.92)";
      this.ctx.font = '700 18px "Avenir Next", "Trebuchet MS", sans-serif';
      this.ctx.textAlign = "center";
      this.ctx.fillText(cue, this.layout.width / 2, this.layout.height > this.layout.width * 1.08 ? 86 : 58);
    }
  }

  private drawSinkSlides(items: RenderSinkSlide[]): void {
    for (const item of items) {
      const eased = easeOutCubic(item.age01);
      const x = item.fromX + (item.toX - item.fromX) * eased;
      const y = item.fromY + (item.toY - item.fromY) * eased;
      this.drawFruit(x, y, this.layout.radius, item.color, 1);
    }
  }

  private drawFalling(items: RenderFalling[]): void {
    for (const item of items) {
      const alpha = 1 - item.age01 * 0.45;
      this.drawFruit(item.x, item.y, this.layout.radius * 0.84, item.color, alpha);
    }
  }

  private drawAppearing(items: RenderAppearing[]): void {
    for (const item of items) {
      const center = this.cellCenter(item.row, item.col);
      const eased = easeOutBack(Math.min(1, item.age01));
      const radius = this.layout.radius * (0.52 + eased * 0.48);
      const alpha = Math.min(1, 0.2 + item.age01 * 1.15);
      this.drawFruit(center.x, center.y, radius, item.color, alpha);
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

  private drawAimGuide(path: Array<{ x: number; y: number }>): void {
    if (path.length < 2) return;
    const { ctx } = this;
    ctx.strokeStyle = "rgba(255, 242, 204, 0.82)";
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.moveTo(path[0]!.x, path[0]!.y);
    for (let index = 1; index < path.length; index += 1) {
      ctx.lineTo(path[index]!.x, path[index]!.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawLauncher(currentShot: LanternColor): void {
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
  }

  private drawHud(model: RenderModel): void {
    const portrait = this.layout.height > this.layout.width * 1.08;
    const warning = Boolean(model.prediction?.willSink);
    if (portrait) {
      const scoreWidth = 134;
      const sinkWidth = 150;
      const chipHeight = 52;
      const gap = 10;
      const totalWidth = scoreWidth + sinkWidth + gap;
      const topY = 18;
      const leftX = this.layout.width / 2 - totalWidth / 2;
      this.drawChip(leftX, topY, scoreWidth, chipHeight, "rgba(17, 45, 21, 0.86)", `${model.score}`, GAME_COPY.scoreLabel, true);
      this.drawChip(
        leftX + scoreWidth + gap,
        topY,
        sinkWidth,
        chipHeight,
        warning ? "rgba(116, 57, 22, 0.9)" : "rgba(75, 35, 17, 0.78)",
        `${model.shotsUntilSink}`,
        GAME_COPY.dangerLabel,
        true,
      );
      if (warning) this.drawChipWarning(leftX + scoreWidth + gap, topY, sinkWidth, chipHeight);
      return;
    }

    const chipWidth = 154;
    const chipHeight = 64;
    const stackX = this.layout.shotLeftBound - chipWidth - 26;
    const topY = this.layout.boardY + 20;
    this.drawChip(stackX, topY, chipWidth, chipHeight, "rgba(17, 45, 21, 0.86)", `${model.score}`, GAME_COPY.scoreLabel);
    this.drawChip(
      stackX,
      topY + chipHeight + 12,
      chipWidth,
      chipHeight,
      warning ? "rgba(116, 57, 22, 0.9)" : "rgba(75, 35, 17, 0.78)",
      `${model.shotsUntilSink}`,
      GAME_COPY.dangerLabel,
    );
    if (warning) this.drawChipWarning(stackX, topY + chipHeight + 12, chipWidth, chipHeight);
  }

  private drawDropLabel(text: string, age01: number): void {
    const alpha = 1 - age01;
    this.ctx.fillStyle = `rgba(255, 245, 213, ${alpha})`;
    this.ctx.font = '700 22px "Avenir Next", "Trebuchet MS", sans-serif';
    this.ctx.textAlign = "center";
    this.ctx.fillText(text, this.layout.width / 2, this.layout.height > this.layout.width * 1.08 ? 118 : 70);
  }

  private drawStartOverlay(): void {
    const portrait = this.layout.height > this.layout.width * 1.08;
    if (portrait) {
      const card = {
        x: 16,
        y: this.layout.primaryButtonRect.y - 176,
        width: this.layout.width - 32,
        height: 152,
      };
      this.ctx.fillStyle = "rgba(13, 30, 15, 0.68)";
      roundRect(this.ctx, card.x, card.y, card.width, card.height, 34);
      this.ctx.fill();
      this.ctx.fillStyle = "rgba(255, 247, 226, 0.98)";
      this.ctx.font = '700 46px "Avenir Next", "Trebuchet MS", sans-serif';
      this.ctx.textAlign = "center";
      this.ctx.fillText(GAME_COPY.title, this.layout.width / 2, card.y + 60);
      this.ctx.fillStyle = "rgba(255, 247, 226, 0.82)";
      this.ctx.font = '18px "Avenir Next", "Trebuchet MS", sans-serif';
      this.drawWrappedText(GAME_COPY.subtitlePortrait, this.layout.width / 2, card.y + 92, card.width - 40, 22);
      this.drawPrimaryButton(GAME_COPY.startButton);
      return;
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
      ? {
          x: 18,
          y: this.layout.primaryButtonRect.y - 20 - Math.min(384, Math.max(320, this.layout.height * 0.38)),
          width: this.layout.width - 36,
          height: Math.min(384, Math.max(320, this.layout.height * 0.38)),
        }
      : { x: 398, y: 110, width: this.layout.width - 796, height: 660 };
    this.ctx.fillStyle = "rgba(12, 30, 15, 0.76)";
    roundRect(this.ctx, panel.x, panel.y, panel.width, panel.height, 44);
    this.ctx.fill();
    this.ctx.fillStyle = "rgba(22, 46, 25, 0.94)";
    roundRect(this.ctx, panel.x + 18, panel.y + 18, panel.width - 36, panel.height - 36, 34);
    this.ctx.fill();

    const centerX = panel.x + panel.width / 2;
    this.ctx.fillStyle = "#fff7e1";
    this.ctx.textAlign = "center";
    this.ctx.font = portrait
      ? '700 34px "Avenir Next", "Trebuchet MS", sans-serif'
      : '700 48px "Avenir Next", "Trebuchet MS", sans-serif';
    const titleBottom = this.drawWrappedText(
      GAME_COPY.gameOverTitle,
      centerX,
      panel.y + (portrait ? 60 : 128),
      panel.width - (portrait ? 48 : 72),
      portrait ? 38 : 52,
    );
    this.ctx.fillStyle = "rgba(255, 247, 226, 0.82)";
    this.ctx.font = portrait
      ? '18px "Avenir Next", "Trebuchet MS", sans-serif'
      : '24px "Avenir Next", "Trebuchet MS", sans-serif';
    const subtitleBottom = this.drawWrappedText(
      portrait ? GAME_COPY.gameOverPortrait : GAME_COPY.gameOverLandscape,
      centerX,
      titleBottom + (portrait ? 22 : 18),
      panel.width - (portrait ? 52 : 96),
      portrait ? 24 : 30,
    );
    if (portrait) {
      const statsY = subtitleBottom + 44;
      this.drawStat(panel.x + panel.width * 0.32, statsY, GAME_COPY.runScoreLabel, `${model.score}`, true);
      this.drawStat(panel.x + panel.width * 0.68, statsY, GAME_COPY.bestDropLabel, `${model.largestDrop}`, true);
      this.drawStat(centerX, statsY + 96, GAME_COPY.bestLabel, `${model.bestScore}`, true);
    } else {
      this.drawStat(panel.x + panel.width * 0.32, panel.y + 320, GAME_COPY.runScoreLabel, `${model.score}`, true);
      this.drawStat(panel.x + panel.width * 0.68, panel.y + 320, GAME_COPY.bestDropLabel, `${model.largestDrop}`, true);
      this.drawStat(centerX, panel.y + 470, GAME_COPY.bestLabel, `${model.bestScore}`, true);
    }
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
    this.ctx.font = this.layout.height > this.layout.width * 1.08
      ? '700 28px "Avenir Next", "Trebuchet MS", sans-serif'
      : '700 32px "Avenir Next", "Trebuchet MS", sans-serif';
    this.ctx.textAlign = "center";
    this.ctx.fillText(label, rect.x + rect.width / 2, rect.y + rect.height / 2 + (this.layout.height > this.layout.width * 1.08 ? 10 : 11));
  }

  private drawWrappedText(text: string, x: number, y: number, maxWidth: number, lineHeight: number): number {
    const lines = wrapText(this.ctx, text, maxWidth);
    for (let index = 0; index < lines.length; index += 1) {
      this.ctx.fillText(lines[index]!, x, y + index * lineHeight);
    }
    return y + (lines.length - 1) * lineHeight;
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

  private drawChipWarning(x: number, y: number, width: number, height: number): void {
    this.ctx.strokeStyle = "rgba(255, 226, 156, 0.84)";
    this.ctx.lineWidth = 2.5;
    roundRect(this.ctx, x + 4, y + 4, width - 8, height - 8, 20);
    this.ctx.stroke();
  }

  private drawFruit(x: number, y: number, radius: number, colorKey: LanternColor, alpha: number): void {
    const { ctx } = this;
    const sprite = this.assets.fruits[colorKey];
    const spriteSize = radius * 2.55;
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

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = word;
      continue;
    }
    current = candidate;
  }

  if (current) lines.push(current);
  return lines;
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

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function easeOutBack(value: number): number {
  const overshoot = 1.70158;
  const shifted = value - 1;
  return 1 + (overshoot + 1) * shifted ** 3 + overshoot * shifted ** 2;
}

function slotKey(slot: Slot): string {
  return `${slot.row}:${slot.col}`;
}
