/**
 * game-app.js — build the game, wire input, run the loop.
 */
import { UI } from './ui.js';
import { Game, STATE } from './game.js';
import { audio } from './audio.js';
import { Store } from './storage.js';
import { BIOMES } from './config.js';
import { sdk } from './runtime.js';

function fail(message) {
  const boot = document.getElementById('boot');
  if (!boot) return;
  boot.classList.remove('gone');
  boot.style.display = 'flex';
  boot.innerHTML = `<div class="boot-title">FLIGHTY SAUCER</div>
    <div class="boot-note" style="max-width:320px;text-align:center;line-height:1.7;letter-spacing:.08em">${message}</div>`;
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (_) {
    return false;
  }
}

export async function boot() {
  if (!hasWebGL()) {
    fail('This game needs WebGL. Try a recent Chrome, Safari, Edge or Firefox with hardware acceleration enabled.');
    throw new Error('[flighty-saucer] WebGL unavailable');
  }

  const canvas = document.getElementById('gl');
  const ui = new UI();
  let game;
  try {
    game = new Game(canvas, ui);
  } catch (err) {
    console.error(err);
    fail('Could not start the renderer: ' + (err && err.message ? err.message : err));
    throw err;
  }

  ui.bind(game);
  ui.setAccent(BIOMES[0].ui);
  if (/[?&]perf=1/.test(location.search)) ui.togglePerf(true);
  audio.setEnabled(Store.get('sound') !== false);
  audio.setHostEnabled(sdk.host.audioEnabled);

  /* ---------------- input ---------------- */
  const tap = () => game.tap();

  window.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    tap();
  }, { passive: true });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    switch (e.code) {
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
      case 'Enter':
        e.preventDefault();
        tap();
        break;
      case 'KeyR':
        if (game.state !== STATE.BOOT) {
          audio.unlock();
          game.restart();
        }
        break;
      case 'KeyF':
        ui.togglePerf();
        break;
      default: break;
    }
  });

  // iOS Safari changes the visual viewport (toolbar show/hide) without a resize
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => game.resize());
  }
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  window.addEventListener('pagehide', () => {
    if (game.persistenceEnabled) void Store.flushNow();
  });

  /*
   * iOS jettisons the GPU process when Safari backgrounds a tab, and often never
   * fires webglcontextrestored afterwards. three re-uploads its own state if the
   * restore does arrive, but nothing here noticed the loss: the loop kept calling
   * game.frame(), so physics, scoring and audio carried on behind a black canvas
   * with a live HUD, and the player's run was silently destroyed.
   */
  let lostAt = 0;
  const recoveryOverlay = document.getElementById('boot');
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    game.pauseFromHost();
    lostAt = performance.now();
    ui.setBootNote('graphics reset…');
    recoveryOverlay.classList.remove('gone');
    recoveryOverlay.style.display = 'flex';
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lostAt = 0;
    game.renderScale = 1;
    game.resize();
    recoveryOverlay.classList.add('gone');
    setTimeout(() => { recoveryOverlay.style.display = 'none'; }, 600);
    game.resumeFromHost();
  });

  /* ---------------- loop ---------------- */
  let last = performance.now();
  let warmed = 0;
  function tick(now) {
    const dt = (now - last) / 1000;
    last = now;
    if (lostAt) {
      // never simulate a run the player cannot see
      if (performance.now() - lostAt > 2000) ui.setBootNote('restoring graphics…');
      requestAnimationFrame(tick);
      return;
    }
    game.frame(dt > 0 ? dt : 0.016);
    ui.updatePerf(game);
    if (warmed < 3) {
      warmed++;
      if (warmed === 3) ui.bootDone();
    }
    requestAnimationFrame(tick);
  }

  // pre-compile shaders so the first real frame never hitches
  try {
    game.renderer.compile(game.scene, game.camera);
  } catch (_) { /* non-fatal */ }

  sdk.host.onPause(() => game.pauseFromHost());
  sdk.host.onResume(() => game.resumeFromHost());
  sdk.host.onAudioPolicyChange(({ enabled }) => audio.setHostEnabled(enabled));
  const prepareListingScene = async (options = {}) => {
    if (options.audioPolicy) {
      audio.setHostEnabled(options.audioPolicy !== 'silent');
    }
    game.prepareListingScene(options);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  };
  window.__listingCapture = {
    prepare: prepareListingScene,
    startAudioCapture: async () => {
      game.rearmPreviewGuideForAudioCapture();
      audio.setHostEnabled(true);
      await audio.startListingCapture();
    },
    stopAudioCapture: async () => {
      const capture = await audio.stopListingCapture();
      audio.setAmbience(0, 0, null, 0);
      return capture;
    },
  };

  sdk.host.onPhaseChange((phase) => {
    if (phase === 'preview') void prepareListingScene();
    else if (game.previewPresentation) game.preparePlayerScene();
  });
  if (sdk.host.phase === 'preview') await prepareListingScene();

  // Draw the waiting gameplay scene before telling the PlayDrop host it is ready.
  game.frame(1 / 60);
  ui.setBootNote('ready');
  requestAnimationFrame(tick);
  // belt and braces: never leave the boot veil up if rAF is throttled
  setTimeout(() => ui.bootDone(), 1800);

  // handy for automated screenshots / debugging
  window.flightySaucer = { game, ui, audio, Store };
  window.render_game_to_text = () => JSON.stringify({
    coordinateSystem: 'world x increases toward incoming gates; y increases upward',
    state: game.state,
    preview: game.previewPresentation,
    persistenceEnabled: game.persistenceEnabled,
    waitingForInput: game.state === STATE.READY,
    score: game.score,
    best: game.best,
    speed: Number(game.speed.toFixed(2)),
    flyer: {
      y: Number(game.flyer.y.toFixed(2)),
      velocityY: Number(game.flyer.vy.toFixed(2)),
    },
    visibleGates: game.gates.pool
      .filter((gate) => gate.active && gate.x > -3 && gate.x < game.visibleW)
      .sort((a, b) => a.x - b.x)
      .slice(0, 4)
      .map((gate) => ({
        x: Number(gate.x.toFixed(2)),
        gapY: Number(gate.gapY.toFixed(2)),
        gap: Number(gate.gap.toFixed(2)),
      })),
  });
  window.advanceTime = (ms) => {
    const steps = Math.max(1, Math.ceil(ms / (1000 / 60)));
    const dt = (ms / 1000) / steps;
    for (let i = 0; i < steps; i++) game.frame(dt);
  };
  sdk.host.ready();
}
