/**
 * flyers.js — the craft roster.
 *
 * Everything the player can fly is built here as plain low-poly geometry, and
 * `flyer.js` knows how to animate any of them. Switch with `CFG.flyer`.
 *
 * A flyer spec returns groups of geometry, each of which gets its own material
 * and its own animation behaviour:
 *
 *   solid    flat-shaded, vertex-coloured hull
 *   glass    translucent canopy
 *   glow     emissive trim; picks up the biome accent
 *   spinner  merged into one mesh that rotates about Y forever (chasing lights)
 *   rider    the little pilot: bobs, leans, blinks
 *   beam     {r0, r1, len} soft cone underneath that flares on thrust
 *   wings    optional; only birds have them
 */
import { THREE } from './runtime.js';
import { TAU, mergeGeometries, paint, paintGradientY, applyTransform } from './util.js';

const ico = (r, d = 1) => new THREE.IcosahedronGeometry(r, d);
const cone = (r, h, s) => new THREE.ConeGeometry(r, h, s);
const cyl = (rt, rb, h, s) => new THREE.CylinderGeometry(rt, rb, h, s);
const sph = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const dome = (r, seg) => new THREE.SphereGeometry(r, seg, Math.max(3, seg >> 1), 0, TAU, 0, Math.PI * 0.5);

/**
 * The pilot: a rounded blob with oversized eyes and a bobbing antenna.
 * Small enough to be a silhouette detail, readable enough to be the charm.
 */
function pilot(scale, skin, skinDark, eyeWhite, pupil, antenna) {
  const parts = [];
  const body = ico(0.30);
  body.scale(1.0, 0.86, 0.95);
  parts.push(paintGradientY(body, skinDark, skin, -0.26, 0.20));
  // eyes: big, forward, slightly toed-in
  for (const s of [-1, 1]) {
    const e = sph(0.125, 10, 8);
    applyTransform(e, [0.16, 0.06, s * 0.115], [0, 0, 0], [0.9, 1.05, 1]);
    parts.push(paint(e, eyeWhite));
    const p = sph(0.062, 8, 6);
    applyTransform(p, [0.235, 0.07, s * 0.125], [0, 0, 0], [0.8, 1, 1]);
    parts.push(paint(p, pupil));
    const g = sph(0.026, 6, 5);
    applyTransform(g, [0.263, 0.115, s * 0.093], [0, 0, 0], [1, 1, 1]);
    parts.push(paint(g, 0xffffff));
  }
  // a little smile-line cheek blob keeps it friendly rather than sinister
  for (const s of [-1, 1]) {
    const c = sph(0.055, 6, 5);
    applyTransform(c, [0.15, -0.09, s * 0.20], [0, 0, 0], [1, 0.7, 1]);
    parts.push(paint(c, skinDark));
  }
  // antenna
  const stalk = cyl(0.018, 0.024, 0.26, 5);
  applyTransform(stalk, [-0.02, 0.34, 0], [0, 0, -0.16], [1, 1, 1]);
  parts.push(paint(stalk, skinDark));
  const bulb = ico(0.062, 0);
  applyTransform(bulb, [-0.06, 0.48, 0], [0, 0, 0], [1, 1, 1]);
  parts.push(paint(bulb, antenna));

  const g = mergeGeometries(parts);
  g.scale(scale, scale, scale);
  return g;
}

/** A ring of emissive pips on a thin torus — rotates, so the lights chase. */
function lightRing(radius, count, pipR, y, tube) {
  const parts = [];
  const t = new THREE.TorusGeometry(radius, tube, 4, 20);
  t.rotateX(Math.PI / 2);
  t.translate(0, y, 0);
  parts.push(paint(t, 0xffffff));
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU;
    const p = ico(pipR, 0);
    applyTransform(p, [Math.cos(a) * radius, y, Math.sin(a) * radius], [0, 0, 0], [1, 1, 1]);
    parts.push(paint(p, 0xffffff));
  }
  return mergeGeometries(parts);
}

/* ==================================================================== *
 * 1 · SAUCER — the classic. Wide disc, big canopy, chasing rim lights.
 * ==================================================================== */
function saucer() {
  const C = {
    hullTop: 0xf3f1fb, hullMid: 0xc8cbe0, hullLow: 0x8d93b8, rim: 0x6d739b,
    trim: 0xff7a4d, skin: 0x8fe6b4, skinDark: 0x4fb98a, pupil: 0x18202e,
  };
  const solid = [];
  // upper and lower cones, base to base: the saucer silhouette
  const up = cyl(0.44, 1.02, 0.30, 12);
  up.translate(0, 0.15, 0);
  solid.push(paintGradientY(up, C.hullMid, C.hullTop, -0.02, 0.32));
  const lo = cyl(1.02, 0.30, 0.44, 12);
  lo.translate(0, -0.22, 0);
  solid.push(paintGradientY(lo, C.hullLow, C.hullMid, -0.46, 0.02));
  // the outer lip, slightly proud of the hull
  const lip = new THREE.TorusGeometry(1.02, 0.075, 4, 14);
  lip.rotateX(Math.PI / 2);
  solid.push(paint(lip, C.rim));
  // three little landing nubs
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * TAU + 0.5;
    const n = cone(0.10, 0.20, 5);
    applyTransform(n, [Math.cos(a) * 0.52, -0.50, Math.sin(a) * 0.52], [Math.PI, 0, 0], [1, 1, 1]);
    solid.push(paint(n, C.rim));
  }

  const glow = [];
  const under = cyl(0.30, 0.16, 0.10, 10);
  under.translate(0, -0.50, 0);
  glow.push(paint(under, 0xffffff));

  return {
    name: 'Saucer',
    solid, glass: [dome(0.50, 14)], glassAt: [0, 0.26, 0],
    glow, spinner: lightRing(0.90, 6, 0.075, -0.06, 0.028),
    rider: pilot(0.86, C.skin, C.skinDark, 0xfdfdff, C.pupil, C.trim),
    riderAt: [0.02, 0.34, 0],
    beam: { r0: 0.34, r1: 1.15, len: 1.9, at: [0, -0.56, 0] },
    trim: C.trim,
    tailAt: [-0.95, -0.10, 0], scale: 1.02, trail: 0x9be8ff,
    collide: { r: 0.40, halfLen: 0.52 },
    motion: { tilt: 0.55, spin: 1.15, bob: 0.030, squash: 0.16 },
    debris: 'shard',
  };
}

/* ==================================================================== *
 * 3 · DROP — a flying droplet. Nods at the name, reads instantly.
 * ==================================================================== */
function drop() {
  const C = {
    shellHi: 0x7ee8ff, shellMid: 0x2fa8d8, shellLow: 0x1c6fa8,
    trim: 0xffd166, skin: 0xfff0d2, skinDark: 0xf0bc7c, pupil: 0x14212e,
  };
  const solid = [];
  // teardrop hull: a sphere with the tail drawn out to a point
  const shell = ico(0.62, 2);
  shell.scale(1.0, 0.94, 1.0);
  {
    const p = shell.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      if (x < 0) {
        const k = Math.min(1, -x / 0.62);
        // squeeze the rear into a point and stretch it back
        p.setY(i, p.getY(i) * (1 - k * 0.82));
        p.setZ(i, p.getZ(i) * (1 - k * 0.82));
        p.setX(i, x - k * k * 0.46);
      }
    }
    shell.computeVertexNormals();
  }
  solid.push(paintGradientY(shell, C.shellLow, C.shellMid, -0.60, 0.30));
  // a belly plate so it does not read as a plain blob
  const belly = cyl(0.50, 0.34, 0.16, 10);
  belly.translate(0.02, -0.50, 0);
  solid.push(paintGradientY(belly, C.shellLow, C.shellMid, -0.6, -0.4));
  // two swept stabiliser fins
  for (const s of [-1, 1]) {
    const f = cone(0.16, 0.62, 3);
    f.scale(1, 1, 0.28);
    applyTransform(f, [-0.60, 0.02, s * 0.30], [0, -s * 0.5, Math.PI / 2 + 0.5], [1, 1, 1]);
    solid.push(paintGradientY(f, C.shellLow, C.shellHi, -0.3, 0.3));
  }

  const glow = [];
  const ex = cyl(0.14, 0.20, 0.12, 8);
  applyTransform(ex, [-0.98, 0.04, 0], [0, 0, Math.PI / 2], [1, 1, 1]);
  glow.push(paint(ex, 0xffffff));

  return {
    name: 'Drop',
    solid, glass: [dome(0.44, 14)], glassAt: [0.14, 0.30, 0],
    glow, spinner: lightRing(0.66, 5, 0.062, -0.16, 0.024),
    rider: pilot(0.78, C.skin, C.skinDark, 0xfdfdff, C.pupil, C.trim),
    riderAt: [0.16, 0.36, 0],
    beam: { r0: 0.26, r1: 0.86, len: 1.5, at: [0.02, -0.58, 0] },
    trim: C.trim,
    tailAt: [-1.12, 0.04, 0], scale: 1.06, trail: 0xffe0a0,
    collide: { r: 0.40, halfLen: 0.40 },
    motion: { tilt: 0.70, spin: 0.9, bob: 0.034, squash: 0.18 },
    debris: 'shard',
  };
}

export const FLYERS = { saucer, drop };
export const FLYER_ORDER = ['saucer', 'drop'];

export function buildFlyer(name) {
  const fn = FLYERS[name] || FLYERS.saucer;
  const spec = fn();
  spec.solidGeo = mergeGeometries(spec.solid);
  spec.glassGeo = spec.glass && spec.glass.length ? mergeGeometries(spec.glass) : null;
  spec.glowGeo = spec.glow && spec.glow.length ? mergeGeometries(spec.glow) : null;
  return spec;
}
