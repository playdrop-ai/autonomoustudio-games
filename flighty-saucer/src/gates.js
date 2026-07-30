/**
 * gates.js — the obstacle field.
 *
 * Base obstacle: a pair of hexagonal monolith towers with glowing emitter caps.
 * As the score climbs, variants are mixed in so the field never reads as "just
 * pipes":
 *
 *   plain     always
 *   mover     from score 12 — the whole gap slides vertically
 *   stagger   from score 18 — top and bottom towers offset along X, so the gap
 *                             becomes a diagonal slot
 *   pulse     from score 30 — the gap breathes open and shut
 *   twin      from score 26 — a second gate right behind the first, offset
 *                             vertically: one quick double manoeuvre
 *   shards    from score 22 — charged crystals floating in the corridor between
 *                             gates, always placed so a clear line remains
 *
 * Every variant is guaranteed passable: no variant ever narrows the usable
 * window below the plain gap for that score.
 *
 * Gates and shards are pooled, geometry is shared, and a biome change is a
 * handful of material colour writes.
 */
import { THREE } from './runtime.js';
import { CFG, rampT } from './config.js';
import { TAU, clamp, lerp, makeRng, rand, paint, applyTransform, mergeGeometries } from './util.js';

/** Grey-scale strata baked into vertex colours so material.color can tint it. */
function strata(geom, seed) {
  const rng = makeRng(seed);
  const p = geom.attributes.position;
  const arr = new Float32Array(p.count * 3);
  const bandOf = new Map();
  for (let i = 0; i < p.count; i++) {
    const key = Math.round(p.getY(i) * 40);
    if (!bandOf.has(key)) bandOf.set(key, 0.90 + rng() * 0.10);
    let v = bandOf.get(key);
    // darken the base a touch: reads as contact shading
    v *= lerp(0.87, 1.0, Math.min(1, (p.getY(i) + 0.5) / 0.85));
    arr[i * 3] = arr[i * 3 + 1] = arr[i * 3 + 2] = v;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geom;
}

function buildColumn() {
  const g = new THREE.CylinderGeometry(0.96, 1.06, 1, 6, 7);
  g.rotateY(Math.PI / 6);
  return strata(g, 7);
}

function buildCap() {
  const parts = [];
  const collar = new THREE.CylinderGeometry(1.16, 1.04, 0.34, 6, 1);
  collar.rotateY(Math.PI / 6);
  parts.push(collar);
  const lip = new THREE.CylinderGeometry(1.09, 1.16, 0.14, 6, 1);
  lip.rotateY(Math.PI / 6);
  lip.translate(0, 0.24, 0);
  parts.push(lip);
  const g = mergeGeometries(parts);
  const p = g.attributes.position;
  const arr = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const v = p.getY(i) > 0.19 ? 1.0 : 0.90;
    arr[i * 3] = arr[i * 3 + 1] = arr[i * 3 + 2] = v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

function buildRing() {
  const g = new THREE.TorusGeometry(1.30, 0.062, 4, 20);
  g.rotateX(Math.PI / 2);
  return paint(g, 0xffffff);
}

/** A thin emissive strip on the camera-facing flat of the hex column. */
function buildSeam() {
  const g = new THREE.BoxGeometry(0.13, 1, 0.09);
  g.translate(0, 0, 0.90);
  return paint(g, 0xffffff);
}

/** Hazard shard: unmistakably spiky, so it never reads as decoration. */
function buildShard() {
  const parts = [];
  // deliberately hollow: the emissive core sits inside and glows between the
  // spikes, which is what makes the shard read as dangerous at a glance
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    const s = new THREE.ConeGeometry(0.17, 0.74, 4);
    applyTransform(s, [Math.cos(a) * 0.40, Math.sin(a * 1.7) * 0.30, Math.sin(a) * 0.40],
      [Math.PI / 2 * Math.sin(a), -a, Math.PI / 2 - 0.35], [1, 1, 1]);
    parts.push(s);
  }
  const spike = new THREE.ConeGeometry(0.18, 0.66, 4);
  spike.translate(0, 0.62, 0);
  parts.push(spike);
  const spikeDown = new THREE.ConeGeometry(0.18, 0.66, 4);
  applyTransform(spikeDown, [0, -0.62, 0], [Math.PI, 0, 0], [1, 1, 1]);
  parts.push(spikeDown);
  return paint(mergeGeometries(parts), 0xffffff);
}

function buildShardCore() {
  const g = new THREE.OctahedronGeometry(0.42, 0);
  g.scale(1, 1.45, 1);
  return paint(g, 0xffffff);
}

const V_PLAIN = 0, V_MOVER = 1, V_STAGGER = 2, V_PULSE = 3;

class Gate {
  constructor(mats, geos) {
    this.group = new THREE.Group();

    this.botCol = new THREE.Mesh(geos.col, mats.body);
    this.topCol = new THREE.Mesh(geos.col, mats.body);
    this.botCap = new THREE.Mesh(geos.cap, mats.cap);
    this.topCap = new THREE.Mesh(geos.cap, mats.cap);
    this.botRing = new THREE.Mesh(geos.ring, mats.accent);
    this.topRing = new THREE.Mesh(geos.ring, mats.accent);
    this.botSeam = new THREE.Mesh(geos.seam, mats.accent);
    this.topSeam = new THREE.Mesh(geos.seam, mats.accent);
    for (const m of [this.botCol, this.topCol, this.botCap, this.topCap]) {
      m.castShadow = true;
      m.receiveShadow = false;
    }
    this.topCap.rotation.x = Math.PI;

    this.group.add(
      this.botCol, this.topCol, this.botCap, this.topCap,
      this.botRing, this.topRing, this.botSeam, this.topSeam,
    );
    this.group.visible = false;

    this.active = false;
    this.x = 0;
    this.gap = 5;
    this.baseGap = 5;
    this.baseY = 8;
    this.gapY = 8;
    this.variant = V_PLAIN;
    this.amp = 0;
    this.phase = 0;
    this.rate = 1;
    this.dxBot = 0;
    this.dxTop = 0;
    this.scored = false;
    this.nearMissed = false;
    this.flash = 0;
  }

  place(x, gapY, gap, variant, amp, phase, rate, stagger) {
    this.x = x;
    this.baseY = gapY;
    this.gapY = gapY;
    this.baseGap = gap;
    this.gap = gap;
    this.variant = variant;
    this.amp = amp;
    this.phase = phase;
    this.rate = rate;
    this.dxBot = variant === V_STAGGER ? -stagger : 0;
    this.dxTop = variant === V_STAGGER ? stagger : 0;
    this.scored = false;
    this.nearMissed = false;
    this.flash = 0;
    this.active = true;
    this.group.visible = true;
    this.layout();
  }

  /** Advance the animated variants. */
  animate(time) {
    if (this.variant === V_MOVER) {
      this.gapY = this.baseY + Math.sin(time * this.rate + this.phase) * this.amp;
    } else if (this.variant === V_PULSE) {
      // breathe upward from the base gap only: never tighter than a plain gate
      this.gap = this.baseGap + (0.5 + 0.5 * Math.sin(time * this.rate * 1.6 + this.phase)) * this.amp;
    }
  }

  layout() {
    const half = this.gap * 0.5;
    this.botTop = this.gapY - half;
    this.topBot = this.gapY + half;
    const botTop = this.botTop, topBot = this.topBot;

    const bh = botTop + 5.0;
    this.botCol.scale.set(1, bh, 1);
    this.botCol.position.set(this.dxBot, botTop - bh * 0.5, 0);
    this.botCap.position.set(this.dxBot, botTop - 0.19, 0);
    this.botRing.position.set(this.dxBot, botTop + 0.03, 0);
    const bSeam = Math.min(bh - 0.9, 3.1);
    this.botSeam.scale.set(1, bSeam, 1);
    this.botSeam.position.set(this.dxBot, botTop - 0.55 - bSeam * 0.5, 0);

    const th = 27.0 - topBot;
    this.topCol.scale.set(1, th, 1);
    this.topCol.position.set(this.dxTop, topBot + th * 0.5, 0);
    this.topCap.position.set(this.dxTop, topBot + 0.19, 0);
    this.topRing.position.set(this.dxTop, topBot - 0.03, 0);
    const tSeam = Math.min(th - 0.9, 3.1);
    this.topSeam.scale.set(1, tSeam, 1);
    this.topSeam.position.set(this.dxTop, topBot + 0.55 + tSeam * 0.5, 0);

    // scoring pop: the emitter rings flare (a transform, so the shared
    // material stays shared)
    const f = 1 + this.flash * 0.42;
    this.botRing.scale.set(f, 1 + this.flash * 1.6, f);
    this.topRing.scale.set(f, 1 + this.flash * 1.6, f);

    this.group.position.x = this.x;
  }

  retire() {
    this.active = false;
    this.group.visible = false;
  }
}

class Shard {
  constructor(mats, geos) {
    this.group = new THREE.Group();
    this.body = new THREE.Mesh(geos.shard, mats.shard);
    this.core = new THREE.Mesh(geos.shardCore, mats.shardCore);
    this.body.castShadow = true;
    this.group.add(this.body, this.core);
    this.group.visible = false;
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.spin = 1;
    this.phase = 0;
    this.bob = 0;
  }

  place(x, y, spin, phase, bob) {
    this.x = x;
    this.y = y;
    this.spin = spin;
    this.phase = phase;
    this.bob = bob;
    this.active = true;
    this.group.visible = true;
    this.group.position.set(x, y, 0);
  }

  animate(time) {
    this.group.position.x = this.x;
    this.group.position.y = this.y + Math.sin(time * 1.3 + this.phase) * this.bob;
    this.group.rotation.y = time * this.spin + this.phase;
    this.group.rotation.z = Math.sin(time * 0.8 + this.phase) * 0.35;
    const s = 1 + Math.sin(time * 3.4 + this.phase) * 0.06;
    this.core.scale.setScalar(s);
  }

  retire() {
    this.active = false;
    this.group.visible = false;
  }
}

export class GateField {
  constructor(scene, seed = 1337) {
    this.rng = makeRng(seed);
    this.group = new THREE.Group();
    scene.add(this.group);

    this.mats = {
      body: new THREE.MeshStandardMaterial({
        vertexColors: true, flatShading: true, roughness: 0.82, metalness: 0.0,
        color: 0xeadfcc,
      }),
      cap: new THREE.MeshStandardMaterial({
        vertexColors: true, flatShading: true, roughness: 0.55, metalness: 0.1,
        color: 0xeadfcc, emissive: 0xff6b3d, emissiveIntensity: 0.30,
      }),
      accent: new THREE.MeshStandardMaterial({
        vertexColors: true, flatShading: true, roughness: 0.32, metalness: 0.0,
        color: 0xff6b3d, emissive: 0xff6b3d, emissiveIntensity: 1.25,
      }),
      // hazards read hot and dark, never like the pale stone of a gate
      // A near-black body with a white-hot core reads as danger against every
      // biome, light sand and deep night alike.
      shard: new THREE.MeshStandardMaterial({
        vertexColors: true, flatShading: true, roughness: 0.36, metalness: 0.25,
        color: 0x231d2b, emissive: 0xff3524, emissiveIntensity: 0.30,
      }),
      shardCore: new THREE.MeshStandardMaterial({
        vertexColors: true, flatShading: true, roughness: 0.18,
        color: 0x2a1410, emissive: 0xfff0e2, emissiveIntensity: 2.4,
      }),
    };

    const geos = {
      col: buildColumn(),
      cap: buildCap(),
      ring: buildRing(),
      seam: buildSeam(),
      shard: buildShard(),
      shardCore: buildShardCore(),
    };
    this.geos = geos;

    this.pool = [];
    for (let i = 0; i < CFG.gatePoolSize; i++) {
      const g = new Gate(this.mats, geos);
      this.pool.push(g);
      this.group.add(g.group);
    }
    this.shards = [];
    for (let i = 0; i < CFG.shardPoolSize; i++) {
      const s = new Shard(this.mats, geos);
      this.shards.push(s);
      this.group.add(s.group);
    }

    this.time = 0;
    this.nextX = 0;
    this.lastGapY = 8;
    this.lastGateX = 0;
    this.spawned = 0;
    this.twinPending = 0;
    this.accent = 0xff6b3d;
  }

  setPalette(b) {
    this.mats.body.color.set(b.gateBody);
    this.mats.cap.color.set(b.gateBody);
    this.mats.cap.emissive.set(b.gateAccent);
    this.mats.accent.color.set(b.gateAccent);
    this.mats.accent.color.multiplyScalar(0.55);
    this.mats.accent.emissive.set(b.gateAccent);
    this.accent = b.gateAccent;
  }

  reset(firstX = 24) {
    for (const g of this.pool) g.retire();
    for (const s of this.shards) s.retire();
    this.nextX = firstX;
    this.lastGapY = 8;
    this.lastGateX = firstX;
    this.spawned = 0;
    this.twinPending = 0;
    this.time = 0;
  }

  /* ---------------------------------------------------------------- *
   * spawning
   * ---------------------------------------------------------------- */

  /** Pick a variant for the given difficulty, respecting the unlock schedule. */
  _pickVariant(score, t) {
    const r = this.rng();
    // chance of *any* variant grows with difficulty
    const exotic = 0.18 + t * 0.52;
    if (r > exotic) return V_PLAIN;
    const pool = [];
    if (score >= CFG.moverFromScore) pool.push(V_MOVER);
    if (score >= CFG.staggerFromScore) pool.push(V_STAGGER);
    if (score >= CFG.pulseFromScore) pool.push(V_PULSE);
    if (!pool.length) return V_PLAIN;
    return pool[Math.floor(this.rng() * pool.length) % pool.length];
  }

  /**
   * Drop a hazard shard in the corridor behind `x`, but only at a height that
   * keeps a clear line between the two gaps it sits between.
   */
  _trySpawnShard(x, gapA, gapB) {
    const s = this.shards.find((h) => !h.active);
    if (!s) return;
    const lo = CFG.shardMinY, hi = CFG.shardMaxY;
    const clear = CFG.shardClearance;
    // candidate heights, furthest from both gap centres first
    const cands = [];
    for (let y = lo; y <= hi; y += 0.4) {
      const d = Math.min(Math.abs(y - gapA), Math.abs(y - gapB));
      if (d >= clear) cands.push(y);
    }
    if (!cands.length) return;
    const y = cands[Math.floor(this.rng() * cands.length) % cands.length];
    s.place(x, y, rand(this.rng, 0.7, 1.5), this.rng() * TAU, rand(this.rng, 0.15, 0.4));
  }

  /** Spawn ahead so obstacles are never seen popping in. */
  ensureAhead(score) {
    const t = rampT(score);
    const baseGap = lerp(CFG.gapStart, CFG.gapEnd, t);
    const spacing = lerp(CFG.spacingStart, CFG.spacingEnd, t);

    while (this.nextX < 62) {
      const g = this.pool.find((p) => !p.active);
      if (!g) break;

      const isTwin = this.twinPending > 0;
      // a twin sits barely a bird-length behind its partner: the second gap has
      // to be within one flap of the first or it simply cannot be flown
      const maxDelta = isTwin ? CFG.twinMaxDelta : 3.0 + t * 2.2;
      const lo = Math.max(CFG.gapMinY, this.lastGapY - maxDelta);
      const hi = Math.min(CFG.gapMaxY, this.lastGapY + maxDelta);
      let gy = rand(this.rng, lo, hi);
      if (!isTwin && Math.abs(gy - this.lastGapY) < 1.1) {
        gy += (this.rng() < 0.5 ? -1 : 1) * 1.4;
        gy = clamp(gy, CFG.gapMinY, CFG.gapMaxY);
      }

      // twins are plain: two variants back to back would be unreadable
      let variant = isTwin ? V_PLAIN : this._pickVariant(score, t);
      let amp = 0, rate = rand(this.rng, 0.6, 1.0), stagger = 0;
      let gap = baseGap;

      if (variant === V_MOVER) {
        amp = rand(this.rng, 0.55, 0.9) + t * 0.7;
        const room = Math.min(gy - CFG.gapMinY, CFG.gapMaxY - gy);
        amp = Math.min(amp, Math.max(0, room));
        if (amp < 0.25) variant = V_PLAIN;
      } else if (variant === V_STAGGER) {
        stagger = rand(this.rng, 0.5, 0.72);
        // a diagonal slot needs a hair more room to fly through cleanly
        gap = baseGap + 0.35;
      } else if (variant === V_PULSE) {
        amp = rand(this.rng, 0.5, 0.95);
        rate = rand(this.rng, 0.7, 1.1);
      }

      g.place(this.nextX, gy, gap, variant, amp, this.rng() * TAU, rate, stagger);

      // a shard can live in the corridor we just spanned
      if (score >= CFG.shardFromScore && this.spawned > 0 && !isTwin) {
        const chance = 0.18 + t * 0.42;
        if (this.rng() < chance) {
          this._trySpawnShard((this.lastGateX + this.nextX) * 0.5, this.lastGapY, gy);
        }
      }

      this.lastGapY = gy;
      this.lastGateX = this.nextX;
      this.spawned++;

      if (isTwin) {
        this.twinPending--;
        this.nextX += spacing * 1.15;
      } else if (score >= CFG.twinFromScore && this.rng() < 0.10 + t * 0.16) {
        this.twinPending = 1;
        this.nextX += spacing * CFG.twinSpacing;
      } else {
        this.nextX += spacing;
      }
    }
  }

  update(dt, dx, score) {
    this.time += dt;
    this.nextX -= dx;
    this.lastGateX -= dx;

    for (const g of this.pool) {
      if (!g.active) continue;
      g.x -= dx;
      if (g.x < -16) { g.retire(); continue; }
      g.animate(this.time);
      g.flash = Math.max(0, g.flash - dt * 3.4);
      g.layout();
    }
    for (const s of this.shards) {
      if (!s.active) continue;
      s.x -= dx;
      if (s.x < -14) { s.retire(); continue; }
      s.animate(this.time);
    }
    this.ensureAhead(score);
  }

  /* ---------------------------------------------------------------- *
   * collision
   * ---------------------------------------------------------------- */

  /**
   * The bird is a short oriented capsule, approximated by `n` circles whose
   * world positions arrive in `sx`/`sy`. Circle-vs-AABB per column, plus
   * circle-vs-circle for shards. Exact, and it tracks the bird's pitch.
   */
  hitTest(sx, sy, n, r) {
    const hw = CFG.gateCollideHalfW;
    const r2 = r * r;

    for (const g of this.pool) {
      if (!g.active) continue;
      if (g.x < -3.2 - r || g.x > 3.2 + r) continue;
      for (let side = 0; side < 2; side++) {
        const cx = g.x + (side === 0 ? g.dxBot : g.dxTop);
        const x0 = cx - hw, x1 = cx + hw;
        // bottom column spans -inf..botTop, top column topBot..+inf
        const yEdge = side === 0 ? g.botTop : g.topBot;
        for (let i = 0; i < n; i++) {
          const px = sx[i], py = sy[i];
          const ddx = px < x0 ? x0 - px : px > x1 ? px - x1 : 0;
          const ddy = side === 0
            ? (py < yEdge ? 0 : py - yEdge)
            : (py > yEdge ? 0 : yEdge - py);
          if (ddx * ddx + ddy * ddy < r2) return { gate: g, kind: 'gate' };
        }
      }
    }

    const sr = CFG.shardRadius;
    for (const h of this.shards) {
      if (!h.active) continue;
      if (h.x < -3 - r || h.x > 3 + r) continue;
      const hx = h.group.position.x, hy = h.group.position.y;
      const rad = r + sr;
      for (let i = 0; i < n; i++) {
        const ddx = sx[i] - hx, ddy = sy[i] - hy;
        if (ddx * ddx + ddy * ddy < rad * rad) return { shard: h, kind: 'shard' };
      }
    }
    return null;
  }

  /**
   * Push a circle out of any column or shard it overlaps.
   * Returns the accumulated separation vector, or null when it is free. Used by
   * the wreck after a crash so it bounces off the world instead of sinking
   * through it.
   */
  separate(px, py, r, out) {
    let bestX = 0, bestY = 0, best = 0;
    const hw = CFG.gateCollideHalfW;
    const consider = (dx, dy) => {
      const d2 = dx * dx + dy * dy;
      if (d2 > best) { best = d2; bestX = dx; bestY = dy; }
    };
    for (const g of this.pool) {
      if (!g.active) continue;
      if (px < g.x - 4 || px > g.x + 4) continue;
      for (let side = 0; side < 2; side++) {
        const cx = g.x + (side === 0 ? g.dxBot : g.dxTop);
        const x0 = cx - hw, x1 = cx + hw;
        const yEdge = side === 0 ? g.botTop : g.topBot;
        // nearest point on the (semi-infinite) column box
        const qx = px < x0 ? x0 : px > x1 ? x1 : px;
        const qy = side === 0 ? Math.min(py, yEdge) : Math.max(py, yEdge);
        let dx = px - qx, dy = py - qy;
        const d2 = dx * dx + dy * dy;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2), k = (r - d) / d;
          consider(dx * k, dy * k);
        } else {
          // dead centre inside: leave by the shallowest face
          const outs = [
            [x0 - r - px, 0], [x1 + r - px, 0],
            side === 0 ? [0, yEdge + r - py] : [0, yEdge - r - py],
          ];
          outs.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
          consider(outs[0][0], outs[0][1]);
        }
      }
    }
    const sr = CFG.shardRadius;
    for (const h of this.shards) {
      if (!h.active) continue;
      const dx = px - h.group.position.x, dy = py - h.group.position.y;
      const rad = r + sr;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rad * rad || d2 < 1e-8) continue;
      const d = Math.sqrt(d2), k = (rad - d) / d;
      consider(dx * k, dy * k);
    }
    if (best === 0) return null;
    out.x = bestX; out.y = bestY;
    return out;
  }

  /**
   * Threaded-the-needle check. Fires at most once per gate and returns the
   * clearance in world units, or -1 when nothing qualifies.
   */
  nearMissCheck(y, thresh) {
    for (const g of this.pool) {
      if (!g.active || g.nearMissed) continue;
      if (Math.abs(g.x) > CFG.gateHalfW + 0.5) continue;
      const c = Math.min(Math.abs(y - g.botTop), Math.abs(g.topBot - y));
      if (c < thresh) {
        g.nearMissed = true;
        return c;
      }
    }
    return -1;
  }

  /** Gate whose scoring plane the bird just crossed, else null. */
  takeScore() {
    for (const g of this.pool) {
      if (g.active && !g.scored && g.x <= 0) {
        g.scored = true;
        g.flash = 1;
        return g;
      }
    }
    return null;
  }
}
