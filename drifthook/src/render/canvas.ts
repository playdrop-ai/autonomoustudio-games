import type { UIScreen, UISpecies } from "../ui/dom";

export interface RenderFish {
  id: number;
  species: UISpecies;
  x01: number;
  y01: number;
  dir: -1 | 1;
  scale?: number;
  alpha?: number;
}

export interface RenderSnag {
  id: number;
  x01: number;
  y01: number;
  scale?: number;
  alpha?: number;
}

export interface RenderModel {
  screen: UIScreen;
  timeMs: number;
  fishes: RenderFish[];
  snags: RenderSnag[];
  lureDepth01: number;
  catchPulse01: number;
  damagePulse01: number;
  orderPulse01: number;
}

interface Layout {
  width: number;
  height: number;
  dpr: number;
  moonX: number;
  moonY: number;
  moonRadius: number;
  waterTop: number;
  waterBottom: number;
  lureX: number;
  surfaceY: number;
}

const SPECIES_STYLE: Record<UISpecies, { body: string; tail: string; glow: string }> = {
  dartfin: { body: "#9fe7ff", tail: "#81cff5", glow: "rgba(159, 231, 255, 0.18)" },
  bloomkoi: { body: "#ffbe74", tail: "#ff8d5b", glow: "rgba(255, 177, 107, 0.18)" },
  glassperch: { body: "#dde0ff", tail: "#aab1ff", glow: "rgba(214, 215, 255, 0.18)" },
  mooneel: { body: "#a697ff", tail: "#7c67f2", glow: "rgba(155, 136, 255, 0.2)" },
};

export class CanvasRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private layout: Layout;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("[drifthook] canvas 2D context unavailable");
    this.ctx = ctx;
    this.layout = this.computeLayout(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
    this.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  }

  resize(width: number, height: number, dpr: number): void {
    this.layout = this.computeLayout(width, height, dpr);
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
  }

  render(model: RenderModel): void {
    const { ctx, layout } = this;
    ctx.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0);
    ctx.clearRect(0, 0, layout.width, layout.height);

    this.drawBackground(model.timeMs);
    this.drawEnvironment(model.timeMs);
    this.drawAmbientFish(model.timeMs);
    this.drawSnags(model.snags);
    this.drawFish(model.fishes);
    this.drawLure(model.lureDepth01, model.timeMs);
    this.drawForeground(model.timeMs);

    if (model.orderPulse01 > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(232, 191, 104, ${0.08 * model.orderPulse01})`;
      ctx.fillRect(0, 0, layout.width, layout.height);
      ctx.restore();
    }

    if (model.damagePulse01 > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 120, 110, ${0.12 * model.damagePulse01})`;
      ctx.fillRect(0, 0, layout.width, layout.height);
      ctx.restore();
    }

    if (model.screen === "gameover") {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
      ctx.fillRect(0, 0, layout.width, layout.height);
      ctx.restore();
    }
  }

  private computeLayout(width: number, height: number, dpr: number): Layout {
    const moonRadius = Math.min(width, height) * (width > height ? 0.038 : 0.07);
    return {
      width,
      height,
      dpr,
      moonX: width * 0.88,
      moonY: height * 0.1,
      moonRadius,
      waterTop: height * 0.2,
      waterBottom: height,
      lureX: width * 0.5,
      surfaceY: height * 0.165,
    };
  }

  private drawBackground(timeMs: number): void {
    const { ctx, layout } = this;
    const sky = ctx.createLinearGradient(0, 0, 0, layout.height);
    sky.addColorStop(0, "#203851");
    sky.addColorStop(0.11, "#1a334a");
    sky.addColorStop(0.19, "#112131");
    sky.addColorStop(0.21, "#18304a");
    sky.addColorStop(0.62, "#0a1730");
    sky.addColorStop(1, "#050d19");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, layout.width, layout.height);

    const moonGlow = ctx.createRadialGradient(layout.moonX, layout.moonY, 0, layout.moonX, layout.moonY, layout.moonRadius * 2.4);
    moonGlow.addColorStop(0, "rgba(255, 245, 219, 0.9)");
    moonGlow.addColorStop(0.58, "rgba(255, 223, 161, 0.6)");
    moonGlow.addColorStop(1, "rgba(255, 223, 161, 0)");
    ctx.fillStyle = moonGlow;
    ctx.beginPath();
    ctx.arc(layout.moonX, layout.moonY, layout.moonRadius * 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255, 236, 194, 0.78)";
    ctx.beginPath();
    ctx.arc(layout.moonX, layout.moonY, layout.moonRadius, 0, Math.PI * 2);
    ctx.fill();

    const waterBand = ctx.createLinearGradient(0, layout.surfaceY, 0, layout.surfaceY + layout.height * 0.1);
    waterBand.addColorStop(0, "rgba(173, 227, 255, 0.18)");
    waterBand.addColorStop(1, "rgba(173, 227, 255, 0)");
    ctx.fillStyle = waterBand;
    ctx.fillRect(0, layout.surfaceY, layout.width, layout.height * 0.14);

    const reflection = ctx.createLinearGradient(layout.lureX, layout.surfaceY, layout.lureX, layout.height);
    reflection.addColorStop(0, "rgba(255, 255, 255, 0.14)");
    reflection.addColorStop(0.2, "rgba(255, 255, 255, 0.04)");
    reflection.addColorStop(0.7, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = reflection;
    ctx.fillRect(layout.lureX - 52 + Math.sin(timeMs / 1400) * 6, layout.surfaceY, 104, layout.height * 0.62);
  }

  private drawEnvironment(timeMs: number): void {
    const { ctx, layout } = this;
    ctx.save();
    ctx.fillStyle = "rgba(6, 12, 20, 0.82)";
    ctx.fillRect(0, layout.surfaceY + layout.height * 0.02, layout.width, layout.height * 0.11);

    const rippleY = layout.surfaceY + 2;
    ctx.strokeStyle = "rgba(210, 240, 255, 0.12)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= layout.width; x += 18) {
      const y = rippleY + Math.sin(x / 32 + timeMs / 780) * 1.8;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    this.drawKelp(layout.width * 0.08, layout.height * 0.9, layout.height * 0.28, -1);
    this.drawKelp(layout.width * 0.9, layout.height * 0.92, layout.height * 0.24, 1);

    this.drawRock(layout.width * 0.12, layout.height * 0.88, 52, 26);
    this.drawRock(layout.width * 0.85, layout.height * 0.91, 64, 30);

    for (let i = 0; i < 7; i += 1) {
      const size = 6 + (i % 3) * 4;
      const x = (i * 137 + 93) % layout.width;
      const baseY = layout.height * (0.34 + (i % 5) * 0.11);
      const drift = Math.sin(timeMs / 900 + i * 1.2) * 10;
      this.drawBubble(x, baseY + drift, size);
    }
    ctx.restore();
  }

  private drawAmbientFish(timeMs: number): void {
    const patterns = [
      { species: "dartfin", y01: 0.3, start: 0.18, speed: 0.00004, dir: -1 as const, alpha: 0.24, scale: 0.82 },
      { species: "glassperch", y01: 0.46, start: 0.74, speed: 0.000028, dir: 1 as const, alpha: 0.18, scale: 0.78 },
      { species: "bloomkoi", y01: 0.58, start: 0.28, speed: 0.000022, dir: -1 as const, alpha: 0.12, scale: 0.92 },
      { species: "mooneel", y01: 0.72, start: 0.62, speed: 0.000018, dir: 1 as const, alpha: 0.1, scale: 0.78 },
    ] as const;

    const ambient: RenderFish[] = patterns.map((pattern, index) => {
      const phase = (pattern.start + timeMs * pattern.speed) % 1;
      return {
        id: -(index + 1),
        species: pattern.species,
        x01: pattern.dir === 1 ? 0.14 + phase * 0.3 : 0.86 - phase * 0.3,
        y01: pattern.y01 + Math.sin(timeMs / 2200 + index) * 0.015,
        dir: pattern.dir,
        alpha: pattern.alpha,
        scale: pattern.scale,
      };
    });

    this.drawFish(ambient);
  }

  private drawSnags(snags: RenderSnag[]): void {
    const { ctx, layout } = this;
    ctx.save();
    for (const snag of snags) {
      const x = snag.x01 * layout.width;
      const y = snag.y01 * layout.height;
      const scale = snag.scale ?? 1;
      const alpha = snag.alpha ?? 0.72;
      ctx.globalAlpha = alpha;
      this.drawKelp(x, y, 120 * scale, x < layout.width * 0.5 ? -1 : 1);
      this.drawRock(x - 12 * scale, y + 26 * scale, 40 * scale, 18 * scale);
    }
    ctx.restore();
  }

  private drawFish(fishes: RenderFish[]): void {
    const { ctx, layout } = this;
    for (const fish of fishes) {
      const style = SPECIES_STYLE[fish.species];
      const scale = fish.scale ?? 1;
      const alpha = fish.alpha ?? 1;
      const x = fish.x01 * layout.width;
      const y = fish.y01 * layout.height;
      const bodyW = fish.species === "mooneel" ? 104 * scale : fish.species === "bloomkoi" ? 82 * scale : 70 * scale;
      const bodyH = fish.species === "mooneel" ? 16 * scale : fish.species === "bloomkoi" ? 34 * scale : 26 * scale;

      ctx.save();
      ctx.translate(x, y);
      ctx.scale(fish.dir, 1);
      ctx.globalAlpha = alpha;

      ctx.shadowBlur = 24;
      ctx.shadowColor = style.glow;

      ctx.fillStyle = style.body;
      roundedCapsule(ctx, -bodyW * 0.5, -bodyH * 0.5, bodyW, bodyH, bodyH * 0.5);
      ctx.fill();

      ctx.fillStyle = style.tail;
      ctx.beginPath();
      ctx.moveTo(bodyW * 0.48, 0);
      ctx.lineTo(bodyW * 0.74, -bodyH * 0.32);
      ctx.lineTo(bodyW * 0.74, bodyH * 0.32);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.ellipse(-bodyW * 0.16, -bodyH * 0.1, bodyW * 0.12, bodyH * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawLure(depth01: number, timeMs: number): void {
    const { ctx, layout } = this;
    const lureY = lerp(layout.height * 0.32, layout.height * 0.76, depth01);

    ctx.save();
    ctx.strokeStyle = "rgba(255, 245, 224, 0.82)";
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.moveTo(layout.lureX, layout.surfaceY + layout.height * 0.015);
    ctx.lineTo(layout.lureX, lureY);
    ctx.stroke();

    const glow = ctx.createRadialGradient(layout.lureX, lureY, 0, layout.lureX, lureY, 48);
    glow.addColorStop(0, "rgba(255, 253, 239, 0.95)");
    glow.addColorStop(0.35, "rgba(255, 214, 133, 0.88)");
    glow.addColorStop(0.72, "rgba(255, 180, 84, 0.28)");
    glow.addColorStop(1, "rgba(255, 180, 84, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(layout.lureX, lureY, 48, 0, Math.PI * 2);
    ctx.fill();

    const bodyRadius = 16 + Math.sin(timeMs / 180) * 0.6;
    ctx.fillStyle = "#f8d37f";
    ctx.beginPath();
    ctx.arc(layout.lureX, lureY, bodyRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(255, 244, 224, 0.72)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(layout.lureX, lureY + 20, 12, Math.PI * 0.25, Math.PI * 1.7);
    ctx.stroke();
    ctx.restore();
  }

  private drawForeground(timeMs: number): void {
    const { ctx, layout } = this;
    const vignette = ctx.createLinearGradient(0, layout.height * 0.8, 0, layout.height);
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.28)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, layout.height * 0.68, layout.width, layout.height * 0.32);

    ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
    ctx.fillRect(layout.lureX - 1 + Math.sin(timeMs / 1100) * 3, layout.height * 0.18, 2, layout.height * 0.44);
  }

  private drawKelp(x: number, y: number, height: number, lean: -1 | 1): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(54, 91, 83, 0.58)";
    for (let i = 0; i < 3; i += 1) {
      const offset = (i - 1) * 18;
      ctx.beginPath();
      ctx.moveTo(offset, 0);
      ctx.bezierCurveTo(offset + lean * 12, -height * 0.3, offset - lean * 8, -height * 0.72, offset + lean * 6, -height);
      ctx.bezierCurveTo(offset + lean * 18, -height * 0.72, offset + lean * 14, -height * 0.34, offset + 8, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawRock(x: number, y: number, width: number, height: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = "rgba(13, 21, 31, 0.82)";
    ctx.beginPath();
    ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBubble(x: number, y: number, radius: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function roundedCapsule(
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

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}
