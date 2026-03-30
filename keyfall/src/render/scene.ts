import * as THREE from "three";
import type { NoteEvent } from "../game/logic.ts";
import type { SongDefinition } from "../game/songbook.ts";

const HIT_Z = -0.18;
const APPROACH_UNITS_PER_BEAT = 4.1;
const LANE_PITCH = 1.3;
const RUNWAY_LENGTH = 34;
const RUNWAY_CENTER_Z = -12;
const NOTE_TAP_LENGTH = 1.55;

type NoteMesh = {
  group: THREE.Group;
  tile: THREE.Mesh;
  gloss: THREE.Mesh;
};

export interface SceneFrame {
  notes: NoteEvent[];
  elapsedMs: number;
  song: SongDefinition;
  pressedLanes: Set<number>;
  pulse: number;
}

export class SceneRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private laneMeshes: THREE.Mesh[] = [];
  private targetPadMeshes: THREE.Mesh[] = [];
  private noteMeshes = new Map<number, NoteMesh>();
  private noteRoot = new THREE.Group();
  private guideRoot = new THREE.Group();
  private dividerMaterial = new THREE.MeshBasicMaterial({ color: 0x0a0c10, transparent: true, opacity: 0.22 });
  private lastResize = { width: 0, height: 0 };

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0f1620, 14, 40);

    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    this.camera.position.set(0, 8.9, 12.5);
    this.camera.lookAt(0, 0.44, -15.2);

    const ambient = new THREE.AmbientLight(0xffffff, 1.02);
    const key = new THREE.DirectionalLight(0xffffff, 0.82);
    key.position.set(0.9, 6.8, 4.5);
    const fill = new THREE.PointLight(0xffffff, 0.4, 32, 2);
    fill.position.set(0, 3.8, -8);
    this.scene.add(ambient, key, fill);

    this.scene.add(this.buildFloor());
    this.scene.add(this.noteRoot);
    this.scene.add(this.buildStrikeLine());
    this.scene.add(this.buildGuides());
  }

  resize(width: number, height: number): void {
    if (this.lastResize.width === width && this.lastResize.height === height) return;
    this.lastResize = { width, height };
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(frame: SceneFrame): void {
    const ambientColor = new THREE.Color(frame.song.theme.ambient);
    const accentColor = new THREE.Color(frame.song.theme.accent);
    this.scene.background = ambientColor.clone();
    (this.scene.fog as THREE.Fog).color.copy(ambientColor);
    this.updateGuides(accentColor, frame.pulse);
    this.updateLanes(accentColor, frame.pressedLanes);
    this.updateNotes(frame.notes, frame.elapsedMs);
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.dispose();
  }

  private buildFloor(): THREE.Object3D {
    const root = new THREE.Group();

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(6.3, 0.34, RUNWAY_LENGTH + 1),
      new THREE.MeshStandardMaterial({ color: 0xb6bcc5, roughness: 0.5, metalness: 0.02 }),
    );
    base.position.set(0, -0.08, RUNWAY_CENTER_Z);
    root.add(base);

    const laneLength = RUNWAY_LENGTH;
    for (let lane = 0; lane < 4; lane += 1) {
      const slab = new THREE.Mesh(
        new THREE.BoxGeometry(1.22, 0.2, laneLength),
        new THREE.MeshStandardMaterial({ color: 0xf5f6f8, roughness: 0.16, metalness: 0.03, emissive: 0x000000 }),
      );
      slab.position.set(laneToX(lane), 0.11, RUNWAY_CENTER_Z);
      this.laneMeshes.push(slab);
      root.add(slab);
    }

    for (let index = 0; index < 5; index += 1) {
      const divider = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, laneLength + 0.4), this.dividerMaterial);
      divider.position.set(dividerToX(index), 0.215, RUNWAY_CENTER_Z);
      root.add(divider);
    }

    for (let stripe = 0; stripe < 6; stripe += 1) {
      const marker = new THREE.Mesh(
        new THREE.BoxGeometry(5.3, 0.02, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.07 }),
      );
      marker.position.set(0, 0.21, HIT_Z - 1.4 - stripe * 4.5);
      root.add(marker);
    }

    return root;
  }

  private buildStrikeLine(): THREE.Object3D {
    const root = new THREE.Group();

    const glow = new THREE.Mesh(
      new THREE.BoxGeometry(5.72, 0.03, 0.8),
      new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0.2 }),
    );
    glow.position.set(0, 0.24, HIT_Z + 0.05);

    const line = new THREE.Mesh(
      new THREE.BoxGeometry(5.46, 0.085, 0.16),
      new THREE.MeshBasicMaterial({ color: 0xffefb9, transparent: true, opacity: 1 }),
    );
    line.position.set(0, 0.285, HIT_Z);

    const shadow = new THREE.Mesh(
      new THREE.BoxGeometry(5.58, 0.02, 0.56),
      new THREE.MeshBasicMaterial({ color: 0x0c1015, transparent: true, opacity: 0.24 }),
    );
    shadow.position.set(0, 0.215, HIT_Z + 0.18);

    for (let lane = 0; lane < 4; lane += 1) {
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(1.14, 0.14, 1.9),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0x000000,
          emissiveIntensity: 0,
          roughness: 0.14,
          metalness: 0.04,
        }),
      );
      pad.position.set(laneToX(lane), 0.18, HIT_Z + 0.84);
      this.targetPadMeshes.push(pad);
      root.add(pad);
    }

    root.add(glow, line, shadow);
    return root;
  }

  private buildGuides(): THREE.Object3D {
    const root = this.guideRoot;
    for (let index = 0; index < 4; index += 1) {
      const guide = new THREE.Mesh(
        new THREE.BoxGeometry(5.4, 0.03, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.05 }),
      );
      guide.position.set(0, 0.26, -4.2 - index * 5.6);
      root.add(guide);
    }
    return root;
  }

  private updateGuides(accent: THREE.Color, pulse: number): void {
    for (const child of this.guideRoot.children) {
      const mesh = child as THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>;
      mesh.material.color.copy(accent);
      mesh.material.opacity = 0.05 + pulse * 0.06;
    }
  }

  private updateLanes(accent: THREE.Color, pressedLanes: Set<number>): void {
    this.laneMeshes.forEach((mesh, lane) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.set(pressedLanes.has(lane) ? new THREE.Color(0xe7f6ff) : new THREE.Color(0xf5f6f8));
      material.emissive.set(pressedLanes.has(lane) ? accent : new THREE.Color(0x000000));
      material.emissiveIntensity = pressedLanes.has(lane) ? 0.08 : 0;
    });

    this.targetPadMeshes.forEach((mesh, lane) => {
      const material = mesh.material as THREE.MeshStandardMaterial;
      material.color.set(pressedLanes.has(lane) ? new THREE.Color(0xe0edf6) : new THREE.Color(0xffffff));
      material.emissive.set(pressedLanes.has(lane) ? accent : new THREE.Color(0x000000));
      material.emissiveIntensity = pressedLanes.has(lane) ? 0.22 : 0;
    });
  }

  private updateNotes(notes: NoteEvent[], elapsedMs: number): void {
    const visibleIds = new Set<number>();
    for (const note of notes) {
      const beatLead = (note.timeMs - elapsedMs) / note.beatMs;
      const tailLead = (note.timeMs + note.durationMs - elapsedMs) / note.beatMs;
      if (tailLead < -0.25 || beatLead > 7) continue;

      visibleIds.add(note.id);
      let mesh = this.noteMeshes.get(note.id);
      if (!mesh) {
        mesh = this.createNoteMesh();
        this.noteMeshes.set(note.id, mesh);
        this.noteRoot.add(mesh.group);
      }
      this.placeNote(mesh, note, beatLead);
      mesh.group.visible = true;
    }

    for (const [id, mesh] of this.noteMeshes) {
      if (visibleIds.has(id)) continue;
      this.noteRoot.remove(mesh.group);
      disposeMesh(mesh.tile);
      disposeMesh(mesh.gloss);
      this.noteMeshes.delete(id);
    }
  }

  private createNoteMesh(): NoteMesh {
    const tile = new THREE.Mesh(
      new THREE.BoxGeometry(1.08, 0.24, 1),
      new THREE.MeshStandardMaterial({
        color: 0x07090d,
        emissive: 0x000000,
        emissiveIntensity: 0,
        roughness: 0.12,
        metalness: 0.22,
      }),
    );
    const gloss = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.02, 0.18),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16 }),
    );
    const group = new THREE.Group();
    group.add(tile, gloss);
    return { group, tile, gloss };
  }

  private placeNote(mesh: NoteMesh, note: NoteEvent, beatLead: number): void {
    const frontEdgeZ = HIT_Z - beatLead * APPROACH_UNITS_PER_BEAT;
    const lane = note.lanes[0] ?? 0;
    const holdBeats = note.durationMs / note.beatMs;
    const tileLength = note.kind === "hold" ? Math.max(2.2, holdBeats * 3.4) : NOTE_TAP_LENGTH;

    mesh.group.position.set(laneToX(lane), 0.42, frontEdgeZ);
    mesh.tile.scale.set(1, 1, tileLength);
    mesh.tile.position.set(0, 0, -tileLength * 0.5);

    mesh.gloss.position.set(0, 0.125, -0.14);
    mesh.gloss.scale.set(1, 1, note.kind === "hold" ? 1.2 : 1);

    const tileMaterial = mesh.tile.material as THREE.MeshStandardMaterial;
    tileMaterial.color.set(note.success ? new THREE.Color(0x10151d) : new THREE.Color(0x07090d));
    tileMaterial.emissive.set(note.success ? new THREE.Color(0x1a2430) : new THREE.Color(0x000000));
    tileMaterial.emissiveIntensity = note.success ? 0.14 : 0.02;
  }
}

function laneToX(lane: number): number {
  return -1.95 + lane * LANE_PITCH;
}

function dividerToX(index: number): number {
  return -2.6 + index * LANE_PITCH;
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
