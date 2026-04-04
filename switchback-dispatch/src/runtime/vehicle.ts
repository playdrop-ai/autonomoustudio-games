import type { RigidBody as RapierRigidBody } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

import {
  DEBUG_BACKGROUND_COLOR,
  DRIVE_SPEED_FACTOR,
  DRIFT_THRESHOLD,
  REVERSE_SPEED_FACTOR,
  SPHERE_RADIUS,
  START_SPHERE_POSITION,
  TORQUE_MULTIPLIER,
  VEHICLE_MODEL_OFFSET_Y,
  VEHICLE_MODEL_SCALE,
  WORLD_UP,
} from './constants';
import { REMOTE_LABEL_HEIGHT } from './multiplayer/config';
import type { GroundState } from './physics';
import { SmokeSystem } from './particles';
import {
  PLAYER_VEHICLE_IDS,
  type ControlsSnapshot,
  type TruckVehicleId,
  type VehicleId,
  type VehicleVisual,
} from './shared';
import { clamp, lerp, lerpAngle } from './utils';
import { AudioController } from './audio';

export type VehicleAudioSink = Pick<AudioController, 'update' | 'playImpact'>;

const TRUCK_SMOKE_OFFSETS = [
  new THREE.Vector3(0.25, 0.05, -0.35),
  new THREE.Vector3(-0.25, 0.05, -0.35),
] as const;
const MOTORCYCLE_SMOKE_OFFSETS = [new THREE.Vector3(0, 0.05, -0.2)] as const;

function getRequiredObject(root: THREE.Object3D, name: string) {
  const object = root.getObjectByName(name);
  if (!object) {
    throw new Error(`[starter-kit-racing] Missing object "${name}" in vehicle model`);
  }
  return object;
}

function applyShadowFlags(root: THREE.Object3D, receiveShadow = true) {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = receiveShadow;
    }
  });
}

function cloneScene(root: THREE.Object3D, receiveShadow = true) {
  const clone = root.clone(true);
  applyShadowFlags(clone, receiveShadow);
  return clone;
}

function applyVehicleImportScale(root: THREE.Object3D) {
  root.scale.setScalar(VEHICLE_MODEL_SCALE);
  root.updateMatrixWorld(true);
}

function createBodyBouncePosition(body: THREE.Object3D) {
  return body.position.clone().add(new THREE.Vector3(0, -0.1, 0));
}

function createTruckVisual(id: TruckVehicleId, gltf: GLTF): VehicleVisual {
  const root = cloneScene(gltf.scene) as THREE.Group;
  applyVehicleImportScale(root);
  const body = getRequiredObject(root, 'body');
  return {
    id,
    root,
    engineProfile: 'truck',
    bodyRestPosition: body.position.clone(),
    bodyBouncePosition: createBodyBouncePosition(body),
    rig: {
      kind: 'truck',
      body,
      wheelFrontLeft: getRequiredObject(root, 'wheel-front-left'),
      wheelFrontRight: getRequiredObject(root, 'wheel-front-right'),
      wheelBackLeft: getRequiredObject(root, 'wheel-back-left'),
      wheelBackRight: getRequiredObject(root, 'wheel-back-right'),
      smokeOffsets: TRUCK_SMOKE_OFFSETS.map((offset) => offset.clone()),
    },
  };
}

function createMotorcycleVisual(gltf: GLTF): VehicleVisual {
  const root = cloneScene(gltf.scene) as THREE.Group;
  applyVehicleImportScale(root);
  const leanRoot = getRequiredObject(root, 'motorcycle');
  const body = getRequiredObject(root, 'body');
  return {
    id: 'motorcycle',
    root,
    engineProfile: 'motorcycle',
    bodyRestPosition: body.position.clone(),
    bodyBouncePosition: createBodyBouncePosition(body),
    rig: {
      kind: 'motorcycle',
      leanRoot,
      body,
      fork: getRequiredObject(root, 'fork'),
      wheelFront: getRequiredObject(root, 'wheel-front'),
      wheelBack: getRequiredObject(root, 'wheel-back'),
      smokeOffsets: MOTORCYCLE_SMOKE_OFFSETS.map((offset) => offset.clone()),
    },
  };
}

function createVehicleVisual(id: VehicleId, gltf: GLTF): VehicleVisual {
  switch (id) {
    case 'truck-yellow':
    case 'truck-red':
    case 'truck-green':
    case 'truck-purple':
      return createTruckVisual(id, gltf);
    case 'motorcycle':
      return createMotorcycleVisual(gltf);
  }
}

function createVehicleVisualMap(vehicles: Record<VehicleId, GLTF>) {
  return Object.fromEntries(
    PLAYER_VEHICLE_IDS.map((id) => [id, createVehicleVisual(id, vehicles[id])]),
  ) as Record<VehicleId, VehicleVisual>;
}

function resetVehicleVisualPose(visual: VehicleVisual) {
  visual.rig.body.position.copy(visual.bodyRestPosition);
  visual.rig.body.rotation.set(0, 0, 0);
  if (visual.rig.kind === 'truck') {
    visual.rig.wheelFrontLeft.rotation.set(0, 0, 0);
    visual.rig.wheelFrontRight.rotation.set(0, 0, 0);
    visual.rig.wheelBackLeft.rotation.set(0, 0, 0);
    visual.rig.wheelBackRight.rotation.set(0, 0, 0);
    return;
  }

  visual.rig.leanRoot.rotation.z = 0;
  visual.rig.fork.rotation.y = 0;
  visual.rig.wheelFront.rotation.set(0, 0, 0);
  visual.rig.wheelBack.rotation.set(0, 0, 0);
}

function updateVehicleVisualPose(
  visual: VehicleVisual,
  {
    speed,
    acceleration,
    steer,
    dt,
    wheelSpin,
  }: {
    speed: number;
    acceleration: number;
    steer: number;
    dt: number;
    wheelSpin: number;
  },
) {
  visual.rig.body.rotation.x = lerpAngle(
    visual.rig.body.rotation.x,
    -(speed - acceleration) / 6,
    dt * 10,
  );
  visual.rig.body.position.lerp(visual.bodyRestPosition, dt * 5);

  if (visual.rig.kind === 'truck') {
    visual.rig.body.rotation.z = lerpAngle(
      visual.rig.body.rotation.z,
      (-steer / 5) * speed,
      dt * 5,
    );
    const steerAngle = lerpAngle(visual.rig.wheelFrontLeft.rotation.y, -steer / 1.5, dt * 10);
    for (const wheel of [
      visual.rig.wheelFrontLeft,
      visual.rig.wheelFrontRight,
      visual.rig.wheelBackLeft,
      visual.rig.wheelBackRight,
    ]) {
      wheel.rotation.x = wheelSpin;
    }
    visual.rig.wheelFrontLeft.rotation.y = steerAngle;
    visual.rig.wheelFrontRight.rotation.y = steerAngle;
    return Math.abs(speed - acceleration) + Math.abs(visual.rig.body.rotation.z) * 2;
  }

  visual.rig.leanRoot.rotation.z = lerpAngle(
    visual.rig.leanRoot.rotation.z,
    steer * speed,
    dt * 3,
  );
  visual.rig.fork.rotation.y = lerpAngle(visual.rig.fork.rotation.y, -steer / 1.5, dt * 5);
  visual.rig.wheelFront.rotation.y = lerpAngle(visual.rig.wheelFront.rotation.y, -steer / 1.5, dt * 10);
  visual.rig.wheelFront.rotation.x = wheelSpin;
  visual.rig.wheelBack.rotation.x = wheelSpin;
  return Math.abs(speed - acceleration) + Math.abs(visual.rig.leanRoot.rotation.z) * 2;
}

export function renderVehiclePreviewImages(vehicles: Record<VehicleId, GLTF>) {
  const canvas = document.createElement('canvas');
  canvas.width = 196;
  canvas.height = 196;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(1);
  renderer.setSize(canvas.width, canvas.height, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.CineonToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.55);
  const fillLight = new THREE.HemisphereLight(0xf8fcff, 0xd3e0f4, 1.1);
  const rimLight = new THREE.DirectionalLight(0xcadfff, 0.45);
  const shadowDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.35, 48),
    new THREE.MeshBasicMaterial({ color: 0xdfe8f5, transparent: true, opacity: 0.8 }),
  );
  const previewRoot = new THREE.Group();
  const bounds = new THREE.Box3();
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  const previewImages = {} as Record<VehicleId, string>;

  keyLight.position.set(4, 6, 5);
  rimLight.position.set(-4, 2, -3);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = -0.52;
  previewRoot.rotation.y = Math.PI * 0.78;

  scene.add(fillLight, keyLight, rimLight, shadowDisc, previewRoot);

  for (const id of PLAYER_VEHICLE_IDS) {
    previewRoot.clear();

    const vehicleRoot = cloneScene(vehicles[id].scene, false);
    applyVehicleImportScale(vehicleRoot);
    vehicleRoot.updateMatrixWorld(true);
    bounds.setFromObject(vehicleRoot);
    bounds.getCenter(center);
    bounds.getSize(size);

    vehicleRoot.position.sub(center);
    vehicleRoot.position.y -= bounds.min.y + 0.08;
    previewRoot.add(vehicleRoot);

    const radius = Math.max(size.x, size.y * 1.25, size.z);
    camera.position.set(radius * 1.3, radius * 0.82 + 0.4, radius * 1.45);
    camera.lookAt(0, size.y * 0.16, 0);
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
    previewImages[id] = canvas.toDataURL('image/png');
  }

  renderer.dispose();
  renderer.forceContextLoss();
  return previewImages;
}

export class RemoteVehicleView {
  readonly container = new THREE.Group();

  private readonly vehicleVisuals: Record<VehicleId, VehicleVisual>;
  private selectedVehicleId: VehicleId = 'truck-yellow';
  private vehicleVisual: VehicleVisual;
  private wheelSpin = 0;
  private readonly labelOffset = new THREE.Vector3(0, REMOTE_LABEL_HEIGHT, 0);

  constructor(vehicles: Record<VehicleId, GLTF>) {
    this.vehicleVisuals = createVehicleVisualMap(vehicles);
    this.vehicleVisual = this.vehicleVisuals[this.selectedVehicleId];
    this.container.add(this.vehicleVisual.root);
    this.setVisible(false);
    this.resetAnimationPose();
  }

  get position() {
    return this.container.position;
  }

  get currentVehicleId() {
    return this.selectedVehicleId;
  }

  get visible() {
    return this.container.visible;
  }

  setVisible(visible: boolean) {
    this.container.visible = visible;
    this.vehicleVisual.root.visible = visible;
  }

  setVehicleId(id: VehicleId) {
    if (this.selectedVehicleId === id) {
      return;
    }

    this.container.remove(this.vehicleVisual.root);
    this.selectedVehicleId = id;
    this.vehicleVisual = this.vehicleVisuals[id];
    this.vehicleVisual.root.visible = this.container.visible;
    this.container.add(this.vehicleVisual.root);
    this.resetAnimationPose();
  }

  getLabelWorldPosition(target: THREE.Vector3) {
    return target.copy(this.container.position).add(this.labelOffset);
  }

  applyMotion(
    {
      position,
      quaternion,
      speed,
      steer,
      throttle,
    }: {
      position: THREE.Vector3;
      quaternion: THREE.Quaternion;
      speed: number;
      steer: number;
      throttle: number;
    },
    dt: number,
    snapped = false,
  ) {
    if (snapped) {
      this.resetAnimationPose();
    }

    this.container.position.copy(position);
    this.container.quaternion.copy(quaternion);
    this.setVisible(true);

    this.wheelSpin += speed;
    updateVehicleVisualPose(this.vehicleVisual, {
      speed,
      acceleration: throttle,
      steer,
      dt,
      wheelSpin: this.wheelSpin,
    });
  }

  private resetAnimationPose() {
    this.wheelSpin = 0;
    resetVehicleVisualPose(this.vehicleVisual);
  }
}

export class VehicleController {
  readonly container = new THREE.Group();
  readonly debugSphereMesh = new THREE.Mesh(
    new THREE.SphereGeometry(SPHERE_RADIUS, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.92 }),
  );

  private readonly vehicleVisuals: Record<VehicleId, VehicleVisual>;
  private readonly spherePosition = new THREE.Vector3().copy(START_SPHERE_POSITION);
  private readonly sphereVelocity = new THREE.Vector3();
  private readonly tempVector = new THREE.Vector3();
  private readonly tempVectorB = new THREE.Vector3();
  private readonly tempVectorC = new THREE.Vector3();
  private readonly tempVectorD = new THREE.Vector3();
  private readonly tempMatrix = new THREE.Matrix4();
  private readonly tempQuaternion = new THREE.Quaternion();
  private selectedVehicleId: VehicleId = 'truck-yellow';
  private vehicleVisual: VehicleVisual;
  private linearSpeed = 0;
  private angularSpeed = 0;
  private acceleration = 0;
  private driftIntensity = 0;
  private wheelSpin = 0;
  private headingYaw = 0;
  private inputX = 0;
  private inputZ = 0;
  private renderVisible = true;

  constructor(vehicles: Record<VehicleId, GLTF>) {
    this.vehicleVisuals = createVehicleVisualMap(vehicles);
    this.vehicleVisual = this.vehicleVisuals[this.selectedVehicleId];
    this.container.add(this.vehicleVisual.root);
    this.debugSphereMesh.renderOrder = 4;
  }

  get position() {
    return this.container.position;
  }

  get debugBackgroundColor() {
    return DEBUG_BACKGROUND_COLOR;
  }

  get currentVehicleId() {
    return this.selectedVehicleId;
  }

  get orientation() {
    return this.container.quaternion;
  }

  get currentInputZ() {
    return this.inputZ;
  }

  get currentDriftIntensity() {
    return this.driftIntensity;
  }

  get telemetry() {
    return {
      spherePosition: this.spherePosition,
      sphereVelocity: this.sphereVelocity,
      headingYaw: this.headingYaw,
      linearSpeed: this.linearSpeed,
      acceleration: this.acceleration,
      inputX: this.inputX,
      inputZ: this.inputZ,
      driftIntensity: this.driftIntensity,
    };
  }

  setVehicleId(id: VehicleId) {
    if (this.selectedVehicleId === id) {
      return false;
    }

    this.container.remove(this.vehicleVisual.root);
    this.selectedVehicleId = id;
    this.vehicleVisual = this.vehicleVisuals[id];
    this.vehicleVisual.root.visible = this.renderVisible;
    this.container.add(this.vehicleVisual.root);
    this.resetState();
    return true;
  }

  setRenderVisible(visible: boolean) {
    this.renderVisible = visible;
    this.vehicleVisual.root.visible = visible;
  }

  resetState() {
    this.headingYaw = 0;
    this.linearSpeed = 0;
    this.angularSpeed = 0;
    this.acceleration = 0;
    this.driftIntensity = 0;
    this.wheelSpin = 0;
    this.inputX = 0;
    this.inputZ = 0;
    this.spherePosition.copy(START_SPHERE_POSITION);
    this.sphereVelocity.set(0, 0, 0);
    this.container.position.copy(this.spherePosition);
    this.container.position.y -= VEHICLE_MODEL_OFFSET_Y;
    this.container.quaternion.identity();
    resetVehicleVisualPose(this.vehicleVisual);
    this.debugSphereMesh.position.copy(START_SPHERE_POSITION);
  }

  setPose(position: THREE.Vector3, yaw: number, velocity = new THREE.Vector3()) {
    this.headingYaw = yaw;
    this.spherePosition.copy(position);
    this.sphereVelocity.copy(velocity);
    this.container.position.copy(position);
    this.container.position.y -= VEHICLE_MODEL_OFFSET_Y;
    this.container.quaternion.setFromAxisAngle(WORLD_UP, yaw);
    this.debugSphereMesh.position.copy(position);
  }

  applyControls(body: RapierRigidBody, controls: ControlsSnapshot, groundState: GroundState, dt: number) {
    if (groundState.isGrounded) {
      this.inputX = controls.x;
      this.inputZ = controls.z;
    }

    const angularVelocity = body.angvel();
    const torqueAxis = this.tempVector.set(1, 0, 0).applyQuaternion(this.container.quaternion).normalize();
    body.setAngvel(
      {
        x: angularVelocity.x + torqueAxis.x * (this.linearSpeed * TORQUE_MULTIPLIER) * dt,
        y: angularVelocity.y + torqueAxis.y * (this.linearSpeed * TORQUE_MULTIPLIER) * dt,
        z: angularVelocity.z + torqueAxis.z * (this.linearSpeed * TORQUE_MULTIPLIER) * dt,
      },
      true,
    );

    const direction = Math.sign(this.linearSpeed) || (Math.abs(this.inputZ) > 0.1 ? Math.sign(this.inputZ) : 1);
    const steeringGrip = clamp(Math.abs(this.linearSpeed), 0.2, 1);
    const targetAngular = -this.inputX * steeringGrip * 4 * direction;
    this.angularSpeed = lerp(this.angularSpeed, targetAngular, dt * 4);
    this.container.rotateY(this.angularSpeed * dt);

    const targetSpeed = this.inputZ * DRIVE_SPEED_FACTOR;
    if (targetSpeed < 0 && this.linearSpeed > 0.01) {
      this.linearSpeed = lerp(this.linearSpeed, 0, dt * 8);
    } else if (targetSpeed < 0) {
      this.linearSpeed = lerp(this.linearSpeed, targetSpeed * REVERSE_SPEED_FACTOR, dt * 2);
    } else {
      this.linearSpeed = lerp(this.linearSpeed, targetSpeed, dt * 6);
    }

    const updatedAngularVelocity = body.angvel();
    const angularLength = Math.hypot(
      updatedAngularVelocity.x,
      updatedAngularVelocity.y,
      updatedAngularVelocity.z,
    );
    this.acceleration = lerp(
      this.acceleration,
      this.linearSpeed + Math.abs(angularLength * this.linearSpeed) / 100,
      dt,
    );
    this.headingYaw = Math.atan2(
      this.tempVectorB.set(0, 0, 1).applyQuaternion(this.container.quaternion).x,
      this.tempVectorB.z,
    );
  }

  sync(
    body: RapierRigidBody,
    groundState: GroundState,
    dt: number,
    smokeSystem: SmokeSystem,
    audioController: VehicleAudioSink,
  ) {
    const translation = body.translation();
    const linvel = body.linvel();
    this.spherePosition.set(translation.x, translation.y, translation.z);
    this.sphereVelocity.set(linvel.x, linvel.y, linvel.z);

    this.container.position.copy(this.spherePosition);
    this.container.position.y -= VEHICLE_MODEL_OFFSET_Y;

    if (groundState.isGrounded) {
      const currentForward = this.tempVector.set(0, 0, 1).applyQuaternion(this.container.quaternion);
      const alignedRight = this.tempVectorB.crossVectors(groundState.groundNormal, currentForward).normalize();
      if (alignedRight.lengthSq() > 1e-6) {
        const correctedForward = this.tempVectorC.crossVectors(alignedRight, groundState.groundNormal).normalize();
        this.tempMatrix.makeBasis(alignedRight, groundState.groundNormal, correctedForward);
        const currentUp = this.tempVectorD.set(0, 1, 0).applyQuaternion(this.container.quaternion);
        if (groundState.groundNormal.dot(currentUp) > 0.5) {
          this.tempQuaternion.setFromRotationMatrix(this.tempMatrix);
          this.container.quaternion.slerp(this.tempQuaternion, 0.2);
        }
      }
    }

    if (groundState.isGrounded && !groundState.wasGrounded) {
      this.vehicleVisual.rig.body.position.copy(this.vehicleVisual.bodyBouncePosition);
      this.inputZ = 0;
    }

    this.wheelSpin += this.acceleration;
    this.driftIntensity = updateVehicleVisualPose(this.vehicleVisual, {
      speed: this.linearSpeed,
      acceleration: this.acceleration,
      steer: this.inputX,
      dt,
      wheelSpin: this.wheelSpin,
    });

    if (this.driftIntensity > DRIFT_THRESHOLD) {
      smokeSystem.spawn(this.container, this.linearSpeed, this.vehicleVisual.rig.smokeOffsets);
    }
    audioController.update(
      this.vehicleVisual.engineProfile,
      this.linearSpeed,
      this.inputZ,
      this.driftIntensity,
      dt,
    );
    this.debugSphereMesh.position.copy(this.spherePosition);
  }
}
