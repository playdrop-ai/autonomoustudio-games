/**
 * postfx.js — a deliberately small post stack: bright-pass + two blurred mips
 * for bloom, then a single composite pass that does tone mapping, vignette,
 * chromatic aberration, hit flash and grain in one draw.
 *
 * Total cost on top of the scene: 1 MSAA resolve + 5 tiny draws + 1 fullscreen.
 */
import { THREE } from './runtime.js';
import { clamp, damp } from './util.js';

const QUAD_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const BRIGHT_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  uniform vec2 uTexel;
  uniform float uThreshold, uKnee;

  void main() {
    vec3 s = texture2D(tDiffuse, vUv + uTexel * vec2(-1.0, -1.0)).rgb;
    s += texture2D(tDiffuse, vUv + uTexel * vec2(1.0, -1.0)).rgb;
    s += texture2D(tDiffuse, vUv + uTexel * vec2(-1.0, 1.0)).rgb;
    s += texture2D(tDiffuse, vUv + uTexel * vec2(1.0, 1.0)).rgb;
    s *= 0.25;
    float l = dot(s, vec3(0.2126, 0.7152, 0.0722));
    float c = smoothstep(uThreshold, uThreshold + uKnee, l);
    gl_FragColor = vec4(min(s, vec3(12.0)) * c, 1.0);
  }
`;

const BLUR_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  uniform vec2 uDir;

  void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb * 0.227027;
    c += texture2D(tDiffuse, vUv + uDir * 1.3846).rgb * 0.316216;
    c += texture2D(tDiffuse, vUv - uDir * 1.3846).rgb * 0.316216;
    c += texture2D(tDiffuse, vUv + uDir * 3.2308).rgb * 0.070270;
    c += texture2D(tDiffuse, vUv - uDir * 3.2308).rgb * 0.070270;
    gl_FragColor = vec4(c, 1.0);
  }
`;

const COMPOSITE_FRAG = /* glsl */`
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D tScene, tBloomA, tBloomB;
  uniform float uBloom, uVignette, uAberr, uFlash, uGrain, uTime, uExposure, uDesat;
  uniform float uSat, uContrast;
  uniform vec3 uFlashColor;

  vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
  }
  vec3 lin2srgb(vec3 c) {
    return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(0.4166667)) - 0.055, step(0.0031308, c));
  }
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 cc = vUv - 0.5;
    float r2 = dot(cc, cc);

    vec3 base = texture2D(tScene, vUv).rgb;
    if (uAberr > 0.00002) {
      // only pay for the extra two taps while the camera is actually shaking
      float ab = uAberr * (0.18 + r2 * 2.2);
      base.r = texture2D(tScene, vUv + cc * ab).r;
      base.b = texture2D(tScene, vUv - cc * ab).b;
    }

    vec3 bloom = texture2D(tBloomA, vUv).rgb * 0.74 + texture2D(tBloomB, vUv).rgb * 0.26;
    vec3 col = base + bloom * uBloom;

    col *= uExposure;
    col += uFlashColor * uFlash;

    // saturate in linear space, then filmic tone map, then a gentle S-curve
    float l0 = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = max(mix(vec3(l0), col, uSat), vec3(0.0));

    col = aces(col);
    col = mix(col, col * col * (3.0 - 2.0 * col), uContrast);

    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = mix(col, vec3(lum), uDesat);

    col *= 1.0 - uVignette * smoothstep(0.16, 0.92, r2);
    col = lin2srgb(col);
    col += (hash21(vUv * 1024.0 + fract(uTime) * 37.0) - 0.5) * uGrain;

    gl_FragColor = vec4(col, 1.0);
  }
`;

class Quad {
  constructor(frag, uniforms) {
    this.material = new THREE.ShaderMaterial({
      uniforms, vertexShader: QUAD_VERT, fragmentShader: frag,
      depthTest: false, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.mesh.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(this.mesh);
  }
}

export class PostFX {
  constructor(renderer) {
    this.renderer = renderer;
    this.enabled = true;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const rtOpts = {
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    };
    this.sceneRT = new THREE.WebGLRenderTarget(2, 2, rtOpts);
    this.sceneRT.samples = 2;

    const mipOpts = { type: THREE.HalfFloatType, depthBuffer: false, stencilBuffer: false };
    this.rtA1 = new THREE.WebGLRenderTarget(2, 2, mipOpts);
    this.rtA2 = new THREE.WebGLRenderTarget(2, 2, mipOpts);
    this.rtB1 = new THREE.WebGLRenderTarget(2, 2, mipOpts);
    this.rtB2 = new THREE.WebGLRenderTarget(2, 2, mipOpts);

    this.bright = new Quad(BRIGHT_FRAG, {
      tDiffuse: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uThreshold: { value: 1.28 },
      uKnee: { value: 0.62 },
    });
    this.blur = new Quad(BLUR_FRAG, {
      tDiffuse: { value: null },
      uDir: { value: new THREE.Vector2() },
    });
    this.comp = new Quad(COMPOSITE_FRAG, {
      tScene: { value: this.sceneRT.texture },
      tBloomA: { value: this.rtA2.texture },
      tBloomB: { value: this.rtB2.texture },
      uBloom: { value: 0.24 },
      uVignette: { value: 0.34 },
      uAberr: { value: 0.0 },
      uFlash: { value: 0.0 },
      uFlashColor: { value: new THREE.Color(1, 1, 1) },
      uGrain: { value: 0.018 },
      uTime: { value: 0 },
      uExposure: { value: 0.98 },
      uDesat: { value: 0.0 },
      uSat: { value: 1.06 },
      uContrast: { value: 0.15 },
    });

    this.flash = 0;
    this.flashTarget = 0;
    this.aberr = 0;
    this.desat = 0;
    this.exposure = 0.98;
  }

  setQuality(q) {
    this.enabled = !!q.bloom;
    this.sceneRT.samples = q.bloom ? 2 : 0;
    this.comp.material.uniforms.uGrain.value = q.grain ? 0.013 : 0.0;
    this._aberrAllowed = !!q.aberration;
    if (this.enabled) {
      this.renderer.toneMapping = THREE.NoToneMapping;
    } else {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
    }
  }

  setSize(w, h) {
    this._w = w; this._h = h;
    this.sceneRT.setSize(w, h);
    const w4 = Math.max(2, Math.floor(w / 4)), h4 = Math.max(2, Math.floor(h / 4));
    const w8 = Math.max(2, Math.floor(w / 8)), h8 = Math.max(2, Math.floor(h / 8));
    this.rtA1.setSize(w4, h4); this.rtA2.setSize(w4, h4);
    this.rtB1.setSize(w8, h8); this.rtB2.setSize(w8, h8);
    this.bright.material.uniforms.uTexel.value.set(1 / w, 1 / h);
  }

  /** Punchy screen flash. `color` is a THREE.Color-compatible hex. */
  hit(strength, color) {
    this.flash = Math.max(this.flash, strength);
    if (color !== undefined) this.comp.material.uniforms.uFlashColor.value.set(color);
  }

  setTrauma(t) {
    this.aberr = t;
  }

  render(scene, camera, dt) {
    const r = this.renderer;
    const u = this.comp.material.uniforms;

    this.flash = damp(this.flash, 0, 7.5, dt);
    u.uFlash.value = this.flash;
    u.uTime.value += dt;
    u.uAberr.value = this._aberrAllowed ? clamp(this.aberr, 0, 1) * 0.0034 : 0;
    u.uDesat.value = this.desat;
    u.uExposure.value = this.exposure;

    if (!this.enabled) {
      r.setRenderTarget(null);
      r.render(scene, camera);
      return;
    }

    r.setRenderTarget(this.sceneRT);
    r.clear();
    r.render(scene, camera);

    // bright pass -> quarter res
    this.bright.material.uniforms.tDiffuse.value = this.sceneRT.texture;
    this._draw(this.bright, this.rtA1);

    // tight bloom at quarter res: two separable gaussian iterations
    const iw = 1 / this.rtA1.width, ih = 1 / this.rtA1.height;
    this._blurPass(this.rtA1, this.rtA2, iw, 0);
    this._blurPass(this.rtA2, this.rtA1, 0, ih);
    this._blurPass(this.rtA1, this.rtA2, iw * 1.7, 0);
    this._blurPass(this.rtA2, this.rtA1, 0, ih * 1.7);

    // wide, soft halo at eighth res
    const jw = 1 / this.rtB1.width, jh = 1 / this.rtB1.height;
    this._blurPass(this.rtA1, this.rtB1, jw * 1.2, 0);
    this._blurPass(this.rtB1, this.rtB2, 0, jh * 1.2);
    this._blurPass(this.rtB2, this.rtB1, jw * 2.6, 0);
    this._blurPass(this.rtB1, this.rtB2, 0, jh * 2.6);

    u.tBloomA.value = this.rtA1.texture;
    u.tBloomB.value = this.rtB2.texture;

    r.setRenderTarget(null);
    this._draw(this.comp, null);
  }

  _blurPass(from, to, dx, dy) {
    this.blur.material.uniforms.tDiffuse.value = from.texture;
    this.blur.material.uniforms.uDir.value.set(dx, dy);
    this._draw(this.blur, to);
  }

  _draw(quad, target) {
    const r = this.renderer;
    r.setRenderTarget(target);
    if (target) r.clear();
    r.render(quad.scene, this.camera);
  }
}
