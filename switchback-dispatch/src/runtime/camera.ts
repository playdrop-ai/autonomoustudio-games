import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import {
  AO_BLEND_INTENSITY,
  AO_RESOLUTION_SCALE,
  BLOOM_RADIUS,
  BLOOM_STRENGTH,
  BLOOM_THRESHOLD,
  CAMERA_LERP_SPEED,
  CAMERA_ZOOM_FAR_DISTANCE,
  CAMERA_ZOOM_LERP_SPEED,
  CAMERA_ZOOM_NEAR_DISTANCE,
  DRIVE_SPEED_FACTOR,
  MAP_CAMERA_HEIGHT,
  MAP_CAMERA_MARGIN,
  START_SPHERE_POSITION,
  TRACK_Y,
} from './constants';
import type { CameraMode, CameraPose, PostProcessingStack } from './shared';
import type { TrackWorldBounds } from './track';
import { clamp, lerp, remap } from './utils';

const CAMERA_DIRECTION_LERP_SPEED = 6;
const CAMERA_HEIGHT = 10.5;
const CAMERA_LOOK_AHEAD = 4.2;
const CAMERA_SIDE_OFFSET = -2.2;

export function getCameraModeFromLocation(search: string): CameraMode {
  const camera = new URLSearchParams(search).get('camera');
  return camera === 'topdown' || camera === 'map' ? 'topdown' : 'follow';
}

export function createPostProcessingStack(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
): PostProcessingStack {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const aoPass = new GTAOPass(
    scene,
    camera,
    Math.max(1, Math.floor(width * AO_RESOLUTION_SCALE)),
    Math.max(1, Math.floor(height * AO_RESOLUTION_SCALE)),
  );
  aoPass.output = GTAOPass.OUTPUT.Default;
  aoPass.blendIntensity = AO_BLEND_INTENSITY;
  aoPass.updateGtaoMaterial({
    radius: 0.35,
    distanceExponent: 1.75,
    thickness: 1.3,
    distanceFallOff: 1,
    scale: 1,
    samples: 8,
    screenSpaceRadius: true,
  });
  aoPass.updatePdMaterial({
    lumaPhi: 10,
    depthPhi: 2,
    normalPhi: 3,
    radius: 8,
    radiusExponent: 2,
    rings: 2,
    samples: 16,
  });
  composer.addPass(aoPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    BLOOM_STRENGTH,
    BLOOM_RADIUS,
    BLOOM_THRESHOLD,
  );
  composer.addPass(bloomPass);

  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  const resize = (nextWidth: number, nextHeight: number) => {
    composer.setSize(nextWidth, nextHeight);
    aoPass.setSize(
      Math.max(1, Math.floor(nextWidth * AO_RESOLUTION_SCALE)),
      Math.max(1, Math.floor(nextHeight * AO_RESOLUTION_SCALE)),
    );
    bloomPass.setSize(nextWidth, nextHeight);
  };

  resize(width, height);

  return {
    composer,
    renderPass,
    aoPass,
    bloomPass,
    outputPass,
    resize,
    render() {
      composer.render();
    },
    dispose() {
      composer.dispose();
      aoPass.dispose();
      bloomPass.dispose();
      outputPass.dispose();
    },
  };
}

export class CameraController {
  readonly followCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  readonly mapCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

  private readonly cameraFocus = START_SPHERE_POSITION.clone();
  private readonly mode: CameraMode;
  private readonly worldBounds: TrackWorldBounds;
  private readonly aimDirection = new THREE.Vector3(0, 0, -1);
  private readonly sideDirection = new THREE.Vector3(1, 0, 0);
  private readonly desiredCameraPosition = new THREE.Vector3();
  private readonly desiredFocus = new THREE.Vector3();
  private readonly desiredLookAt = new THREE.Vector3();
  private followDistance = CAMERA_ZOOM_NEAR_DISTANCE;

  constructor(search: string, worldBounds: TrackWorldBounds) {
    this.mode = getCameraModeFromLocation(search);
    this.worldBounds = worldBounds;
  }

  get cameraMode() {
    return this.mode;
  }

  getActiveCamera() {
    return this.mode === 'topdown' ? this.mapCamera : this.followCamera;
  }

  getPose(): CameraPose {
    const forward = new THREE.Vector3();
    this.getActiveCamera().getWorldDirection(forward);
    return {
      focus: this.cameraFocus.clone(),
      position: this.getActiveCamera().position.clone(),
      forward,
    };
  }

  resetFocus(position: THREE.Vector3) {
    this.cameraFocus.copy(position);
    this.followDistance = CAMERA_ZOOM_NEAR_DISTANCE;
  }

  update(vehiclePosition: THREE.Vector3, linearSpeed: number, dt: number, aimTarget: THREE.Vector3 = vehiclePosition) {
    this.desiredFocus.copy(aimTarget).sub(vehiclePosition).setY(0);
    if (this.desiredFocus.lengthSq() > 0.01) {
      this.desiredFocus.normalize();
      this.aimDirection.lerp(this.desiredFocus, dt * CAMERA_DIRECTION_LERP_SPEED).normalize();
    }

    const speedFactor = clamp(Math.abs(linearSpeed) / DRIVE_SPEED_FACTOR, 0, 1);
    const targetDistance = remap(
      speedFactor,
      0,
      1,
      CAMERA_ZOOM_NEAR_DISTANCE,
      CAMERA_ZOOM_FAR_DISTANCE,
    );
    this.followDistance = lerp(
      this.followDistance,
      targetDistance,
      dt * CAMERA_ZOOM_LERP_SPEED,
    );

    this.cameraFocus.lerp(vehiclePosition, dt * CAMERA_LERP_SPEED);
    this.sideDirection.set(-this.aimDirection.z, 0, this.aimDirection.x).normalize();

    this.desiredCameraPosition
      .copy(this.cameraFocus)
      .addScaledVector(this.aimDirection, -this.followDistance)
      .addScaledVector(this.sideDirection, CAMERA_SIDE_OFFSET);
    this.desiredCameraPosition.y = this.cameraFocus.y + CAMERA_HEIGHT;

    this.followCamera.position.lerp(this.desiredCameraPosition, dt * CAMERA_LERP_SPEED);
    this.desiredLookAt.copy(this.cameraFocus).addScaledVector(this.aimDirection, CAMERA_LOOK_AHEAD);
    this.followCamera.lookAt(this.desiredLookAt.x, TRACK_Y + 0.4, this.desiredLookAt.z);
    this.followCamera.updateMatrixWorld();
  }

  updateProjection(width: number, height: number) {
    const aspect = width / Math.max(height, 1);
    this.followCamera.aspect = aspect;
    this.followCamera.updateProjectionMatrix();

    const paddedWidth = this.worldBounds.width + MAP_CAMERA_MARGIN * 2;
    const paddedHeight = this.worldBounds.height + MAP_CAMERA_MARGIN * 2;
    const requiredHeight = Math.max(paddedHeight, paddedWidth / Math.max(aspect, 0.001));
    const halfHeight = requiredHeight / 2;
    const halfWidth = halfHeight * aspect;
    this.mapCamera.left = -halfWidth;
    this.mapCamera.right = halfWidth;
    this.mapCamera.top = halfHeight;
    this.mapCamera.bottom = -halfHeight;
    this.mapCamera.updateProjectionMatrix();
    this.updateMapCamera();
  }

  updateMapCamera() {
    this.mapCamera.position.set(this.worldBounds.centerX, MAP_CAMERA_HEIGHT, this.worldBounds.centerZ);
    this.mapCamera.up.set(0, 0, -1);
    this.mapCamera.lookAt(this.worldBounds.centerX, TRACK_Y, this.worldBounds.centerZ);
    this.mapCamera.updateMatrixWorld();
  }
}
