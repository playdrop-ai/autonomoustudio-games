/**
 * game.js — the orchestrator: renderer, camera rig, state machine, fixed-step
 * physics, scoring and every piece of juice that hangs off them.
 */
import { THREE, sdk } from './runtime.js';
import { CFG, QUALITY, BIOMES, biomeIndexForScore, rampT } from './config.js';
import { clamp, clamp01, lerp, damp, DEG, detectMobile, ResolutionGovernor } from './util.js';
import { Sky } from './sky.js';
import { World } from './world.js';
import { GateField } from './gates.js';
import { Flyer } from './flyer.js';
import { Particles } from './particles.js';
import { PostFX } from './postfx.js';
import { audio } from './audio.js';
import { Store } from './storage.js';

const STATE = { BOOT: 'boot', HOME: 'home', READY: 'ready', PLAY: 'play', DYING: 'dying', DEAD: 'dead', PAUSED: 'paused' };
const _v = new THREE.Vector3();
const _sep = { x: 0, y: 0 };

/*
 * Adaptive-resolution bounds. renderScale multiplies the quality tier's dprCap, and
 * the product is clamped to the panel and to DPR_MAX.
 *
 * DPR_MAX 2.0, not 3.0: on a dpr-3 phone panel, 3.0 means nine device pixels per CSS
 * pixel and the art style -- flat-shaded low-poly with no fine texture detail -- gets
 * nothing for the last step. 2.0 is where the edges stop reading as stair-steps.
 */
const RENDER_SCALE_MIN = 0.55;
const RENDER_SCALE_MAX = 1.5;
const DPR_MAX = 2.0;

function previewSeed(value) {
  const text = String(value || 'flighty-saucer-preview');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export class Game {
  constructor(canvas, ui) {
    this.canvas = canvas;
    this.ui = ui;
    this.state = STATE.BOOT;

    /* ---------- quality, resolved BEFORE the renderer ---------- */
    this.mobile = detectMobile();
    this.qualityName = Store.get('quality');
    this.quality = this._resolveQuality(this.qualityName);

    /* ---------- renderer ---------- */
    /*
     * antialias only when there is no post chain. With post on, the scene renders
     * into an offscreen target that already has samples: 2, and the only draw that
     * ever reaches the default framebuffer is one full-screen composite quad --
     * multisampling two triangles is a no-op, but the driver still allocates the
     * multisampled backbuffer and resolves it every frame. On a tile-based mobile GPU
     * that is pure bandwidth. The low tier does draw straight to the canvas, and
     * antialias cannot be changed after construction, hence the ordering above.
     */
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: !this.quality.bloom, alpha: false,
      powerPreference: 'high-performance', stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 1);
    // count draws across the whole frame, not just the last render() call
    this.renderer.info.autoReset = false;
    this.renderer.shadowMap.enabled = this.quality.shadows;

    /* ---------- scene ---------- */
    this.scene = new THREE.Scene();
    this.sky = new Sky();
    this.scene.add(this.sky.mesh);

    this.camera = new THREE.PerspectiveCamera(CFG.camFov, 1, 0.1, 620);
    this.scene.add(this.camera);

    this.world = new World(this.scene, this.sky, this.quality);
    this.gates = new GateField(this.scene, (Math.random() * 1e9) | 0);
    this.particles = new Particles(this.scene);
    this.particles.setQuality(this.quality);
    this.flyer = new Flyer(this.scene, CFG.flyer);

    this.post = new PostFX(this.renderer);
    this.post.setQuality(this.quality);

    /* ---------- runtime state ---------- */
    this.score = 0;
    this.best = Store.get('best') || 0;
    this.speed = 0;
    this.dist = 0;
    this.trauma = 0;
    this.fovPunch = 0;
    this.timeScale = 1;
    this.timeScaleTarget = 1;
    this.hitStop = 0;
    this.camY = CFG.camCenterY;
    this.camRoll = 0;
    this.camDollyExtra = 0;
    this.deadTimer = 0;
    this.readyPulse = 0;
    this.homeTime = 0;
    this.lastNearMissGate = null;
    this.bounced = false;
    this._cx = new Float64Array(8);
    this._cy = new Float64Array(8);
    this.governor = new ResolutionGovernor(RENDER_SCALE_MIN, RENDER_SCALE_MAX);
    this.renderScale = 1;
    this.frameAvg = 16;
    this.reducedMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.shakeMul = this.reducedMotion ? 0.25 : 1;

    this._resizeBound = () => this.resize();
    window.addEventListener('resize', this._resizeBound);
    window.addEventListener('orientationchange', this._resizeBound);

    this.resize();
    this.enterHome(true);
  }

  _resolveQuality(name) {
    if (name === 'high' || name === 'medium' || name === 'low') return { ...QUALITY[name] };
    const auto = this.mobile ? 'medium' : 'high';
    return { ...QUALITY[auto] };
  }

  setQuality(name) {
    Store.set('quality', name);
    this.qualityName = name;
    const q = this._resolveQuality(name);
    this.quality = q;
    this.renderer.shadowMap.enabled = q.shadows;
    this.world.setQuality(q);
    this.post.setQuality(q);
    this.particles.setQuality(q);
    this.governor.reset();
    this.renderScale = 1;
    this.resize();
  }

  /* ================================================================ *
   * framing
   * ================================================================ */
  resize() {
    const viewport = window.visualViewport;
    const w = Math.max(1, Math.round(viewport?.width || this.canvas.clientWidth || window.innerWidth));
    const h = Math.max(1, Math.round(viewport?.height || this.canvas.clientHeight || window.innerHeight));
    const aspect = w / h;

    // portrait screens get a wider lens and a tighter horizontal guarantee
    const narrow = clamp01((1.15 - aspect) / 0.7);
    const fov = lerp(CFG.camFov, 69, narrow);
    const viewW = lerp(CFG.camViewW, 10.4, narrow);

    const tanV = Math.tan(fov * 0.5 * DEG);
    const distV = (CFG.camViewH * 0.5) / tanV;
    const distH = (viewW * 0.5) / (tanV * aspect);
    this.camDist = Math.max(distV, distH);
    /*
     * Place the bird at a fixed fraction of the frame width rather than at a
     * fixed world offset: every aspect ratio then gets the same *proportion* of
     * look-ahead, which is what actually decides whether the game feels fair.
     */
    const visibleW = 2 * this.camDist * tanV * aspect;
    this.visibleW = visibleW;
    /*
     * On a narrow screen the visible width collapses, so the craft is pushed
     * further left to keep a usable amount of track ahead of it.
     */
    const screenX = lerp(CFG.flyerScreenX, 0.24, narrow);
    this.lookX = (0.5 - screenX) * visibleW;
    // camera sits just off the frame centre, so the view axis is almost exactly
    // -Z: towers stay vertical and parallel and the game reads as a side view
    this.camXPos = this.lookX - CFG.camSideOffset * Math.min(1, visibleW / 20);

    this.baseFov = fov;
    this.camera.fov = fov;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();

    /*
     * Resolution is the tier's cap TIMES the adaptive scale, then clamped to the
     * panel and to DPR_MAX -- not (cap clamped to panel) times scale.
     *
     * The old form made dprCap a hard ceiling, so a phone with headroom could never
     * earn a sharper image: on an iPhone at devicePixelRatio 3 the medium tier's cap
     * of 1.4 pinned the backing store at 484x813 for a 393x660 viewport and upscaled
     * it 2.4x, which is exactly the softness visible on the tower edges and the
     * energy rings. Now renderScale is allowed above 1 (see frame()), so a device
     * that holds 60 fps climbs toward DPR_MAX on its own, and a device that cannot
     * still falls to the 0.55 floor as before. Nothing gets more expensive up front.
     */
    const dpr = Math.min(window.devicePixelRatio || 1,
                         this.quality.dprCap * this.renderScale,
                         DPR_MAX);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);

    // the shadow box follows the corridor the camera frames (portrait spans ~10.5
    // world units of x against the fixed 56-unit box this replaces)
    if (this.world) this.world.fitShadow(this.lookX, visibleW);

    const bw = Math.floor(w * dpr), bh = Math.floor(h * dpr);
    this.post.setSize(bw, bh);
    this.particles.setViewport(bh, fov * DEG);
    this.world.setMoteScale(0.5 * bh / Math.tan(fov * 0.5 * DEG));
  }

  /* ================================================================ *
   * state transitions
   * ================================================================ */
  enterHome(first = false) {
    this.state = STATE.HOME;
    this.score = 0;
    this.speed = 3.4;
    this.homeTime = 0;
    this.trauma = 0;
    this.timeScale = 1;
    this.timeScaleTarget = 1;
    this.camDollyExtra = 0;
    this.world.setBiome(0);
    this.gates.reset(140);
    this.flyer.reset(CFG.camCenterY);
    this.flyer.setPalette(BIOMES[0]);
    this.particles.clear();
    this.post.desat = 0;
    this.post.exposure = 0.98;
    this._syncLook();
    this.ui.setAccent(BIOMES[0].ui);
    this.previewPresentation = false;
    this.ui.setPreviewMode(false);
    this.ui.showHome(this.best, first);
    this.captureAutopilot = false;
  }

  enterReady() {
    this.state = STATE.READY;
    this.score = 0;
    this.speed = 4.6;
    this.dist = 0;
    this.trauma = 0;
    this.bounced = false;
    this.deadTimer = 0;
    this.camDollyExtra = 0;
    this.timeScale = 1;
    this.timeScaleTarget = 1;
    this.world.setBiome(0);
    this.gates.reset(40);
    this.gates.ensureAhead(0);
    this.flyer.reset(CFG.camCenterY);
    this.flyer.setPalette(BIOMES[0]);
    this.particles.clear();
    this.camY = CFG.camCenterY;
    this.post.desat = 0;
    this.post.exposure = 0.98;
    this._syncLook();
    this.ui.setAccent(BIOMES[0].ui);
    if (this.previewPresentation) this.ui.showPreview();
    else this.ui.showReady();
  }

  start() {
    this.state = STATE.PLAY;
    if (this.previewPresentation) this.ui.showPreview();
    else this.ui.showHud(this.score, this.best);
    this.thrust(true);
    void sdk.achievements.unlock('first-flight')
      .catch((error) => console.info('[flighty-saucer] achievement unavailable in this session', error));
  }

  prepareListingScene(options = {}) {
    this.previewPresentation = true;
    this.captureAutopilot = true;
    this.ui.setPreviewMode(true);
    this.gates.setSeed(previewSeed(options.seed));
    this.enterReady();
    this.start();
  }

  rearmPreviewGuideForAudioCapture() {
    if (!this.previewPresentation) return;
    this.ui.setPreviewMode(true);
  }

  thrust(first = false) {
    const b = this.flyer;
    b.vy = CFG.flapImpulse;
    b.thrust();
    this.fovPunch = Math.min(1.6, this.fovPunch + (first ? 1.1 : 0.85));
    this.trauma = Math.min(1, this.trauma + 0.045);
    this.particles.thrustPuff(0, b.y, 0, this.world.pal.cur.trail);
    audio.flap(first ? 1.15 : 1);
    Store.bump('flaps');
    if (Store.get('haptics') && navigator.vibrate) navigator.vibrate(8);
    if (
      this.previewPresentation
      && this.captureAutopilot
    ) {
      this.ui.previewTap();
    }
  }

  /** Single entry point for every kind of tap/click/keypress. */
  tap() {
    audio.unlock();
    switch (this.state) {
      case STATE.HOME: this.enterReady(); this.ui.pulseHint(); break;
      case STATE.READY: this.start(); break;
      case STATE.PLAY: this.thrust(); break;
      case STATE.DEAD: if (this.deadTimer > 0.75) this.enterReady(); break;
      // backgrounding the tab auto-pauses (main.js), so without this a returning
      // player taps the screen and nothing at all happens
      case STATE.PAUSED: this.resume(); break;
      default: break;
    }
  }

  togglePause() {
    if (this.state === STATE.PLAY) {
      this.state = STATE.PAUSED;
      this.post.desat = 0.55;
      this.post.exposure = 0.66;
      this.ui.showPause();
      audio.ui('back');
    } else if (this.state === STATE.PAUSED) {
      this.resume();
    }
  }

  resume() {
    if (this.state !== STATE.PAUSED) return;
    this.state = STATE.PLAY;
    this.post.desat = 0;
    this.post.exposure = 0.98;
    this.ui.hidePause();
    audio.ui('tap');
  }

  pauseFromHost() {
    if (this.state !== STATE.PLAY) return;
    this._pausedByHost = true;
    this.state = STATE.PAUSED;
    this.post.desat = 0.55;
    this.post.exposure = 0.66;
    this.ui.showPause();
  }

  resumeFromHost() {
    if (!this._pausedByHost || this.state !== STATE.PAUSED) return;
    this._pausedByHost = false;
    this.state = STATE.PLAY;
    this.post.desat = 0;
    this.post.exposure = 0.98;
    this.ui.hidePause();
  }

  restart() {
    this.post.desat = 0;
    this.post.exposure = 0.98;
    this.ui.hidePause();
    this.enterReady();
  }

  goHome() {
    this.post.desat = 0;
    this.post.exposure = 0.98;
    this.ui.hidePause();
    this.enterHome();
  }

  die(cause) {
    if (this.state !== STATE.PLAY) return;
    this.state = STATE.DYING;
    this.deadTimer = 0;
    this.hitStop = 0.085;
    this.timeScale = 1;
    this.timeScaleTarget = 0.35;
    this.trauma = 1;
    this.fovPunch = -2.2;
    this.post.hit(cause === 'shard' ? 0.5 : 0.42, cause === 'shard' ? 0xff3b2a : 0xff6a4a);
    audio.crash();
    const pal = this.world.pal.cur;
    this.particles.crash(0, this.flyer.y, 0, 0xc8cbe0, pal.gateAccent, this.flyer.spec.debris);
    this.flyer.kill(cause === 'floor' ? 5.5 : -7.5);
    this.flyer.vy = Math.max(this.flyer.vy, 3.2);
    // shoved backwards by whatever it clipped
    this.flyer.vx = cause === 'floor' ? -1.2 : -3.4;
    this.wreckHits = 0;

    Store.bump('games');
    Store.bump('totalScore', this.score);
    const isBest = this.score > this.best;
    if (isBest) {
      this.best = this.score;
      Store.set('best', this.best);
    }
    this.pendingBest = isBest;
    void sdk.leaderboards.submitScore('high-score', this.score)
      .catch((error) => console.info('[flighty-saucer] leaderboard unavailable in this session', error));
    if (Store.get('haptics') && navigator.vibrate) navigator.vibrate([18, 40, 22]);
  }

  /** Push the live (cross-faded) palette into everything the World doesn't own. */
  _syncLook() {
    const cur = this.world.pal.cur;
    this.gates.setPalette(cur);
    this.flyer.setPalette(cur);
    this._accentTick = (this._accentTick || 0) + 1;
    if (this._accentTick % 4 === 0) {
      this.ui.setAccent('#' + cur.gateAccent.getHexString());
    }
  }

  /* ================================================================ *
   * simulation
   * ================================================================ */
  _physics(dt) {
    const b = this.flyer;
    b.vy -= CFG.gravity * dt;
    b.vy = clamp(b.vy, -CFG.maxFall, CFG.maxRise);
    b.y += b.vy * dt;

    const n = CFG.bodyCircles, r = b.collide.r;
    b.collisionCircles(this._cx, this._cy, n, b.collide.halfLen);

    // ceiling: a soft bonk, never a death
    let top = -Infinity, bot = Infinity;
    for (let i = 0; i < n; i++) {
      if (this._cy[i] > top) top = this._cy[i];
      if (this._cy[i] < bot) bot = this._cy[i];
    }
    if (top + r > CFG.ceilY) {
      b.y -= (top + r) - CFG.ceilY;
      if (b.vy > 2.5) {
        audio.bonk();
        this.trauma = Math.min(1, this.trauma + 0.12);
        this.particles.groundPuff(0, CFG.ceilY + 0.3, 0, 0xffffff);
      }
      b.vy = Math.min(b.vy, -1.5);
      b.collisionCircles(this._cx, this._cy, n, b.collide.halfLen);
    }

    if (bot - r < CFG.groundY) {
      this.die('floor');
      return;
    }

    const hit = this.gates.hitTest(this._cx, this._cy, n, r);
    if (hit) this.die(hit.kind);
  }

  /**
   * The wreck keeps colliding. It tumbles, bounces off the ground and off any
   * column or shard it is touching, and slides free of whatever killed it —
   * rather than dropping through the world and coming to rest inside a tower.
   */
  _deathPhysics(dt) {
    const b = this.flyer;
    const n = CFG.bodyCircles, r = b.collide.r;

    b.vy -= CFG.gravity * 0.85 * dt;
    b.vy = clamp(b.vy, -CFG.maxFall, CFG.maxRise);
    b.vx *= Math.exp(-0.7 * dt);
    b.dx += b.vx * dt;
    b.y += b.vy * dt;

    // two relaxation passes are plenty for a body this size
    for (let iter = 0; iter < 2; iter++) {
      b.collisionCircles(this._cx, this._cy, n, b.collide.halfLen);
      let sx = 0, sy = 0, best = 0;
      for (let i = 0; i < n; i++) {
        const hit = this.gates.separate(this._cx[i] + b.dx, this._cy[i], r, _sep);
        if (!hit) continue;
        const m = hit.x * hit.x + hit.y * hit.y;
        if (m > best) { best = m; sx = hit.x; sy = hit.y; }
      }
      if (!best) break;
      b.dx += sx;
      b.y += sy;
      const len = Math.hypot(sx, sy) || 1;
      const nx = sx / len, ny = sy / len;
      const vn = b.vx * nx + b.vy * ny;
      if (vn < 0) {
        // bounce, then bleed off the sliding component
        b.vx -= 1.42 * vn * nx;
        b.vy -= 1.42 * vn * ny;
        b.vx *= 0.72;
        b.vy *= 0.72;
        b.spin = clamp(b.spin + vn * nx * 1.6, -9, 9);
        if (!this.wreckHits) this.wreckHits = 0;
        if (Math.abs(vn) > 3.2 && this.wreckHits < 4) {
          this.wreckHits++;
          audio.thud();
          this.trauma = Math.min(1, this.trauma + 0.22);
          this.particles.groundPuff(b.dx, b.y - 0.2, 0, this.world.pal.cur.gateAccent);
        }
      }
    }

    // ground
    b.collisionCircles(this._cx, this._cy, n, b.collide.halfLen);
    let lowest = Infinity;
    for (let i = 0; i < n; i++) lowest = Math.min(lowest, this._cy[i]);
    const pen = CFG.groundY - (lowest - r);
    if (pen > 0) {
      b.y += pen;
      if (b.vy < -3.5 && !this.bounced) {
        this.bounced = true;
        b.vy = -b.vy * 0.34;
        b.vx *= 0.8;
        b.spin *= 0.6;
        audio.thud();
        this.trauma = Math.min(1, this.trauma + 0.32);
        this.particles.groundPuff(b.dx, CFG.groundY + 0.15, 0, this.world.pal.cur.groundHigh);
        this.post.hit(0.12, 0xffffff);
      } else if (b.vy < 0) {
        b.vy = -b.vy * 0.22;
        b.vx *= 0.86;
        if (Math.abs(b.vy) < 0.6) b.vy = 0;
      }
      b.spin = damp(b.spin, 0, 5, dt);
    }
    b.renderY = b.y;
  }

  _scoring() {
    const g = this.gates.takeScore();
    if (!g) return;
    this.score++;
    void sdk.achievements.setProgressAtLeast('gate-runner', this.score)
      .catch((error) => console.info('[flighty-saucer] achievement progress unavailable in this session', error));
    const pal = this.world.pal.cur;
    this.particles.scoreBurst(0, g.gapY, 0, pal.gateAccent);
    audio.score(this.score);
    this.post.hit(0.055, pal.gateAccent.getHex());
    this.trauma = Math.min(1, this.trauma + 0.05);
    this.ui.setScore(this.score);

    if (this.score % CFG.milestoneEvery === 0) {
      this.particles.milestone(0, g.gapY, 0, pal.gateAccent);
      audio.milestone(this.score);
      this.post.hit(0.3, 0xffffff);
      this.trauma = Math.min(1, this.trauma + 0.22);
      this.fovPunch = Math.min(2.4, this.fovPunch + 1.6);
      this.ui.milestone(this.score);
    }

    const bi = biomeIndexForScore(this.score);
    if (bi !== this.world.pal.targetIndex) {
      this.world.setBiome(bi);
      audio.biomeShift();
      this.ui.biomeToast(BIOMES[bi].name);
    }
  }

  _nearMiss() {
    const c = this.gates.nearMissCheck(this.flyer.y, CFG.nearMissDist);
    if (c < 0) return;
    this.particles.nearMiss(0.45, this.flyer.y, 0, 0xffffff);
    audio.nearMiss();
    this.trauma = Math.min(1, this.trauma + 0.07);
    this.fovPunch = Math.min(2.0, this.fovPunch + 0.5);
    this.ui.nearMiss();
  }

  /* ================================================================ *
   * per-frame
   * ================================================================ */
  frame(rawDt) {
    // ---- adaptive resolution (see ResolutionGovernor in util.js) ----
    if (this.governor.step(rawDt)) {
      this.renderScale = this.governor.scale;
      this.resize();
    }
    this.frameAvg = this.governor.frameAvg;
    this.fps = this.governor.fps;

    let dt = Math.min(rawDt, 0.05);

    // ---- hit stop + slow motion ----------------------------------
    if (this.hitStop > 0) {
      this.hitStop -= dt;
      dt = 0;
    }
    this.timeScale = damp(this.timeScale, this.timeScaleTarget, 3.0, Math.min(rawDt, 0.05));
    const sdt = dt * this.timeScale;

    const st = this.state;
    const playing = st === STATE.PLAY;
    const paused = st === STATE.PAUSED;

    if (playing && this.captureAutopilot) {
      const nextGate = this.gates.pool
        .filter((gate) => gate.active && gate.x > -2)
        .sort((a, b) => a.x - b.x)[0];
      const targetY = nextGate?.gapY ?? CFG.camCenterY;
      if (this.flyer.y < targetY - 0.2 && this.flyer.vy < 2.5) this.thrust();
    }

    // ---- forward speed -------------------------------------------
    let targetSpeed;
    if (st === STATE.HOME) targetSpeed = 3.4;
    else if (st === STATE.READY) targetSpeed = 4.6;
    else if (playing) targetSpeed = lerp(CFG.speedStart, CFG.speedEnd, rampT(this.score));
    else if (st === STATE.DYING || st === STATE.DEAD) targetSpeed = 0;
    else targetSpeed = this.speed;
    if (!paused) this.speed = damp(this.speed, targetSpeed, st === STATE.DYING ? 3.4 : (playing ? 2.4 : 1.4), sdt);

    const dx = paused ? 0 : this.speed * sdt;
    this.dist += dx;

    // ---- physics (fixed step) ------------------------------------
    if (playing) {
      this._acc = (this._acc || 0) + sdt;
      let steps = 0;
      while (this._acc >= CFG.fixedStep && steps < CFG.maxSubSteps) {
        // remember the pre-step position so the frame can be drawn between
        // simulation ticks instead of snapping to them
        this._prevY = this.flyer.y;
        this._physics(CFG.fixedStep);
        this._acc -= CFG.fixedStep;
        steps++;
        if (this.state !== STATE.PLAY) break;
      }
      if (steps >= CFG.maxSubSteps) this._acc = 0;
      /*
       * Render between ticks. Without this the craft's height quantises to
       * 1/120 s boundaries, which reads as micro-jitter at any refresh rate
       * that is not an exact multiple of the step.
       */
      this.flyer.renderY = steps > 0
        ? lerp(this._prevY, this.flyer.y, clamp01(this._acc / CFG.fixedStep))
        : this.flyer.y;
      if (this.state === STATE.PLAY) {
        this._scoring();
        this._nearMiss();
      }
    } else if (st === STATE.DYING || st === STATE.DEAD) {
      this._deathPhysics(sdt);
      this.flyer.renderY = this.flyer.y;
      this.deadTimer += Math.min(rawDt, 0.05);
      if (st === STATE.DYING && this.deadTimer > 0.62) {
        this.state = STATE.DEAD;
        this.timeScaleTarget = 1;
        this.ui.showGameOver(this.score, this.best, this.pendingBest);
        if (this.pendingBest && this.score > 0) audio.newBest();
      }
    } else if (st === STATE.READY) {
      // gentle idle hover so the bird never looks frozen
      const b = this.flyer;
      b.y = CFG.camCenterY + Math.sin(this.homeTime * 2.1) * 0.30;
      b.vy = Math.cos(this.homeTime * 2.1) * 0.6;
      b.renderY = b.y;
      this.homeTime += sdt;
    } else if (st === STATE.HOME) {
      const b = this.flyer;
      this.homeTime += sdt;
      b.y = CFG.camCenterY + Math.sin(this.homeTime * 1.35) * 0.55;
      b.vy = Math.cos(this.homeTime * 1.35) * 0.7;
      b.renderY = b.y;
      if (Math.random() < sdt * 0.85) {
        b.thrust();
        this.particles.thrustPuff(0, b.y, 0, this.world.pal.cur.trail);
      }
    }

    // ---- world / actors ------------------------------------------
    if (!paused) {
      const speed01 = clamp01((this.speed - CFG.speedStart * 0.5) / (CFG.speedEnd - CFG.speedStart * 0.5));
      if (this.world.update(sdt, dx)) this._syncLook();
      this.gates.update(sdt, dx, this.score);
      this.flyer.shift(dx);
      this.particles.shift(dx);
      this.flyer.update(sdt, speed01, playing || st === STATE.READY || st === STATE.HOME ? 1 : 0);
      this.particles.update(sdt);
      this.sky.update(sdt, this.camera);

      // occasional trail sparks while flying fast
      if (playing && Math.random() < sdt * (6 + speed01 * 12)) {
        this.flyer.tailPoint(_v);
        this.particles.trailSpark(_v.x, _v.y, _v.z, this.world.pal.cur.trail);
      }

      audio.setAmbience(
        st === STATE.HOME ? 0.55 : 1.0,
        speed01,
        this.world.pal.chord,
        this.world.pal.cur.pad,
      );
    }

    // ---- camera ---------------------------------------------------
    this._camera(Math.min(rawDt, 0.05), st);

    // ---- render ---------------------------------------------------
    this.post.setTrauma(this.trauma * this.trauma * this.shakeMul);
    this.renderer.info.reset();
    this.post.render(this.scene, this.camera, Math.min(rawDt, 0.05));
    this.drawCalls = this.renderer.info.render.calls;

    this.trauma = Math.max(0, this.trauma - CFG.shakeDecay * Math.min(rawDt, 0.05));
  }

  _camera(dt, st) {
    const b = this.flyer;
    let targetY;
    if (st === STATE.HOME) {
      targetY = CFG.camCenterY + Math.sin(this.homeTime * 0.55) * 0.7;
    } else if (st === STATE.DYING || st === STATE.DEAD) {
      targetY = lerp(CFG.camCenterY, Math.max(b.y, CFG.groundY + 1.6), 0.7);
    } else {
      targetY = lerp(CFG.camCenterY, b.y, CFG.camFollow) + clamp(b.vy * 0.035, -0.5, 0.5);
    }
    this.camY = damp(this.camY, targetY, CFG.camDamp, dt);

    // dolly out a little on death and while flying fast
    const dollyTarget = (st === STATE.DYING || st === STATE.DEAD) ? 2.4
      : (st === STATE.HOME ? 1.2 : clamp01((this.speed - CFG.speedStart) / 7) * 1.1);
    this.camDollyExtra = damp(this.camDollyExtra, dollyTarget, 2.2, dt);

    const sh = this.trauma * this.trauma * this.shakeMul;
    const t = performance.now() * 0.001;
    const sx = (Math.sin(t * 47.3) + Math.sin(t * 31.7) * 0.6) * 0.30 * sh;
    const sy = (Math.sin(t * 41.1) + Math.sin(t * 26.3) * 0.6) * 0.30 * sh;

    const homeDrift = st === STATE.HOME ? Math.sin(this.homeTime * 0.4) * 1.1 : 0;

    this.camera.position.set(
      this.camXPos + sx + homeDrift * 0.35,
      this.camY + sy,
      this.camDist + this.camDollyExtra + homeDrift,
    );
    this.camera.lookAt(this.lookX, this.camY + 0.55, 0);

    this.camRoll = damp(this.camRoll, clamp(-b.vy * 0.004, -0.05, 0.05) + sh * 0.05, 5, dt);
    this.camera.rotateZ(this.camRoll);

    this.fovPunch = damp(this.fovPunch, 0, 6.5, dt);
    const fov = this.baseFov + this.fovPunch;
    if (Math.abs(this.camera.fov - fov) > 0.002) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
}

export { STATE };
