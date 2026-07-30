/**
 * ui.js — DOM layer. Keeps all glass panels, the HUD and the transient
 * feedback animations in one place; the game only calls intents on it.
 *
 * Animations use the Web Animations API so a re-trigger never needs a class
 * dance or a forced reflow.
 */
import { Store } from './storage.js';
import { audio } from './audio.js';

const MEDALS = [
  { min: 80, cls: 'plat', name: 'LEGEND' },
  { min: 45, cls: 'gold', name: 'ACE' },
  { min: 25, cls: 'silver', name: 'NAVIGATOR' },
  { min: 10, cls: 'bronze', name: 'PILOT' },
  { min: 0, cls: '', name: 'ROOKIE' },
];

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.el = {
      hud: $('hud'), home: $('home'), ready: $('ready'), over: $('over'),
      pause: $('pause'), help: $('help'),
      score: $('score'), bestVal: $('bestVal'),
      hBest: $('hBest'), hGames: $('hGames'), hFlaps: $('hFlaps'),
      biome: $('biomeToast'), biomeText: $('biomeToast').querySelector('span'),
      milestone: $('milestone'),
      msNum: $('milestone').querySelector('b'),
      msWord: $('milestone').querySelector('i'),
      overScore: $('overScore'), overBest: $('overBest'),
      overCard: document.querySelector('.over-card'),
      medal: $('medal'), medalName: $('medalName'),
      nearFlash: $('nearFlash'), edgeGlow: $('edgeGlow'),
      soundBtn: $('soundBtn'), soundLabel: $('soundLabel'),
      qualityBtn: $('qualityBtn'), qualityLabel: $('qualityLabel'),
      boot: $('boot'), bootNote: $('bootNote'), perf: $('perf'),
      root: document.documentElement,
    };
    this.layers = ['hud', 'home', 'ready', 'over', 'pause', 'help'];
    this.helpOpen = false;
    this._lastScore = -1;
    this._reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._syncSoundBtn();
    this._syncQualityBtn();
  }

  /* ---------------------------------------------------------------- *
   * wiring
   * ---------------------------------------------------------------- */
  bind(game) {
    this.game = game;
    const on = (id, fn) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        audio.unlock();
        fn(e);
      });
    };

    on('playBtn', () => { audio.ui('tap'); game.tap(); });
    on('pauseBtn', () => game.togglePause());
    on('resumeBtn', () => game.resume());
    on('restartBtn', () => { audio.ui('tap'); game.restart(); });
    on('quitBtn', () => { audio.ui('back'); game.goHome(); });
    on('retryBtn', () => { audio.ui('tap'); game.enterReady(); });
    on('homeBtn', () => { audio.ui('back'); game.goHome(); });
    on('helpBtn', () => { audio.ui('tap'); this.toggleHelp(true); });
    on('helpCloseBtn', () => { audio.ui('back'); this.toggleHelp(false); });
    on('soundBtn', () => {
      const next = !Store.get('sound');
      Store.set('sound', next);
      audio.setEnabled(next);
      this._syncSoundBtn();
      if (next) audio.ui('tap');
    });
    on('qualityBtn', () => {
      const order = ['auto', 'high', 'medium', 'low'];
      const next = order[(order.indexOf(Store.get('quality')) + 1) % order.length];
      game.setQuality(next);
      this._syncQualityBtn();
      audio.ui('tap');
    });
  }

  _syncSoundBtn() {
    const on = Store.get('sound');
    this.el.soundBtn.classList.toggle('muted', !on);
    this.el.soundLabel.textContent = on ? 'SOUND' : 'MUTED';
  }

  _syncQualityBtn() {
    this.el.qualityLabel.textContent = String(Store.get('quality')).toUpperCase();
  }

  /* ---------------------------------------------------------------- *
   * layers
   * ---------------------------------------------------------------- */
  _only(...names) {
    for (const l of this.layers) {
      if (l === 'help' && this.helpOpen) continue;
      this.el[l].classList.toggle('on', names.includes(l));
    }
  }

  bootDone() {
    if (this._booted) return;
    this._booted = true;
    this.el.boot.classList.add('gone');
    setTimeout(() => { this.el.boot.style.display = 'none'; }, 700);
  }

  setBootNote(t) { this.el.bootNote.textContent = t; }

  setAccent(hexString) {
    this.el.root.style.setProperty('--accent', hexString);
    const rgb = hexString.replace('#', '');
    const r = parseInt(rgb.slice(0, 2), 16), g = parseInt(rgb.slice(2, 4), 16), b = parseInt(rgb.slice(4, 6), 16);
    this.el.root.style.setProperty('--accent-soft', `rgba(${r},${g},${b},0.36)`);
  }

  showHome(best, first) {
    this._only('home');
    const all = Store.all();
    this.el.hBest.textContent = best;
    this.el.hGames.textContent = all.games || 0;
    this.el.hFlaps.textContent = all.flaps || 0;
    if (first && !Store.get('seenHint')) {
      Store.set('seenHint', true);
    }
  }

  showReady() {
    this._only('hud', 'ready');
    this.el.hud.classList.remove('dim');
    this.setScore(0, true);
    this.el.bestVal.textContent = Store.get('best') || 0;
  }

  showHud(score, best) {
    this._only('hud');
    this.el.hud.classList.remove('dim');
    this.setScore(score, true);
    this.el.bestVal.textContent = best;
  }

  showGameOver(score, best, isBest) {
    this._only('hud', 'over');
    this.el.hud.classList.add('dim');
    this.el.overScore.textContent = score;
    this.el.overBest.textContent = best;
    this.el.overCard.classList.toggle('best', !!isBest);
    const m = MEDALS.find((x) => score >= x.min);
    this.el.medal.className = `medal ${m.cls}`;
    this.el.medalName.textContent = m.name;
    this.el.bestVal.textContent = best;
  }

  showPause() { this._only('hud', 'pause'); this.el.hud.classList.add('dim'); }
  hidePause() { this._only('hud'); this.el.hud.classList.remove('dim'); }

  toggleHelp(open) {
    this.helpOpen = open;
    this.el.home.inert = open;
    this.el.home.setAttribute('aria-hidden', open ? 'true' : 'false');
    this.el.help.classList.toggle('on', open);
    this.el.help.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) $('helpCloseBtn').focus({ preventScroll: true });
    else $('helpBtn').focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------------- *
   * transient feedback
   * ---------------------------------------------------------------- */
  setScore(n, silent = false) {
    if (n === this._lastScore) return;
    this._lastScore = n;
    this.el.score.textContent = n;
    if (silent || this._reduced) return;
    this.el.score.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.28) translateY(-4px)', offset: 0.22 },
        { transform: 'scale(0.97)', offset: 0.55 },
        { transform: 'scale(1)' },
      ],
      { duration: 420, easing: 'cubic-bezier(0.22,1,0.36,1)' },
    );
  }

  milestone(n) {
    const words = ['NICE', 'SWEET', 'SMOOTH', 'ON FIRE', 'UNREAL', 'MASTERFUL'];
    this.el.msNum.textContent = n;
    this.el.msWord.textContent = words[Math.min(words.length - 1, Math.floor(n / 10) - 1)] || 'NICE';
    const d = this._reduced ? 500 : 1150;
    this.el.milestone.animate(
      [
        { opacity: 0, transform: 'scale(0.62)' },
        { opacity: 1, transform: 'scale(1.06)', offset: 0.16 },
        { opacity: 1, transform: 'scale(1)', offset: 0.28 },
        { opacity: 1, transform: 'scale(1.02)', offset: 0.66 },
        { opacity: 0, transform: 'scale(1.22)' },
      ],
      { duration: d, easing: 'cubic-bezier(0.22,1,0.36,1)' },
    );
    this.el.edgeGlow.animate(
      [{ opacity: 0 }, { opacity: 0.55, offset: 0.12 }, { opacity: 0 }],
      { duration: 720, easing: 'ease-out' },
    );
  }

  biomeToast(name) {
    this.el.biomeText.textContent = name;
    this.el.biome.animate(
      [
        { opacity: 0, transform: 'translateY(14px)' },
        { opacity: 1, transform: 'translateY(0)', offset: 0.14 },
        { opacity: 1, transform: 'translateY(0)', offset: 0.74 },
        { opacity: 0, transform: 'translateY(-10px)' },
      ],
      { duration: 2600, easing: 'cubic-bezier(0.22,1,0.36,1)' },
    );
  }

  nearMiss() {
    if (this._reduced) return;
    this.el.nearFlash.animate(
      [{ opacity: 0 }, { opacity: 0.4, offset: 0.1 }, { opacity: 0 }],
      { duration: 340, easing: 'ease-out' },
    );
  }

  pulseHint() { /* reserved: the ready layer animates on its own */ }

  /* ---------------------------------------------------------------- *
   * perf readout — press F, or load with ?perf=1
   * ---------------------------------------------------------------- */
  togglePerf(on) {
    this.perfOn = on === undefined ? !this.perfOn : on;
    this.el.perf.classList.toggle('on', this.perfOn);
  }

  updatePerf(g) {
    if (!this.perfOn) return;
    const now = performance.now();
    if (now - (this._perfAt || 0) < 250) return;
    this._perfAt = now;
    const c = g.renderer.domElement;
    this.el.perf.textContent =
      `${Math.round(g.fps || 0).toString().padStart(3)} fps   ${(g.frameAvg || 0).toFixed(1)} ms\n`
      + `${c.width}x${c.height}  dpr ${g.renderer.getPixelRatio().toFixed(2)}\n`
      + `quality ${g.qualityName}  scale ${g.renderScale.toFixed(2)}\n`
      + `draws ${g.drawCalls || 0}`;
  }
}
