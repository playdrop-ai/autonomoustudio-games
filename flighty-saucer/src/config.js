/**
 * config.js — every tunable in one place: physics, difficulty curve,
 * camera rig, and the biome palettes that drive the whole look.
 */

export const CFG = {
  /* ---- physics (world units, seconds) ---- */
  gravity: 38.0,
  flapImpulse: 11.6,
  maxFall: 27.0,
  maxRise: 14.0,
  /** Which craft to fly. See flyers.js — 'saucer' or 'drop'. */
  flyer: 'saucer',
  /**
   * The craft collides as a short oriented capsule: `bodyCircles` circles laid
   * along the pitched body axis. The radius and half-length come from the
   * flyer's own spec, so a wide saucer and a long droplet each get an honest
   * hitbox.
   */
  bodyCircles: 3,
  groundY: 0.26,
  ceilY: 13.3,
  fixedStep: 1 / 120,
  maxSubSteps: 6,

  /* ---- difficulty ramp (score 0 -> rampScore) ---- */
  rampScore: 65,
  speedStart: 10.6,
  speedEnd: 16.8,
  gapStart: 5.30,
  gapEnd: 3.98,
  spacingStart: 9.9,
  spacingEnd: 7.9,
  gapMinY: 4.70,
  gapMaxY: 10.00,
  /* ---- obstacle variety unlocks ---- */
  moverFromScore: 12,
  staggerFromScore: 18,
  shardFromScore: 22,
  twinFromScore: 26,
  pulseFromScore: 30,
  twinSpacing: 0.58,    // fraction of normal spacing between the two halves
  twinMaxDelta: 1.3,    // the second half must be a small, reachable correction

  /* ---- hazard shards ---- */
  shardPoolSize: 8,
  shardRadius: 0.60,
  shardMinY: 2.8,
  shardMaxY: 12.0,
  shardClearance: 2.55, // min distance from either neighbouring gap centre

  /* ---- gate look ---- */
  gateHalfW: 1.02,
  gateCollideHalfW: 0.90,
  gatePoolSize: 11,

  /* ---- camera rig ---- */
  /**
   * The camera looks almost straight down -Z so the game reads as a side view
   * even though everything is 3D; `camSideOffset` is the small lateral offset
   * that keeps a hint of depth on the towers.
   */
  camSideOffset: 1.25,
  flyerScreenX: 0.30,  // where the craft sits horizontally in frame
  camViewH: 13.8,     // world units of vertical framing we guarantee
  camViewW: 17.0,     // ...and horizontally
  camFov: 52,
  camFollow: 0.56,    // how much of the bird's Y the camera tracks
  camDamp: 6.2,
  camCenterY: 7.1,

  /* ---- juice ---- */
  shakeDecay: 2.6,
  nearMissDist: 0.46,
  milestoneEvery: 10,

  /* ---- world ---- */
  terrainSegLen: 62,
  terrainSegs: 7,
  terrainWidth: 52,
  corridorHalf: 5.2,   // flat area around z=0 so the floor height is honest
  fogNear: 150,
  fogFar: 330,
  rebaseAt: 1e7,
};

/** Score thresholds that introduce each biome, then it cycles. */
export const BIOME_SCHEDULE = [0, 10, 26, 46, 70];

/**
 * Biome palettes. Colours are plain hex ints so they can be lerped cheaply.
 * Every field is cross-faded on a biome change (see Palette in world.js).
 */
export const BIOMES = [
  {
    name: 'Dawn Meadow',
    skyTop: 0x2f6fb8, skyHorizon: 0xf7cfa4, skyLow: 0xdcb894,
    fog: 0xeee0cd, fogNear: 155, fogFar: 340,
    sunDir: [0.64, 0.40, -0.66], sunColor: 0xffe6c4, sunInt: 1.95, sunGlow: 0.78, sunSize: 0.05,
    hemiSky: 0xa6d4ff, hemiGround: 0x84b96e, hemiInt: 0.68,
    groundLow: 0x4f9f5e, groundHigh: 0x8fd071,
    waterColor: 0x4fb8d8, waterOpacity: 0.62,
    mtn: [0x7c9fd6, 0x9ab7e0, 0xbccfea],
    cloudColor: 0xfdf7f0, cloudShade: 0xcfc4cf, cloudCount: 1.0,
    gateBody: 0xeadfcc, gateBodyDark: 0xc9bca6, gateAccent: 0xff6b3d,
    prop: 'broadleaf', propA: 0x3d8f4c, propB: 0x6cbe5b, trunk: 0x6f5138,
    rockColor: 0x9aa3ad,
    stars: 0.0, aurora: 0.0,
    moteColor: 0xfff0c0, moteCount: 0.75, moteSpeed: 0.5,
    trail: 0xffd7a8,
    chord: [0, 4, 7, 11], pad: 0.55,
    ui: '#ff8355',
  },
  {
    name: 'Azure Coast',
    skyTop: 0x1d7ed6, skyHorizon: 0x9ee8ff, skyLow: 0xd2f6ff,
    fog: 0xcdeeff, fogNear: 175, fogFar: 350,
    sunDir: [0.56, 0.60, -0.57], sunColor: 0xffffff, sunInt: 2.18, sunGlow: 0.8, sunSize: 0.045,
    hemiSky: 0xaee6ff, hemiGround: 0x74c8c2, hemiInt: 0.76,
    groundLow: 0xdfcf9c, groundHigh: 0xf6ecc8,
    waterColor: 0x14b8cf, waterOpacity: 0.78,
    mtn: [0x4fa9c9, 0x7cc4da, 0xacdcea],
    cloudColor: 0xffffff, cloudShade: 0xc8e2f0, cloudCount: 1.15,
    gateBody: 0xf2f0e4, gateBodyDark: 0xd2ccbc, gateAccent: 0x00bcd8,
    prop: 'palm', propA: 0x2f9e78, propB: 0x5fd0a0, trunk: 0xa07c52,
    rockColor: 0xa8b0b8,
    stars: 0.0, aurora: 0.0,
    moteColor: 0xffffff, moteCount: 0.6, moteSpeed: 0.45,
    trail: 0xaef0ff,
    chord: [0, 5, 7, 12], pad: 0.5,
    ui: '#26d0e0',
  },
  {
    name: 'Sunset Canyon',
    skyTop: 0x46265f, skyHorizon: 0xff7a4d, skyLow: 0xffb27a,
    fog: 0xf5a377, fogNear: 120, fogFar: 310,
    sunDir: [0.76, 0.17, -0.63], sunColor: 0xffcf8a, sunInt: 1.74, sunGlow: 1.15, sunSize: 0.075,
    hemiSky: 0xff9e86, hemiGround: 0x8a4e3c, hemiInt: 0.64,
    groundLow: 0xb2573a, groundHigh: 0xe08c5c,
    waterColor: 0x8c4a63, waterOpacity: 0.5,
    mtn: [0x6b3a5c, 0x8d5166, 0xad677c],
    cloudColor: 0xffbd96, cloudShade: 0xa9557a, cloudCount: 0.8,
    gateBody: 0xf2d8c0, gateBodyDark: 0xc9a289, gateAccent: 0xff2e5c,
    prop: 'cactus', propA: 0x4f8a52, propB: 0xc9a55e, trunk: 0x8c5a3c,
    rockColor: 0xb06a4c,
    stars: 0.12, aurora: 0.0,
    moteColor: 0xffc890, moteCount: 1.25, moteSpeed: 0.9,
    trail: 0xff9a6e,
    chord: [0, 3, 7, 10], pad: 0.6,
    ui: '#ff6b81',
  },
  {
    name: 'Nightfall',
    skyTop: 0x070f28, skyHorizon: 0x27356b, skyLow: 0x3b487a,
    fog: 0x1a2750, fogNear: 105, fogFar: 290,
    sunDir: [-0.52, 0.50, -0.69], sunColor: 0xbcd0ff, sunInt: 0.85, sunGlow: 0.95, sunSize: 0.05,
    hemiSky: 0x5470ad, hemiGround: 0x1b2742, hemiInt: 0.62,
    groundLow: 0x2e3f66, groundHigh: 0x4d6795,
    waterColor: 0x16326b, waterOpacity: 0.7,
    mtn: [0x121c3c, 0x1e2b52, 0x2c3d66],
    cloudColor: 0x3c4c7e, cloudShade: 0x222d55, cloudCount: 0.7,
    gateBody: 0xc6d3f2, gateBodyDark: 0x7d8cb8, gateAccent: 0x3ddcff,
    prop: 'pine', propA: 0x1e3f4a, propB: 0x2d5f63, trunk: 0x3a2f3c,
    rockColor: 0x46506b,
    stars: 1.0, aurora: 0.25,
    moteColor: 0xffe08a, moteCount: 1.0, moteSpeed: 0.32,
    trail: 0x8ef0ff,
    chord: [0, 3, 7, 14], pad: 0.7,
    ui: '#7ee8ff',
  },
  {
    name: 'Aurora Peaks',
    skyTop: 0x06182f, skyHorizon: 0x0d4a5e, skyLow: 0x1a6b74,
    fog: 0x113f52, fogNear: 130, fogFar: 320,
    sunDir: [-0.62, 0.38, -0.68], sunColor: 0xd6f6ff, sunInt: 1.11, sunGlow: 0.7, sunSize: 0.04,
    hemiSky: 0x8fe9dd, hemiGround: 0x2a6070, hemiInt: 0.66,
    groundLow: 0xc3dcee, groundHigh: 0xffffff,
    waterColor: 0x1a7f96, waterOpacity: 0.66,
    mtn: [0x1b4a63, 0x2c6b82, 0x4090a6],
    cloudColor: 0x9fe8e0, cloudShade: 0x4d8a96, cloudCount: 0.65,
    gateBody: 0xd8ecf7, gateBodyDark: 0x9ebccc, gateAccent: 0x9a4dff,
    prop: 'pine', propA: 0x1f5c58, propB: 0x3f8c7c, trunk: 0x4a3f46,
    rockColor: 0x8fa8bd,
    stars: 0.85, aurora: 1.0,
    moteColor: 0xdcf6ff, moteCount: 1.35, moteSpeed: 0.55,
    trail: 0xc7a6ff,
    chord: [0, 4, 9, 12], pad: 0.75,
    ui: '#b98cff',
  },
];

/** Quality presets. `auto` resolves to one of these at boot. */
export const QUALITY = {
  high: {
    // 2.0 on a Retina panel means 4x the CSS pixels; 1.75 is visually identical
    // at this art style and ~23% cheaper on fill.
    bloom: true, shadows: true, shadowSize: 1024, dprCap: 1.75,
    props: 1.0, motes: 1.0, clouds: 1.0, water: true, grain: true, aberration: true,
  },
  medium: {
    bloom: true, shadows: true, shadowSize: 512, dprCap: 1.4,
    props: 0.7, motes: 0.7, clouds: 0.8, water: true, grain: false, aberration: true,
  },
  low: {
    bloom: false, shadows: false, shadowSize: 512, dprCap: 1.0,
    props: 0.45, motes: 0.4, clouds: 0.55, water: false, grain: false, aberration: false,
  },
};

export function biomeIndexForScore(score) {
  for (let i = BIOME_SCHEDULE.length - 1; i >= 0; i--) {
    if (score >= BIOME_SCHEDULE[i]) {
      if (i === BIOME_SCHEDULE.length - 1) {
        // the final biome plays once, then we cycle through 1..4 forever
        const cycles = Math.floor((score - BIOME_SCHEDULE[i]) / 24);
        if (cycles === 0) return i;
        return 1 + ((cycles - 1) % (BIOMES.length - 1));
      }
      return i;
    }
  }
  return 0;
}

/** Difficulty at a given score: 0 -> 1 eased. */
export function rampT(score) {
  const t = Math.min(1, score / CFG.rampScore);
  return t * t * (3 - 2 * t);
}
