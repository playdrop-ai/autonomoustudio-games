/**
 * world.js — everything that isn't the bird or the gates: the palette
 * cross-fader, lighting, scrolling low-poly terrain, water, three parallax
 * mountain ranges, volumetric clouds, instanced vegetation, floating islands,
 * drifting motes and distant flocks.
 *
 * The bird stays at x = 0 and the world scrolls past it, so nothing ever needs
 * a floating-point rebase and the camera framing is rock stable.
 */
import { THREE } from './runtime.js';
import { CFG, BIOMES } from './config.js';
import { TAU, clamp, clamp01, lerp, smoothstep, fbm2, noise2, makeRng, rand, mergeGeometries, applyTransform, invLerp } from './util.js';

/* ================================================================== *
 * Palette — holds the current (cross-faded) look of the world.
 * ================================================================== */
const COLOR_KEYS = [
  'skyTop', 'skyHorizon', 'skyLow', 'fog', 'sunColor', 'hemiSky', 'hemiGround',
  'groundLow', 'groundHigh', 'waterColor', 'cloudColor', 'cloudShade',
  'gateBody', 'gateAccent', 'propA', 'propB', 'trunk', 'rockColor', 'moteColor', 'trail',
];
const NUM_KEYS = [
  'sunInt', 'sunGlow', 'sunSize', 'hemiInt', 'stars', 'aurora',
  'waterOpacity', 'moteCount', 'moteSpeed', 'cloudCount', 'pad',
  'fogNear', 'fogFar',
];

export class Palette {
  constructor(index = 0) {
    this.index = index;
    this.targetIndex = index;
    this.t = 1;
    this.cur = {};
    const b = BIOMES[index];
    for (const k of COLOR_KEYS) this.cur[k] = new THREE.Color(b[k]);
    this.cur.mtn = b.mtn.map((c) => new THREE.Color(c));
    for (const k of NUM_KEYS) this.cur[k] = b[k];
    this.cur.sunDir = new THREE.Vector3(...b.sunDir).normalize();
    this.prop = b.prop;
    this.name = b.name;
    this.ui = b.ui;
    this.chord = b.chord;
    this.changed = true;
  }

  to(index) {
    if (index === this.targetIndex) return false;
    this.fromIndex = this.targetIndex;
    this.targetIndex = index;
    this.t = 0;
    return true;
  }

  update(dt) {
    if (this.t >= 1) return false;
    this.t = clamp01(this.t + dt / 2.4);
    const k = smoothstep(0, 1, this.t);
    const a = BIOMES[this.fromIndex], b = BIOMES[this.targetIndex];
    const tmpA = _cA, tmpB = _cB;
    for (const key of COLOR_KEYS) {
      tmpA.set(a[key]); tmpB.set(b[key]);
      this.cur[key].copy(tmpA).lerp(tmpB, k);
    }
    for (let i = 0; i < 3; i++) {
      tmpA.set(a.mtn[i]); tmpB.set(b.mtn[i]);
      this.cur.mtn[i].copy(tmpA).lerp(tmpB, k);
    }
    for (const key of NUM_KEYS) this.cur[key] = lerp(a[key], b[key], k);
    _v1.set(...a.sunDir).normalize();
    _v2.set(...b.sunDir).normalize();
    this.cur.sunDir.copy(_v1).lerp(_v2, k).normalize();
    if (k > 0.5) {
      this.prop = b.prop;
      this.name = b.name;
      this.ui = b.ui;
      this.chord = b.chord;
      this.index = this.targetIndex;
    }
    this.changed = true;
    return true;
  }
}

const _cA = new THREE.Color(), _cB = new THREE.Color();
const _white = new THREE.Color(0xffffff);
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s3 = new THREE.Vector3();
const _p3 = new THREE.Vector3();

/* ================================================================== *
 * Materials that take two tint uniforms (terrain, mountains)
 * ================================================================== */
function gradientMaterial(low, high, opts = {}) {
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, ...opts });
  mat.userData.uLow = { value: low };
  mat.userData.uHigh = { value: high };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uLow = mat.userData.uLow;
    shader.uniforms.uHigh = mat.userData.uHigh;
    shader.vertexShader = 'attribute float aH;\nvarying float vH;\n' + shader.vertexShader
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vH = aH;');
    shader.fragmentShader = 'uniform vec3 uLow;\nuniform vec3 uHigh;\nvarying float vH;\n' + shader.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= mix(uLow, uHigh, clamp(vH, 0.0, 1.0));');
  };
  return mat;
}

/* ================================================================== *
 * Terrain — scrolling strips of low-poly ground
 * ================================================================== */
const T_SEGX = 18, T_SEGZ = 22;

class Terrain {
  constructor(scene, pal) {
    this.pal = pal;
    this.material = gradientMaterial(pal.cur.groundLow, pal.cur.groundHigh, { flatShading: true });
    this.strips = [];
    this.group = new THREE.Group();
    scene.add(this.group);

    for (let i = 0; i < CFG.terrainSegs; i++) {
      const geo = new THREE.PlaneGeometry(CFG.terrainSegLen, CFG.terrainWidth, T_SEGX, T_SEGZ);
      geo.rotateX(-Math.PI / 2);
      geo.setAttribute('aH', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count), 1));
      const mesh = new THREE.Mesh(geo, this.material);
      mesh.receiveShadow = true;
      mesh.position.x = i * CFG.terrainSegLen;
      mesh.matrixAutoUpdate = true;
      this.group.add(mesh);
      this.strips.push({ mesh, geo, origin: i * CFG.terrainSegLen });
      this._displace(this.strips[i]);
    }
  }

  _displace(strip) {
    const p = strip.geo.attributes.position;
    const h = strip.geo.attributes.aH;
    const ox = strip.origin;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + ox;
      const z = p.getZ(i);
      const az = Math.abs(z);
      // flat, honest corridor around z = 0 — the floor height must be readable
      const rise = smoothstep(CFG.corridorHalf, CFG.corridorHalf + 13, az);
      let y = fbm2(x * 0.030, z * 0.028, 3) * 4.8 * rise;
      y += fbm2(x * 0.11 + 40, z * 0.10, 2) * 0.85 * rise;
      // a soft roll everywhere, kept well under the death floor
      y += fbm2(x * 0.055 + 7, z * 0.05 - 3, 2) * 0.34;
      y += noise2(x * 0.19, z * 0.17) * 0.09;
      // shoreline: pull the outer edge up into a bank
      y += smoothstep(18, 26, az) * 2.2;
      p.setY(i, y);
      h.setX(i, clamp01(y / 3.4 + 0.12 + noise2(x * 0.5, z * 0.5) * 0.08));
    }
    p.needsUpdate = true;
    h.needsUpdate = true;
    strip.geo.computeVertexNormals();
  }

  update(dx, dist) {
    const span = CFG.terrainSegLen * CFG.terrainSegs;
    for (const s of this.strips) {
      s.mesh.position.x -= dx;
      if (s.mesh.position.x < -CFG.terrainSegLen * 1.6) {
        s.mesh.position.x += span;
        s.origin = dist + s.mesh.position.x;
        this._displace(s);
      }
    }
  }

  syncPalette(pal) {
    this.material.userData.uLow.value = pal.cur.groundLow;
    this.material.userData.uHigh.value = pal.cur.groundHigh;
  }
}

/* ================================================================== *
 * Water — two animated bands flanking the valley
 * ================================================================== */
const WATER_VERT = /* glsl */`
  uniform float uTime;
  varying float vFogDepth;
  varying float vWave;
  varying vec2 vXZ;
  void main() {
    vec3 p = position;
    float w = sin(p.x * 0.22 + uTime * 1.1) * 0.16
            + sin(p.z * 0.31 - uTime * 0.8) * 0.13
            + sin((p.x + p.z) * 0.09 + uTime * 0.5) * 0.20;
    p.y += w;
    vWave = w;
    vXZ = vec2(p.x, p.z);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vFogDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const WATER_FRAG = /* glsl */`
  precision highp float;
  uniform vec3 uColor, uDeep, uSky, fogColor;
  uniform float uOpacity, uTime, fogNear, fogFar;
  varying float vFogDepth, vWave;
  varying vec2 vXZ;
  float hash21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    float k = clamp(vWave * 1.6 + 0.5, 0.0, 1.0);
    vec3 col = mix(uDeep, uColor, k);
    // sun glitter
    vec2 g = floor(vXZ * 2.2 + vec2(uTime * 1.4, 0.0));
    float sp = step(0.984, hash21(g)) * (0.5 + 0.5 * sin(uTime * 5.0 + hash21(g) * 30.0));
    col += uSky * sp * 0.45;
    col = mix(col, uSky, 0.14);
    float f = smoothstep(fogNear, fogFar, vFogDepth);
    col = mix(col, fogColor, f);
    gl_FragColor = vec4(col, uOpacity);
  }
`;

class Water {
  constructor(scene, pal) {
    this.uniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color().copy(pal.cur.waterColor) },
      uDeep: { value: new THREE.Color().copy(pal.cur.waterColor).multiplyScalar(0.55) },
      uSky: { value: new THREE.Color().copy(pal.cur.skyHorizon) },
      uOpacity: { value: pal.cur.waterOpacity },
      fogColor: { value: new THREE.Color().copy(pal.cur.fog) },
      fogNear: { value: CFG.fogNear },
      fogFar: { value: CFG.fogFar },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: WATER_VERT,
      fragmentShader: WATER_FRAG,
      transparent: true,
      depthWrite: false,
    });
    this.group = new THREE.Group();
    for (const s of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(760, 130, 34, 10);
      geo.rotateX(-Math.PI / 2);
      const m = new THREE.Mesh(geo, this.material);
      m.position.set(150, -0.55, s * 88);
      m.matrixAutoUpdate = false;
      m.updateMatrix();
      this.group.add(m);
    }
    scene.add(this.group);
  }

  update(dt) { this.uniforms.uTime.value += dt; }

  syncPalette(pal) {
    this.uniforms.uColor.value.copy(pal.cur.waterColor);
    this.uniforms.uDeep.value.copy(pal.cur.waterColor).multiplyScalar(0.5);
    this.uniforms.uSky.value.copy(pal.cur.skyHorizon);
    this.uniforms.uOpacity.value = pal.cur.waterOpacity;
    this.uniforms.fogColor.value.copy(pal.cur.fog);
    this.uniforms.fogNear.value = pal.cur.fogNear;
    this.uniforms.fogFar.value = pal.cur.fogFar;
  }
}

/* ================================================================== *
 * Mountains — three parallax ridge ribbons
 * ================================================================== */
/**
 * Ridges are sampled on a circle so the height function is exactly periodic:
 * the ribbon can then be wrapped by one period with no visible seam.
 */
const RIDGE_PERIOD = 340;

class Mountains {
  constructor(scene, pal) {
    this.layers = [];
    const conf = [
      { z: -62, h: 15, base: -5, factor: 0.34, seed: 11, rad: 3.4, detail: 1.0 },
      { z: -108, h: 27, base: -8, factor: 0.20, seed: 61, rad: 2.3, detail: 0.7 },
      { z: -172, h: 44, base: -10, factor: 0.10, seed: 97, rad: 1.5, detail: 0.45 },
    ];
    this.group = new THREE.Group();
    scene.add(this.group);

    conf.forEach((c, li) => {
      const perPeriod = 130;
      const N = perPeriod * 2 + 1;      // two periods so a wrap is always covered
      const pos = new Float32Array(N * 2 * 3);
      const col = new Float32Array(N * 2 * 3);
      const idx = [];
      for (let i = 0; i < N; i++) {
        const x = -RIDGE_PERIOD + (i / perPeriod) * RIDGE_PERIOD;
        const th = (x / RIDGE_PERIOD) * TAU;
        const cx = Math.cos(th) * c.rad + c.seed;
        const cz = Math.sin(th) * c.rad;
        let hh = fbm2(cx, cz, 4) * 0.5 + 0.5;
        hh = Math.pow(clamp01(hh), 1.4);
        const jag = (fbm2(cx * 4.1, cz * 4.1, 2) * 0.5) * c.h * 0.16 * c.detail;
        const peak = c.base + hh * c.h + jag;
        const o = i * 6;
        pos[o] = x; pos[o + 1] = c.base - 8; pos[o + 2] = 0;
        pos[o + 3] = x; pos[o + 4] = peak; pos[o + 5] = 0;
        // shade: dark at the base, bright at the crest
        const s0 = 0.60, s1 = 1.0 + hh * 0.14;
        col[o] = col[o + 1] = col[o + 2] = s0;
        col[o + 3] = col[o + 4] = col[o + 5] = s1;
      }
      for (let i = 0; i < N - 1; i++) {
        const a = i * 2;
        idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();

      const mat = new THREE.MeshBasicMaterial({
        vertexColors: true, color: pal.cur.mtn[li].clone(), fog: true, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, 0, c.z);
      mesh.matrixAutoUpdate = true;
      this.group.add(mesh);
      this.layers.push({ mesh, mat, factor: c.factor, off: 0 });
    });
  }

  update(dx) {
    for (const l of this.layers) {
      l.off -= dx * l.factor;
      if (l.off < -RIDGE_PERIOD) l.off += RIDGE_PERIOD;
      l.mesh.position.x = l.off;
    }
  }

  syncPalette(pal) {
    for (let i = 0; i < this.layers.length; i++) this.layers[i].mat.color.copy(pal.cur.mtn[i]);
  }
}

/* ================================================================== *
 * Clouds — near low-poly clusters + far soft billboards
 * ================================================================== */
function cloudTexture() {
  const S = 256;
  const cv = document.createElement('canvas');
  cv.width = S; cv.height = S / 2;
  const g = cv.getContext('2d');
  const blobs = [
    [0.5, 0.62, 0.30], [0.32, 0.66, 0.22], [0.68, 0.66, 0.24],
    [0.44, 0.48, 0.18], [0.60, 0.50, 0.16], [0.22, 0.72, 0.14], [0.80, 0.72, 0.13],
  ];
  for (const [bx, by, br] of blobs) {
    const x = bx * S, y = by * (S / 2), r = br * S * 0.5;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.85)');
    grd.addColorStop(0.55, 'rgba(255,255,255,0.35)');
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function cloudGeometry(seed) {
  const rng = makeRng(seed);
  const parts = [];
  // a flat-bottomed cluster: big lobes in a ring, smaller ones piled on top
  const lobes = 5 + Math.floor(rng() * 3);
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * TAU + rng() * 0.5;
    const rad = 0.55 + rng() * 0.55;
    const r = 0.72 + rng() * 0.5;
    const s = new THREE.IcosahedronGeometry(r, 1);
    applyTransform(s,
      [Math.cos(a) * rad * 1.55, rng() * 0.18, Math.sin(a) * rad * 0.85],
      [0, rng() * TAU, rng() * 0.4], [1.0, 0.72, 1.0]);
    parts.push(s);
  }
  const tops = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < tops; i++) {
    const r = 0.5 + rng() * 0.42;
    const s = new THREE.IcosahedronGeometry(r, 1);
    applyTransform(s,
      [(rng() - 0.5) * 1.5, 0.42 + rng() * 0.34, (rng() - 0.5) * 0.7],
      [0, rng() * TAU, 0], [1.05, 0.85, 1.0]);
    parts.push(s);
  }
  const g = mergeGeometries(parts);
  // grey-scale vertical gradient baked in: material.color does the tinting
  const p = g.attributes.position;
  const arr = new Float32Array(p.count * 3);
  let minY = Infinity, maxY = -Infinity;
  for (let i = 0; i < p.count; i++) { minY = Math.min(minY, p.getY(i)); maxY = Math.max(maxY, p.getY(i)); }
  for (let i = 0; i < p.count; i++) {
    const v = lerp(0.80, 1.0, Math.pow(invLerp(minY, maxY, p.getY(i)), 0.7));
    arr[i * 3] = arr[i * 3 + 1] = arr[i * 3 + 2] = v;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

class Clouds {
  constructor(scene, pal, quality) {
    this.rng = makeRng(4242);
    this.group = new THREE.Group();
    scene.add(this.group);

    // a touch of emissive keeps the undersides from going grey when we fly beneath
    this.nearMat = new THREE.MeshLambertMaterial({
      vertexColors: true, color: pal.cur.cloudColor.clone(), flatShading: false,
      emissive: pal.cur.cloudColor.clone().multiplyScalar(0.34),
    });
    const geos = [cloudGeometry(1), cloudGeometry(2), cloudGeometry(3), cloudGeometry(4)];

    this.near = [];
    const nNear = Math.round(11 * quality.clouds);
    for (let i = 0; i < nNear; i++) {
      const m = new THREE.Mesh(geos[i % geos.length], this.nearMat);
      m.matrixAutoUpdate = true;
      this.group.add(m);
      const c = { mesh: m, bob: this.rng() * TAU, factor: 0, spin: 0 };
      this.near.push(c);
      this._placeNear(c, rand(this.rng, -30, 140));
    }

    this.farMat = new THREE.MeshBasicMaterial({
      map: cloudTexture(), transparent: true, depthWrite: false,
      color: pal.cur.cloudColor.clone(), fog: false, opacity: 0.75,
    });
    this.far = [];
    const nFar = Math.round(7 * quality.clouds);
    const farGeo = new THREE.PlaneGeometry(1, 0.5);
    for (let i = 0; i < nFar; i++) {
      const m = new THREE.Mesh(farGeo, this.farMat);
      m.matrixAutoUpdate = true;
      this.group.add(m);
      const c = { mesh: m, factor: 0.06 };
      this.far.push(c);
      this._placeFar(c, rand(this.rng, -140, 260));
    }
  }

  _placeNear(c, x) {
    const rng = this.rng;
    const s = rand(rng, 1.5, 3.4);
    c.mesh.position.set(x, rand(rng, 9.5, 26), rand(rng, -52, -6));
    c.mesh.scale.setScalar(s);
    c.mesh.rotation.y = rng() * TAU;
    c.factor = lerp(0.14, 0.42, invLerp(-52, -6, c.mesh.position.z));
    c.bob = rng() * TAU;
  }

  _placeFar(c, x) {
    const rng = this.rng;
    const w = rand(rng, 70, 130);
    c.mesh.position.set(x, rand(rng, 22, 58), -220);
    c.mesh.scale.set(w, w * rand(rng, 0.4, 0.62), 1);
  }

  update(dt, dx, t) {
    for (const c of this.near) {
      c.mesh.position.x -= dx * c.factor;
      c.mesh.position.y += Math.sin(t * 0.4 + c.bob) * dt * 0.25;
      c.mesh.rotation.y += dt * 0.015;
      if (c.mesh.position.x < -70) this._placeNear(c, rand(this.rng, 150, 210));
    }
    for (const c of this.far) {
      c.mesh.position.x -= dx * c.factor;
      if (c.mesh.position.x < -260) this._placeFar(c, rand(this.rng, 240, 330));
    }
  }

  setDensity(f) {
    const nn = Math.max(3, Math.round(this.near.length * f));
    this.near.forEach((c, i) => { c.mesh.visible = i < nn; });
    const nf = Math.max(2, Math.round(this.far.length * f));
    this.far.forEach((c, i) => { c.mesh.visible = i < nf; });
  }

  syncPalette(pal) {
    this.nearMat.color.copy(pal.cur.cloudColor);
    this.nearMat.emissive.copy(pal.cur.cloudColor).multiplyScalar(0.34);
    this.farMat.color.copy(pal.cur.cloudColor);
  }
}

/* ================================================================== *
 * Vegetation + rocks (instanced)
 * ================================================================== */
function plantGeos(kind) {
  // returns { trunk, leaf } geometries centred on the ground at y = 0
  const trunkParts = [], leafParts = [];
  if (kind === 'broadleaf') {
    const t = new THREE.CylinderGeometry(0.10, 0.16, 1.5, 6);
    t.translate(0, 0.75, 0);
    trunkParts.push(t);
    for (let i = 0; i < 3; i++) {
      const c = new THREE.IcosahedronGeometry(0.62 - i * 0.11, 0);
      applyTransform(c, [(i - 1) * 0.22, 1.55 + i * 0.42, (i % 2 - 0.5) * 0.2], [0, i, 0], [1.1, 0.85, 1.1]);
      leafParts.push(c);
    }
  } else if (kind === 'pine') {
    const t = new THREE.CylinderGeometry(0.08, 0.14, 1.0, 5);
    t.translate(0, 0.5, 0);
    trunkParts.push(t);
    for (let i = 0; i < 3; i++) {
      const c = new THREE.ConeGeometry(0.72 - i * 0.19, 1.1 - i * 0.16, 6);
      c.translate(0, 1.0 + i * 0.62, 0);
      leafParts.push(c);
    }
  } else if (kind === 'cactus') {
    const t = new THREE.CylinderGeometry(0.22, 0.26, 1.9, 7);
    t.translate(0, 0.95, 0);
    leafParts.push(t);
    for (const s of [-1, 1]) {
      const a = new THREE.CylinderGeometry(0.11, 0.12, 0.7, 6);
      applyTransform(a, [s * 0.32, 1.1, 0], [0, 0, -s * 0.9], [1, 1, 1]);
      leafParts.push(a);
      const b = new THREE.CylinderGeometry(0.10, 0.11, 0.55, 6);
      applyTransform(b, [s * 0.5, 1.55, 0], [0, 0, 0], [1, 1, 1]);
      leafParts.push(b);
    }
    const base = new THREE.CylinderGeometry(0.3, 0.36, 0.16, 7);
    base.translate(0, 0.08, 0);
    trunkParts.push(base);
  } else { // palm
    const t = new THREE.CylinderGeometry(0.09, 0.16, 2.4, 6);
    applyTransform(t, [0, 1.2, 0], [0, 0, 0.10], [1, 1, 1]);
    trunkParts.push(t);
    const crown = new THREE.IcosahedronGeometry(0.18, 0);
    crown.translate(0.24, 2.42, 0);
    leafParts.push(crown);
    /*
     * Each frond is one blade whose BASE sits at the crown: a cone's origin is
     * its centre, so it has to be pushed out along its own axis by half its
     * length, otherwise the fronds detach and read as scattered sticks.
     */
    const L = 1.34, droop = 0.34, radial = 0.94;
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU;
      const dx = -radial * Math.cos(a), dy = -droop, dz = -radial * Math.sin(a);
      const f = new THREE.ConeGeometry(0.155, L, 3);
      f.scale(1, 1, 0.40);
      applyTransform(f,
        [0.24 + dx * L * 0.5, 2.42 + dy * L * 0.5, dz * L * 0.5],
        [0, -a, Math.PI / 2 + droop], [1, 1, 1]);
      leafParts.push(f);
    }
  }
  return {
    trunk: trunkParts.length ? mergeGeometries(trunkParts) : null,
    leaf: mergeGeometries(leafParts),
  };
}

function rockGeometry(seed) {
  const rng = makeRng(seed);
  const parts = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.DodecahedronGeometry(0.42 - i * 0.09, 0);
    applyTransform(g, [(rng() - 0.5) * 0.6, 0.16 + i * 0.14, (rng() - 0.5) * 0.6],
      [rng(), rng(), rng()], [1.2, 0.8, 1.1]);
    parts.push(g);
  }
  return mergeGeometries(parts);
}

function tuftGeometry() {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    const b = new THREE.ConeGeometry(0.055, 0.42 + (i % 2) * 0.13, 3);
    applyTransform(b, [Math.cos(a) * 0.09, 0.22, Math.sin(a) * 0.09], [0.22 * Math.sin(a), a, 0.22 * Math.cos(a)], [1, 1, 1]);
    parts.push(b);
  }
  return mergeGeometries(parts);
}

const KINDS = ['broadleaf', 'pine', 'cactus', 'palm'];

class Flora {
  constructor(scene, pal, quality) {
    this.rng = makeRng(9182);
    this.group = new THREE.Group();
    scene.add(this.group);

    this.count = Math.max(14, Math.round(48 * quality.props));
    this.data = [];
    for (let i = 0; i < this.count; i++) {
      this.data.push({ x: 0, z: 0, s: 1, r: 0, sway: 0 });
      this._respawn(this.data[i], rand(this.rng, -30, 150));
    }

    this.matTrunk = new THREE.MeshLambertMaterial({ color: pal.cur.trunk.clone(), flatShading: true });
    this.matLeafA = new THREE.MeshLambertMaterial({ color: pal.cur.propA.clone(), flatShading: true });

    this.variants = {};
    for (const k of KINDS) {
      const g = plantGeos(k);
      const v = { leaf: new THREE.InstancedMesh(g.leaf, this.matLeafA, this.count) };
      v.leaf.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      v.leaf.castShadow = quality.shadows;
      v.leaf.frustumCulled = false;
      v.leaf.visible = false;
      this.group.add(v.leaf);
      if (g.trunk) {
        v.trunk = new THREE.InstancedMesh(g.trunk, this.matTrunk, this.count);
        v.trunk.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        v.trunk.frustumCulled = false;
        v.trunk.visible = false;
        this.group.add(v.trunk);
      }
      this.variants[k] = v;
    }

    // rocks + grass tufts (shared across biomes)
    const nRock = Math.max(10, Math.round(34 * quality.props));
    this.rockData = [];
    this.matRock = new THREE.MeshLambertMaterial({ color: pal.cur.rockColor.clone(), flatShading: true });
    this.rocks = new THREE.InstancedMesh(rockGeometry(5), this.matRock, nRock);
    this.rocks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rocks.frustumCulled = false;
    this.group.add(this.rocks);
    for (let i = 0; i < nRock; i++) {
      this.rockData.push({ x: 0, z: 0, s: 1, r: 0 });
      this._respawnRock(this.rockData[i], rand(this.rng, -30, 150));
    }

    const nTuft = Math.max(18, Math.round(82 * quality.props));
    this.tuftData = [];
    this.matTuft = new THREE.MeshLambertMaterial({
      color: pal.cur.propB.clone().lerp(pal.cur.groundHigh, 0.34), flatShading: true,
    });
    this.tufts = new THREE.InstancedMesh(tuftGeometry(), this.matTuft, nTuft);
    this.tufts.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.tufts.frustumCulled = false;
    this.group.add(this.tufts);
    for (let i = 0; i < nTuft; i++) {
      this.tuftData.push({ x: 0, z: 0, s: 1, r: 0 });
      this._respawnTuft(this.tuftData[i], rand(this.rng, -20, 120));
    }

    this.active = null;
    this.setKind(pal.prop);
  }

  _respawn(d, x) {
    const rng = this.rng;
    d.x = x;
    // far bank only: the near bank would block the playfield
    d.z = rand(rng, -25, -7.5);
    d.s = rand(rng, 0.75, 1.5) * (1 + invLerp(-7.5, -25, d.z) * 0.35);
    d.r = rng() * TAU;
    d.sway = rng() * TAU;
    d.ys = rand(rng, 0.85, 1.28);
    d.y = 0;
  }

  _respawnRock(d, x) {
    const rng = this.rng;
    d.x = x;
    d.z = rng() < 0.58 ? rand(rng, -25, -7) : rand(rng, 6.0, 9.6);
    d.s = rand(rng, 0.5, 1.35) * (d.z > 0 ? 0.62 : 1);
    d.r = rng() * TAU;
  }

  _respawnTuft(d, x) {
    const rng = this.rng;
    d.x = x;
    d.z = rng() < 0.42 ? rand(rng, -7.5, -2.2) : rand(rng, 2.4, 9.8);
    d.s = rand(rng, 0.6, 1.35);
    d.r = rng() * TAU;
  }

  setKind(kind) {
    if (this.active === kind) return;
    this.active = kind;
    for (const k of KINDS) {
      const v = this.variants[k];
      const on = k === kind;
      v.leaf.visible = on;
      if (v.trunk) v.trunk.visible = on;
    }
    this._writeAll(0);
  }

  _writeAll(t) {
    const v = this.variants[this.active];
    for (let i = 0; i < this.count; i++) {
      const d = this.data[i];
      const sway = Math.sin(t * 1.1 + d.sway) * 0.035;
      _e.set(sway, d.r, sway * 0.6);
      _q.setFromEuler(_e);
      _p3.set(d.x, d.y, d.z);
      _s3.set(d.s, d.s * d.ys, d.s);
      _m4.compose(_p3, _q, _s3);
      v.leaf.setMatrixAt(i, _m4);
      if (v.trunk) v.trunk.setMatrixAt(i, _m4);
    }
    v.leaf.instanceMatrix.needsUpdate = true;
    if (v.trunk) v.trunk.instanceMatrix.needsUpdate = true;
  }

  update(dt, dx, t) {
    for (const d of this.data) {
      d.x -= dx;
      if (d.x < -34) this._respawn(d, rand(this.rng, 140, 175));
    }
    this._writeAll(t);

    for (let i = 0; i < this.rockData.length; i++) {
      const d = this.rockData[i];
      d.x -= dx;
      if (d.x < -34) this._respawnRock(d, rand(this.rng, 140, 175));
      _e.set(0, d.r, 0); _q.setFromEuler(_e);
      _p3.set(d.x, 0, d.z); _s3.set(d.s, d.s, d.s);
      _m4.compose(_p3, _q, _s3);
      this.rocks.setMatrixAt(i, _m4);
    }
    this.rocks.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < this.tuftData.length; i++) {
      const d = this.tuftData[i];
      d.x -= dx;
      if (d.x < -30) this._respawnTuft(d, rand(this.rng, 110, 145));
      const sway = Math.sin(t * 2.4 + d.x * 0.3) * 0.10;
      _e.set(sway, d.r, sway); _q.setFromEuler(_e);
      _p3.set(d.x, 0, d.z); _s3.set(d.s, d.s, d.s);
      _m4.compose(_p3, _q, _s3);
      this.tufts.setMatrixAt(i, _m4);
    }
    this.tufts.instanceMatrix.needsUpdate = true;
  }

  /**
   * Follow a runtime quality change. castShadow was set at construction only, so
   * flora kept casting (or kept not casting) whatever the boot tier decided, no matter
   * what the player picked afterwards.
   */
  setShadows(on) {
    for (const k of KINDS) this.variants[k].leaf.castShadow = on;
  }

  /** Runtime density lever for the quality presets (drops instance counts). */
  setDensity(f) {
    const n = Math.max(4, Math.round(this.count * f));
    for (const k of KINDS) {
      this.variants[k].leaf.count = n;
      if (this.variants[k].trunk) this.variants[k].trunk.count = n;
    }
    this.rocks.count = Math.max(3, Math.round(this.rockData.length * f));
    this.tufts.count = Math.max(4, Math.round(this.tuftData.length * f));
  }

  syncPalette(pal) {
    this.matTrunk.color.copy(pal.cur.trunk);
    this.matLeafA.color.copy(pal.cur.propA);
    this.matRock.color.copy(pal.cur.rockColor);
    this.matTuft.color.copy(pal.cur.propB).lerp(pal.cur.groundHigh, 0.34);
    this.setKind(pal.prop);
  }
}

/* ================================================================== *
 * Floating islands
 * ================================================================== */
class Islands {
  constructor(scene, pal, quality) {
    this.rng = makeRng(777);
    this.group = new THREE.Group();
    scene.add(this.group);
    this.matRock = new THREE.MeshLambertMaterial({
      color: pal.cur.rockColor.clone(), flatShading: true,
      emissive: pal.cur.rockColor.clone().multiplyScalar(0.22),
    });
    this.matTop = new THREE.MeshLambertMaterial({ color: pal.cur.groundLow.clone(), flatShading: true });

    /*
     * A floating island reads correctly only if it is wider than it is tall:
     * a chunky rock slab, an irregular underside, and a thin grass cap.
     */
    const rockGeo = (() => {
      const parts = [];
      const slab = new THREE.CylinderGeometry(1.34, 1.08, 0.62, 7);
      slab.rotateY(0.3);
      applyTransform(slab, [0, -0.30, 0], [0, 0, 0], [1, 1, 0.92]);
      parts.push(slab);
      const under = new THREE.ConeGeometry(1.02, 0.95, 7);
      applyTransform(under, [0.06, -1.02, 0], [Math.PI, 0.4, 0.06], [1, 1, 0.92]);
      parts.push(under);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU + 0.6;
        const d = new THREE.DodecahedronGeometry(0.3 - i * 0.06, 0);
        applyTransform(d, [Math.cos(a) * 0.5, -0.72 - i * 0.26, Math.sin(a) * 0.42],
          [0.4 + i, 0.3, 0.2], [1.2, 0.85, 1.1]);
        parts.push(d);
      }
      return mergeGeometries(parts);
    })();
    const topGeo = (() => {
      const parts = [];
      const cap = new THREE.CylinderGeometry(1.40, 1.34, 0.26, 7);
      cap.rotateY(0.3);
      applyTransform(cap, [0, 0.10, 0], [0, 0, 0], [1, 1, 0.92]);
      parts.push(cap);
      // a couple of tiny trees so the scale reads
      for (let i = 0; i < 2; i++) {
        const a = 1.2 + i * 2.4;
        const t = new THREE.ConeGeometry(0.24, 0.72, 5);
        applyTransform(t, [Math.cos(a) * 0.52, 0.56, Math.sin(a) * 0.44], [0, 0, 0.06], [1, 1, 1]);
        parts.push(t);
      }
      return mergeGeometries(parts);
    })();

    this.items = [];
    const n = Math.max(2, Math.round(3 * quality.props));
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group();
      const r = new THREE.Mesh(rockGeo, this.matRock);
      const t = new THREE.Mesh(topGeo, this.matTop);
      g.add(r, t);
      this.group.add(g);
      const it = { g, bob: this.rng() * TAU, factor: 0.5, y0: 0 };
      this.items.push(it);
      this._place(it, rand(this.rng, 0, 150));
    }
  }

  _place(it, x) {
    const rng = this.rng;
    const z = rand(rng, -52, -26);
    it.y0 = rand(rng, 5.0, 11.5);
    it.g.position.set(x, it.y0, z);
    const s = rand(rng, 0.8, 1.6);
    it.g.scale.set(s, s * rand(rng, 0.80, 1.0), s);
    it.g.rotation.y = rng() * TAU;
    it.factor = lerp(0.36, 0.62, invLerp(-52, -26, z));
    it.bob = rng() * TAU;
  }

  update(dt, dx, t) {
    for (const it of this.items) {
      it.g.position.x -= dx * it.factor;
      it.g.position.y = it.y0 + Math.sin(t * 0.55 + it.bob) * 0.42;
      it.g.rotation.y += dt * 0.05;
      if (it.g.position.x < -40) this._place(it, rand(this.rng, 150, 200));
    }
  }

  setDensity(f) {
    const n = Math.max(1, Math.round(this.items.length * f));
    this.items.forEach((it, i) => { it.g.visible = i < n; });
  }

  syncPalette(pal) {
    this.matRock.color.copy(pal.cur.rockColor);
    this.matRock.emissive.copy(pal.cur.rockColor).multiplyScalar(0.22);
    this.matTop.color.copy(pal.cur.groundLow);
  }
}

/* ================================================================== *
 * Motes — persistent drifting atmosphere points
 * ================================================================== */
const MOTE_VERT = /* glsl */`
  attribute float aSeed;
  uniform float uScale, uTime, uSize;
  varying float vA;
  void main() {
    vec3 p = position;
    p.x += sin(uTime * 0.7 + aSeed * 9.0) * 0.5;
    p.y += sin(uTime * 0.9 + aSeed * 21.0) * 0.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp(uSize * (0.5 + aSeed) * uScale / max(0.4, -mv.z), 1.0, 90.0);
    vA = 0.35 + 0.65 * (0.5 + 0.5 * sin(uTime * 1.6 + aSeed * 40.0));
  }
`;
const MOTE_FRAG = /* glsl */`
  precision highp float;
  uniform vec3 uColor; uniform float uOpacity;
  varying float vA;
  void main() {
    vec2 d = gl_PointCoord - 0.5;
    float r = dot(d, d);
    if (r > 0.25) discard;
    float a = smoothstep(0.25, 0.0, r);
    gl_FragColor = vec4(uColor, a * vA * uOpacity);
  }
`;

class Motes {
  constructor(scene, pal, quality) {
    const n = Math.max(30, Math.round(190 * quality.motes));
    this.n = n;
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    const rng = makeRng(31337);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rand(rng, -22, 46);
      pos[i * 3 + 1] = rand(rng, 0.4, 20);
      pos[i * 3 + 2] = rand(rng, -14, 12);
      seed[i] = rng();
    }
    const geo = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.attr);
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(12, 10, 0), 90);

    this.uniforms = {
      uColor: { value: new THREE.Color().copy(pal.cur.moteColor) },
      uOpacity: { value: 0.8 },
      uScale: { value: 500 },
      uTime: { value: 0 },
      uSize: { value: 0.17 },
    };
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.pos = pos;
  }

  update(dt, dx, moteSpeed) {
    this.uniforms.uTime.value += dt;
    const p = this.pos;
    const drift = dx * 0.34 + moteSpeed * dt * 1.4;
    for (let i = 0; i < this.n; i++) {
      p[i * 3] -= drift;
      if (p[i * 3] < -24) p[i * 3] += 70;
    }
    this.attr.needsUpdate = true;
  }

  setDensity(f) {
    this.points.geometry.setDrawRange(0, Math.max(12, Math.round(this.n * f)));
  }

  syncPalette(pal) {
    this.uniforms.uColor.value.copy(pal.cur.moteColor);
    this.uniforms.uOpacity.value = 0.35 + 0.5 * clamp01(pal.cur.moteCount);
  }
}

/* ================================================================== *
 * Distant flocks — tiny animated silhouettes for scale
 * ================================================================== */
class Flocks {
  constructor(scene, pal) {
    const g = new THREE.BufferGeometry();
    // simple V shape
    const v = new Float32Array([
      0, 0, 0, -0.5, 0.28, -0.55, -0.42, 0, -0.1,
      0, 0, 0, -0.5, 0.28, 0.55, -0.42, 0, 0.1,
    ]);
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.computeVertexNormals();
    this.mat = new THREE.MeshBasicMaterial({
      color: 0x223344, side: THREE.DoubleSide, transparent: true, opacity: 0.5, fog: true,
    });
    this.n = 12;
    this.mesh = new THREE.InstancedMesh(g, this.mat, this.n);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.rng = makeRng(6161);
    this.items = [];
    for (let i = 0; i < this.n; i++) {
      const it = { x: 0, y: 0, z: 0, ph: this.rng() * TAU, s: 1 };
      this.items.push(it);
      this._place(it, rand(this.rng, -40, 180), i);
    }
  }

  _place(it, x, i) {
    const rng = this.rng;
    const flock = Math.floor(i / 4);
    it.x = x + (i % 4) * rand(rng, 1.6, 3.0);
    it.y = 20 + flock * 5 + rand(rng, -2.5, 2.5);
    it.z = -55 - flock * 14 + rand(rng, -6, 6);
    it.s = rand(rng, 1.2, 2.2);
    it.ph = rng() * TAU;
  }

  update(dt, dx, t) {
    for (let i = 0; i < this.n; i++) {
      const it = this.items[i];
      it.x -= dx * 0.16 + dt * 1.2;
      if (it.x < -120) this._place(it, rand(this.rng, 200, 280), i);
      const flap = 0.55 + 0.45 * Math.sin(t * 7 + it.ph);
      _p3.set(it.x, it.y + Math.sin(t * 0.6 + it.ph) * 0.6, it.z);
      _e.set(0, 0, 0); _q.setFromEuler(_e);
      _s3.set(it.s, it.s * flap, it.s);
      _m4.compose(_p3, _q, _s3);
      this.mesh.setMatrixAt(i, _m4);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  syncPalette(pal) {
    this.mat.color.copy(pal.cur.mtn[0]).multiplyScalar(0.6);
  }
}

/* ================================================================== *
 * World — owns all of the above plus lights and fog
 * ================================================================== */
export class World {
  constructor(scene, sky, quality) {
    this.scene = scene;
    this.sky = sky;
    this.quality = quality;
    this.pal = new Palette(0);
    this.time = 0;
    this.dist = 0;

    scene.fog = new THREE.Fog(this.pal.cur.fog.getHex(), CFG.fogNear, CFG.fogFar);

    this.hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xffffff, 2.5);
    this.sun.position.set(14, 22, 12);
    this.sun.castShadow = quality.shadows;
    if (quality.shadows) {
      this.sun.shadow.mapSize.set(quality.shadowSize, quality.shadowSize);
      this._configureShadow();
    }
    scene.add(this.sun);
    this.sunTarget = new THREE.Object3D();
    this.sunTarget.position.set(4, 7, 0);
    scene.add(this.sunTarget);
    this.sun.target = this.sunTarget;

    // fill from behind the camera keeps the faces we actually see from going muddy
    this.fill = new THREE.DirectionalLight(0xffffff, 0.62);
    this.fill.position.set(-6, 9, 26);
    scene.add(this.fill);

    // Build at full density; `setQuality` scales what is actually drawn.
    const full = { ...quality, props: 1, motes: 1, clouds: 1 };
    this.terrain = new Terrain(scene, this.pal);
    this.water = new Water(scene, this.pal);
    this.mountains = new Mountains(scene, this.pal);
    this.clouds = new Clouds(scene, this.pal, full);
    this.flora = new Flora(scene, this.pal, full);
    this.islands = new Islands(scene, this.pal, full);
    this.motes = new Motes(scene, this.pal, full);
    this.flocks = new Flocks(scene, this.pal);

    this.syncPalette();
    this.setQuality(quality);
  }

  setBiome(i) { return this.pal.to(i); }

  /**
   * Re-applies a quality preset live. Object counts are allocated once at boot
   * for the highest tier and then simply drawn in part, so switching quality
   * never allocates and never hitches.
   */
  /**
   * Bias and the shadow frustum, applied from one place so a runtime quality change
   * gets them too. `updateProjectionMatrix` matters: three only calls it itself when
   * it allocates the shadow map, which is once, on the first frame that casts.
   */
  _configureShadow() {
    const s = this.sun.shadow;
    s.camera.near = 1; s.camera.far = 90;
    s.bias = -0.0012;
    s.normalBias = 0.045;
    this.fitShadow(this._shadowLookX, this._shadowVisW);
  }

  /**
   * Fit the shadow ortho to the corridor the camera actually frames.
   *
   * It was a fixed 56 x 37 box against a portrait frame that spans 10.5 world units of
   * x -- so a 512 map was spread over roughly 14x the area it needed, which is exactly
   * why the blockiness needed the most expensive filter to hide it, and why ~6 gates'
   * worth of casters were drawn for the one the player can see.
   *
   * The +9.5 on the right is derived, not guessed: the sun runs (4,7,0) - (14,22,12),
   * so dx/dy = -0.667 and a caster at the ceiling height of 13.3 throws its shadow
   * 8.9 units toward -x. Anything further right cannot cast into frame.
   */
  fitShadow(lookX = 4.9, visW = 24.5) {
    this._shadowLookX = lookX;
    this._shadowVisW = visW;
    if (!this.sun.castShadow) return;
    const s = this.sun.shadow;
    s.camera.left = lookX - visW * 0.5 - 1;
    s.camera.right = lookX + visW * 0.5 + 9.5;
    s.camera.top = 20;
    s.camera.bottom = -6;
    s.camera.updateProjectionMatrix();
  }

  setQuality(q) {
    this.quality = q;
    this.sun.castShadow = q.shadows;
    if (q.shadows) {
      const s = this.sun.shadow;
      if (s.mapSize.x !== q.shadowSize) {
        s.mapSize.set(q.shadowSize, q.shadowSize);
        // force three to reallocate at the new size; it only does so when map is null
        if (s.map) { s.map.dispose(); s.map = null; }
      }
      this._configureShadow();
    }
    // flora castShadow was set at construction only, so it never followed a change
    this.flora.setShadows(q.shadows);
    this.flora.setDensity(q.props);
    this.clouds.setDensity(q.clouds);
    this.islands.setDensity(q.props);
    this.motes.setDensity(q.motes);
    if (this.water) this.water.group.visible = q.water;
  }

  syncPalette() {
    const p = this.pal;
    const u = this.sky.uniforms;
    u.uTop.value.copy(p.cur.skyTop);
    u.uHorizon.value.copy(p.cur.skyHorizon);
    u.uLow.value.copy(p.cur.skyLow);
    u.uSunColor.value.copy(p.cur.sunColor);
    u.uSunDir.value.copy(p.cur.sunDir);
    u.uSunGlow.value = p.cur.sunGlow;
    u.uSunSize.value = p.cur.sunSize;
    u.uStars.value = p.cur.stars;
    u.uAurora.value = p.cur.aurora;

    this.scene.fog.color.copy(p.cur.fog);
    this.scene.fog.near = p.cur.fogNear;
    this.scene.fog.far = p.cur.fogFar;
    this.hemi.color.copy(p.cur.hemiSky);
    this.hemi.groundColor.copy(p.cur.hemiGround);
    this.hemi.intensity = p.cur.hemiInt;
    this.sun.color.copy(p.cur.sunColor);
    this.sun.intensity = p.cur.sunInt * 0.88;
    this.fill.color.copy(p.cur.hemiSky).lerp(_white, 0.45);
    this.fill.intensity = 0.30 + p.cur.hemiInt * 0.34;

    /*
     * The key light is art-directed, not slaved to the visual sun: it keeps a
     * strong +Z component so the faces the camera actually sees stay lit, while
     * the biome's sun direction still swings the shadows around.
     */
    const d = p.cur.sunDir;
    _v1.set(d.x * 0.72, Math.max(d.y, 0.34) * 0.85 + 0.78, 0.88).normalize();
    this.sun.position.set(
      this.sunTarget.position.x + _v1.x * 32,
      this.sunTarget.position.y + _v1.y * 32,
      this.sunTarget.position.z + _v1.z * 32,
    );

    this.terrain.syncPalette(p);
    if (this.water) this.water.syncPalette(p);
    this.mountains.syncPalette(p);
    this.clouds.syncPalette(p);
    this.flora.syncPalette(p);
    this.islands.syncPalette(p);
    this.motes.syncPalette(p);
    this.flocks.syncPalette(p);
  }

  /** Returns true on frames where the palette cross-fade advanced. */
  update(dt, dx) {
    this.time += dt;
    this.dist += dx;
    const palMoved = this.pal.update(dt);
    if (palMoved) this.syncPalette();

    this.terrain.update(dx, this.dist);
    if (this.water) this.water.update(dt);
    this.mountains.update(dx);
    this.clouds.update(dt, dx, this.time);
    this.flora.update(dt, dx, this.time);
    this.islands.update(dt, dx, this.time);
    this.motes.update(dt, dx, this.pal.cur.moteSpeed);
    this.flocks.update(dt, dx, this.time);
    return palMoved;
  }

  setMoteScale(s) { this.motes.uniforms.uScale.value = s; }
}
