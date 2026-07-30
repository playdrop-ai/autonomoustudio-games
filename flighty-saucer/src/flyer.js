/**
 * flyer.js — the player craft.
 *
 * Geometry comes from flyers.js; this file owns the rig and every bit of
 * motion: hover bob, velocity tilt, thrust squash, the chasing rim lights, the
 * pilot's lean and blink, the under-beam flare, and the trailing wake ribbon.
 *
 * Node layout:
 *   root      world position (y only; the world scrolls past x = 0)
 *    └ tilt   pitch + roll
 *       └ hull   hover bob + thrust squash
 *          ├ solid / glow / spinner / glass
 *          └ riderPivot ─ rider
 *       └ beam
 */
import { THREE } from './runtime.js';
import { TAU, clamp, lerp, damp, smoothstep, easeOutCubic } from './util.js';
import { buildFlyer } from './flyers.js';

/** Thrust curve: a hard kick, a springy settle. Drives squash and the beam. */
const THRUST_KEYS = [
  [0.00, 0.00],
  [0.070, 1.00],
  [0.200, -0.32],
  [0.340, 0.12],
  [0.480, 0.00],
];
function thrustCurve(t) {
  const last = THRUST_KEYS[THRUST_KEYS.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < THRUST_KEYS.length - 1; i++) {
    const [t0, v0] = THRUST_KEYS[i], [t1, v1] = THRUST_KEYS[i + 1];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return lerp(v0, v1, i === 0 ? easeOutCubic(k) : smoothstep(0, 1, k));
    }
  }
  return 0;
}

const BEAM_VERT = /* glsl */`
  varying vec2 vUv;
  varying float vY;
  void main() {
    vUv = uv;
    vY = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const BEAM_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform vec3 uColor;
  uniform float uOpacity, uTime, uFlare;
  void main() {
    // fade out toward the ground, plus soft scanning bands
    float fall = smoothstep(0.0, 0.85, vUv.y);
    float bands = 0.72 + 0.28 * sin(vUv.y * 22.0 - uTime * 5.0);
    float edge = smoothstep(0.0, 0.30, vUv.x) * smoothstep(1.0, 0.70, vUv.x);
    float a = fall * bands * edge * (0.16 + uFlare * 0.55) * uOpacity;
    gl_FragColor = vec4(uColor * (1.0 + uFlare * 1.6), a);
  }
`;

export class Flyer {
  constructor(scene, name) {
    this.spec = buildFlyer(name);
    const s = this.spec;

    this.root = new THREE.Group();
    this.root.scale.setScalar(s.scale);
    this.tilt = new THREE.Group();
    this.hull = new THREE.Group();
    this.root.add(this.tilt);
    this.tilt.add(this.hull);
    scene.add(this.root);

    this.matSolid = new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: true, roughness: 0.48, metalness: 0.22,
    });
    this.matGlow = new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: true, roughness: 0.3,
      color: 0x221a12, emissive: s.trim, emissiveIntensity: 1.5,
    });
    this.matGlass = new THREE.MeshStandardMaterial({
      vertexColors: false, color: 0xbfeeff, roughness: 0.08, metalness: 0.0,
      transparent: true, opacity: 0.36, depthWrite: false,
      emissive: 0x2b6d88, emissiveIntensity: 0.35, side: THREE.DoubleSide,
    });
    this.matRider = new THREE.MeshStandardMaterial({
      vertexColors: true, flatShading: true, roughness: 0.62, metalness: 0.0,
    });

    this.solidMesh = new THREE.Mesh(s.solidGeo, this.matSolid);
    this.solidMesh.castShadow = true;
    this.hull.add(this.solidMesh);

    if (s.glowGeo) {
      this.glowMesh = new THREE.Mesh(s.glowGeo, this.matGlow);
      this.hull.add(this.glowMesh);
    }
    if (s.spinner) {
      this.spinnerMesh = new THREE.Mesh(s.spinner, this.matGlow);
      this.hull.add(this.spinnerMesh);
    }

    // the pilot goes in before the canopy so the transparent dome blends over it
    this.riderPivot = new THREE.Group();
    this.riderPivot.position.set(...s.riderAt);
    this.riderMesh = new THREE.Mesh(s.rider, this.matRider);
    this.riderPivot.add(this.riderMesh);
    this.hull.add(this.riderPivot);

    if (s.glassGeo) {
      this.glassMesh = new THREE.Mesh(s.glassGeo, this.matGlass);
      this.glassMesh.position.set(...s.glassAt);
      this.glassMesh.renderOrder = 4;
      this.hull.add(this.glassMesh);
    }

    if (s.beam) this._buildBeam(s.beam);
    this._buildTrail(scene);

    this.collide = s.collide;
    this.dx = 0;
    this.vx = 0;
    this.y = 8;
    this.renderY = 8;
    this.vy = 0;
    this.thrustT = 99;
    this.thrusts = 0;
    this.dead = false;
    this.spin = 0;
    this.pitch = 0;
    this.roll = 0;
    this.time = 0;
    this.blinkAt = 2.4;
    this.blink = 0;
  }

  _buildBeam(b) {
    const geo = new THREE.CylinderGeometry(b.r0, b.r1, b.len, 14, 1, true);
    geo.translate(0, -b.len * 0.5, 0);
    this.beamMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(this.spec.trim) },
        uOpacity: { value: 1 }, uTime: { value: 0 }, uFlare: { value: 0 },
      },
      vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.beam = new THREE.Mesh(geo, this.beamMat);
    this.beam.position.set(...b.at);
    this.beam.renderOrder = 3;
    this.hull.add(this.beam);
  }

  _buildTrail(scene) {
    this.trailN = 22;
    this.trailAcc = 0;
    this.trailPts = new Float32Array(this.trailN * 3);
    this.trailLen = 0;

    const verts = this.trailN * 2;
    this.trailPos = new Float32Array(verts * 3);
    this.trailAlpha = new Float32Array(verts);
    const geo = new THREE.BufferGeometry();
    this.trailPosAttr = new THREE.BufferAttribute(this.trailPos, 3).setUsage(THREE.DynamicDrawUsage);
    this.trailAlphaAttr = new THREE.BufferAttribute(this.trailAlpha, 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.trailPosAttr);
    geo.setAttribute('aAlpha', this.trailAlphaAttr);
    const idx = [];
    for (let i = 0; i < this.trailN - 1; i++) {
      const a = i * 2;
      idx.push(a, a + 1, a + 3, a, a + 3, a + 2);
    }
    geo.setIndex(idx);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 8, 0), 60);

    this.trailMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(this.spec.trail) }, uOpacity: { value: 1 } },
      vertexShader: /* glsl */`
        attribute float aAlpha;
        varying float vA;
        void main() {
          vA = aAlpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */`
        precision highp float;
        uniform vec3 uColor; uniform float uOpacity;
        varying float vA;
        void main() { gl_FragColor = vec4(uColor * (0.45 + vA * 1.1), vA * uOpacity); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.trail = new THREE.Mesh(geo, this.trailMat);
    this.trail.frustumCulled = false;
    scene.add(this.trail);
  }

  /** Trim and wake pick up the live biome accent; the hull stays itself. */
  setPalette(b) {
    this.trailMat.uniforms.uColor.value.set(b.trail);
    this.matGlow.emissive.set(b.gateAccent);
    if (this.beamMat) this.beamMat.uniforms.uColor.value.set(b.gateAccent);
  }

  reset(y) {
    this.dx = 0;
    this.vx = 0;
    this.y = y;
    this.renderY = y;
    this.vy = 0;
    this.dead = false;
    this.spin = 0;
    this.pitch = 0;
    this.roll = 0;
    this.thrustT = 99;
    this.trailLen = 0;
    this.root.position.set(this.dx, y, 0);
    this.root.rotation.set(0, 0, 0);
    this.tilt.rotation.set(0, 0, 0);
    this.hull.scale.set(1, 1, 1);
    this.hull.rotation.set(0, 0, 0);
    this.trailMat.uniforms.uOpacity.value = 1;
    if (this.beamMat) this.beamMat.uniforms.uOpacity.value = 1;
  }

  thrust() {
    this.thrustT = 0;
    this.thrusts++;
  }

  /** Where the wake is emitted, in world space. */
  tailPoint(out) {
    out.set(...this.spec.tailAt);
    this.hull.localToWorld(out);
    return out;
  }

  /**
   * World-space centres of the collision circles, along the body axis and
   * rotated by the current pitch. Written into the caller's arrays.
   */
  collisionCircles(outX, outY, n, halfLen) {
    const c = Math.cos(this.pitch), s = Math.sin(this.pitch);
    for (let i = 0; i < n; i++) {
      const d = n === 1 ? 0 : (i / (n - 1) - 0.5) * 2 * halfLen;
      outX[i] = d * c;
      outY[i] = this.y + d * s;
    }
  }

  update(dt, speed01, alive) {
    this.time += dt;
    this.thrustT += dt;
    const t = this.time;
    const m = this.spec.motion;

    this.root.position.x = this.dx;
    this.root.position.y = Number.isFinite(this.renderY) ? this.renderY : this.y;

    if (this.dead) {
      this.tilt.rotation.z += this.spin * dt;
      this.tilt.rotation.x += this.spin * 0.5 * dt;
      this.hull.rotation.y += this.spin * 0.8 * dt;
      this.hull.scale.set(1, 1, 1);
      if (this.spinnerMesh) this.spinnerMesh.rotation.y += dt * 0.6;
      // systems fail: canopy dims, beam dies
      this.matGlow.emissiveIntensity = damp(this.matGlow.emissiveIntensity, 0.15, 3, dt);
      if (this.beamMat) {
        this.beamMat.uniforms.uOpacity.value = damp(this.beamMat.uniforms.uOpacity.value, 0, 6, dt);
      }
      this.riderPivot.rotation.z = Math.sin(t * 22) * 0.28;
      this._updateTrail(dt, 0);
      return;
    }

    this.matGlow.emissiveIntensity = 1.5;

    /* ---- attitude: a saucer leans into its climb rather than pitching ---- */
    const targetPitch = clamp(Math.atan2(this.vy, 22) * m.tilt, -0.52, 0.34);
    this.pitch = damp(this.pitch, targetPitch, 10, dt);
    const kick = this.thrustT < 0.26 ? (1 - this.thrustT / 0.26) * 0.10 : 0;
    this.tilt.rotation.z = this.pitch + kick;
    this.roll = damp(this.roll, clamp(-this.vy * 0.006, -0.07, 0.07), 5, dt);
    this.tilt.rotation.x = this.roll;
    // a slow yaw drift so a hovering craft never looks welded in place
    this.tilt.rotation.y = Math.sin(t * 0.7) * 0.05;

    /* ---- hover bob + thrust squash ---- */
    const th = this.thrustT < 0.48 ? thrustCurve(this.thrustT) : 0;
    this.hull.position.y = Math.sin(t * 2.1) * m.bob;
    const sq = th * m.squash;
    this.hull.scale.set(1 + sq * 0.55, 1 - sq, 1 + sq * 0.55);

    /* ---- chasing rim lights ---- */
    if (this.spinnerMesh) {
      this.spinnerMesh.rotation.y += dt * (m.spin + speed01 * 0.9 + Math.max(0, th) * 5);
    }

    /* ---- under-beam ---- */
    if (this.beamMat) {
      const u = this.beamMat.uniforms;
      u.uTime.value = t;
      u.uFlare.value = damp(u.uFlare.value, Math.max(0, th) * 0.9, 14, dt);
      u.uOpacity.value = alive ? 1 : 0;
    }

    /* ---- the pilot: leans into the manoeuvre, bobs, blinks ---- */
    const rp = this.riderPivot;
    rp.rotation.z = damp(rp.rotation.z, clamp(-this.vy * 0.02, -0.3, 0.22), 8, dt);
    rp.rotation.y = Math.sin(t * 0.83) * 0.22;
    rp.position.y = this.spec.riderAt[1] + Math.sin(t * 2.6 + 1.1) * 0.022 - Math.max(0, th) * 0.05;
    this.blinkAt -= dt;
    if (this.blinkAt <= 0) { this.blink = 0.13; this.blinkAt = 2.2 + Math.random() * 3.4; }
    if (this.blink > 0) {
      this.blink -= dt;
      this.riderMesh.scale.set(1, this.blink > 0 ? 0.72 : 1, 1);
    } else {
      this.riderMesh.scale.set(1, 1, 1);
    }

    this._updateTrail(dt, alive ? 1 : 0);
  }

  /** The world scrolls past, so historical wake points scroll too. */
  shift(dx) {
    for (let i = 0; i < this.trailLen; i++) this.trailPts[i * 3] -= dx;
  }

  _updateTrail(dt, strength) {
    const N = this.trailN;
    const p = _tmp;
    this.tailPoint(p);

    this.trailAcc += dt;
    let pushes = 0;
    while (this.trailAcc >= TRAIL_STEP && pushes < N) {
      this.trailAcc -= TRAIL_STEP;
      pushes++;
      if (this.trailLen < N) this.trailLen++;
      for (let i = Math.min(this.trailLen - 1, N - 1); i > 0; i--) {
        this.trailPts[i * 3] = this.trailPts[(i - 1) * 3];
        this.trailPts[i * 3 + 1] = this.trailPts[(i - 1) * 3 + 1];
        this.trailPts[i * 3 + 2] = this.trailPts[(i - 1) * 3 + 2];
      }
      this.trailPts[0] = p.x; this.trailPts[1] = p.y; this.trailPts[2] = p.z;
    }
    if (this.trailLen === 0) {
      this.trailLen = 1;
      this.trailPts[0] = p.x; this.trailPts[1] = p.y; this.trailPts[2] = p.z;
    }

    const n = this.trailLen;
    for (let i = 0; i < N; i++) {
      const j = Math.min(i, n - 1);
      const x = this.trailPts[j * 3], y = this.trailPts[j * 3 + 1], z = this.trailPts[j * 3 + 2];
      const k = Math.min(j + 1, n - 1);
      let dx = this.trailPts[k * 3] - x, dy = this.trailPts[k * 3 + 1] - y;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l; dy /= l;
      const taper = Math.pow(1 - i / (N - 1), 0.85);
      const w = 0.115 * taper * strength;
      const o = i * 6;
      this.trailPos[o] = x + dy * w; this.trailPos[o + 1] = y - dx * w; this.trailPos[o + 2] = z;
      this.trailPos[o + 3] = x - dy * w; this.trailPos[o + 4] = y + dx * w; this.trailPos[o + 5] = z;
      const a = taper * taper * 0.42 * strength;
      this.trailAlpha[i * 2] = a;
      this.trailAlpha[i * 2 + 1] = a;
    }
    this.trailPosAttr.needsUpdate = true;
    this.trailAlphaAttr.needsUpdate = true;
  }

  kill(spin) {
    this.dead = true;
    this.spin = spin;
  }
}

const TRAIL_STEP = 1 / 55;
const _tmp = new THREE.Vector3();
