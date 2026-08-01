import * as THREE from "three";

export interface KnifeSourceAnchors {
  tip: readonly [number, number, number];
  hilt: readonly [number, number, number];
  handleEnd: readonly [number, number, number];
}

export interface KnifeModelDefinition {
  sourceAxis: "x" | "y" | "z";
  bladeDirection: -1 | 1;
  anchors: KnifeSourceAnchors;
  bladeReach: number;
  bladeHalfWidth: number;
  handleHalfWidth: number;
  readyAngle: number;
  yawOffset?: number;
}

export interface KnifeGeometry {
  bladeReach: number;
  handleReach: number;
  bladeHalfWidth: number;
  handleHalfWidth: number;
  tipLocal: THREE.Vector3;
  hiltLocal: THREE.Vector3;
  handleEndLocal: THREE.Vector3;
  readyAngle: number;
  yawOffset: number;
}

const anchorVector = (anchor: readonly [number, number, number]): THREE.Vector3 =>
  new THREE.Vector3(anchor[0], anchor[1], anchor[2]);

function orientBladeTowardPositiveY(asset: THREE.Object3D, definition: KnifeModelDefinition): void {
  if (definition.sourceAxis === "x") {
    asset.rotation.z += definition.bladeDirection < 0 ? -Math.PI / 2 : Math.PI / 2;
  } else if (definition.sourceAxis === "z") {
    asset.rotation.x += definition.bladeDirection > 0 ? -Math.PI / 2 : Math.PI / 2;
  } else if (definition.bladeDirection < 0) {
    asset.rotation.z += Math.PI;
  }
  asset.updateMatrixWorld(true);
}

export function normalizeKnifeModel(asset: THREE.Object3D, definition: KnifeModelDefinition): KnifeGeometry {
  orientBladeTowardPositiveY(asset, definition);

  const sourceTip = anchorVector(definition.anchors.tip);
  const sourceHilt = anchorVector(definition.anchors.hilt);
  const sourceHandleEnd = anchorVector(definition.anchors.handleEnd);
  const sourceBladeLength = sourceTip.distanceTo(sourceHilt);
  if (sourceBladeLength <= 0.0001) {
    throw new Error("[chopline-rush] Knife tip and hilt anchors must be distinct");
  }

  asset.scale.multiplyScalar(definition.bladeReach / sourceBladeLength);
  asset.updateMatrixWorld(true);

  const hiltBeforePivot = asset.localToWorld(sourceHilt.clone());
  asset.position.sub(hiltBeforePivot);
  asset.updateMatrixWorld(true);

  const tipLocal = asset.localToWorld(sourceTip.clone());
  const hiltLocal = asset.localToWorld(sourceHilt.clone());
  const handleEndLocal = asset.localToWorld(sourceHandleEnd.clone());
  const bladeReach = tipLocal.distanceTo(hiltLocal);
  const handleReach = handleEndLocal.distanceTo(hiltLocal);
  const bladeDirection = tipLocal.clone().sub(hiltLocal).normalize();

  if (bladeDirection.y < 0.995 || Math.abs(bladeDirection.x) > 0.05 || Math.abs(bladeDirection.z) > 0.05) {
    throw new Error("[chopline-rush] Knife semantic anchors did not normalize onto the blade axis");
  }

  return {
    bladeReach,
    handleReach,
    bladeHalfWidth: definition.bladeHalfWidth,
    handleHalfWidth: definition.handleHalfWidth,
    tipLocal,
    hiltLocal,
    handleEndLocal,
    readyAngle: definition.readyAngle,
    yawOffset: definition.yawOffset ?? 0,
  };
}
