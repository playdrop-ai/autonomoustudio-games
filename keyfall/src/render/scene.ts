import * as THREE from "three";
import type { NoteEvent } from "../game/logic.ts";
import type { SongConfig } from "../game/songs.ts";

type NoteMesh = {
  group: THREE.Group;
  head: THREE.Mesh;
  tail: THREE.Mesh | null;
  link: THREE.Mesh | null;
};

export interface SceneFrame {
  notes: NoteEvent[];
  elapsedMs: number;
  song: SongConfig;
  pressedLanes: Set<number>;
  pulse: number;
}

export class SceneRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private laneMeshes: THREE.Mesh[] = [];
  private noteMeshes = new Map<number, NoteMesh>();
  private noteRoot = new THREE.Group();
  private tunnelRoot = new THREE.Group();
  private dividerMaterial = new THREE.MeshBasicMaterial({ color: 0xcffcff, transparent: true, opacity: 0.18 });
  private lastResize = { width: 0, height: 0 };

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0c1420, 12, 42);

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    this.camera.position.set(0, 8.2, 8.6);
    this.camera.lookAt(0, 0.6, -18);

    const ambient = new THREE.AmbientLight(0xffffff, 0.85);
    const key = new THREE.DirectionalLight(0xffffff, 0.75);
    key.position.set(1.5, 6, 3);
    const rim = new THREE.PointLight(0x63e6ff, 0.9, 24, 2);
    rim.position.set(0, 5, -14);
    this.scene.add(ambient, key, rim);

    this.scene.add(this.buildFloor());
    this.scene.add(this.noteRoot);
    this.scene.add(this.buildStrikeLine());
    this.scene.add(this.buildTunnel());
  }

  resize(width: number, height: number): void {
    if (this.lastResize.width === width && this.lastResize.height === height) return;
    this.lastResize = { width, height };
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(frame: SceneFrame): void {
    const ambientColor = new THREE.Color(frame.song.ambient);
    const accentColor = new THREE.Color(frame.song.accent);
    this.scene.background = ambientColor.clone();
    (this.scene.fog as THREE.Fog).color.copy(ambientColor);
    this.updateTunnel(accentColor, frame.pulse);
    this.updateLanes(accentColor, frame.pressedLanes);
    this.updateNotes(frame.notes, frame.elapsedMs, accentColor);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.dispose();
  }

  private buildFloor(): THREE.Object3D {
    const root = new THREE.Group();
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.18, 32),
      new THREE.MeshStandardMaterial({ color: 0xaebfc8, roughness: 0.34, metalness: 0.08 }),
    );
    floor.position.set(0, 0, -12);
    root.add(floor);

    for (let lane = 0; lane < 4; lane += 1) {
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(1.06, 0.2, 32),
        new THREE.MeshStandardMaterial({ color: 0xc7d3d8, roughness: 0.28, metalness: 0.05, emissive: 0x000000 }),
      );
      slab.position.set(-1.6 + lane * 1.07, 0.11, -12);
      this.laneMeshes.push(slab);
      root.add(slab);
    }

    for (let index = 0; index < 5; index += 1) {
      const divider = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 32), this.dividerMaterial);
      divider.position.set(-2.14 + index * 1.07, 0.22, -12);
      root.add(divider);
    }

    for (let stripe = 0; stripe < 6; stripe += 1) {
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(5.8, 0.04, 0.14),
        new THREE.MeshBasicMaterial({ color: 0x63e6ff, transparent: true, opacity: 0.18 }),
      );
      marker.position.set(0, 0.21, -2 - stripe * 4.2);
      root.add(marker);
    }
    return root;
  }

  private buildStrikeLine(): THREE.Object3D {
    const root = new THREE.Group();
    const primary = new THREE.Mesh(
      new THREE.BoxGeometry(5.8, 0.05, 0.14),
      new THREE.MeshBasicMaterial({ color: 0xffefb0, transparent: true, opacity: 0.96 }),
    );
    primary.position.set(0, 0.26, 1.3);
    const secondary = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.02, 0.14),
      new THREE.MeshBasicMaterial({ color: 0xff7e9f, transparent: true, opacity: 0.44 }),
    );
    secondary.position.set(0, 0.28, 1.48);
    root.add(primary, secondary);
    return root;
  }

  private buildTunnel(): THREE.Object3D {
    const arcMaterial = new THREE.MeshBasicMaterial({ color: 0x63e6ff, transparent: true, opacity: 0.08 });
    for (let index = 0; index < 6; index += 1) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.03, 8, 48), arcMaterial.clone());
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 2.2, -4 - index * 5.2);
      this.tunnelRoot.add(ring);
    }
    return this.tunnelRoot;
  }

  private updateTunnel(accent: THREE.Color, pulse: number): void {
    for (const child of this.tunnelRoot.children) {
      const mesh = child as THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
      mesh.material.color.copy(accent);
      mesh.material.opacity = 0.08 + pulse * 0.08;
    }
  }

  private updateLanes(accent: THREE.Color, pressedLanes: Set<number>): void {
    this.laneMeshes.forEach((mesh, lane) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.emissive.set(pressedLanes.has(lane) ? accent : new THREE.Color(0x000000));
      material.emissiveIntensity = pressedLanes.has(lane) ? 0.45 : 0;
    });
  }

  private updateNotes(notes: NoteEvent[], elapsedMs: number, accent: THREE.Color): void {
    const visibleIds = new Set<number>();
    for (const note of notes) {
      const beatLead = (note.timeMs - elapsedMs) / note.beatMs;
      const tailLead = (note.timeMs + note.durationMs - elapsedMs) / note.beatMs;
      if (tailLead < -0.25 || beatLead > 7) continue;

      visibleIds.add(note.id);
      let mesh = this.noteMeshes.get(note.id);
      if (!mesh) {
        mesh = this.createNoteMesh(note);
        this.noteMeshes.set(note.id, mesh);
        this.noteRoot.add(mesh.group);
      }
      this.placeNote(mesh, note, beatLead, accent);
      mesh.group.visible = true;
    }

    for (const [id, mesh] of this.noteMeshes) {
      if (visibleIds.has(id)) continue;
      this.noteRoot.remove(mesh.group);
      disposeMesh(mesh.head);
      if (mesh.tail) disposeMesh(mesh.tail);
      if (mesh.link) disposeMesh(mesh.link);
      this.noteMeshes.delete(id);
    }
  }

  private createNoteMesh(note: NoteEvent): NoteMesh {
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.7, roughness: 0.25 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.34, 0.64), material);
    const group = new THREE.Group();
    group.add(head);
    let tail: THREE.Mesh | null = null;
    let link: THREE.Mesh | null = null;
    if (note.kind === "hold") {
      tail = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.12, 1),
        new THREE.MeshBasicMaterial({ color: 0xffefb0, transparent: true, opacity: 0.22 }),
      );
      group.add(tail);
    }
    if (note.lanes.length === 2) {
      link = new THREE.Mesh(
        new THREE.BoxGeometry(1.06, 0.12, 0.18),
        new THREE.MeshBasicMaterial({ color: 0xcffcff, transparent: true, opacity: 0.35 }),
      );
      group.add(link);
    }
    return { group, head, tail, link };
  }

  private placeNote(mesh: NoteMesh, note: NoteEvent, beatLead: number, accent: THREE.Color): void {
    const z = 1.3 - beatLead * 3.5;
    const lanePositions = note.lanes.map((lane) => -1.6 + lane * 1.07);
    const x = lanePositions.reduce((sum, value) => sum + value, 0) / lanePositions.length;
    mesh.group.position.set(x, 0.52, z);
    const color = pickNoteColor(note);
    const headMaterial = mesh.head.material as THREE.MeshStandardMaterial;
    headMaterial.color.copy(color);
    headMaterial.emissive.copy(color);
    headMaterial.emissiveIntensity = note.success ? 0.35 : 0.8;
    mesh.head.scale.x = note.lanes.length === 2 ? 0.82 : 1;

    if (mesh.tail && note.kind === "hold") {
      const beatLength = note.durationMs / note.beatMs;
      mesh.tail.position.set(0, -0.08, -beatLength * 1.7);
      mesh.tail.scale.z = Math.max(0.4, beatLength * 4.2);
      (mesh.tail.material as THREE.MeshBasicMaterial).color.copy(color);
    }
    if (mesh.link) {
      const left = lanePositions[0] ?? 0;
      const right = lanePositions[1] ?? left;
      mesh.link.position.set(0, -0.04, 0);
      mesh.link.scale.x = Math.abs(right - left) + 0.84;
      (mesh.link.material as THREE.MeshBasicMaterial).color.copy(accent);
    }
  }
}

function pickNoteColor(note: NoteEvent): THREE.Color {
  const lane = note.lanes[0] ?? 0;
  if (note.kind === "hold") return new THREE.Color("#ffd780");
  if (note.lanes.length === 2) return new THREE.Color("#63e6ff");
  return lane % 2 === 0 ? new THREE.Color("#63e6ff") : new THREE.Color("#ff88a5");
}

function disposeMesh(mesh: THREE.Mesh): void {
  mesh.geometry.dispose();
  const material = mesh.material;
  if (Array.isArray(material)) {
    material.forEach((entry) => entry.dispose());
  } else {
    material.dispose();
  }
}
