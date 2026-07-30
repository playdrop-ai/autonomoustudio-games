type ThreeNamespace = any;

export type SideOnCameraRig = {
  frameObjects(objects: any[], padding?: number): void;
};

/**
 * Keeps side-on gameplay readable across portrait and landscape surfaces by
 * framing the controlled entity and objective together on one fixed view axis.
 */
export function createSideOnCameraRig(
  THREE: ThreeNamespace,
  camera: any,
  viewDirection = new THREE.Vector3(0, 0, 1)
): SideOnCameraRig {
  const bounds = new THREE.Box3();
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  const direction = viewDirection.clone().normalize();

  return {
    frameObjects(objects: any[], padding = 1.35) {
      if (objects.length === 0) throw new Error('[side-on-camera] at least one object is required');
      bounds.makeEmpty();
      for (const object of objects) bounds.expandByObject(object);
      bounds.getCenter(center);
      bounds.getSize(size);

      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov * 0.5) * Math.max(camera.aspect, 0.001));
      const distanceForHeight = size.y / Math.max(2 * Math.tan(verticalFov * 0.5), 0.001);
      const distanceForWidth = size.x / Math.max(2 * Math.tan(horizontalFov * 0.5), 0.001);
      const distance = Math.max(distanceForHeight, distanceForWidth, size.z, 0.25) * padding;

      camera.position.copy(center).addScaledVector(direction, distance);
      camera.lookAt(center);
      camera.near = Math.max(0.01, distance / 100);
      camera.far = Math.max(100, distance * 12);
      camera.updateProjectionMatrix();
    },
  };
}
