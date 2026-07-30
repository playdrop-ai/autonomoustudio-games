/**
 * sky.js — one shader does the whole backdrop: three-stop gradient, sun disc
 * with halo, a twinkling star field and aurora curtains. All of it is driven
 * by uniforms so a biome change is just a colour lerp, never a rebuild.
 */
import { THREE } from './runtime.js';

const VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */`
  precision highp float;
  varying vec3 vDir;

  uniform vec3 uTop, uHorizon, uLow;
  uniform vec3 uSunDir, uSunColor;
  uniform float uSunGlow, uSunSize;
  uniform float uStars, uAurora, uTime;
  uniform vec3 uAuroraA, uAuroraB;

  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419));
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i), b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0)), d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }
  float fbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { s += vnoise(p) * a; p *= 2.07; a *= 0.5; }
    return s;
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;

    // --- gradient ---
    vec3 col = mix(uLow, uHorizon, smoothstep(-0.42, 0.015, h));
    col = mix(col, uTop, pow(smoothstep(0.0, 0.92, h), 0.72));

    // --- sun / moon ---
    vec3 sd = normalize(uSunDir);
    float d = max(dot(dir, sd), 0.0);
    float disc = smoothstep(1.0 - uSunSize * 0.055, 1.0 - uSunSize * 0.018, d);
    float halo = pow(d, 90.0) * 0.55 + pow(d, 14.0) * 0.085 + pow(d, 4.0) * 0.022;
    col += uSunColor * (disc * 1.35 + halo * uSunGlow);

    // --- stars ---
    if (uStars > 0.002) {
      vec3 sp = dir * 130.0;
      vec3 cell = floor(sp);
      vec3 f = fract(sp);
      float r = hash31(cell);
      if (r > 0.968) {
        vec3 c = vec3(hash31(cell + 1.7), hash31(cell + 3.3), hash31(cell + 5.9));
        float dd = length(f - c);
        float s = smoothstep(0.30, 0.0, dd);
        float tw = 0.5 + 0.5 * sin(uTime * 2.4 + r * 90.0);
        float tint = hash31(cell + 9.1);
        vec3 sc = mix(vec3(0.78, 0.86, 1.0), vec3(1.0, 0.92, 0.8), tint);
        col += sc * s * s * (0.35 + tw * 0.9) * uStars * smoothstep(-0.03, 0.22, h) * 2.0;
      }
    }

    // --- aurora ---
    if (uAurora > 0.002) {
      float ang = atan(dir.x, -dir.z);
      float band = smoothstep(0.03, 0.26, h) * smoothstep(0.95, 0.34, h);
      float n = fbm(vec2(ang * 2.2 + uTime * 0.025, h * 2.6 - uTime * 0.04));
      float n2 = fbm(vec2(ang * 5.5 - uTime * 0.05, h * 5.0));
      float ribbon = smoothstep(0.42, 0.86, n) * (0.55 + 0.45 * n2);
      float striations = 0.65 + 0.35 * sin(ang * 90.0 + n * 14.0);
      col += mix(uAuroraA, uAuroraB, n2) * ribbon * band * striations * uAurora * 1.55;
    }

    // dither: kills banding on the big smooth gradient
    col += (hash21(gl_FragCoord.xy) - 0.5) * 0.006;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export class Sky {
  constructor() {
    this.uniforms = {
      uTop: { value: new THREE.Color(0x2f6fb8) },
      uHorizon: { value: new THREE.Color(0xffc48a) },
      uLow: { value: new THREE.Color(0xe79f68) },
      uSunDir: { value: new THREE.Vector3(0.42, 0.2, -0.88) },
      uSunColor: { value: new THREE.Color(0xffe0b0) },
      uSunGlow: { value: 1.0 },
      uSunSize: { value: 0.06 },
      uStars: { value: 0.0 },
      uAurora: { value: 0.0 },
      uTime: { value: 0.0 },
      uAuroraA: { value: new THREE.Color(0x4dffc3) },
      uAuroraB: { value: new THREE.Color(0x9a6bff) },
    };

    const geo = new THREE.SphereGeometry(1, 40, 24);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: true,
      fog: false,
      toneMapped: false,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.scale.setScalar(400);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 900;
    this.mesh.matrixAutoUpdate = false;
  }

  update(dt, camera) {
    this.uniforms.uTime.value += dt;
    this.mesh.position.copy(camera.position);
    this.mesh.updateMatrix();
  }
}
