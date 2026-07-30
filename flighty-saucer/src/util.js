/**
 * util.js — small math / geometry helpers shared across the game.
 * Everything here is allocation-free on the hot path.
 */
import { THREE } from './runtime.js';

export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (b === a ? 0 : clamp01((v - a) / (b - a)));
export const mix = lerp;

export const smoothstep = (e0, e1, x) => {
  const t = clamp01((x - e0) / (e1 - e0 || 1e-6));
  return t * t * (3 - 2 * t);
};

export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t) => t * t * t;
export const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOutBack = (t, s = 1.7) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
export const easeOutElastic = (t) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c = TAU / 3;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c) + 1;
};

/** Frame-rate independent exponential approach. */
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));

/** Deterministic PRNG (mulberry32). Returns a function producing [0,1). */
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rand = (rng, a, b) => a + (b - a) * rng();
export const randInt = (rng, a, b) => Math.floor(a + (b - a + 1) * rng());
export const pick = (rng, arr) => arr[Math.floor(rng() * arr.length) % arr.length];

/* ------------------------------------------------------------------ *
 * Value noise — used for terrain, ridges and cloud placement.
 * ------------------------------------------------------------------ */
function hash2(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const fade = (t) => t * t * (3 - 2 * t);

export function noise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = fade(xf), v = fade(yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi);
  const c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
}

export function fbm2(x, y, octaves = 3, lac = 2.03, gain = 0.5) {
  let sum = 0, amp = 0.5, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x, y) * amp;
    norm += amp;
    amp *= gain;
    x *= lac; y *= lac;
  }
  return sum / norm;
}

/* ------------------------------------------------------------------ *
 * Geometry helpers
 * ------------------------------------------------------------------ */

/** Merge non-indexed geometries (position/normal/color only) into one. */
export function mergeGeometries(geoms) {
  const parts = geoms.map((g) => (g.index ? g.toNonIndexed() : g));
  let total = 0;
  for (const g of parts) total += g.attributes.position.count;

  const pos = new Float32Array(total * 3);
  const nor = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  let o = 0;
  for (const g of parts) {
    const p = g.attributes.position, n = g.attributes.normal, c = g.attributes.color;
    pos.set(p.array, o * 3);
    if (n) nor.set(n.array, o * 3);
    if (c) col.set(c.array, o * 3);
    else col.fill(1, o * 3, (o + p.count) * 3);
    o += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  if (!parts.some((g) => g.attributes.normal)) out.computeVertexNormals();
  return out;
}

/** Paint a whole geometry with one colour (adds a `color` attribute). */
export function paint(geom, hex) {
  const c = new THREE.Color(hex);
  const n = geom.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = c.r; arr[i * 3 + 1] = c.g; arr[i * 3 + 2] = c.b; }
  geom.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geom;
}

/** Vertical gradient vertex colours (by local Y between y0..y1). */
export function paintGradientY(geom, hexLow, hexHigh, y0, y1, sharp = 0) {
  const a = new THREE.Color(hexLow), b = new THREE.Color(hexHigh);
  const p = geom.attributes.position;
  const arr = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    let t = invLerp(y0, y1, p.getY(i));
    if (sharp > 0) t = smoothstep(0.5 - sharp, 0.5 + sharp, t);
    arr[i * 3] = lerp(a.r, b.r, t);
    arr[i * 3 + 1] = lerp(a.g, b.g, t);
    arr[i * 3 + 2] = lerp(a.b, b.b, t);
  }
  geom.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geom;
}

/** Nudge every vertex a little for a hand-made low-poly silhouette. */
export function jitterGeometry(geom, amount, seed = 1) {
  const rng = makeRng(seed);
  const p = geom.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setXYZ(
      i,
      p.getX(i) + (rng() - 0.5) * amount,
      p.getY(i) + (rng() - 0.5) * amount,
      p.getZ(i) + (rng() - 0.5) * amount,
    );
  }
  geom.computeVertexNormals();
  return geom;
}

/** Bake a transform into geometry vertices. */
export function applyTransform(geom, pos, rot, scale) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2]));
  m.compose(new THREE.Vector3(pos[0], pos[1], pos[2]), q, new THREE.Vector3(scale[0], scale[1], scale[2]));
  geom.applyMatrix4(m);
  return geom;
}

/* ------------------------------------------------------------------ *
 * Misc
 * ------------------------------------------------------------------ */
export const nowMs = () => performance.now();

/** Detect a touch-first / low-power device for quality defaults. */
export function detectMobile() {
  const ua = navigator.userAgent || '';
  const touch = (navigator.maxTouchPoints || 0) > 1;
  return /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(ua) || (touch && /Macintosh/.test(ua) && window.innerWidth < 900);
}


/**
 * ResolutionGovernor — decides the render-resolution multiplier from frame timing.
 *
 * Extracted from Game.frame() and given its own tests (tools/test-governor.mjs)
 * because this logic has been wrong twice, in ways no screenshot could show:
 *
 *  1. Fixed 18 ms / 13 ms thresholds. Under a 30 Hz cap (Low Power Mode, thermal
 *     throttle) every frame reads as an overrun and 13 ms is unreachable, so the scale
 *     fell to the floor in ~4 s and could never recover.
 *  2. A frame in the 13-18 ms dead band reset NEITHER counter, so a clean 60 fps at
 *     ~16.6 ms accumulated the scattered hitches of a whole session and eventually
 *     downgraded, while recovering needed 240 CONSECUTIVE sub-13 ms frames — impossible
 *     at 60 Hz. Resolution decayed monotonically on a healthy phone.
 *
 * The budget is the display's own cadence, tracked as a 20th-percentile frame interval
 * rather than a running minimum: a minimum is poisoned permanently by one anomalously
 * short frame, which pinned the budget at its clamp and reproduced defect 1 exactly.
 *
 * Climbing is a hill-climb, not a measurement — at vsync, frame duration cannot prove
 * headroom exists, because the display caps it. So it tries one step up and, if frames
 * start missing, latches that level as unreachable for the session and stays below it.
 * That converges instead of oscillating.
 */
export class ResolutionGovernor {
  constructor(min = 0.55, max = 1.5) {
    this.min = min;
    this.max = max;
    this.scale = 1;
    this.ceil = max;
    this.frameAvg = 16;
    this.frameLow = 16.7;
    this.hold = 0;
    this.slow = 0;
    this.fast = 0;
    this.warm = 0;
  }

  /** Feed one frame's duration in seconds. Returns true when the scale changed. */
  step(dtSeconds) {
    const ms = dtSeconds * 1000;
    this.frameAvg = this.frameAvg * 0.9 + ms * 0.1;

    /*
     * WARM-UP. The percentile tracker only creeps upward (by design: that is what
     * makes it ignore outliers), so it needs ~190 frames to climb from its 16.7 ms
     * seed to a 33 ms reality. Under a 30 Hz cap that left a long window where every
     * ordinary frame looked like an overrun, and the tests caught it downgrading twice
     * before the budget caught up. So converge fast in both directions at first, and
     * refuse to touch the scale at all — which also stops boot-time shader-compile
     * hitches from provoking a downgrade before the game has drawn anything.
     */
    if (this.warm < 90) {
      this.warm++;
      this.frameLow = clamp(this.frameLow + (ms - this.frameLow) * 0.15, 6, 40);
      return false;
    }

    // 20th-percentile tracker: down 0.35 per fast frame, up 0.0875 per slow one
    this.frameLow = clamp(this.frameLow + (ms < this.frameLow ? -0.35 : 0.0875), 6, 40);
    const budget = this.frameLow;
    this.hold = Math.max(0, this.hold - dtSeconds);

    if (this.frameAvg > budget * 1.30) { this.slow++; this.fast = 0; }
    else if (this.frameAvg < budget * 1.10) { this.fast++; this.slow = 0; }
    else { this.slow = 0; this.fast = 0; }              // dead band clears both

    if (this.hold > 0) return false;
    if (this.slow > 30 && this.scale > this.min) {
      this.ceil = Math.min(this.ceil, this.scale);      // this level is unsustainable
      this.scale = Math.max(this.min, this.scale - 0.12);
      this.slow = 0; this.hold = 2.0;
      return true;
    }
    /*
     * Only climb when the display cadence itself is healthy. A device sitting at a
     * clean 30 Hz is not a device with spare capacity -- it is Low Power Mode or a
     * thermal throttle -- and "no frames missed against a 33 ms budget" would
     * otherwise read as headroom and add load to a phone that is already conserving.
     * Shedding pixels stays available at any cadence; only earning them is gated.
     */
    if (this.fast > 240 && budget < 20 && this.scale + 0.10 <= this.ceil) {
      this.scale = Math.min(this.max, this.scale + 0.10);
      this.fast = 0; this.hold = 2.0;
      return true;
    }
    return false;
  }

  /** A quality change is a clean slate: the new tier may sustain what the old could not. */
  reset() {
    this.scale = 1;
    this.ceil = this.max;
    this.slow = 0;
    this.fast = 0;
    this.hold = 0;
    this.warm = 60;   // partial re-warm: the display cadence has not changed
  }

  get fps() { return 1000 / Math.max(0.1, this.frameAvg); }
}
