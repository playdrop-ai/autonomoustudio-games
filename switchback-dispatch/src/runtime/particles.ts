import * as THREE from 'three';

import { FIXED_DT } from './constants';
import type { SmokeParticle } from './shared';
import { lerp } from './utils';

export class SmokeSystem {
  readonly group = new THREE.Group();
  readonly particles: SmokeParticle[];

  private readonly defaultOffsets = [
    new THREE.Vector3(0.25, 0.05, -0.35),
    new THREE.Vector3(-0.25, 0.05, -0.35),
  ];
  private readonly spawnPoint = new THREE.Vector3();
  private readonly drift = new THREE.Vector3();
  private readonly worldPosition = new THREE.Vector3();
  private readonly offsetDirection = new THREE.Vector3();
  private readonly vehicleForward = new THREE.Vector3();
  private readonly randomOffset = new THREE.Vector3();
  private spawnAccumulator = 0;

  constructor(texture: THREE.Texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.premultiplyAlpha = true;
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    this.particles = Array.from({ length: 48 }, () => {
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        premultipliedAlpha: true,
        color: 0xffffff,
        toneMapped: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      sprite.scale.setScalar(0.24);
      this.group.add(sprite);
      return {
        sprite,
        age: 0,
        life: 0.5,
        active: false,
        velocity: new THREE.Vector3(),
        baseScale: 0.3,
      };
    });
  }

  spawn(vehicleRoot: THREE.Object3D, speed: number, offsets: readonly THREE.Vector3[] = this.defaultOffsets) {
    this.spawnAccumulator += FIXED_DT;
    if (this.spawnAccumulator < 1 / 40) {
      return;
    }
    this.spawnAccumulator = 0;

    for (const offset of offsets) {
      this.emitFromOffset(vehicleRoot, offset, speed);
    }
  }

  update(dt: number) {
    for (const particle of this.particles) {
      if (!particle.active) {
        continue;
      }

      particle.age += dt;
      if (particle.age >= particle.life) {
        particle.active = false;
        particle.sprite.visible = false;
        continue;
      }

      const t = particle.age / particle.life;
      const alpha = t < 0.5 ? t * 2 : (1 - t) * 2;
      const scaleCurve = t < 0.5 ? lerp(0.5, 1, t * 2) : lerp(1, 0.2, (t - 0.5) * 2);
      particle.sprite.position.addScaledVector(particle.velocity, dt);
      particle.sprite.material.opacity = alpha * 0.16;
      particle.sprite.scale.setScalar(particle.baseScale * (0.75 + scaleCurve * 0.6));
    }
  }

  private emitFromOffset(vehicleRoot: THREE.Object3D, offset: THREE.Vector3, speed: number) {
    const particle = this.particles.find((entry) => !entry.active);
    if (!particle) {
      return;
    }

    vehicleRoot.updateWorldMatrix(true, false);
    this.spawnPoint.copy(offset);
    vehicleRoot.localToWorld(this.spawnPoint);

    particle.active = true;
    particle.age = 0;
    particle.life = 0.45 + Math.random() * 0.05;
    particle.baseScale = 0.18 + Math.random() * 0.05;
    particle.sprite.visible = true;
    particle.sprite.position.copy(this.spawnPoint);
    particle.sprite.scale.setScalar(particle.baseScale);

    this.worldPosition.setFromMatrixPosition(vehicleRoot.matrixWorld);
    this.vehicleForward.set(0, 0, 1).transformDirection(vehicleRoot.matrixWorld);
    this.drift
      .copy(this.vehicleForward)
      .multiplyScalar(-(Math.sign(speed) || 1) * (0.08 + Math.abs(speed) * 0.04))
      .addScaledVector(this.offsetDirection.subVectors(this.spawnPoint, this.worldPosition).normalize(), 0.08)
      .add(
        this.randomOffset.set(
          (Math.random() - 0.5) * 0.05,
          0.32 + Math.random() * 0.12,
          (Math.random() - 0.5) * 0.05,
        ),
      );
    particle.velocity.copy(this.drift);
  }
}
