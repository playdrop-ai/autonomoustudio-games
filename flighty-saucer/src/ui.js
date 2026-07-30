/**
 * ui.js — DOM layer. Keeps all glass panels, the HUD and the transient
 * feedback animations in one place; the game only calls intents on it.
 *
 * Animations use the Web Animations API so a re-trigger never needs a class
 * dance or a forced reflow.
 */
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
      hud: $('hud'), over: $('over'), pause: $('pause'),
      score: $('score'), bestVal: $('bestVal'),
      biome: $('biomeToast'), biomeText: $('biomeToast').querySelector('span'),
      milestone: $('milestone'),
      msNum: $('milestone').querySelector('b'),
      msWord: $('milestone').querySelector('i'),
      overScore: $('overScore'), overBest: $('overBest'),
      overCard: document.querySelector('.over-card'),
      medal: $('medal'), medalName: $('medalName'),
      nearFlash: $('nearFlash'), edgeGlow: $('edgeGlow'),
      previewGuide: $('previewGuide'),
      previewTapHand: $('previewTapHand'),
      previewTapRing: $('previewTapRing'),
      boot: $('boot'), bootNote: $('bootNote'), perf: $('perf'),
      root: document.documentElement,
    };
    this.layers = ['hud', 'over', 'pause'];
    this.previewMode = false;
    this._previewTapCount = 0;
    this._lastScore = -1;
    this._reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

    on('retryBtn', () => { audio.ui('tap'); game.enterReady(); });
  }

  /* ---------------------------------------------------------------- *
   * layers
   * ---------------------------------------------------------------- */
  _only(...names) {
    for (const l of this.layers) {
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

  showReady(best) {
    this._only('hud');
    this.el.hud.classList.remove('dim');
    this.el.hud.classList.add('waiting');
    this.setScore(0, true);
    this.el.bestVal.textContent = best;
  }

  showHud(score, best) {
    this._only('hud');
    this.el.hud.classList.remove('dim');
    this.el.hud.classList.remove('waiting');
    this.setScore(score, true);
    this.el.bestVal.textContent = best;
  }

  showPreview() {
    this._only();
    this.el.hud.classList.remove('dim', 'waiting');
  }

  setPreviewMode(enabled) {
    this.previewMode = enabled;
    this._previewTapCount = 0;
    clearTimeout(this._previewGuideTimer);
    this.el.previewGuide.classList.remove('on');
    this.el.previewTapHand.getAnimations().forEach((animation) => animation.cancel());
    this.el.previewTapRing.getAnimations().forEach((animation) => animation.cancel());
  }

  showGameOver(score, best, isBest) {
    this._only('hud', 'over');
    this.el.hud.classList.remove('waiting');
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

  previewTap() {
    if (!this.previewMode) return;
    this._previewTapCount++;
    clearTimeout(this._previewGuideTimer);
    this.el.previewGuide.classList.add('on');

    this.el.previewTapHand.getAnimations().forEach((animation) => animation.cancel());
    this.el.previewTapRing.getAnimations().forEach((animation) => animation.cancel());

    if (!this._reduced) {
      this.el.previewTapHand.animate(
        [
          { transform: 'translate(-38%, 0) scale(1)' },
          { transform: 'translate(-38%, 0) scale(0.93)', offset: 0.38 },
          { transform: 'translate(-38%, 0) scale(1)' },
        ],
        { duration: 260, easing: 'cubic-bezier(0.22,1,0.36,1)' },
      );
      this.el.previewTapRing.animate(
        [
          { opacity: 0.95, transform: 'translate(-50%, -50%) scale(0.35)' },
          { opacity: 0.5, offset: 0.45 },
          { opacity: 0, transform: 'translate(-50%, -50%) scale(1.55)' },
        ],
        { duration: 430, easing: 'ease-out' },
      );
    }

    this._previewGuideTimer = setTimeout(() => {
      this.el.previewGuide.classList.remove('on');
    }, 440);
  }

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
