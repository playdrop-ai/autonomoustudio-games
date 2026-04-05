import * as THREE from "three";
import { smoothstep } from "./math";
import type { EnemyKind, PropKind, SimEvent, SimulationSnapshot } from "./sim";

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  drag: number;
  life: number;
  maxLife: number;
}

interface VehicleVisual {
  group: THREE.Group;
  accent: THREE.MeshStandardMaterial;
  shell: THREE.MeshStandardMaterial;
}

export class GameRenderer {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
  private readonly renderer: THREE.WebGLRenderer;
  private readonly root: HTMLElement;
  private readonly arenaGroup = new THREE.Group();
  private readonly effectsGroup = new THREE.Group();
  private readonly propGroup = new THREE.Group();
  private readonly batteryGroup = new THREE.Group();
  private readonly enemyGroup = new THREE.Group();
  private readonly deskGlow = new THREE.Mesh(
    new THREE.CircleGeometry(8.2, 48),
    new THREE.MeshBasicMaterial({ color: 0xffd7a6, transparent: true, opacity: 0.12 }),
  );
  private readonly playerVisual = this.createVehicleVisual("player");
  private readonly enemyVisuals = new Map<number, VehicleVisual>();
  private readonly batteryMeshes = new Map<number, THREE.Group>();
  private readonly propMeshes = new Map<number, THREE.Object3D>();
  private readonly particles: Particle[] = [];
  private readonly spawnPad = new THREE.Group();
  private readonly spawnRing = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.7, 32),
    new THREE.MeshBasicMaterial({ color: 0x6cc0ff, transparent: true, opacity: 0.85, side: THREE.DoubleSide }),
  );
  private readonly spawnTower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 1.4, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }),
  );
  private lastSnapshot: SimulationSnapshot | null = null;
  private previousFrameTime = performance.now();

  constructor(root: HTMLElement) {
    this.root = root;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.root.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0xf5d5a1);
    this.scene.fog = new THREE.Fog(0xf5d5a1, 13, 26);
    this.camera.position.set(0, 9.5, 6.35);
    this.camera.lookAt(0, 0.38, 0.24);

    const ambient = new THREE.HemisphereLight(0xfff5dc, 0x6b4328, 1.4);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xfff1d2, 1.5);
    sun.position.set(-5.2, 10.6, 6.4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    this.scene.add(sun);

    this.buildArena();
    this.scene.add(this.arenaGroup, this.propGroup, this.enemyGroup, this.batteryGroup, this.effectsGroup);
    this.scene.add(this.playerVisual.group);
    this.spawnRing.rotation.x = -Math.PI * 0.5;
    this.spawnPad.add(this.spawnRing, this.spawnTower);
    this.spawnPad.visible = false;
    this.scene.add(this.spawnPad);

    this.deskGlow.position.set(0, -0.09, 0);
    this.deskGlow.rotation.x = -Math.PI * 0.5;
    this.scene.add(this.deskGlow);

    window.addEventListener("resize", this.handleResize);
    this.handleResize();
  }

  dispose(): void {
    window.removeEventListener("resize", this.handleResize);
    this.renderer.dispose();
    this.root.removeChild(this.renderer.domElement);
  }

  render(snapshot: SimulationSnapshot, events: SimEvent[]): void {
    this.syncProps(snapshot);
    this.syncEnemies(snapshot);
    this.syncPickups(snapshot);
    this.syncPlayer(snapshot);
    this.syncSpawnPreview(snapshot);
    this.playEvents(events);

    const now = performance.now();
    const dt = Math.min(1 / 20, Math.max(1 / 120, (now - this.previousFrameTime) / 1000));
    this.previousFrameTime = now;
    this.updateParticles(dt);
    this.renderer.render(this.scene, this.camera);
    this.lastSnapshot = snapshot;
  }

  private buildArena(): void {
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(15.8, 0.26, 10.2),
      new THREE.MeshStandardMaterial({
        color: 0xe8b56f,
        metalness: 0.02,
        roughness: 0.78,
      }),
    );
    table.receiveShadow = true;
    table.position.y = -0.2;
    this.arenaGroup.add(table);

    const lane = new THREE.Mesh(
      new THREE.PlaneGeometry(14.2, 8.8),
      new THREE.MeshStandardMaterial({
        color: 0xe6f3ff,
        roughness: 0.88,
      }),
    );
    lane.rotation.x = -Math.PI * 0.5;
    lane.receiveShadow = true;
    this.arenaGroup.add(lane);

    const railMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e2736,
      roughness: 0.55,
      metalness: 0.18,
    });

    const railNorth = new THREE.Mesh(new THREE.BoxGeometry(14.9, 0.46, 0.48), railMaterial);
    railNorth.position.set(0, 0.2, -4.6);
    railNorth.castShadow = true;
    this.arenaGroup.add(railNorth);

    const railSouth = railNorth.clone();
    railSouth.position.z = 4.6;
    this.arenaGroup.add(railSouth);

    const railWest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.46, 9.6), railMaterial);
    railWest.position.set(-7.35, 0.2, 0);
    railWest.castShadow = true;
    this.arenaGroup.add(railWest);

    const railEast = railWest.clone();
    railEast.position.x = 7.35;
    this.arenaGroup.add(railEast);

    const tapeMaterial = new THREE.MeshStandardMaterial({ color: 0xf7f4ea, roughness: 0.8 });
    const tapeLine = new THREE.Mesh(new THREE.PlaneGeometry(13.1, 7.7), tapeMaterial);
    tapeLine.rotation.x = -Math.PI * 0.5;
    tapeLine.position.y = 0.002;
    this.arenaGroup.add(tapeLine);

    const deskMaterial = new THREE.MeshStandardMaterial({
      color: 0xa85b2e,
      roughness: 0.86,
      metalness: 0.01,
    });
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(24, 18), deskMaterial);
    desk.position.y = -0.35;
    desk.rotation.x = -Math.PI * 0.5;
    desk.receiveShadow = true;
    this.arenaGroup.add(desk);

    const pencil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 7.6, 12),
      new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.72 }),
    );
    pencil.rotation.z = Math.PI * 0.5;
    pencil.rotation.x = 0.14;
    pencil.position.set(-8.4, -0.03, 5.2);
    this.arenaGroup.add(pencil);

    const notebook = new THREE.Mesh(
      new THREE.BoxGeometry(4, 0.32, 2.7),
      new THREE.MeshStandardMaterial({ color: 0x2f4d7c, roughness: 0.82 }),
    );
    notebook.position.set(8.6, -0.06, -4.8);
    notebook.rotation.y = 0.28;
    notebook.castShadow = true;
    this.arenaGroup.add(notebook);
  }

  private syncPlayer(snapshot: SimulationSnapshot): void {
    this.playerVisual.group.position.set(snapshot.player.position.x, 0.32, snapshot.player.position.y);
    this.playerVisual.group.rotation.y = -snapshot.player.heading;
    this.playerVisual.accent.emissiveIntensity = 0.18 + (snapshot.player.dashTimer > 0 ? 0.5 : 0) + snapshot.player.lowBatteryPulse * 0.24;
    this.playerVisual.shell.emissiveIntensity = snapshot.player.lowBatteryPulse * 0.13;
    this.playerVisual.group.scale.setScalar(snapshot.player.dashTimer > 0 ? 1.12 : 1.06);
  }

  private syncEnemies(snapshot: SimulationSnapshot): void {
    const activeIds = new Set<number>();

    for (const enemy of snapshot.enemies) {
      activeIds.add(enemy.id);
      let visual = this.enemyVisuals.get(enemy.id);
      if (!visual) {
        visual = this.createVehicleVisual(enemy.kind);
        this.enemyVisuals.set(enemy.id, visual);
        this.enemyGroup.add(visual.group);
      }

      visual.group.position.set(enemy.position.x, enemy.kind === "heavy" ? 0.36 : 0.32, enemy.position.y);
      visual.group.rotation.y = -enemy.heading;
      const damageRatio = 1 - enemy.hp / enemy.maxHp;
      visual.group.scale.setScalar(enemy.kind === "heavy" ? 1.2 : 1.08);
      visual.accent.emissiveIntensity = 0.14 + enemy.flashTimer * 2 + damageRatio * 0.18;
      visual.shell.emissiveIntensity = damageRatio * 0.08;
    }

    for (const [enemyId, visual] of this.enemyVisuals) {
      if (activeIds.has(enemyId)) {
        continue;
      }
      this.enemyGroup.remove(visual.group);
      this.enemyVisuals.delete(enemyId);
    }
  }

  private syncPickups(snapshot: SimulationSnapshot): void {
    const active = new Set<number>();

    for (const pickup of snapshot.pickups) {
      active.add(pickup.id);
      let group = this.batteryMeshes.get(pickup.id);
      if (!group) {
        group = new THREE.Group();
        const core = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.18, 0),
          new THREE.MeshStandardMaterial({
            color: 0x98f2ff,
            emissive: 0x4ecfff,
            emissiveIntensity: 0.55,
            roughness: 0.32,
          }),
        );
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.26, 0.04, 8, 24),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 }),
        );
        ring.rotation.x = Math.PI * 0.5;
        group.add(core, ring);
        this.batteryMeshes.set(pickup.id, group);
        this.batteryGroup.add(group);
      }

      group.position.set(pickup.position.x, 0.26 + Math.sin(pickup.lifeTimer * 4.2 + pickup.id) * 0.06, pickup.position.y);
      group.scale.setScalar(1.16);
      group.rotation.y += 0.05;
    }

    for (const [pickupId, mesh] of this.batteryMeshes) {
      if (active.has(pickupId)) {
        continue;
      }
      this.batteryGroup.remove(mesh);
      this.batteryMeshes.delete(pickupId);
    }
  }

  private syncProps(snapshot: SimulationSnapshot): void {
    const active = new Set<number>();

    for (const prop of snapshot.props) {
      active.add(prop.id);
      let mesh = this.propMeshes.get(prop.id);
      if (!mesh) {
        mesh = this.createProp(prop.kind);
        this.propMeshes.set(prop.id, mesh);
        this.propGroup.add(mesh);
      }
      mesh.position.set(prop.position.x, prop.kind === "box" ? 0.23 : 0.2, prop.position.y);
      mesh.rotation.y = -prop.angle;
      if (prop.kind === "box") {
        mesh.scale.set(prop.width / 0.8, 1, prop.height / 0.68);
      }
    }

    for (const [propId, mesh] of this.propMeshes) {
      if (active.has(propId)) {
        continue;
      }
      this.propGroup.remove(mesh);
      this.propMeshes.delete(propId);
    }
  }

  private syncSpawnPreview(snapshot: SimulationSnapshot): void {
    if (!snapshot.nextSpawn) {
      this.spawnPad.visible = false;
      return;
    }

    this.spawnPad.visible = true;
    this.spawnPad.position.set(snapshot.nextSpawn.point.x, 0.02, snapshot.nextSpawn.point.y);
    const urgency = 1 - Math.min(1, snapshot.nextSpawn.eta / 6);
    this.spawnRing.scale.setScalar(1.18 + urgency * 0.42);
    const ringMaterial = this.spawnRing.material as THREE.MeshBasicMaterial;
    ringMaterial.color.setHex(snapshot.nextSpawn.kind === "heavy" ? 0xff725c : 0x6cc0ff);
    ringMaterial.opacity = 0.35 + urgency * 0.5;
    (this.spawnTower.material as THREE.MeshBasicMaterial).opacity = 0.18 + urgency * 0.5;
    this.spawnTower.scale.y = 0.6 + smoothstep(0, 1, urgency) * 0.8;
  }

  private playEvents(events: SimEvent[]): void {
    for (const event of events) {
      if (event.type === "pickup") {
        this.spawnBurst(event.x, event.y, 0x6ce7ff, 9, 0.6, 0.9);
      } else if (event.type === "dash") {
        this.spawnBurst(event.x, event.y, 0xf7f7ff, 12, 0.8, 1.1);
      } else if (event.type === "ko") {
        this.spawnBurst(event.x, event.y, event.kind === "heavy" ? 0xff7845 : 0xffbc66, 16, 1, 1.6);
      } else if (event.type === "spawn") {
        this.spawnBurst(event.x, event.y, event.kind === "heavy" ? 0xff735f : 0x81dfff, 10, 0.35, 0.7);
      } else if (event.type === "prop-spawn") {
        this.spawnBurst(event.x, event.y, 0xffffff, 6, 0.35, 0.6);
      } else {
        this.spawnBurst(event.x, event.y, 0xffd48f, 8, 0.55, 0.78);
      }
    }
  }

  private updateParticles(dt: number): void {
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      const particle = this.particles[index];
      if (!particle) {
        continue;
      }
      particle.life -= dt;
      if (particle.life <= 0) {
        this.effectsGroup.remove(particle.mesh);
        this.particles.splice(index, 1);
        continue;
      }

      particle.velocity.multiplyScalar(particle.drag);
      particle.mesh.position.addScaledVector(particle.velocity, dt);
      const material = particle.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = particle.life / particle.maxLife;
      const scale = 0.38 + (1 - particle.life / particle.maxLife) * 0.22;
      particle.mesh.scale.setScalar(scale);
    }
  }

  private spawnBurst(
    x: number,
    y: number,
    color: number,
    count: number,
    speed: number,
    intensity: number,
  ): void {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Math.random() * 0.45;
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.15, 0.15),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82, side: THREE.DoubleSide }),
      );
      mesh.rotation.x = -Math.PI * 0.5;
      mesh.position.set(x, 0.22, y);
      this.effectsGroup.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(Math.cos(angle) * speed * intensity, 0, Math.sin(angle) * speed * intensity),
        drag: 0.93,
        life: 0.34 + Math.random() * 0.18,
        maxLife: 0.52,
      });
    }
  }

  private createVehicleVisual(kind: "player" | EnemyKind): VehicleVisual {
    const heavy = kind === "heavy";
    const group = new THREE.Group();
    const shell = new THREE.MeshStandardMaterial({
      color:
        kind === "player"
          ? 0x57d6ff
          : heavy
            ? 0x8f2c20
            : 0xe35f3f,
      emissive:
        kind === "player"
          ? 0x0b6076
          : heavy
            ? 0x4e130a
            : 0x612215,
      roughness: 0.42,
      metalness: 0.18,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: kind === "player" ? 0xffffff : heavy ? 0x281717 : 0x3b2320,
      emissive: kind === "player" ? 0xcff8ff : 0xffc29f,
      emissiveIntensity: 0.12,
      roughness: 0.3,
      metalness: 0.24,
    });

    const base = new THREE.Mesh(new THREE.BoxGeometry(heavy ? 1.48 : 1.16, 0.28, heavy ? 2.1 : 1.68), shell);
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(heavy ? 0.84 : 0.72, 0.22, heavy ? 0.94 : 0.7), accent);
    cabin.position.set(0, 0.21, -0.08);
    cabin.castShadow = true;
    group.add(cabin);

    const bumper = new THREE.Mesh(
      new THREE.BoxGeometry(heavy ? 1.12 : 0.88, 0.14, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x19202a, roughness: 0.56 }),
    );
    bumper.position.set(0, -0.02, heavy ? -1.02 : -0.82);
    group.add(bumper);

    for (const side of [-1, 1] as const) {
      for (const z of heavy ? [-0.72, 0.78] : [-0.58, 0.64]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.16, 0.16, 10),
          new THREE.MeshStandardMaterial({ color: 0x232323, roughness: 0.62 }),
        );
        wheel.rotation.z = Math.PI * 0.5;
        wheel.position.set(side * (heavy ? 0.64 : 0.48), -0.12, z);
        group.add(wheel);
      }
    }

    return { group, accent, shell };
  }

  private createProp(kind: PropKind): THREE.Object3D {
    if (kind === "cone") {
      const group = new THREE.Group();
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.18, 0.42, 12),
        new THREE.MeshStandardMaterial({ color: 0xff7a32, roughness: 0.62 }),
      );
      const band = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.035, 8, 18),
        new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.48 }),
      );
      band.rotation.x = Math.PI * 0.5;
      band.position.y = -0.04;
      group.add(cone, band);
      return group;
    }

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.38, 0.68),
      new THREE.MeshStandardMaterial({ color: 0xd9b07b, roughness: 0.74 }),
    );
    box.castShadow = true;
    box.receiveShadow = true;
    return box;
  }

  private handleResize = (): void => {
    const width = this.root.clientWidth;
    const height = this.root.clientHeight;
    if (width === 0 || height === 0) {
      return;
    }
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };
}
