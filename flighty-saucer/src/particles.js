/**
 * particles.js — one pooled GPU point system per blend mode (2 draw calls for
 * every effect in the game). Sprites are cut from a procedurally generated
 * 2x2 atlas: glow, feather, ring, sparkle.
 *
 * Everything is pre-allocated: no garbage is produced while playing.
 */
import { THREE } from './runtime.js';
import { clamp, TAU } from './util.js';

const TILE_GLOW = 0, TILE_FEATHER = 1, TILE_RING = 2, TILE_SPARK = 3;

function buildAtlas() {
  const S = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S * 2;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, S * 2, S * 2);

  // tile position helper (uv origin bottom-left, canvas origin top-left)
  const at = (idx) => [(idx % 2) * S, (1 - Math.floor(idx / 2)) * S];

  // --- glow ---
  {
    const [x, y] = at(TILE_GLOW);
    const grd = g.createRadialGradient(x + S / 2, y + S / 2, 0, x + S / 2, y + S / 2, S / 2);
    grd.addColorStop(0.0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.25, 'rgba(255,255,255,0.75)');
    grd.addColorStop(0.6, 'rgba(255,255,255,0.18)');
    grd.addColorStop(1.0, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(x, y, S, S);
  }

  // --- feather ---
  {
    const [x, y] = at(TILE_FEATHER);
    g.save();
    g.translate(x + S / 2, y + S / 2);
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(0, -S * 0.42);
    g.bezierCurveTo(S * 0.26, -S * 0.1, S * 0.2, S * 0.24, 0, S * 0.42);
    g.bezierCurveTo(-S * 0.2, S * 0.24, -S * 0.26, -S * 0.1, 0, -S * 0.42);
    g.fill();
    // spine notch for a hand-drawn feel
    g.globalCompositeOperation = 'destination-out';
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    g.lineWidth = S * 0.035;
    g.beginPath();
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const yy = -S * 0.3 + t * S * 0.62;
      g.moveTo(0, yy);
      g.lineTo((i % 2 ? 1 : -1) * S * 0.2, yy + S * 0.06);
    }
    g.stroke();
    g.restore();
  }

  // --- ring ---
  {
    const [x, y] = at(TILE_RING);
    const cx = x + S / 2, cy = y + S / 2;
    const grd = g.createRadialGradient(cx, cy, S * 0.28, cx, cy, S * 0.5);
    grd.addColorStop(0.0, 'rgba(255,255,255,0)');
    grd.addColorStop(0.55, 'rgba(255,255,255,0.95)');
    grd.addColorStop(0.8, 'rgba(255,255,255,0.35)');
    grd.addColorStop(1.0, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(x, y, S, S);
  }

  // --- sparkle (4-point star) ---
  {
    const [x, y] = at(TILE_SPARK);
    g.save();
    g.translate(x + S / 2, y + S / 2);
    const grd = g.createRadialGradient(0, 0, 0, 0, 0, S * 0.5);
    grd.addColorStop(0, 'rgba(255,255,255,1)');
    grd.addColorStop(0.35, 'rgba(255,255,255,0.35)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      const a2 = a + TAU / 8;
      g.lineTo(Math.cos(a) * S * 0.48, Math.sin(a) * S * 0.48);
      g.lineTo(Math.cos(a2) * S * 0.055, Math.sin(a2) * S * 0.055);
    }
    g.closePath();
    g.fill();
    g.beginPath();
    g.arc(0, 0, S * 0.09, 0, TAU);
    g.fill();
    g.restore();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

const P_VERT = /* glsl */`
  attribute vec3 aColor;
  attribute vec4 aParams;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha, vRot, vTile;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(aParams.x * uScale / max(0.25, -mv.z), 1.0, 640.0);
    vColor = aColor;
    vAlpha = aParams.y;
    vRot = aParams.z;
    vTile = aParams.w;
  }
`;

const P_FRAG = /* glsl */`
  precision highp float;
  uniform sampler2D uTex;
  varying vec3 vColor;
  varying float vAlpha, vRot, vTile;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float c = cos(vRot), s = sin(vRot);
    vec2 rp = vec2(p.x * c - p.y * s, p.x * s + p.y * c) + 0.5;
    if (rp.x < 0.001 || rp.x > 0.999 || rp.y < 0.001 || rp.y > 0.999) discard;
    vec2 off = vec2(mod(vTile, 2.0), floor(vTile * 0.5)) * 0.5;
    vec4 t = texture2D(uTex, off + rp * 0.5);
    float a = t.a * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor * t.rgb, a);
  }
`;

class Pool {
  constructor(max, tex, additive) {
    this.max = max;
    this.count = 0;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.par = new Float32Array(max * 4);
    // cpu-only state
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.s0 = new Float32Array(max);
    this.s1 = new Float32Array(max);
    this.a0 = new Float32Array(max);
    this.spin = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.fadePow = new Float32Array(max);

    const geo = new THREE.BufferGeometry();
    this.aPos = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.aCol = new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage);
    this.aPar = new THREE.BufferAttribute(this.par, 4).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.aPos);
    geo.setAttribute('aColor', this.aCol);
    geo.setAttribute('aParams', this.aPar);
    geo.setDrawRange(0, 0);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 8, 0), 400);

    this.material = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uScale: { value: 500 } },
      vertexShader: P_VERT,
      fragmentShader: P_FRAG,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.geo = geo;
  }

  spawn(o) {
    let i = this.count;
    if (i >= this.max) {
      // recycle the oldest slot rather than dropping the effect
      i = (this._rr = ((this._rr || 0) + 1) % this.max);
    } else {
      this.count++;
    }
    const i3 = i * 3, i4 = i * 4;
    this.pos[i3] = o.x; this.pos[i3 + 1] = o.y; this.pos[i3 + 2] = o.z || 0;
    this.vel[i3] = o.vx || 0; this.vel[i3 + 1] = o.vy || 0; this.vel[i3 + 2] = o.vz || 0;
    this.col[i3] = o.r; this.col[i3 + 1] = o.g; this.col[i3 + 2] = o.b;
    this.life[i] = 0;
    this.maxLife[i] = o.life;
    this.s0[i] = o.size0; this.s1[i] = o.size1;
    this.a0[i] = o.alpha === undefined ? 1 : o.alpha;
    this.spin[i] = o.spin || 0;
    this.grav[i] = o.grav || 0;
    this.drag[i] = o.drag === undefined ? 1.6 : o.drag;
    this.fadePow[i] = o.fadePow || 1;
    this.par[i4] = o.size0;
    this.par[i4 + 1] = this.a0[i];
    this.par[i4 + 2] = o.rot || 0;
    this.par[i4 + 3] = o.tile || 0;
  }

  /** scroll the whole pool with the world */
  shift(dx) {
    for (let i = 0; i < this.count; i++) this.pos[i * 3] -= dx;
  }

  update(dt) {
    let i = 0;
    while (i < this.count) {
      this.life[i] += dt;
      const t = this.life[i] / this.maxLife[i];
      if (t >= 1) {
        // swap-remove
        const last = this.count - 1;
        if (i !== last) this._copy(last, i);
        this.count--;
        continue;
      }
      const i3 = i * 3, i4 = i * 4;
      const d = Math.exp(-this.drag[i] * dt);
      this.vel[i3] *= d;
      this.vel[i3 + 1] = this.vel[i3 + 1] * d - this.grav[i] * dt;
      this.vel[i3 + 2] *= d;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;

      this.par[i4] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      this.par[i4 + 1] = this.a0[i] * Math.pow(1 - t, this.fadePow[i]);
      this.par[i4 + 2] += this.spin[i] * dt;
      i++;
    }
    this.geo.setDrawRange(0, this.count);
    if (this.count > 0) {
      // upload only the live prefix, not the whole 560-slot pool
      const n = this.count;
      for (const [attr, comps] of [[this.aPos, 3], [this.aCol, 3], [this.aPar, 4]]) {
        if (attr.clearUpdateRanges) {
          attr.clearUpdateRanges();
          attr.addUpdateRange(0, n * comps);
        }
        attr.needsUpdate = true;
      }
    }
  }

  _copy(from, to) {
    const f3 = from * 3, t3 = to * 3, f4 = from * 4, t4 = to * 4;
    for (let k = 0; k < 3; k++) {
      this.pos[t3 + k] = this.pos[f3 + k];
      this.col[t3 + k] = this.col[f3 + k];
      this.vel[t3 + k] = this.vel[f3 + k];
    }
    for (let k = 0; k < 4; k++) this.par[t4 + k] = this.par[f4 + k];
    this.life[to] = this.life[from];
    this.maxLife[to] = this.maxLife[from];
    this.s0[to] = this.s0[from]; this.s1[to] = this.s1[from];
    this.a0[to] = this.a0[from];
    this.spin[to] = this.spin[from];
    this.grav[to] = this.grav[from];
    this.drag[to] = this.drag[from];
    this.fadePow[to] = this.fadePow[from];
  }

  clear() {
    this.count = 0;
    this.geo.setDrawRange(0, 0);
  }
}

const _c = new THREE.Color();

export class Particles {
  constructor(scene) {
    this.tex = buildAtlas();
    this.add = new Pool(560, this.tex, true);
    this.nrm = new Pool(340, this.tex, false);
    this.group = new THREE.Group();
    this.group.add(this.add.points, this.nrm.points);
    scene.add(this.group);
    this.intensity = 1;
  }

  setViewport(heightPx, fovRad) {
    const s = 0.5 * heightPx / Math.tan(fovRad * 0.5);
    this.add.material.uniforms.uScale.value = s;
    this.nrm.material.uniforms.uScale.value = s;
  }

  setQuality(q) { this.intensity = clamp(q.motes + 0.35, 0.5, 1.35); }

  update(dt) { this.add.update(dt); this.nrm.update(dt); }
  shift(dx) { this.add.shift(dx); this.nrm.shift(dx); }
  clear() { this.add.clear(); this.nrm.clear(); }

  _n(count) { return Math.max(1, Math.round(count * this.intensity)); }

  /* ---------------- emitters ---------------- */

  thrustPuff(x, y, z, tint) {
    _c.set(tint);
    // expanding air ring under the wings
    this.add.spawn({
      x: x - 0.15, y: y - 0.28, z, r: _c.r, g: _c.g, b: _c.b,
      life: 0.42, size0: 0.5, size1: 2.7, alpha: 0.5, tile: TILE_RING, drag: 3, fadePow: 1.5,
      vx: -3.5,
    });
    const n = this._n(5);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      this.nrm.spawn({
        x: x - 0.2 + Math.random() * 0.3, y: y - 0.2, z: z + (Math.random() - 0.5) * 0.5,
        vx: -3 - Math.random() * 2.5, vy: -3.5 - Math.random() * 3.0, vz: Math.cos(a) * 1.2,
        r: 1, g: 1, b: 1, life: 0.5 + Math.random() * 0.3,
        size0: 0.16, size1: 0.5, alpha: 0.30, tile: TILE_GLOW, drag: 2.2, fadePow: 1.6,
      });
    }
  }

  trailSpark(x, y, z, tint) {
    _c.set(tint);
    this.add.spawn({
      x, y, z, vx: -1.2, vy: (Math.random() - 0.5) * 0.6,
      r: _c.r, g: _c.g, b: _c.b, life: 0.5, size0: 0.30, size1: 0.02,
      alpha: 0.55, tile: TILE_GLOW, drag: 1.2, fadePow: 1.2,
    });
  }

  scoreBurst(x, y, z, tint) {
    _c.set(tint);
    this.add.spawn({
      x, y, z, r: _c.r, g: _c.g, b: _c.b, life: 0.55, size0: 0.8, size1: 6.0,
      alpha: 0.75, tile: TILE_RING, drag: 4, fadePow: 1.6,
    });
    const n = this._n(14);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + Math.random() * 0.4;
      const sp = 4 + Math.random() * 7;
      this.add.spawn({
        x, y, z: z + (Math.random() - 0.5) * 0.8,
        vx: Math.cos(a) * sp * 0.5 - 2, vy: Math.sin(a) * sp, vz: (Math.random() - 0.5) * 3,
        r: _c.r, g: _c.g, b: _c.b, life: 0.36 + Math.random() * 0.30,
        size0: 0.21 + Math.random() * 0.13, size1: 0.02, alpha: 0.95,
        tile: TILE_SPARK, rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 8,
        drag: 1.9, grav: 2,
      });
    }
  }

  milestone(x, y, z, tint) {
    _c.set(tint);
    for (let k = 0; k < 3; k++) {
      this.add.spawn({
        x, y, z, r: _c.r, g: _c.g, b: _c.b, life: 0.7 + k * 0.18,
        size0: 1.0 + k, size1: 9 + k * 4, alpha: 0.55, tile: TILE_RING, drag: 3.4, fadePow: 1.7,
      });
    }
    const n = this._n(30);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const sp = 5 + Math.random() * 12;
      const warm = Math.random() < 0.5;
      this.add.spawn({
        x, y, z: z + (Math.random() - 0.5) * 1.5,
        vx: Math.cos(a) * sp * 0.6 - 2, vy: Math.sin(a) * sp, vz: (Math.random() - 0.5) * 5,
        r: warm ? 1 : _c.r, g: warm ? 0.92 : _c.g, b: warm ? 0.62 : _c.b,
        life: 0.7 + Math.random() * 0.7,
        size0: 0.4 + Math.random() * 0.3, size1: 0.02, alpha: 1,
        tile: Math.random() < 0.7 ? TILE_SPARK : TILE_GLOW,
        rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 10, drag: 1.5, grav: 3.5,
      });
    }
  }

  crash(x, y, z, bodyTint, accent, style) {
    _c.set(bodyTint);
    const br = _c.r, bg = _c.g, bb = _c.b;
    const shard = style === 'shard';
    const nf = this._n(shard ? 16 : 20);
    for (let i = 0; i < nf; i++) {
      const a = Math.random() * TAU;
      const sp = 2.5 + Math.random() * 8;
      this.nrm.spawn({
        x, y, z: z + (Math.random() - 0.5) * 0.6,
        vx: Math.cos(a) * sp * 0.7, vy: Math.abs(Math.sin(a)) * sp * 0.9 + 1,
        vz: (Math.random() - 0.5) * 4,
        r: br, g: bg, b: bb, life: shard ? 1.1 + Math.random() * 0.9 : 1.5 + Math.random() * 1.2,
        size0: shard ? 0.20 + Math.random() * 0.16 : 0.30 + Math.random() * 0.22,
        size1: shard ? 0.16 : 0.26, alpha: 1,
        tile: shard ? TILE_SPARK : TILE_FEATHER,
        rot: Math.random() * TAU, spin: (Math.random() - 0.5) * (shard ? 12 : 7),
        drag: shard ? 0.9 : 1.15, grav: shard ? 7.5 : 4.5, fadePow: 2.2,
      });
    }
    _c.set(accent);
    this.add.spawn({
      x, y, z, r: 1, g: 1, b: 1, life: 0.4, size0: 1.2, size1: 8, alpha: 0.9,
      tile: TILE_RING, drag: 5, fadePow: 1.4,
    });
    const ns = this._n(16);
    for (let i = 0; i < ns; i++) {
      const a = Math.random() * TAU;
      const sp = 6 + Math.random() * 12;
      this.add.spawn({
        x, y, z, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: (Math.random() - 0.5) * 6,
        r: _c.r, g: _c.g, b: _c.b, life: 0.3 + Math.random() * 0.35,
        size0: 0.5, size1: 0.02, alpha: 1, tile: TILE_SPARK,
        rot: Math.random() * TAU, spin: (Math.random() - 0.5) * 14, drag: 3, grav: 1,
      });
    }
  }

  groundPuff(x, y, z, tint) {
    _c.set(tint);
    const n = this._n(9);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      this.nrm.spawn({
        x: x + (Math.random() - 0.5) * 0.6, y, z: z + (Math.random() - 0.5) * 1.2,
        vx: Math.cos(a) * 3.5, vy: 1.2 + Math.random() * 2.4, vz: Math.sin(a) * 3.5,
        r: _c.r, g: _c.g, b: _c.b, life: 0.7 + Math.random() * 0.5,
        size0: 0.35, size1: 1.5, alpha: 0.5, tile: TILE_GLOW, drag: 2.6, grav: 1.2, fadePow: 1.6,
      });
    }
  }

  nearMiss(x, y, z, tint) {
    _c.set(tint);
    const n = this._n(5);
    for (let i = 0; i < n; i++) {
      this.add.spawn({
        x: x + (Math.random() - 0.5) * 0.4, y: y + (Math.random() - 0.5) * 1.4, z,
        vx: -6 - Math.random() * 4, vy: (Math.random() - 0.5) * 2,
        r: _c.r, g: _c.g, b: _c.b, life: 0.3, size0: 0.3, size1: 0.02,
        alpha: 0.9, tile: TILE_SPARK, rot: Math.random() * TAU, spin: 8, drag: 1.4,
      });
    }
  }
}
