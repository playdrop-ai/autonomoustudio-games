import {
  backdropVariantForViewport,
  type RuntimeBackdropAsset,
  type RuntimeBackdropPack,
  type RuntimeBackdropVariant,
} from "./backdrops";
import {
  BLOSSOM_KINDS,
  LANE_COUNT,
  ROW_COUNT,
  STRIKE_LIMIT,
  activePairs,
  nextLaneForRow,
  type Blossom,
  type BlossomKind,
  type GameState,
  type Screen,
} from "./logic";

export interface AccentLabel {
  text: string;
  color: string;
  opacity: number;
}

export interface Layout {
  width: number;
  height: number;
  backdropVariant: RuntimeBackdropVariant | "procedural";
  backdropDrawX: number;
  backdropDrawY: number;
  backdropDrawWidth: number;
  backdropDrawHeight: number;
  boardX: number;
  boardY: number;
  boardWidth: number;
  boardHeight: number;
  laneCenters: number[];
  rowBoundaries: number[];
  latchRows: number[];
  vaseY: number;
  latchRadius: number;
}

export interface RenderModel {
  state: GameState;
  screen: Screen;
  bestScore: number;
  accent: AccentLabel | null;
  spawnCharge01: number;
}

interface BlossomPalette {
  fill: string;
  glow: string;
  petal: string;
}

const BLOSSOM_PALETTE: Record<BlossomKind, BlossomPalette> = {
  rose: { fill: "#ff6f98", glow: "#ffd4df", petal: "#fff6f9" },
  iris: { fill: "#8a7bff", glow: "#e0dcff", petal: "#f4f1ff" },
  sun: { fill: "#ffd765", glow: "#fff0b8", petal: "#fff7d4" },
  mint: { fill: "#56d8ac", glow: "#cdffe8", petal: "#effff8" },
};

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly backdropPack: RuntimeBackdropPack | null;
  private width = 1;
  private height = 1;
  private dpr = 1;
  private layout: Layout = this.computeLayout(1, 1);

  constructor(canvas: HTMLCanvasElement, backdropPack: RuntimeBackdropPack | null = null) {
    this.canvas = canvas;
    this.backdropPack = backdropPack;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("[latchbloom] canvas 2D context unavailable");
    this.ctx = ctx;
    this.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  }

  resize(width: number, height: number, dpr: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.dpr = Math.max(1, dpr);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.layout = this.computeLayout(this.width, this.height);
  }

  getLayout(): Layout {
    return this.layout;
  }

  locateLatch(clientX: number, clientY: number): { row: number; pairIndex: number } | null {
    const threshold = this.layout.latchRadius * 1.2;
    for (let row = 0; row < this.layout.latchRows.length; row += 1) {
      const pairs = activePairs(row);
      for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
        const [left, right] = pairs[pairIndex]!;
        const x = (this.layout.laneCenters[left]! + this.layout.laneCenters[right]!) / 2;
        const y = this.layout.latchRows[row]!;
        const dx = clientX - x;
        const dy = clientY - y;
        if (Math.hypot(dx, dy) <= threshold) return { row, pairIndex };
      }
    }
    return null;
  }

  render(model: RenderModel): void {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();
    this.drawBoardShell();
    this.drawLaneBackplates(model.screen === "gameover");
    this.drawNetwork(model.state, model.screen === "gameover");
    this.drawLatches(model.state, model.screen === "gameover");
    this.drawVases(model.state, model.screen === "gameover");
    this.drawBlossoms(model.state, model.screen === "gameover");
    this.drawGlassHighlight(model.screen === "gameover");
    if (model.screen !== "gameover") {
      this.drawNextPreview(model);
    }
    if (model.screen === "playing") {
      this.drawHud(model);
    }

    if (model.screen === "start") {
      this.drawStartOverlay();
    } else if (model.screen === "gameover") {
      this.drawGameOverOverlay(model.state.score, model.bestScore);
    }
  }

  private computeLayout(width: number, height: number): Layout {
    const portraitish = width <= height;
    const activeBackdrop = this.getBackdropForViewport(width, height);

    let boardX: number;
    let boardY: number;
    let boardWidth: number;
    let boardHeight: number;
    let backdropDrawX = 0;
    let backdropDrawY = 0;
    let backdropDrawWidth = width;
    let backdropDrawHeight = height;
    let backdropVariant: RuntimeBackdropVariant | "procedural" = "procedural";

    if (activeBackdrop) {
      const drawRect = this.coverRect(activeBackdrop.image.naturalWidth, activeBackdrop.image.naturalHeight, width, height);
      backdropDrawX = drawRect.x;
      backdropDrawY = drawRect.y;
      backdropDrawWidth = drawRect.width;
      backdropDrawHeight = drawRect.height;
      backdropVariant = activeBackdrop.variant;

      boardX = drawRect.x + drawRect.width * activeBackdrop.boardRect.x;
      boardY = drawRect.y + drawRect.height * activeBackdrop.boardRect.y;
      boardWidth = drawRect.width * activeBackdrop.boardRect.width;
      boardHeight = drawRect.height * activeBackdrop.boardRect.height;
    } else {
      const safePadding = portraitish ? 34 : 56;
      const maxBoardHeight = portraitish ? height - 228 : height - 102;
      const idealHeight = portraitish ? Math.min(980, maxBoardHeight) : Math.min(792, maxBoardHeight);
      boardHeight = Math.max(600, idealHeight);
      boardWidth = portraitish
        ? Math.min(width - safePadding * 2, boardHeight * 0.6)
        : Math.min(width - safePadding * 2, boardHeight * 0.86);
      boardX = (width - boardWidth) / 2;
      boardY = portraitish ? Math.max(164, (height - boardHeight) / 2 + 34) : Math.max(52, (height - boardHeight) / 2);
    }

    const laneInset = boardWidth * 0.15;
    const laneCenters = Array.from({ length: LANE_COUNT }, (_, index) => boardX + laneInset + (index * (boardWidth - laneInset * 2)) / (LANE_COUNT - 1));
    const topY = boardY + boardHeight * 0.12;
    const bottomY = boardY + boardHeight * 0.74;
    const rowBoundaries = Array.from({ length: ROW_COUNT + 1 }, (_, index) => topY + (index * (bottomY - topY)) / ROW_COUNT);
    const latchRows = Array.from({ length: ROW_COUNT }, (_, index) => (rowBoundaries[index]! + rowBoundaries[index + 1]!) / 2);
    const vaseY = boardY + boardHeight - 88;
    const latchRadius = Math.max(20, Math.min(28, boardWidth * 0.045));

    return {
      width,
      height,
      backdropVariant,
      backdropDrawX,
      backdropDrawY,
      backdropDrawWidth,
      backdropDrawHeight,
      boardX,
      boardY,
      boardWidth,
      boardHeight,
      laneCenters,
      rowBoundaries,
      latchRows,
      vaseY,
      latchRadius,
    };
  }

  private getBackdropForViewport(width: number, height: number): (RuntimeBackdropAsset & { variant: RuntimeBackdropVariant }) | null {
    if (!this.backdropPack) return null;
    const variant = backdropVariantForViewport(width, height);
    const backdrop = this.backdropPack[variant];
    return {
      ...backdrop,
      variant,
    };
  }

  private coverRect(
    sourceWidth: number,
    sourceHeight: number,
    targetWidth: number,
    targetHeight: number,
  ): { x: number; y: number; width: number; height: number } {
    const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
    const width = sourceWidth * scale;
    const height = sourceHeight * scale;
    return {
      x: (targetWidth - width) / 2,
      y: (targetHeight - height) / 2,
      width,
      height,
    };
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, "#09131d");
    gradient.addColorStop(0.52, "#0f1f2f");
    gradient.addColorStop(1, "#1a1632");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.layout.backdropVariant !== "procedural" && this.backdropPack) {
      const backdrop = this.backdropPack[this.layout.backdropVariant];
      ctx.drawImage(
        backdrop.image,
        this.layout.backdropDrawX,
        this.layout.backdropDrawY,
        this.layout.backdropDrawWidth,
        this.layout.backdropDrawHeight,
      );
      const glaze = ctx.createLinearGradient(0, 0, 0, this.height);
      glaze.addColorStop(0, "rgba(8,15,24,0.12)");
      glaze.addColorStop(0.7, "rgba(9,19,29,0)");
      glaze.addColorStop(1, "rgba(6,14,22,0.18)");
      ctx.fillStyle = glaze;
      ctx.fillRect(0, 0, this.width, this.height);
      return;
    }

    this.fillGlow(this.width * 0.12, this.height * 0.14, this.width * 0.16, "rgba(28,70,84,0.34)");
    this.fillGlow(this.width * 0.84, this.height * 0.18, this.width * 0.14, "rgba(67,35,90,0.28)");
    this.fillGlow(this.width * 0.7, this.height * 0.76, this.width * 0.24, "rgba(19,54,69,0.26)");

    const paneXs = [0.08, 0.24, 0.76, 0.92];
    for (const paneX of paneXs) {
      const x = this.width * paneX;
      ctx.fillStyle = "rgba(214,255,247,0.03)";
      ctx.fillRect(x - 28, -24, 56, this.height + 48);
      ctx.fillStyle = "rgba(243,255,249,0.05)";
      ctx.fillRect(x - 6, -24, 12, this.height + 48);
    }

    const motes: Array<[number, number]> = [
      [0.16, 0.12],
      [0.26, 0.32],
      [0.86, 0.28],
      [0.72, 0.16],
      [0.24, 0.72],
      [0.68, 0.62],
      [0.82, 0.84],
      [0.14, 0.88],
    ];
    for (const [x, y] of motes) {
      this.fillCircle(this.width * x, this.height * y, 2.2, "rgba(255,243,201,0.68)");
      this.fillCircle(this.width * x, this.height * y, 9, "rgba(255,243,201,0.05)");
    }
  }

  private drawBoardShell(): void {
    if (this.layout.backdropVariant !== "procedural") return;
    const ctx = this.ctx;
    const { boardX, boardY, boardWidth, boardHeight } = this.layout;
    this.drawRoundedRect(boardX - 18, boardY - 18, boardWidth + 36, boardHeight + 36, 46, "rgba(22,53,73,0.38)", 28);
    const frame = ctx.createLinearGradient(boardX - 8, boardY - 8, boardX + boardWidth + 8, boardY + boardHeight + 8);
    frame.addColorStop(0, "#39647a");
    frame.addColorStop(1, "#153043");
    this.fillRoundedRect(boardX - 8, boardY - 8, boardWidth + 16, boardHeight + 16, 42, frame);
    const glass = ctx.createLinearGradient(boardX, boardY, boardX, boardY + boardHeight);
    glass.addColorStop(0, "#14374a");
    glass.addColorStop(1, "#0e2232");
    this.fillRoundedRect(boardX, boardY, boardWidth, boardHeight, 36, glass);
  }

  private drawLaneBackplates(dim: boolean): void {
    const ctx = this.ctx;
    const { laneCenters, rowBoundaries, vaseY } = this.layout;
    const hasBackdrop = this.layout.backdropVariant !== "procedural";
    for (const x of laneCenters) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(213,255,241,${dim ? 0.08 : hasBackdrop ? 0.09 : 0.13})`;
      ctx.lineWidth = 68;
      ctx.beginPath();
      ctx.moveTo(x, rowBoundaries[0]! - 40);
      ctx.bezierCurveTo(x - 8, rowBoundaries[1]! + 18, x + 10, rowBoundaries[3]! + 28, x, vaseY - 68);
      ctx.stroke();
      ctx.strokeStyle = `rgba(109,225,207,${dim ? 0.12 : hasBackdrop ? 0.18 : 0.24})`;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawNetwork(state: GameState, dim: boolean): void {
    const { laneCenters, rowBoundaries, vaseY } = this.layout;
    for (let row = 0; row < ROW_COUNT; row += 1) {
      const pairs = activePairs(row);
      const yTop = rowBoundaries[row]!;
      const yBottom = rowBoundaries[row + 1]!;
      const used = new Set<number>();

      for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
        const [left, right] = pairs[pairIndex]!;
        const crossed = state.latches[row]![pairIndex] === "cross";
        used.add(left);
        used.add(right);
        this.drawSegment(laneCenters[left]!, crossed ? laneCenters[right]! : laneCenters[left]!, yTop, yBottom, dim);
        this.drawSegment(laneCenters[right]!, crossed ? laneCenters[left]! : laneCenters[right]!, yTop, yBottom, dim);
      }

      for (let lane = 0; lane < laneCenters.length; lane += 1) {
        if (!used.has(lane)) this.drawSegment(laneCenters[lane]!, laneCenters[lane]!, yTop, yBottom, dim);
      }
    }

    for (const x of laneCenters) {
      this.drawSegment(x, x, rowBoundaries[ROW_COUNT]!, vaseY - 72, dim, 12);
    }
  }

  private drawSegment(x1: number, x2: number, y1: number, y2: number, dim: boolean, width = 14): void {
    const ctx = this.ctx;
    const curve = Math.abs(x2 - x1) * 0.45;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1, y1 + curve, x2, y2 - curve, x2, y2);
    ctx.strokeStyle = `rgba(238,253,247,${dim ? 0.11 : 0.22})`;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1, y1 + curve, x2, y2 - curve, x2, y2);
    ctx.strokeStyle = `rgba(109,225,207,${dim ? 0.18 : 0.38})`;
    ctx.lineWidth = Math.max(4, width - 8);
    ctx.stroke();
    ctx.restore();
  }

  private drawLatches(state: GameState, dim: boolean): void {
    const { laneCenters, latchRows, latchRadius } = this.layout;
    const ctx = this.ctx;
    for (let row = 0; row < latchRows.length; row += 1) {
      const pairs = activePairs(row);
      for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
        const [left, right] = pairs[pairIndex]!;
        const x = (laneCenters[left]! + laneCenters[right]!) / 2;
        const y = latchRows[row]!;
        const crossed = state.latches[row]![pairIndex] === "cross";

        this.fillCircle(x, y, latchRadius + 8, `rgba(64,38,20,${dim ? 0.48 : 0.72})`);
        this.fillCircle(x, y, latchRadius + 3, `rgba(157,106,52,${dim ? 0.72 : 0.98})`);
        const latchFill = ctx.createLinearGradient(x - latchRadius, y - latchRadius, x + latchRadius, y + latchRadius);
        latchFill.addColorStop(0, "#ffd98a");
        latchFill.addColorStop(1, "#c88429");
        this.fillCircle(x, y, latchRadius - 2, latchFill);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(((crossed ? 35 : 0) * Math.PI) / 180);
        this.fillRoundedRect(-14, -4, 28, 8, 4, `rgba(255,244,212,${dim ? 0.56 : 0.92})`);
        ctx.rotate((((crossed ? -35 : 90) - (crossed ? 35 : 0)) * Math.PI) / 180);
        this.fillRoundedRect(-14, -4, 28, 8, 4, `rgba(243,203,111,${dim ? 0.56 : 0.92})`);
        ctx.restore();

        this.fillCircle(x, y, 4.5, `rgba(255,248,223,${dim ? 0.4 : 0.9})`);
      }
    }
  }

  private drawVases(state: GameState, dim: boolean): void {
    const { laneCenters, vaseY } = this.layout;
    for (let lane = 0; lane < LANE_COUNT; lane += 1) {
      const vase = state.vases[lane]!;
      const palette = BLOSSOM_PALETTE[vase.target];
      const x = laneCenters[lane]!;
      const burstGlow = vase.burstTimer > 0 ? vase.burstTimer * 40 : 0;
      const wrongGlow = vase.wrongTimer > 0 ? vase.wrongTimer * 28 : 0;

      this.fillEllipse(x, vaseY + 12, 48, 18, `rgba(10,22,33,${dim ? 0.24 : 0.42})`);
      if (burstGlow > 0) this.fillGlow(x, vaseY - 18, 56 + burstGlow, `rgba(255,215,101,${0.08 + vase.burstTimer * 0.12})`);
      if (wrongGlow > 0) this.fillGlow(x, vaseY - 24, 48 + wrongGlow, `rgba(210,86,94,${0.08 + vase.wrongTimer * 0.16})`);

      const bodyGradient = this.ctx.createLinearGradient(x, vaseY - 10, x, vaseY + 92);
      bodyGradient.addColorStop(0, "#224b67");
      bodyGradient.addColorStop(1, "#132a3e");
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(x - 42, vaseY - 10);
      this.ctx.bezierCurveTo(x - 36, vaseY + 42, x - 26, vaseY + 82, x, vaseY + 92);
      this.ctx.bezierCurveTo(x + 26, vaseY + 82, x + 36, vaseY + 42, x + 42, vaseY - 10);
      this.ctx.closePath();
      this.ctx.fillStyle = `rgba(23,53,74,${dim ? 0.56 : 0.96})`;
      this.ctx.fill();
      this.ctx.restore();

      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(x - 34, vaseY - 6);
      this.ctx.bezierCurveTo(x - 28, vaseY + 34, x - 18, vaseY + 62, x, vaseY + 70);
      this.ctx.bezierCurveTo(x + 18, vaseY + 62, x + 28, vaseY + 34, x + 34, vaseY - 6);
      this.ctx.closePath();
      this.ctx.fillStyle = bodyGradient;
      this.ctx.globalAlpha = dim ? 0.44 : 0.88;
      this.ctx.fill();
      this.ctx.restore();

      this.fillCircle(x, vaseY - 28, 22, dim ? this.withAlpha(palette.fill, 0.36) : palette.fill);
      this.drawFlowerIcon(vase.target, x, vaseY - 28, 15, dim ? 0.32 : 0.98);

      for (let dot = 0; dot < 3; dot += 1) {
        const dotX = x - 24 + dot * 24;
        this.fillCircle(dotX, vaseY + 26, 7.5, dot < vase.meter ? palette.fill : "rgba(33,66,87,0.72)");
      }
    }
  }

  private drawBlossoms(state: GameState, dim: boolean): void {
    for (const blossom of state.blossoms) {
      const position = this.getBlossomPosition(blossom, state);
      const palette = BLOSSOM_PALETTE[blossom.kind];
      this.fillCircle(position.x, position.y, 28 * position.scale, `rgba(255,255,255,${dim ? 0.06 : 0.08})`);
      this.fillCircle(position.x, position.y, 24 * position.scale, dim ? this.withAlpha(palette.glow, 0.18) : this.withAlpha(palette.glow, 0.32));
      this.fillCircle(position.x, position.y, 20 * position.scale, dim ? this.withAlpha(palette.fill, 0.42) : palette.fill);
      this.drawFlowerIcon(blossom.kind, position.x, position.y, 14 * position.scale, dim ? 0.42 : 1);
    }
  }

  private getBlossomPosition(blossom: Blossom, state: GameState): { x: number; y: number; scale: number } {
    const { laneCenters, rowBoundaries, vaseY } = this.layout;
    const x1 = laneCenters[blossom.fromLane]!;
    const x2 = laneCenters[blossom.toLane]!;
    const segmentTop = blossom.segment === 0 ? rowBoundaries[0]! - 42 : rowBoundaries[blossom.segment]!;
    const segmentBottom = blossom.segment === ROW_COUNT ? vaseY - 74 : rowBoundaries[blossom.segment + 1]!;
    const curve = Math.abs(x2 - x1) * 0.45;
    const t = blossom.progress;
    const x =
      (1 - t) ** 3 * x1 +
      3 * (1 - t) ** 2 * t * x1 +
      3 * (1 - t) * t ** 2 * x2 +
      t ** 3 * x2;
    const y =
      (1 - t) ** 3 * segmentTop +
      3 * (1 - t) ** 2 * t * (segmentTop + curve) +
      3 * (1 - t) * t ** 2 * (segmentBottom - curve) +
      t ** 3 * segmentBottom;
    return { x, y, scale: 0.94 + blossom.progress * 0.08 };
  }

  private drawGlassHighlight(dim: boolean): void {
    const { boardX, boardY, boardWidth, boardHeight } = this.layout;
    this.strokeRoundedRect(boardX + 16, boardY + 16, boardWidth - 32, boardHeight - 32, 28, `rgba(237,255,247,${dim ? 0.08 : 0.18})`, 2);
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = `rgba(247,255,249,${dim ? 0.04 : 0.08})`;
    ctx.lineWidth = 18;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(boardX + 40, boardY + 76);
    ctx.bezierCurveTo(boardX + 200, boardY + 40, boardX + 380, boardY + 100, boardX + boardWidth - 40, boardY + 52);
    ctx.stroke();
    ctx.restore();
  }

  private drawHud(model: RenderModel): void {
    const ctx = this.ctx;
    const portraitish = this.width <= this.height;
    ctx.save();
    if (portraitish) {
      const railY = Math.max(26, this.layout.boardY - 88);
      const railLeft = Math.max(18, this.layout.boardX + 16);
      const railRight = Math.min(this.width - 18, this.layout.boardX + this.layout.boardWidth - 16);

      ctx.fillStyle = "#9ee3cf";
      ctx.font = "700 14px 'Trebuchet MS', 'Avenir Next', sans-serif";
      ctx.letterSpacing = "0.12em";
      ctx.fillText("SCORE", railLeft, railY + 14);

      ctx.fillStyle = "#f8fff8";
      ctx.font = "700 34px 'Trebuchet MS', 'Avenir Next', sans-serif";
      ctx.fillText(this.formatScore(model.state.score), railLeft, railY + 48);

      for (let index = 0; index < STRIKE_LIMIT; index += 1) {
        const x = railRight - 74 + index * 28;
        const y = railY + 24;
        const lit = index < model.state.strikes;
        const color = index === 0 ? "#f3cc6b" : index === 1 ? "#f0a94d" : "#ff6f86";
        this.fillCircle(x, y, 10, lit ? color : "rgba(58,87,99,0.5)");
        this.fillCircle(x, y, 4.5, lit ? "rgba(255,248,227,0.88)" : "rgba(166,197,189,0.16)");
      }
    } else {
      ctx.fillStyle = "#9ee3cf";
      ctx.font = "700 22px 'Trebuchet MS', 'Avenir Next', sans-serif";
      ctx.letterSpacing = "0.12em";
      ctx.fillText("SCORE", 64, 108);

      ctx.fillStyle = "#f8fff8";
      ctx.font = "700 42px 'Trebuchet MS', 'Avenir Next', sans-serif";
      ctx.fillText(this.formatScore(model.state.score), 64, 154);

      for (let index = 0; index < STRIKE_LIMIT; index += 1) {
        const x = this.width - 156 + index * 36;
        const y = 116;
        const lit = index < model.state.strikes;
        const color = index === 0 ? "#f3cc6b" : index === 1 ? "#f0a94d" : "#ff6f86";
        this.fillCircle(x, y, 13, lit ? color : "rgba(58,87,99,0.5)");
        this.fillCircle(x, y, 6, lit ? "rgba(255,248,227,0.88)" : "rgba(166,197,189,0.16)");
      }
    }
    ctx.textAlign = "left";

    if (model.accent && model.accent.opacity > 0 && !portraitish) {
      ctx.save();
      ctx.globalAlpha = model.accent.opacity;
      ctx.fillStyle = model.accent.color;
      ctx.font = "700 28px 'Trebuchet MS', 'Avenir Next', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(model.accent.text, this.width / 2, this.layout.boardY + 58);
      ctx.restore();
    }
    ctx.restore();
  }

  private drawNextPreview(model: RenderModel): void {
    const packet = model.state.nextSpawn;
    const x = this.layout.laneCenters[packet.lane]!;
    const portraitish = this.width <= this.height;
    const tokenY = Math.max(34, this.layout.boardY - (portraitish ? 40 : 24));
    const ringRadius = portraitish ? 28 : 26;
    const tokenRadius = portraitish ? 19 : 17;
    const palette = BLOSSOM_PALETTE[packet.kind];
    const ctx = this.ctx;

    this.fillGlow(x, tokenY, ringRadius + 10, "rgba(109,225,207,0.12)");

    ctx.save();
    ctx.strokeStyle = "rgba(235,255,248,0.14)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, tokenY, ringRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = "rgba(158,227,207,0.88)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(
      x,
      tokenY,
      ringRadius,
      -Math.PI / 2,
      -Math.PI / 2 + Math.PI * 2 * model.spawnCharge01,
    );
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.72;
    this.fillCircle(x, tokenY, tokenRadius, this.withAlpha(palette.fill, 0.76));
    ctx.restore();
    this.drawFlowerIcon(packet.kind, x, tokenY, portraitish ? 11 : 10, 0.86);
  }

  private drawStartOverlay(): void {
    const portraitish = this.width <= this.height;
    const sheetWidth = Math.min(portraitish ? this.width - 36 : 620, this.width - 36);
    const sheetHeight = portraitish ? 264 : 252;
    const sheetX = (this.width - sheetWidth) / 2;
    const sheetY = this.height - sheetHeight - 26;
    const ctx = this.ctx;

    this.fillRoundedRect(sheetX, sheetY, sheetWidth, sheetHeight, 34, "rgba(8,19,29,0.78)");
    this.fillRoundedRect(sheetX + 12, sheetY + 12, sheetWidth - 24, sheetHeight - 24, 28, "rgba(15,33,47,0.96)");

    ctx.save();
    ctx.fillStyle = "#9ee3cf";
    ctx.font = "700 18px 'Trebuchet MS', 'Avenir Next', sans-serif";
    ctx.fillText("GREENHOUSE ROUTING ARCADE", sheetX + 28, sheetY + 44);

    ctx.fillStyle = "#f7fff8";
    ctx.font = portraitish ? "700 44px 'Trebuchet MS', 'Avenir Next', sans-serif" : "700 40px 'Trebuchet MS', 'Avenir Next', sans-serif";
    ctx.fillText("Latchbloom", sheetX + 28, sheetY + 92);

    ctx.fillStyle = "#c4ddd8";
    ctx.font = portraitish ? "500 18px 'Trebuchet MS', 'Avenir Next', sans-serif" : "500 19px 'Trebuchet MS', 'Avenir Next', sans-serif";
    const bodyLines = portraitish
      ? ["Route blossoms into matching vases.", "Bouquets clear 1 strike.", "Three strikes ends the run."]
      : ["Route blossoms into matching vases.", "Bouquets clear 1 strike. Three strikes ends the run."];
    for (let index = 0; index < bodyLines.length; index += 1) {
      ctx.fillText(bodyLines[index]!, sheetX + 28, sheetY + 132 + index * 24);
    }
    ctx.restore();

    this.drawButton(sheetX + 28, sheetY + sheetHeight - 78, sheetWidth - 56, 56, "Open The Glasshouse");
  }

  private drawGameOverOverlay(score: number, bestScore: number): void {
    const portraitish = this.width <= this.height;
    const panelWidth = Math.min(portraitish ? this.width - 36 : 648, this.width - 36);
    const panelHeight = portraitish ? 372 : 312;
    const panelX = (this.width - panelWidth) / 2;
    const panelY = this.height - panelHeight - 26;

    this.fillRoundedRect(panelX, panelY, panelWidth, panelHeight, 36, "rgba(9,18,27,0.82)");
    this.fillRoundedRect(panelX + 12, panelY + 12, panelWidth - 24, panelHeight - 24, 28, "rgba(16,32,47,0.98)");

    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#9ee3cf";
    ctx.font = "700 18px 'Trebuchet MS', 'Avenir Next', sans-serif";
    ctx.fillText("RUN OVER", panelX + 28, panelY + 44);

    ctx.fillStyle = "#f8fff8";
    ctx.font = portraitish ? "700 30px 'Trebuchet MS', 'Avenir Next', sans-serif" : "700 32px 'Trebuchet MS', 'Avenir Next', sans-serif";
    const titleLines = portraitish ? ["Three strikes shut", "the greenhouse."] : ["Three strikes shut the greenhouse."];
    for (let index = 0; index < titleLines.length; index += 1) {
      ctx.fillText(titleLines[index]!, panelX + 28, panelY + 86 + index * 34);
    }

    ctx.fillStyle = "#c4ddd8";
    ctx.font = portraitish ? "500 18px 'Trebuchet MS', 'Avenir Next', sans-serif" : "500 19px 'Trebuchet MS', 'Avenir Next', sans-serif";
    const detailLines = portraitish ? ["Build bouquets to erase strikes.", "Keep the flow alive longer."] : ["Build bouquets to erase strikes and keep the flow alive longer."];
    for (let index = 0; index < detailLines.length; index += 1) {
      ctx.fillText(detailLines[index]!, panelX + 28, panelY + (portraitish ? 154 : 146) + index * 24);
    }
    ctx.restore();

    const cardY = panelY + (portraitish ? 198 : 182);
    const cardGap = 16;
    const cardWidth = (panelWidth - 56 - cardGap) / 2;
    const cardHeight = portraitish ? 92 : 84;
    this.drawStatCard(panelX + 28, cardY, cardWidth, cardHeight, "RUN SCORE", this.formatScore(score));
    this.drawStatCard(panelX + 28 + cardWidth + cardGap, cardY, cardWidth, cardHeight, "BEST", this.formatScore(bestScore));

    this.drawButton(panelX + 28, panelY + panelHeight - (portraitish ? 78 : 66), panelWidth - 56, portraitish ? 56 : 48, "Bloom Again");
  }

  private drawStatCard(x: number, y: number, width: number, height: number, label: string, value: string): void {
    this.fillRoundedRect(x, y, width, height, 22, "rgba(12,31,43,0.74)");
    this.strokeRoundedRect(x, y, width, height, 22, "rgba(158,227,207,0.14)", 2);

    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#9ee3cf";
    ctx.font = "700 15px 'Trebuchet MS', 'Avenir Next', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + width / 2, y + 24);

    ctx.fillStyle = "#fff3c2";
    ctx.font = "700 34px 'Trebuchet MS', 'Avenir Next', sans-serif";
    ctx.fillText(value, x + width / 2, y + 66);
    ctx.restore();
  }

  private drawButton(x: number, y: number, width: number, height: number, label: string): void {
    this.fillRoundedRect(x, y, width, height, 28, "#f2bf63");
    const gradient = this.ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, "#f9da90");
    gradient.addColorStop(1, "#e9aa37");
    this.fillRoundedRect(x + 6, y + 6, width - 12, height - 12, 24, gradient);

    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "#322006";
    ctx.font = "700 22px 'Trebuchet MS', 'Avenir Next', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, x + width / 2, y + height / 2 + 7);
    ctx.restore();
  }

  private drawFlowerIcon(kind: BlossomKind, x: number, y: number, size: number, alpha: number): void {
    const ctx = this.ctx;
    const palette = BLOSSOM_PALETTE[kind];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.fillStyle = palette.petal;

    if (kind === "rose") {
      const petals: Array<[number, number]> = [
        [0, -size * 0.72],
        [size * 0.72, 0],
        [0, size * 0.72],
        [-size * 0.72, 0],
      ];
      for (const [dx, dy] of petals) {
        this.drawPetal(dx, dy, size * 0.72, size * 0.52);
      }
    } else if (kind === "iris") {
      for (let index = 0; index < 6; index += 1) {
        ctx.save();
        ctx.rotate((index * Math.PI) / 3);
        this.drawDiamondPetal(size * 0.94, size * 0.42);
        ctx.restore();
      }
    } else if (kind === "sun") {
      for (let index = 0; index < 8; index += 1) {
        ctx.save();
        ctx.rotate((index * Math.PI) / 4);
        this.drawDiamondPetal(size * 1.18, size * 0.34);
        ctx.restore();
      }
    } else {
      for (let index = 0; index < 4; index += 1) {
        ctx.save();
        ctx.rotate((index * Math.PI) / 2);
        this.drawLeafPetal(size * 0.92, size * 0.38);
        ctx.restore();
      }
    }

    ctx.fillStyle = palette.glow;
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawPetal(dx: number, dy: number, length: number, radius: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.ellipse(dx, dy, radius, length * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDiamondPetal(length: number, width: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(0, -length);
    ctx.lineTo(width, 0);
    ctx.lineTo(0, length);
    ctx.lineTo(-width, 0);
    ctx.closePath();
    ctx.fill();
  }

  private drawLeafPetal(length: number, width: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(0, -length);
    ctx.quadraticCurveTo(width, -width, 0, length);
    ctx.quadraticCurveTo(-width, -width, 0, -length);
    ctx.closePath();
    ctx.fill();
  }

  private fillGlow(x: number, y: number, radius: number, color: string): void {
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private fillRoundedRect(x: number, y: number, width: number, height: number, radius: number, fill: string | CanvasGradient): void {
    const ctx = this.ctx;
    ctx.save();
    this.roundedRectPath(x, y, width, height, radius);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }

  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number, color: string, blurRadius: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blurRadius;
    ctx.fillStyle = color;
    this.roundedRectPath(x, y, width, height, radius);
    ctx.fill();
    ctx.restore();
  }

  private strokeRoundedRect(x: number, y: number, width: number, height: number, radius: number, color: string, lineWidth: number): void {
    const ctx = this.ctx;
    ctx.save();
    this.roundedRectPath(x, y, width, height, radius);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
    ctx.restore();
  }

  private roundedRectPath(x: number, y: number, width: number, height: number, radius: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
  }

  private fillCircle(x: number, y: number, radius: number, fill: string | CanvasGradient): void {
    this.ctx.save();
    this.ctx.fillStyle = fill;
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private fillEllipse(x: number, y: number, rx: number, ry: number, fill: string): void {
    this.ctx.save();
    this.ctx.fillStyle = fill;
    this.ctx.beginPath();
    this.ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }

  private formatScore(value: number): string {
    return new Intl.NumberFormat("en-US").format(value);
  }

  private withAlpha(hex: string, alpha: number): string {
    const clean = hex.replace("#", "");
    const value = Number.parseInt(clean, 16);
    const r = (value >> 16) & 255;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
