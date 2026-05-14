import * as THREE from 'three';

import {
  GODOT_ORTHO_MATRICES,
  GRID_STEP,
  TRACK_SCALE,
  TRACK_Y,
} from '../runtime/constants';
import {
  createDetachedPreviewRenderer,
  encodeCanvasPngBlob,
} from '../runtime/preview-renderer';
import type { AssetBundle } from '../runtime/shared';
import {
  getNormalizedTileRotation,
  getTrackTileDefinition,
  type RacingTrackDocument,
  type RacingTrackTile,
} from './track-core';

export type EditorToolId = 'road' | 'finish' | 'forest' | 'tents';
type SceneToolId = EditorToolId | 'erase';

type LoadedModelMap = {
  corner: THREE.Object3D;
  finish: THREE.Object3D;
  straight: THREE.Object3D;
  empty: THREE.Object3D;
  forest: THREE.Object3D;
  tents: THREE.Object3D;
};

const ROTATION_TO_ORIENTATION_INDEX = [0, 16, 10, 22] as const;
const MODEL_KEY_BY_TILE_ID = {
  'track.corner': 'corner',
  'track.finish': 'finish',
  'track.straight': 'straight',
  'deco.empty': 'empty',
  'deco.forest': 'forest',
  'deco.tents': 'tents',
} as const satisfies Record<RacingTrackTile['tile'], keyof LoadedModelMap>;
const TOOL_GHOST_TILE = {
  road: 'track.straight',
  finish: 'track.finish',
  forest: 'deco.forest',
  tents: 'deco.tents',
  erase: null,
} as const satisfies Record<SceneToolId, RacingTrackTile['tile'] | null>;
const GHOST_TINT_BY_TOOL = {
  road: 0xffffff,
  finish: 0xffffff,
  forest: 0xb7ffcb,
  tents: 0xffd0a8,
  erase: 0xff8f8f,
} as const satisfies Record<SceneToolId, number>;
const TOOL_PREVIEW_TILES = {
  road: { tile: 'track.straight', rotation: 1 },
  finish: { tile: 'track.finish', rotation: 0 },
  forest: { tile: 'deco.forest', rotation: 0 },
  tents: { tile: 'deco.tents', rotation: 0 },
} as const satisfies Record<Exclude<EditorToolId, 'erase'>, Pick<RacingTrackTile, 'tile' | 'rotation'>>;
const DEFAULT_DOCUMENT_SIZE = 16;
const MIN_ZOOM = 0.55;
const MAX_ZOOM = 3.5;
const CAMERA_HEIGHT = 52;
const EDITOR_SURFACE_COLOR = 0x369069;

function getDocumentGridOffset(length: number) {
  return Math.floor(length / 2);
}

function getWorldGridCoordinate(length: number, coordinate: number) {
  return coordinate - getDocumentGridOffset(length);
}

function getDocumentCenterCoordinate(length: number) {
  return ((length - 1) / 2 - getDocumentGridOffset(length)) * GRID_STEP;
}

function getDocumentBounds(documentData: RacingTrackDocument) {
  return {
    centerX: getDocumentCenterCoordinate(documentData.size.width),
    centerZ: getDocumentCenterCoordinate(documentData.size.height),
    width: documentData.size.width * GRID_STEP,
    height: documentData.size.height * GRID_STEP,
  };
}

function cloneMaterialWithOpacity(material: THREE.Material, opacity: number, color?: number) {
  const cloned = material.clone();
  cloned.transparent = true;
  cloned.opacity = opacity;
  cloned.depthWrite = false;
  if (color !== undefined && 'color' in cloned) {
    const tinted = cloned as THREE.MeshStandardMaterial;
    tinted.color = new THREE.Color(color);
    tinted.emissive = new THREE.Color(color);
    tinted.emissiveIntensity = 0.12;
  }
  return cloned;
}

function setRootMatrix(
  root: THREE.Object3D,
  documentData: RacingTrackDocument,
  tile: Pick<RacingTrackTile, 'x' | 'y' | 'tile' | 'rotation'>,
) {
  const orientationIndex = ROTATION_TO_ORIENTATION_INDEX[
    getNormalizedTileRotation(tile.tile, tile.rotation)
  ]!;
  const orientationMatrix = GODOT_ORTHO_MATRICES[orientationIndex];
  if (!orientationMatrix) {
    throw new Error(`[starter-kit-racing] Unsupported orientation index ${orientationIndex}`);
  }
  const translation = new THREE.Vector3(
    getWorldGridCoordinate(documentData.size.width, tile.x) * GRID_STEP,
    TRACK_Y,
    getWorldGridCoordinate(documentData.size.height, tile.y) * GRID_STEP,
  );

  root.matrixAutoUpdate = false;
  root.matrix
    .copy(orientationMatrix)
    .scale(new THREE.Vector3(TRACK_SCALE, TRACK_SCALE, TRACK_SCALE))
    .setPosition(translation);
  root.matrixWorldNeedsUpdate = true;
}

function createHoverOutline() {
  const geometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(GRID_STEP, GRID_STEP));
  const material = new THREE.LineBasicMaterial({
    color: 0xffc857,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });
  const outline = new THREE.LineSegments(geometry, material);
  outline.rotation.x = -Math.PI / 2;
  outline.position.y = TRACK_Y + 0.02;
  outline.renderOrder = 32;
  outline.visible = false;
  return outline;
}

function createModelMap(models: AssetBundle['tiles']): LoadedModelMap {
  return {
    corner: models.corner.scene,
    finish: models.finish.scene,
    straight: models.straight.scene,
    empty: models.empty.scene,
    forest: models.forest.scene,
    tents: models.tents.scene,
  };
}

function createDocumentGridLines(documentData: RacingTrackDocument) {
  const positions: number[] = [];
  const halfWidth = (documentData.size.width * GRID_STEP) / 2;
  const halfHeight = (documentData.size.height * GRID_STEP) / 2;
  const originX = getDocumentCenterCoordinate(documentData.size.width);
  const originZ = getDocumentCenterCoordinate(documentData.size.height);
  const minX = originX - halfWidth;
  const maxX = originX + halfWidth;
  const minZ = originZ - halfHeight;
  const maxZ = originZ + halfHeight;
  const y = TRACK_Y - 0.34;

  for (let column = 0; column <= documentData.size.width; column += 1) {
    const x = minX + column * GRID_STEP;
    positions.push(x, y, minZ, x, y, maxZ);
  }
  for (let row = 0; row <= documentData.size.height; row += 1) {
    const z = minZ + row * GRID_STEP;
    positions.push(minX, y, z, maxX, y, z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0x4a7a2a,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  return new THREE.LineSegments(geometry, material);
}

function disposeLineSegments(lines: THREE.LineSegments) {
  lines.geometry.dispose();
  if (Array.isArray(lines.material)) {
    for (const material of lines.material) {
      material.dispose();
    }
    return;
  }
  lines.material.dispose();
}

function disposeMeshGeometry(mesh: THREE.Mesh) {
  mesh.geometry.dispose();
}

function configureOrthoCamera(
  camera: THREE.OrthographicCamera,
  {
    centerX,
    centerZ,
    width,
    height,
    zoom,
    aspect,
  }: {
    centerX: number;
    centerZ: number;
    width: number;
    height: number;
    zoom: number;
    aspect: number;
  },
) {
  const halfHeight = Math.max(height / 2, width / (2 * aspect)) / zoom;
  camera.left = -halfHeight * aspect;
  camera.right = halfHeight * aspect;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.position.set(centerX, CAMERA_HEIGHT, centerZ);
  camera.up.set(0, 0, -1);
  camera.lookAt(centerX, 0, centerZ);
  camera.updateProjectionMatrix();
}

export function renderEditorToolPreviewImages(
  tileModels: AssetBundle['tiles'],
  _renderer: THREE.WebGLRenderer,
) {
  const previewRenderer = createDetachedPreviewRenderer({
    width: 96,
    height: 96,
    alpha: false,
    clearColor: EDITOR_SURFACE_COLOR,
    clearAlpha: 1,
  });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  const models = createModelMap(tileModels);
  const previewRoot = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID_STEP, GRID_STEP),
    new THREE.MeshStandardMaterial({ color: 0x369069, metalness: 0 }),
  );
  const grid = createDocumentGridLines({
    size: { width: 1, height: 1 },
    tiles: [],
  });
  const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
  const fillLight = new THREE.HemisphereLight(0xdbeafe, 0x5f7c46, 1.5);
  const rimLight = new THREE.DirectionalLight(0xe2f1ff, 0.8);
  const documentData: RacingTrackDocument = {
    size: { width: 1, height: 1 },
    tiles: [],
  };
  const previewImages = {} as Record<EditorToolId, string>;

  ground.rotation.x = -Math.PI / 2;
  ground.position.y = TRACK_Y - 0.14;
  keyLight.position.set(10, 16, -6);
  rimLight.position.set(-8, 5, 5);

  scene.add(fillLight, keyLight, rimLight, ground, grid, previewRoot);
  configureOrthoCamera(camera, {
    centerX: 0,
    centerZ: 0,
    width: GRID_STEP * 1.08,
    height: GRID_STEP * 1.08,
    zoom: 1,
    aspect: 1,
  });

  for (const tool of ['road', 'finish', 'forest', 'tents'] as const) {
    previewRoot.clear();
    const previewTile = TOOL_PREVIEW_TILES[tool];
    const modelKey = MODEL_KEY_BY_TILE_ID[previewTile.tile];
    const template = models[modelKey];
    const root = template.clone(true);
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = false;
        child.receiveShadow = true;
      }
    });
    setRootMatrix(root, documentData, {
      x: 0,
      y: 0,
      tile: previewTile.tile,
      rotation: previewTile.rotation,
    });
    previewRoot.add(root);
    previewRenderer.renderer.render(scene, camera);
    previewImages[tool] = previewRenderer.canvas.toDataURL('image/png');
  }

  previewRenderer.dispose();
  disposeLineSegments(grid);
  disposeMeshGeometry(ground);
  return previewImages;
}

export class TrackEditorScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  private readonly raycaster = new THREE.Raycaster();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly trackRoot = new THREE.Group();
  private readonly ghostRoot = new THREE.Group();
  private readonly hoverOutline = createHoverOutline();
  private readonly ground: THREE.Mesh;
  private readonly models: LoadedModelMap;

  private gridLines: THREE.LineSegments | null = null;
  private document: RacingTrackDocument = {
    size: { width: DEFAULT_DOCUMENT_SIZE, height: DEFAULT_DOCUMENT_SIZE },
    tiles: [],
  };
  private tool: SceneToolId = 'road';
  private rotation = 0;
  private hoveredCell: { x: number; y: number } | null = null;
  private previewTile: RacingTrackTile | null = null;
  private zoom = 1;
  private pan = new THREE.Vector2(0, 0);
  private width = 1;
  private height = 1;
  private active = false;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly canvas: HTMLCanvasElement,
    tileModels: AssetBundle['tiles'],
  ) {
    this.models = createModelMap(tileModels);
    this.scene.background = new THREE.Color(EDITOR_SURFACE_COLOR);

    const directionLight = new THREE.DirectionalLight(0xffffff, 5);
    directionLight.position.set(11.4, 15, -5.3);
    directionLight.castShadow = true;
    directionLight.shadow.mapSize.setScalar(4096);
    directionLight.shadow.camera.near = 0.5;
    directionLight.shadow.camera.far = 100;
    directionLight.shadow.camera.left = -60;
    directionLight.shadow.camera.right = 60;
    directionLight.shadow.camera.top = 60;
    directionLight.shadow.camera.bottom = -60;
    this.scene.add(directionLight);

    const hemisphereLight = new THREE.HemisphereLight(0xc8d8e8, 0x7a8a5a, 1.5);
    this.scene.add(hemisphereLight);

    this.ground = new THREE.Mesh(
      new THREE.PlaneGeometry(GRID_STEP * DEFAULT_DOCUMENT_SIZE, GRID_STEP * DEFAULT_DOCUMENT_SIZE),
      new THREE.MeshStandardMaterial({ color: EDITOR_SURFACE_COLOR, metalness: 0 }),
    );
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = TRACK_Y - 0.14;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);

    this.scene.add(this.trackRoot);
    this.scene.add(this.ghostRoot);
    this.scene.add(this.hoverOutline);
    this.updateSurfaceGeometry();
  }

  async initialize() {
    this.resetView();
    this.updateTrackMeshes();
  }

  dispose() {
    this.trackRoot.clear();
    this.ghostRoot.clear();
    if (this.gridLines) {
      this.scene.remove(this.gridLines);
      disposeLineSegments(this.gridLines);
      this.gridLines = null;
    }
    disposeMeshGeometry(this.ground);
  }

  setActive(active: boolean) {
    this.active = active;
    if (active) {
      this.renderFrame();
    }
  }

  resize(width: number, height: number) {
    this.width = Math.max(Math.round(width), 1);
    this.height = Math.max(Math.round(height), 1);
    this.updateCamera();
    if (this.active) {
      this.renderFrame();
    }
  }

  resetView(documentData = this.document) {
    this.pan.set(0, 0);
    this.zoom = 1;
    this.document = documentData;
    this.updateSurfaceGeometry();
    this.updateCamera();
    if (this.active) {
      this.renderFrame();
    }
  }

  setDocument(documentData: RacingTrackDocument) {
    this.document = documentData;
    this.updateSurfaceGeometry();
    this.updateTrackMeshes();
    this.updateGhost();
    this.updateCamera();
    if (this.active) {
      this.renderFrame();
    }
  }

  setTool(tool: EditorToolId, rotation: number) {
    this.tool = tool;
    this.rotation = rotation;
    this.updateGhost();
    if (this.active) {
      this.renderFrame();
    }
  }

  setHoverCell(cell: { x: number; y: number } | null, previewTile: RacingTrackTile | null) {
    this.hoveredCell = cell;
    this.previewTile = previewTile;
    this.updateGhost();
    if (this.active) {
      this.renderFrame();
    }
  }

  zoomBy(multiplier: number) {
    this.zoom = THREE.MathUtils.clamp(this.zoom * multiplier, MIN_ZOOM, MAX_ZOOM);
    this.updateCamera();
    if (this.active) {
      this.renderFrame();
    }
  }

  panByPixels(deltaX: number, deltaY: number) {
    const width = Math.max(this.width, 1);
    const height = Math.max(this.height, 1);
    const visibleWidth = this.camera.right - this.camera.left;
    const visibleHeight = this.camera.top - this.camera.bottom;
    this.pan.x -= (deltaX / width) * visibleWidth;
    this.pan.y += (deltaY / height) * visibleHeight;
    this.updateCamera();
    if (this.active) {
      this.renderFrame();
    }
  }

  pickCell(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }
    const pointer = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    const intersection = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, intersection)) {
      return null;
    }
    const gridX = Math.round(intersection.x / GRID_STEP);
    const gridY = Math.round(intersection.z / GRID_STEP);
    const x = gridX + getDocumentGridOffset(this.document.size.width);
    const y = gridY + getDocumentGridOffset(this.document.size.height);
    if (x < 0 || y < 0 || x >= this.document.size.width || y >= this.document.size.height) {
      return null;
    }
    return { x, y };
  }

  async capturePreviewBlob(size = 1024) {
    const previewCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    const previousGhostVisibility = this.ghostRoot.visible;
    const previousOutlineVisibility = this.hoverOutline.visible;
    const previewRenderer = createDetachedPreviewRenderer({
      width: size,
      height: size,
      alpha: false,
      clearColor: EDITOR_SURFACE_COLOR,
      clearAlpha: 1,
      shadowMapEnabled: true,
    });

    const bounds = getDocumentBounds(this.document);
    this.ghostRoot.visible = false;
    this.hoverOutline.visible = false;
    configureOrthoCamera(previewCamera, {
      centerX: bounds.centerX,
      centerZ: bounds.centerZ,
      width: bounds.width,
      height: bounds.height,
      zoom: 1,
      aspect: 1,
    });
    previewRenderer.renderer.render(this.scene, previewCamera);

    const blob = await encodeCanvasPngBlob(previewRenderer.canvas);

    previewRenderer.dispose();
    this.ghostRoot.visible = previousGhostVisibility;
    this.hoverOutline.visible = previousOutlineVisibility;
    if (this.active) {
      this.renderFrame();
    }
    return blob;
  }

  renderFrame() {
    this.renderer.render(this.scene, this.camera);
  }

  private updateSurfaceGeometry() {
    const bounds = getDocumentBounds(this.document);
    this.ground.geometry.dispose();
    this.ground.geometry = new THREE.PlaneGeometry(bounds.width, bounds.height);
    this.ground.position.set(bounds.centerX, TRACK_Y - 0.14, bounds.centerZ);

    if (this.gridLines) {
      this.scene.remove(this.gridLines);
      disposeLineSegments(this.gridLines);
    }
    this.gridLines = createDocumentGridLines(this.document);
    this.scene.add(this.gridLines);
  }

  private updateTrackMeshes() {
    this.trackRoot.clear();

    const sortedTiles = [...this.document.tiles].sort((left, right) => {
      const leftDefinition = getTrackTileDefinition(left.tile);
      const rightDefinition = getTrackTileDefinition(right.tile);
      const leftCategory = leftDefinition?.category === 'track' ? 1 : 0;
      const rightCategory = rightDefinition?.category === 'track' ? 1 : 0;
      return leftCategory - rightCategory || left.y - right.y || left.x - right.x;
    });

    for (const tile of sortedTiles) {
      if (tile.tile === 'deco.empty') {
        continue;
      }
      const modelKey = MODEL_KEY_BY_TILE_ID[tile.tile];
      const template = this.models[modelKey];
      const root = template.clone(true);
      root.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      setRootMatrix(root, this.document, tile);
      this.trackRoot.add(root);
    }
  }

  private updateGhost() {
    this.ghostRoot.clear();
    const hovered = this.hoveredCell;
    this.hoverOutline.visible = Boolean(hovered);
    if (hovered) {
      this.hoverOutline.position.set(
        getWorldGridCoordinate(this.document.size.width, hovered.x) * GRID_STEP,
        TRACK_Y + 0.02,
        getWorldGridCoordinate(this.document.size.height, hovered.y) * GRID_STEP,
      );
    }

    if (!hovered || this.tool === 'erase') {
      return;
    }

    const ghostTile = this.previewTile ?? {
      x: hovered.x,
      y: hovered.y,
      tile: TOOL_GHOST_TILE[this.tool] ?? 'track.straight',
      rotation: this.rotation,
    };
    const modelKey = MODEL_KEY_BY_TILE_ID[ghostTile.tile];
    const template = this.models[modelKey];
    const ghost = template.clone(true);
    ghost.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) {
        return;
      }
      child.material = Array.isArray(child.material)
        ? child.material.map((material) =>
            cloneMaterialWithOpacity(material, 0.48, GHOST_TINT_BY_TOOL[this.tool]),
          )
        : cloneMaterialWithOpacity(child.material, 0.48, GHOST_TINT_BY_TOOL[this.tool]);
      child.castShadow = false;
      child.receiveShadow = false;
    });
    setRootMatrix(ghost, this.document, ghostTile);
    this.ghostRoot.add(ghost);
  }

  private updateCamera() {
    const bounds = getDocumentBounds(this.document);
    const aspect = this.width / Math.max(this.height, 1);
    configureOrthoCamera(this.camera, {
      centerX: bounds.centerX + this.pan.x,
      centerZ: bounds.centerZ + this.pan.y,
      width: bounds.width,
      height: bounds.height,
      zoom: this.zoom,
      aspect,
    });
  }
}
