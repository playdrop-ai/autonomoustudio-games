/**
 * audio.js — the entire soundtrack is synthesised at runtime with the
 * Web Audio API: no asset downloads, no loading time, tiny footprint.
 *
 * Signal flow:
 *   sfx voices ─┐
 *   pad/wind ───┼─> busGain ─> compressor ─> destination
 *   reverb send ┘
 */

const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21]; // major pentatonic ladder
const ROOT = 233.08; // Bb3 — warm, sits nicely under the pad

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      resolve(value.includes(',') ? value.split(',')[1] : value);
    };
    reader.onerror = () => reject(new Error('[flighty-saucer] listing audio export failed'));
    reader.readAsDataURL(blob);
  });
}

export class Audio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.userEnabled = true;
    this.hostEnabled = false;
    this.ready = false;
    this.master = null;
    this.padVoices = [];
    this._speed = 0;
    this._duck = 1;
    this.captureDestination = null;
    this.listingAudioRecorder = null;
    this.listingAudioStopPromise = null;
  }

  /** Must be called from a user gesture. Safe to call repeatedly. */
  unlock() {
    if (this.ready) {
      // iOS parks the context in 'interrupted' after a call, Siri or the ringer
      // switch -- not 'suspended' -- and it stays there until something resumes it.
      if (this.ctx.state !== 'running') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { this.ctx = new AC({ latencyHint: 'interactive' }); } catch (_) { return; }
    const ctx = this.ctx;

    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -14;
    this.comp.knee.value = 22;
    this.comp.ratio.value = 6;
    this.comp.attack.value = 0.004;
    this.comp.release.value = 0.22;
    this.comp.connect(ctx.destination);
    this.captureDestination = ctx.createMediaStreamDestination();
    this.comp.connect(this.captureDestination);

    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.9 : 0.0;
    this.master.connect(this.comp);

    // --- reverb (generated impulse response) ---
    this.verb = ctx.createConvolver();
    this.verb.buffer = this._makeIR(1.5, 2.6);
    this.verbGain = ctx.createGain();
    this.verbGain.gain.value = 0.5;
    this.verb.connect(this.verbGain);
    this.verbGain.connect(this.master);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 1.0;
    this.sfxBus.connect(this.master);

    this.ambBus = ctx.createGain();
    this.ambBus.gain.value = 0.0;
    this.ambBus.connect(this.master);

    this.noiseBuf = this._makeNoise(2.0, 0.72);

    this._buildWind();
    this._buildPad();

    this.ready = true;
    if (ctx.state !== 'running') ctx.resume();
    // and resume again whenever the page comes back, since the interruption can
    // arrive while we are backgrounded and no tap follows it
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.ctx && this.ctx.state !== 'running') this.ctx.resume();
    });
  }

  async startListingCapture() {
    if (this.listingAudioRecorder || this.listingAudioStopPromise) {
      throw new Error('[flighty-saucer] listing audio capture is already running');
    }
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('[flighty-saucer] MediaRecorder is unavailable for listing audio capture');
    }
    if (!MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
      throw new Error('[flighty-saucer] audio/webm;codecs=opus is unavailable for listing audio capture');
    }

    this.unlock();
    if (!this.ctx || !this.captureDestination) {
      throw new Error('[flighty-saucer] listing audio capture requires an unlocked audio context');
    }
    await this.ctx.resume();

    const stream = this.captureDestination.stream.clone();
    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    const chunks = [];
    this.listingAudioStopPromise = new Promise((resolve, reject) => {
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      recorder.addEventListener('error', () => {
        reject(new Error('[flighty-saucer] listing audio recorder failed'));
      });
      recorder.addEventListener('stop', () => {
        const mimeType = recorder.mimeType || 'audio/webm;codecs=opus';
        const blob = new Blob(chunks, { type: mimeType });
        void blobToBase64(blob)
          .then((base64) => resolve({ mimeType, base64 }))
          .catch(reject)
          .finally(() => stream.getTracks().forEach((track) => track.stop()));
      });
    });
    recorder.start(100);
    this.listingAudioRecorder = recorder;
  }

  async stopListingCapture() {
    const recorder = this.listingAudioRecorder;
    const stopPromise = this.listingAudioStopPromise;
    if (!recorder || !stopPromise) {
      throw new Error('[flighty-saucer] listing audio capture is not running');
    }
    this.listingAudioRecorder = null;
    this.listingAudioStopPromise = null;
    recorder.requestData();
    await new Promise((resolve) => setTimeout(resolve, 500));
    recorder.requestData();
    await new Promise((resolve) => setTimeout(resolve, 100));
    recorder.stop();
    return stopPromise;
  }

  setEnabled(on) {
    this.userEnabled = !!on;
    this._syncEnabled();
  }

  setHostEnabled(on) {
    this.hostEnabled = !!on;
    this._syncEnabled();
  }

  _syncEnabled() {
    this.enabled = this.userEnabled && this.hostEnabled;
    if (this.ready) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(this.enabled ? 0.9 : 0.0, this.ctx.currentTime, 0.08);
    }
  }

  /* ---------------------------------------------------------------- *
   * buffer builders
   * ---------------------------------------------------------------- */
  _makeNoise(seconds, tilt) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = last * tilt + w * (1 - tilt); // brown-ish
      d[i] = last * 3.0;
    }
    return buf;
  }

  _makeIR(seconds, decay) {
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // sparse early reflections + smooth tail reads as a small hall
        const spark = i % 1861 < 3 ? 2.2 : 1.0;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * spark * 0.6;
      }
    }
    return buf;
  }

  /* ---------------------------------------------------------------- *
   * continuous layers
   * ---------------------------------------------------------------- */
  _buildWind() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 480;
    bp.Q.value = 0.7;

    const g = ctx.createGain();
    g.gain.value = 0.0;

    // slow breathing of the wind
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.09;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 220;
    lfo.connect(lfoG); lfoG.connect(bp.frequency);

    src.connect(bp); bp.connect(g); g.connect(this.ambBus);
    src.start(); lfo.start();
    this.wind = { g, bp };
  }

  _buildPad() {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 0.6;

    const g = ctx.createGain();
    g.gain.value = 0.0;
    lp.connect(g);
    g.connect(this.ambBus);

    const send = ctx.createGain();
    send.gain.value = 0.55;
    g.connect(send); send.connect(this.verb);

    // slow filter movement keeps the pad from sounding static
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.055;
    const lfoG = ctx.createGain();
    lfoG.gain.value = 320;
    lfo.connect(lfoG); lfoG.connect(lp.frequency);
    lfo.start();

    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      osc.type = i === 0 ? 'triangle' : 'sawtooth';
      osc.frequency.value = ROOT;
      const og = ctx.createGain();
      og.gain.value = i === 0 ? 0.26 : 0.075;
      const det = ctx.createOscillator();
      det.frequency.value = 0.13 + i * 0.07;
      const detG = ctx.createGain();
      detG.gain.value = 1.6;
      det.connect(detG); detG.connect(osc.frequency);
      det.start();
      osc.connect(og); og.connect(lp);
      osc.start();
      this.padVoices.push(osc);
    }
    this.pad = { g, lp };
  }

  /** Called every frame with normalised flight speed + biome intensity. */
  setAmbience(intensity, speed01, chord, padLevel) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this.ambBus.gain.setTargetAtTime(intensity * this._duck, t, 0.25);
    this.wind.g.gain.setTargetAtTime(0.10 + speed01 * 0.30, t, 0.4);
    this.wind.bp.frequency.setTargetAtTime(360 + speed01 * 620, t, 0.5);
    this.pad.g.gain.setTargetAtTime(0.09 * (padLevel ?? 0.6), t, 1.2);
    if (chord) {
      for (let i = 0; i < this.padVoices.length; i++) {
        const semi = chord[i % chord.length] - (i >= chord.length ? 12 : 0);
        const f = ROOT * Math.pow(2, semi / 12) * (i === 0 ? 0.5 : 1);
        this.padVoices[i].frequency.setTargetAtTime(f, t, 1.6);
      }
    }
  }

  duck(amount, seconds = 0.6) {
    if (!this.ready) return;
    this._duck = amount;
    setTimeout(() => { this._duck = 1; }, seconds * 1000);
  }

  /* ---------------------------------------------------------------- *
   * one-shots
   * ---------------------------------------------------------------- */
  _noiseVoice(dur, type, f0, f1, q, gain, sendVerb = 0) {
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = ctx.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.012, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.sfxBus);
    if (sendVerb > 0) {
      const s = ctx.createGain(); s.gain.value = sendVerb;
      g.connect(s); s.connect(this.verb);
    }
    src.start(t); src.stop(t + dur + 0.05);
  }

  _tone(freq, dur, type, gain, glideTo = 0, sendVerb = 0, delay = 0) {
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, glideTo), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxBus);
    if (sendVerb > 0) {
      const s = ctx.createGain(); s.gain.value = sendVerb;
      g.connect(s); s.connect(this.verb);
    }
    o.start(t); o.stop(t + dur + 0.05);
  }

  /** FM-ish bell used for scoring. */
  _bell(freq, dur, gain, delay = 0, verb = 0.4) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime + delay;
    const car = ctx.createOscillator(); car.type = 'sine'; car.frequency.value = freq;
    const mod = ctx.createOscillator(); mod.type = 'sine'; mod.frequency.value = freq * 2.01;
    const modG = ctx.createGain(); modG.gain.setValueAtTime(freq * 1.6, t);
    modG.gain.exponentialRampToValueAtTime(freq * 0.05, t + dur * 0.5);
    mod.connect(modG); modG.connect(car.frequency);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    car.connect(g); g.connect(this.sfxBus);
    const s = ctx.createGain(); s.gain.value = verb;
    g.connect(s); s.connect(this.verb);

    car.start(t); mod.start(t);
    car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
  }

  flap(power = 1) {
    if (!this.ready) return;
    this._noiseVoice(0.17, 'bandpass', 1500 * (0.85 + Math.random() * 0.3), 380, 1.1, 0.26 * power);
    this._tone(190 * (0.94 + Math.random() * 0.12), 0.13, 'sine', 0.16 * power, 96);
  }

  score(n) {
    if (!this.ready) return;
    const step = SCALE[(n - 1) % SCALE.length];
    const oct = Math.floor(((n - 1) % 20) / 10);
    const f = ROOT * 2 * Math.pow(2, (step + oct * 12) / 12);
    this._bell(f, 0.62, 0.30);
    this._bell(f * 2, 0.22, 0.08, 0.005, 0.25);
  }

  milestone(n) {
    if (!this.ready) return;
    const base = ROOT * 2;
    [0, 4, 7, 12].forEach((s, i) => this._bell(base * Math.pow(2, s / 12), 0.85, 0.22, i * 0.055, 0.6));
    this._noiseVoice(0.5, 'highpass', 3200, 7000, 0.6, 0.07, 0.4);
  }

  nearMiss() {
    if (!this.ready) return;
    this._noiseVoice(0.15, 'bandpass', 3400, 1500, 2.2, 0.10);
  }

  crash() {
    if (!this.ready) return;
    this.duck(0.35, 1.1);
    this._noiseVoice(0.55, 'lowpass', 1400, 110, 0.8, 0.5, 0.5);
    this._tone(150, 0.42, 'square', 0.16, 42, 0.35);
    this._tone(72, 0.6, 'sine', 0.30, 34);
  }

  bonk() {
    if (!this.ready) return;
    this._tone(300, 0.11, 'sine', 0.16, 190);
    this._noiseVoice(0.09, 'bandpass', 900, 500, 1.5, 0.10);
  }

  thud() {
    if (!this.ready) return;
    this._tone(88, 0.3, 'sine', 0.22, 40);
    this._noiseVoice(0.24, 'lowpass', 700, 90, 0.7, 0.18, 0.3);
  }

  ui(kind = 'tap') {
    if (!this.ready) return;
    if (kind === 'tap') this._tone(720, 0.07, 'triangle', 0.075, 900);
    else if (kind === 'back') this._tone(430, 0.09, 'triangle', 0.07, 300);
    else this._tone(560, 0.12, 'sine', 0.08, 840);
  }

  newBest() {
    if (!this.ready) return;
    const base = ROOT * 2;
    [0, 4, 7, 12, 16, 19].forEach((s, i) =>
      this._bell(base * Math.pow(2, s / 12), 0.9, 0.2, i * 0.07, 0.7));
  }

  biomeShift() {
    if (!this.ready) return;
    this._noiseVoice(1.1, 'bandpass', 500, 4200, 0.9, 0.10, 0.6);
    this._bell(ROOT * 2, 1.4, 0.13, 0, 0.8);
  }
}

export const audio = new Audio();
