import { COURIER_Y, type District, type GameState, type Obstacle, type Screen } from "./types";

interface LayoutSnapshot {
  width: number;
  height: number;
  centerX: number;
  slopeTop: number;
  topWidth: number;
  bottomWidth: number;
}

export class CanvasRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private layout: LayoutSnapshot;

  public constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("[powder-post] 2d canvas unavailable");
    this.canvas = canvas;
    this.context = context;
    this.layout = {
      width: 1,
      height: 1,
      centerX: 0.5,
      slopeTop: 0.12,
      topWidth: 0.28,
      bottomWidth: 0.94,
    };
    this.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  }

  public resize(width: number, height: number, dpr: number): void {
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.layout = {
      width,
      height,
      centerX: width * 0.5,
      slopeTop: height * 0.11,
      topWidth: width * 0.28,
      bottomWidth: width * 0.94,
    };
  }

  public getLayout(): LayoutSnapshot {
    return this.layout;
  }

  public render(state: GameState, screen: Screen): void {
    const { width, height } = this.layout;
    const ctx = this.context;
    ctx.clearRect(0, 0, width, height);

    this.drawSky(screen);
    this.drawStars();
    this.drawAvalanche(state.storm01);
    this.drawSlope();
    this.drawRouteRails();
    this.drawScenery();

    const sortedGates = state.gates
      .filter((gate) => gate.y > -0.18 && gate.y < 0.94)
      .sort((a, b) => a.y - b.y);
    for (const gate of sortedGates) this.drawGate(gate.lane, gate.y, gate.district, gate.scale);

    const sortedObstacles = state.obstacles
      .filter((obstacle) => obstacle.y > -0.12 && obstacle.y < 0.96)
      .sort((a, b) => a.y - b.y);
    for (const obstacle of sortedObstacles) this.drawObstacle(obstacle);

    this.drawParticles(state);
    this.drawCourier(state.courierX, state.courierLean);
    this.drawForegroundMist(screen, state.storm01);
  }

  private drawSky(screen: Screen): void {
    const ctx = this.context;
    const { width, height } = this.layout;
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, screen === "gameover" ? "#0b1b31" : "#102341");
    gradient.addColorStop(0.38, screen === "gameover" ? "#244b73" : "#214a76");
    gradient.addColorStop(0.7, "#6d8eb1");
    gradient.addColorStop(1, "#aac1d7");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const moonX = width * 0.81;
    const moonY = height * 0.16;
    const moonR = Math.min(width, height) * 0.07;
    const moon = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonR * 2);
    moon.addColorStop(0, "rgba(255, 248, 230, 0.94)");
    moon.addColorStop(0.46, "rgba(255, 248, 230, 0.62)");
    moon.addColorStop(1, "rgba(255, 248, 230, 0)");
    ctx.fillStyle = moon;
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR * 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawStars(): void {
    const ctx = this.context;
    const { width, height } = this.layout;
    const stars = [
      [0.17, 0.08, 1.5],
      [0.28, 0.14, 1.2],
      [0.36, 0.1, 1.1],
      [0.54, 0.08, 1.3],
      [0.66, 0.12, 1.2],
      [0.72, 0.18, 1.1],
      [0.89, 0.15, 1.1],
    ] as const;
    ctx.fillStyle = "rgba(255,255,255,0.58)";
    for (const [x, y, radius] of stars) {
      ctx.beginPath();
      ctx.arc(width * x, height * y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawAvalanche(storm01: number): void {
    const ctx = this.context;
    const { width, height } = this.layout;
    const top = this.avalancheTopRatio(storm01) * height;
    const wave = ctx.createLinearGradient(0, 0, 0, top + height * 0.12);
    wave.addColorStop(0, "rgba(238, 248, 255, 0.98)");
    wave.addColorStop(0.38, "rgba(223, 241, 255, 0.88)");
    wave.addColorStop(1, "rgba(168, 205, 238, 0)");
    ctx.fillStyle = wave;
    ctx.fillRect(0, 0, width, top + height * 0.12);

    ctx.strokeStyle = "rgba(255,255,255,0.84)";
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    for (let index = 0; index <= 14; index += 1) {
      const x = (width / 14) * index;
      const y = top + Math.sin(index * 0.72 + storm01 * 18) * 7;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  private drawSlope(): void {
    const ctx = this.context;
    const { width, height, centerX, slopeTop, topWidth, bottomWidth } = this.layout;
    const leftTop = centerX - topWidth * 0.5;
    const rightTop = centerX + topWidth * 0.5;
    const leftBottom = centerX - bottomWidth * 0.5;
    const rightBottom = centerX + bottomWidth * 0.5;

    const snow = ctx.createLinearGradient(0, slopeTop, 0, height);
    snow.addColorStop(0, "#eef7ff");
    snow.addColorStop(0.55, "#dbe8f5");
    snow.addColorStop(1, "#afc7de");

    ctx.beginPath();
    ctx.moveTo(leftTop, slopeTop);
    ctx.lineTo(rightTop, slopeTop);
    ctx.lineTo(rightBottom, height);
    ctx.lineTo(leftBottom, height);
    ctx.closePath();
    ctx.fillStyle = snow;
    ctx.fill();

    const glow = ctx.createLinearGradient(0, slopeTop, 0, height);
    glow.addColorStop(0, "rgba(255,255,255,0.46)");
    glow.addColorStop(0.42, "rgba(255,255,255,0.13)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.moveTo(centerX - topWidth * 0.18, slopeTop);
    ctx.lineTo(centerX + topWidth * 0.18, slopeTop);
    ctx.lineTo(centerX + bottomWidth * 0.24, height);
    ctx.lineTo(centerX - bottomWidth * 0.24, height);
    ctx.closePath();
    ctx.fill();
  }

  private drawRouteRails(): void {
    const ctx = this.context;
    const { height, slopeTop } = this.layout;
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 1;
    for (let index = 0; index < 11; index += 1) {
      const t = index / 10;
      const y = slopeTop + (height - slopeTop) * t;
      const { left, right } = this.slopeEdgesAtY(y);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
      ctx.stroke();
    }
  }

  private drawScenery(): void {
    const scenery = [
      { x: -0.98, y: 0.42, scale: 0.86 },
      { x: 0.96, y: 0.47, scale: 0.92 },
      { x: -0.92, y: 0.63, scale: 1.06 },
      { x: 0.88, y: 0.69, scale: 1.08 },
    ] as const;

    for (const tree of scenery) {
      const screenY = this.screenY(tree.y);
      const screenX = this.screenX(tree.x, screenY);
      const perspective = this.perspectiveScale(tree.y) * tree.scale;
      drawTree(this.context, screenX, screenY, perspective);
    }
  }

  private drawGate(lane: number, y01: number, district: District, scale: number): void {
    const ctx = this.context;
    const screenY = this.screenY(y01);
    const screenX = this.screenX(lane, screenY);
    const perspective = this.perspectiveScale(y01) * scale;
    const poleHeight = 82 * perspective;
    const poleGap = 88 * perspective;
    const palette = crestPalette(district);

    ctx.strokeStyle = "rgba(69, 42, 24, 0.96)";
    ctx.lineWidth = 5 * perspective;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(screenX - poleGap * 0.5, screenY - 10 * perspective);
    ctx.lineTo(screenX - poleGap * 0.5, screenY + poleHeight);
    ctx.moveTo(screenX + poleGap * 0.5, screenY - 10 * perspective);
    ctx.lineTo(screenX + poleGap * 0.5, screenY + poleHeight);
    ctx.stroke();

    const banner = ctx.createLinearGradient(screenX, screenY, screenX, screenY + 34 * perspective);
    banner.addColorStop(0, "rgba(255, 250, 238, 0.92)");
    banner.addColorStop(1, palette.fill);
    ctx.fillStyle = banner;
    roundRect(
      ctx,
      screenX - poleGap * 0.46,
      screenY + 4 * perspective,
      poleGap * 0.92,
      34 * perspective,
      10 * perspective,
    );
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.38)";
    ctx.lineWidth = 1.4 * perspective;
    roundRect(
      ctx,
      screenX - poleGap * 0.46,
      screenY + 4 * perspective,
      poleGap * 0.92,
      34 * perspective,
      10 * perspective,
    );
    ctx.stroke();

    const glow = ctx.createRadialGradient(screenX, screenY + poleHeight * 0.55, 0, screenX, screenY + poleHeight * 0.55, 42 * perspective);
    glow.addColorStop(0, "rgba(255, 234, 188, 0.5)");
    glow.addColorStop(1, "rgba(255, 234, 188, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(screenX, screenY + poleHeight * 0.55, 42 * perspective, 0, Math.PI * 2);
    ctx.fill();

    drawCrestIcon(ctx, screenX, screenY + 22 * perspective, district, 0.68 * perspective);
  }

  private drawObstacle(obstacle: Obstacle): void {
    if (obstacle.hit) return;
    const screenY = this.screenY(obstacle.y);
    const screenX = this.screenX(obstacle.lane, screenY);
    const perspective = this.perspectiveScale(obstacle.y) * obstacle.scale;
    if (obstacle.kind === "tree") {
      drawTree(this.context, screenX, screenY, perspective);
    } else if (obstacle.kind === "rock") {
      drawRock(this.context, screenX, screenY, perspective);
    } else {
      drawIce(this.context, screenX, screenY, perspective);
    }
  }

  private drawParticles(state: GameState): void {
    const ctx = this.context;
    for (const particle of state.particles) {
      const alpha = 1 - particle.ageMs / particle.lifeMs;
      const screenY = this.screenY(particle.y);
      const screenX = this.screenX(particle.x, screenY);
      const radius = Math.max(1, particle.radius * this.layout.height * 0.45);
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(screenX, screenY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawCourier(courierX: number, lean: number): void {
    const ctx = this.context;
    const screenY = this.screenY(COURIER_Y);
    const screenX = this.screenX(courierX, screenY);
    const scale = this.perspectiveScale(COURIER_Y) * 1.16;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.rotate(lean * 0.56);

    ctx.strokeStyle = "rgba(255,255,255,0.58)";
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.moveTo(-34 * scale, 18 * scale);
    ctx.lineTo(38 * scale, 30 * scale);
    ctx.stroke();

    ctx.fillStyle = "#10213a";
    ctx.beginPath();
    ctx.arc(0, -16 * scale, 10 * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#193150";
    ctx.lineWidth = 9 * scale;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, -6 * scale);
    ctx.lineTo(-4 * scale, 22 * scale);
    ctx.moveTo(-2 * scale, 8 * scale);
    ctx.lineTo(-23 * scale, 22 * scale);
    ctx.moveTo(4 * scale, 8 * scale);
    ctx.lineTo(16 * scale, 26 * scale);
    ctx.stroke();

    ctx.strokeStyle = "#ffb45b";
    ctx.lineWidth = 5 * scale;
    ctx.beginPath();
    ctx.moveTo(-6 * scale, -5 * scale);
    ctx.lineTo(10 * scale, 8 * scale);
    ctx.lineTo(22 * scale, 25 * scale);
    ctx.stroke();

    ctx.fillStyle = "#ff936c";
    ctx.fillRect(6 * scale, -2 * scale, 12 * scale, 13 * scale);
    ctx.fillStyle = "#193150";
    ctx.fillRect(8 * scale, 2 * scale, 8 * scale, 9 * scale);

    ctx.restore();
  }

  private drawForegroundMist(screen: Screen, storm01: number): void {
    const ctx = this.context;
    const { width, height } = this.layout;
    const mist = ctx.createLinearGradient(0, height * 0.54, 0, height);
    mist.addColorStop(0, "rgba(255,255,255,0)");
    mist.addColorStop(0.55, "rgba(255,255,255,0.08)");
    mist.addColorStop(1, screen === "gameover" ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.18)");
    ctx.fillStyle = mist;
    ctx.fillRect(0, height * 0.54, width, height * 0.46);

    if (storm01 > 0.7) {
      ctx.fillStyle = `rgba(255,255,255,${(storm01 - 0.7) * 0.18})`;
      ctx.fillRect(0, 0, width, height);
    }
  }

  private avalancheTopRatio(storm01: number): number {
    return 0.08 + Math.pow(storm01, 1.6) * 0.66;
  }

  private perspectiveScale(y01: number): number {
    return 0.54 + clamp01(y01) * 0.92;
  }

  private screenY(y01: number): number {
    return this.layout.height * y01;
  }

  private screenX(lane: number, screenY: number): number {
    const { centerX } = this.layout;
    const { left, right } = this.slopeEdgesAtY(screenY);
    const halfWidth = (right - left) * 0.5;
    return centerX + lane * halfWidth * 0.88;
  }

  private slopeEdgesAtY(screenY: number): { left: number; right: number } {
    const { centerX, slopeTop, topWidth, bottomWidth, height } = this.layout;
    const t = clamp01((screenY - slopeTop) / Math.max(1, height - slopeTop));
    const widthAtY = topWidth + (bottomWidth - topWidth) * t;
    return {
      left: centerX - widthAtY * 0.5,
      right: centerX + widthAtY * 0.5,
    };
  }
}

function crestPalette(district: District): { fill: string; stroke: string } {
  if (district === "amber") return { fill: "#ffc868", stroke: "#7f4b12" };
  if (district === "coral") return { fill: "#ff936c", stroke: "#82311c" };
  return { fill: "#7ce7dc", stroke: "#145055" };
}

function drawCrestIcon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  district: District,
  scale: number,
): void {
  const palette = crestPalette(district);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = palette.stroke;
  if (district === "amber") {
    ctx.rotate(Math.PI * 0.25);
    ctx.fillRect(-7, -7, 14, 14);
  } else if (district === "coral") {
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(9, 8);
    ctx.lineTo(-9, 8);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.fill;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.fillStyle = "#1c433d";
  ctx.beginPath();
  ctx.moveTo(x, y - 40 * scale);
  ctx.lineTo(x - 26 * scale, y + 10 * scale);
  ctx.lineTo(x - 12 * scale, y + 10 * scale);
  ctx.lineTo(x - 34 * scale, y + 52 * scale);
  ctx.lineTo(x + 34 * scale, y + 52 * scale);
  ctx.lineTo(x + 12 * scale, y + 10 * scale);
  ctx.lineTo(x + 26 * scale, y + 10 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#7b5938";
  ctx.fillRect(x - 6 * scale, y + 52 * scale, 12 * scale, 22 * scale);
}

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.fillStyle = "#708198";
  ctx.beginPath();
  ctx.moveTo(x - 28 * scale, y + 12 * scale);
  ctx.lineTo(x - 16 * scale, y - 10 * scale);
  ctx.lineTo(x + 14 * scale, y - 16 * scale);
  ctx.lineTo(x + 32 * scale, y + 8 * scale);
  ctx.lineTo(x + 10 * scale, y + 20 * scale);
  ctx.lineTo(x - 12 * scale, y + 24 * scale);
  ctx.closePath();
  ctx.fill();
}

function drawIce(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number): void {
  ctx.strokeStyle = "rgba(213, 240, 255, 0.88)";
  ctx.lineWidth = 4 * scale;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 28 * scale, y - 4 * scale);
  ctx.lineTo(x - 8 * scale, y + 14 * scale);
  ctx.lineTo(x + 14 * scale, y - 2 * scale);
  ctx.lineTo(x + 30 * scale, y + 12 * scale);
  ctx.stroke();

  ctx.strokeStyle = "rgba(148, 199, 235, 0.72)";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(x - 10 * scale, y - 18 * scale);
  ctx.lineTo(x + 8 * scale, y + 8 * scale);
  ctx.moveTo(x - 26 * scale, y + 12 * scale);
  ctx.lineTo(x + 4 * scale, y + 18 * scale);
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

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
