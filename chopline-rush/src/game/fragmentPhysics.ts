import RAPIER from "@dimforge/rapier3d-compat";

export interface PhysicsVector {
  x: number;
  y: number;
  z: number;
}

export interface PhysicsBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zMin?: number;
  zMax?: number;
}

export interface FragmentBodySpec {
  position: PhysicsVector;
  velocity: PhysicsVector;
  angularVelocity: PhysicsVector;
  bounds: PhysicsBounds;
  density: number;
}

export interface FragmentTransform {
  position: PhysicsVector;
  rotation: { x: number; y: number; z: number; w: number };
  velocity: PhysicsVector;
  sleeping: boolean;
}

export class FragmentPhysics {
  private world: RAPIER.World | null = null;
  private readonly platforms = new Map<string, RAPIER.RigidBody>();
  private readonly fragments = new Map<number, RAPIER.RigidBody>();

  async init(): Promise<void> {
    await RAPIER.init();
    this.reset();
  }

  reset(): void {
    this.world?.free();
    this.world = new RAPIER.World({ x: 0, y: -15, z: 0 });
    this.world.numSolverIterations = 8;
    this.platforms.clear();
    this.fragments.clear();

    const groundBody = this.world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.3, 80));
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(40, 0.3, 160).setFriction(0.92).setRestitution(0.08),
      groundBody,
    );
  }

  addPlatform(id: string, position: PhysicsVector, size: PhysicsVector, moving: boolean): void {
    const world = this.requireWorld();
    const desc = moving ? RAPIER.RigidBodyDesc.kinematicPositionBased() : RAPIER.RigidBodyDesc.fixed();
    const body = world.createRigidBody(desc.setTranslation(position.x, position.y, position.z));
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2)
        .setFriction(0.82)
        .setRestitution(0.12),
      body,
    );
    this.platforms.set(id, body);
  }

  updatePlatform(id: string, position: PhysicsVector): void {
    const body = this.platforms.get(id);
    if (!body || !body.isKinematic()) return;
    body.setNextKinematicTranslation(position);
  }

  removePlatform(id: string): void {
    const world = this.requireWorld();
    const body = this.platforms.get(id);
    if (!body) return;
    world.removeRigidBody(body);
    this.platforms.delete(id);
  }

  addFragment(spec: FragmentBodySpec): number {
    const world = this.requireWorld();
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(spec.position.x, spec.position.y, spec.position.z)
        .setLinvel(spec.velocity.x, spec.velocity.y, spec.velocity.z)
        .setAngvel(spec.angularVelocity)
        .setLinearDamping(0.36)
        .setAngularDamping(0.52)
        .setCcdEnabled(true),
    );

    const zMin = spec.bounds.zMin ?? -0.3;
    const zMax = spec.bounds.zMax ?? 0.3;
    const halfX = Math.max(0.04, (spec.bounds.xMax - spec.bounds.xMin) / 2);
    const halfY = Math.max(0.04, (spec.bounds.yMax - spec.bounds.yMin) / 2);
    const halfZ = Math.max(0.04, (zMax - zMin) / 2);
    const centerX = (spec.bounds.xMin + spec.bounds.xMax) / 2;
    const centerY = (spec.bounds.yMin + spec.bounds.yMax) / 2;
    const centerZ = (zMin + zMax) / 2;
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(halfX, halfY, halfZ)
        .setTranslation(centerX, centerY, centerZ)
        .setDensity(spec.density)
        .setFriction(0.74)
        .setRestitution(0.18),
      body,
    );
    this.fragments.set(body.handle, body);
    return body.handle;
  }

  removeFragment(handle: number): void {
    const world = this.requireWorld();
    const body = this.fragments.get(handle);
    if (!body) return;
    world.removeRigidBody(body);
    this.fragments.delete(handle);
  }

  step(dt: number): void {
    const world = this.requireWorld();
    world.timestep = Math.min(1 / 30, Math.max(1 / 240, dt));
    world.step();
  }

  fragmentTransform(handle: number): FragmentTransform | null {
    const body = this.fragments.get(handle);
    if (!body) return null;
    const position = body.translation();
    const rotation = body.rotation();
    const velocity = body.linvel();
    return {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
      velocity: { x: velocity.x, y: velocity.y, z: velocity.z },
      sleeping: body.isSleeping(),
    };
  }

  private requireWorld(): RAPIER.World {
    if (!this.world) throw new Error("[chopline-rush] Fragment physics is not initialized");
    return this.world;
  }
}
