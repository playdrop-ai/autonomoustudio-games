/// <reference types="playdrop-sdk-types" />

import type { PlaydropSDK } from 'playdrop-sdk-types';
import type { WebGLRenderer } from 'three';

import {
  DEFAULT_EDITOR_TRACK_SIZE,
  RACING_TRACK_ASSET_SPEC_REF,
  cloneTrackDocument,
  createBlankTrackDocument,
  createSquareTrackDocument,
  deriveTrackRuntime,
  getNormalizedTileRotation,
  getTrackTileDefinition,
  normalizeTrackDocument,
  validateTrackDocument,
  type RacingTrackDocument,
  type RacingTrackTile,
} from './track-core';
import { type EditorToolId, renderEditorToolPreviewImages, TrackEditorScene } from './editor-scene';
import { createMultiplayerRoomConfig, type LoadedTrackState } from './runtime-track';
import type { AssetBundle } from '../runtime/shared';

type VisibleEditorToolId = EditorToolId;
type MutationToolId = EditorToolId | 'erase';

type EditorTrackState = {
  source: LoadedTrackState['source'];
  document: RacingTrackDocument;
  assetRef: string | null;
  assetName: string | null;
  displayName: string | null;
  description: string | null;
};

type EditableRoadTile = {
  x: number;
  y: number;
  tile: 'track.finish' | 'track.straight' | 'track.corner';
  rotation: number;
  isFinish: boolean;
};

type EditableDecorationTile = {
  x: number;
  y: number;
  tile: 'deco.forest' | 'deco.tents';
  rotation: number;
};

type PersistedEditorSession = {
  version: 1;
  state: EditorTrackState;
};

type SaveModalState = {
  name: string;
  description: string;
  error: string | null;
};

type EditorView = {
  root: HTMLElement;
  stage: HTMLElement;
  toast: HTMLElement;
  toolButtons: Map<VisibleEditorToolId, HTMLButtonElement>;
  cancelButton: HTMLButtonElement;
  saveButton: HTMLButtonElement;
  modalOverlay: HTMLElement;
  modalForm: HTMLFormElement;
  modalNameInput: HTMLInputElement;
  modalDescriptionInput: HTMLTextAreaElement;
  modalError: HTMLElement;
  modalCancelButton: HTMLButtonElement;
  modalSaveButton: HTMLButtonElement;
};

export type CreateTrackEditorControllerOptions = {
  sdk: PlaydropSDK;
  renderer: WebGLRenderer;
  canvas: HTMLCanvasElement;
  tileModels: AssetBundle['tiles'];
  onCancelRequested: () => void;
  onSaveCompleted: (track: LoadedTrackState) => void | Promise<void>;
};

const EDITOR_STYLE_ID = 'starter-kit-racing-editor-style-v3';
const EDITOR_SESSION_STORAGE_KEY = 'starter-kit-racing-editor-session-v3';
const TOOL_ORDER: VisibleEditorToolId[] = ['road', 'finish', 'forest', 'tents'];
const TOOL_LABELS: Record<VisibleEditorToolId, string> = {
  road: 'Road',
  finish: 'Finish',
  forest: 'Forest',
  tents: 'Tent',
};
const ROAD_AUTOTILE = [
  { tile: 'track.straight', rotation: 0 },
  { tile: 'track.straight', rotation: 1 },
  { tile: 'track.straight', rotation: 1 },
  { tile: 'track.straight', rotation: 1 },
  { tile: 'track.straight', rotation: 0 },
  { tile: 'track.corner', rotation: 0 },
  { tile: 'track.corner', rotation: 1 },
  { tile: 'track.straight', rotation: 1 },
  { tile: 'track.straight', rotation: 0 },
  { tile: 'track.corner', rotation: 3 },
  { tile: 'track.corner', rotation: 2 },
  { tile: 'track.straight', rotation: 1 },
  { tile: 'track.straight', rotation: 0 },
  { tile: 'track.straight', rotation: 0 },
  { tile: 'track.straight', rotation: 0 },
  { tile: 'track.straight', rotation: 0 },
] as const satisfies ReadonlyArray<{
  tile: EditableRoadTile['tile'] | 'track.straight';
  rotation: number;
}>;
const DIRECTION_BITS = [
  { bit: 8, dx: 0, dy: -1, opposite: 4 },
  { bit: 4, dx: 0, dy: 1, opposite: 8 },
  { bit: 2, dx: 1, dy: 0, opposite: 1 },
  { bit: 1, dx: -1, dy: 0, opposite: 2 },
] as const;

function makeTileKey(x: number, y: number) {
  return `${x}:${y}`;
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  );
}

function slugifyTrackName(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'racing-track';
}

function createDraftAssetName(displayName: string | null | undefined) {
  const base = slugifyTrackName(displayName ?? '');
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function buildDuplicateDisplayName(value: string | null, fallbackAssetName: string) {
  const base = (value ?? '').trim() || fallbackAssetName;
  return `${base} Copy`;
}

function sortDocumentTiles(documentData: RacingTrackDocument): RacingTrackDocument {
  const tiles = [...documentData.tiles].sort((left, right) => {
    const leftCategory = getTrackTileDefinition(left.tile)?.category === 'track' ? 0 : 1;
    const rightCategory = getTrackTileDefinition(right.tile)?.category === 'track' ? 0 : 1;
    return leftCategory - rightCategory || left.y - right.y || left.x - right.x || left.tile.localeCompare(right.tile);
  });
  return {
    size: { ...documentData.size },
    tiles,
  };
}

function sanitizeEditorDocument(documentData: RacingTrackDocument): RacingTrackDocument {
  return sortDocumentTiles(createSquareTrackDocument({
    size: { ...documentData.size },
    tiles: documentData.tiles.map((tile) => ({
      x: tile.x,
      y: tile.y,
      tile: tile.tile,
      rotation: getNormalizedTileRotation(tile.tile, tile.rotation),
    })),
  }));
}

function shouldPersistEditorSession(state: EditorTrackState) {
  if (state.source !== 'draft') {
    return true;
  }
  const sanitized = sanitizeEditorDocument(state.document);
  const starter = sanitizeEditorDocument(createStarterTrackDocument(
    sanitized.size.width,
  ));
  return (
    (state.displayName?.trim().length ?? 0) > 0
    || (state.description?.trim().length ?? 0) > 0
    || JSON.stringify(sanitized) !== JSON.stringify(starter)
  );
}

function persistEditorSession(state: EditorTrackState | null) {
  if (state === null || !shouldPersistEditorSession(state)) {
    window.localStorage.removeItem(EDITOR_SESSION_STORAGE_KEY);
    return;
  }
  const payload: PersistedEditorSession = {
    version: 1,
    state: {
      source: state.source,
      document: sanitizeEditorDocument(state.document),
      assetRef: state.assetRef,
      assetName: state.assetName,
      displayName: state.displayName,
      description: state.description,
    },
  };
  window.localStorage.setItem(EDITOR_SESSION_STORAGE_KEY, JSON.stringify(payload));
}

function loadPersistedEditorSession(): EditorTrackState | null {
  const raw = window.localStorage.getItem(EDITOR_SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  const parsed = JSON.parse(raw) as Partial<PersistedEditorSession>;
  if (parsed.version !== 1 || !parsed.state) {
    throw new Error('[starter-kit-racing] Persisted editor draft is invalid');
  }
  const source = parsed.state.source;
  if (
    source !== 'draft'
    && source !== 'owned_asset'
    && source !== 'public_asset'
    && source !== 'stock'
  ) {
    throw new Error('[starter-kit-racing] Persisted editor draft uses an unsupported source');
  }
  return {
    source,
    document: sanitizeEditorDocument(normalizeTrackDocument(parsed.state.document)),
    assetRef: typeof parsed.state.assetRef === 'string' && parsed.state.assetRef.trim().length > 0
      ? parsed.state.assetRef
      : null,
    assetName: typeof parsed.state.assetName === 'string' && parsed.state.assetName.trim().length > 0
      ? parsed.state.assetName
      : null,
    displayName: typeof parsed.state.displayName === 'string' ? parsed.state.displayName : '',
    description: typeof parsed.state.description === 'string' ? parsed.state.description : null,
  };
}

function createStarterTrackDocument(size = DEFAULT_EDITOR_TRACK_SIZE): RacingTrackDocument {
  const documentData = createBlankTrackDocument(size, size);
  return {
    size: { ...documentData.size },
    tiles: documentData.tiles.map((tile) => ({
      x: tile.x,
      y: tile.y,
      tile: 'deco.forest',
      rotation: 0,
    })),
  };
}

function normalizeEditorErrorMessage(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  const message = raw.replace(/^\[starter-kit-racing\]\s*/i, '');
  const [code] = message.split(':', 1);
  switch (code) {
    case 'custom_asset_auth_required':
      return 'Sign in to save tracks.';
    case 'custom_asset_host_bridge_unavailable':
      return 'Track saving is unavailable in this session.';
    case 'custom_asset_spec_family_mismatch':
    case 'asset_kind_conflict':
      return 'This track slug collides with another asset.';
    case 'custom_asset_host_request_timeout':
      return 'Track save timed out.';
    default:
      return message;
  }
}

function buildStatusMessage(documentData: RacingTrackDocument) {
  const validation = validateTrackDocument(documentData);
  if (validation.ok) {
    return {
      valid: true,
      message: `Valid loop . ${documentData.size.width * documentData.size.height} mapped cells`,
    };
  }
  const firstIssue = validation.issues[0];
  const prefix = validation.issues.length === 1 ? '1 issue' : `${validation.issues.length} issues`;
  return {
    valid: false,
    message: `${prefix} . ${firstIssue?.message ?? 'Track is invalid'}`,
  };
}

function applyEditorStyles() {
  if (document.getElementById(EDITOR_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = EDITOR_STYLE_ID;
  style.textContent = `
    .editor-simple-app,
    .editor-simple-app * {
      box-sizing: border-box;
    }

    .editor-simple-app {
      position: fixed;
      inset: 0;
      z-index: 30;
      pointer-events: none;
    }

    .editor-simple-app[hidden] {
      display: none;
    }

    .editor-simple-stage {
      position: absolute;
      inset: 0;
      pointer-events: auto;
      cursor: crosshair;
    }

    .editor-simple-toolbar,
    .editor-simple-toast,
    .editor-simple-modal-card {
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      background: rgba(9, 15, 24, 0.9);
      border: 1px solid rgba(148, 163, 184, 0.18);
      box-shadow: 0 20px 60px rgba(2, 6, 23, 0.35);
      color: #f8fafc;
    }

    .editor-simple-toolbar {
      position: absolute;
      left: 50%;
      bottom: 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      transform: translateX(-50%);
      max-width: calc(100vw - 24px);
      padding: 10px 12px;
      border-radius: 22px;
      pointer-events: auto;
    }

    .editor-simple-tool-strip,
    .editor-simple-action-strip {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .editor-simple-divider {
      width: 1px;
      height: 48px;
      background: rgba(148, 163, 184, 0.2);
      flex-shrink: 0;
    }

    .editor-simple-tool-button,
    .editor-simple-action-button {
      position: relative;
      border: none;
      font: inherit;
      cursor: pointer;
    }

    .editor-simple-tool-button {
      width: 56px;
      height: 56px;
      padding: 6px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.05);
      outline: 1px solid rgba(148, 163, 184, 0.14);
      transition: transform 0.16s ease, background 0.16s ease, outline-color 0.16s ease;
    }

    .editor-simple-tool-button:hover:not(:disabled),
    .editor-simple-tool-button:focus-visible:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      outline-color: rgba(248, 212, 76, 0.5);
      transform: translateY(-1px);
    }

    .editor-simple-tool-button.is-active {
      background: rgba(248, 212, 76, 0.16);
      outline-color: rgba(248, 212, 76, 0.72);
    }

    .editor-simple-tool-button::after {
      content: attr(data-tooltip);
      position: absolute;
      left: 50%;
      bottom: calc(100% + 10px);
      transform: translateX(-50%) translateY(4px);
      padding: 6px 9px;
      border-radius: 999px;
      background: rgba(2, 6, 23, 0.96);
      color: #f8fafc;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.02em;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.14s ease, transform 0.14s ease;
    }

    .editor-simple-tool-button:hover::after,
    .editor-simple-tool-button:focus-visible::after {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    .editor-simple-tool-button img {
      width: 100%;
      height: 100%;
      display: block;
      border-radius: 12px;
      object-fit: cover;
      pointer-events: none;
    }

    .editor-simple-action-button {
      min-height: 48px;
      padding: 0 18px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.04);
      color: #f8fafc;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.03em;
      transition: background 0.16s ease, transform 0.16s ease;
    }

    .editor-simple-action-button:hover:not(:disabled),
    .editor-simple-action-button:focus-visible:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
      transform: translateY(-1px);
    }

    .editor-simple-action-button.is-brand {
      background: linear-gradient(135deg, #f8d44c 0%, #f97316 100%);
      color: #111827;
    }

    .editor-simple-action-button:disabled,
    .editor-simple-tool-button:disabled {
      opacity: 0.45;
      cursor: progress;
      transform: none;
    }

    .editor-simple-toast {
      position: absolute;
      left: 50%;
      bottom: 100px;
      transform: translateX(-50%);
      max-width: min(520px, calc(100vw - 36px));
      padding: 10px 16px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.4;
      text-align: center;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
    }

    .editor-simple-toast.show {
      opacity: 1;
    }

    .editor-simple-toast.is-error {
      background: rgba(74, 20, 24, 0.95);
    }

    .editor-simple-modal-overlay {
      position: absolute;
      inset: 0;
      z-index: 12;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(2, 6, 23, 0.58);
      pointer-events: auto;
    }

    .editor-simple-modal-overlay[hidden] {
      display: none;
    }

    .editor-simple-modal-card {
      width: min(420px, 100%);
      padding: 20px;
      border-radius: 24px;
    }

    .editor-simple-modal-card h2 {
      margin: 0 0 8px;
      font-size: 28px;
      line-height: 0.95;
      letter-spacing: -0.04em;
    }

    .editor-simple-modal-card p {
      margin: 0 0 18px;
      color: #cbd5e1;
      font-size: 13px;
      line-height: 1.45;
    }

    .editor-simple-modal-form {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .editor-simple-modal-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .editor-simple-modal-field label {
      color: #e2e8f0;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }

    .editor-simple-modal-field input,
    .editor-simple-modal-field textarea {
      width: 100%;
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.04);
      color: #f8fafc;
      font: inherit;
      font-size: 14px;
      line-height: 1.5;
      outline: none;
    }

    .editor-simple-modal-field input {
      min-height: 48px;
      padding: 0 14px;
    }

    .editor-simple-modal-field textarea {
      min-height: 112px;
      resize: vertical;
      padding: 12px 14px;
    }

    .editor-simple-modal-field input:focus,
    .editor-simple-modal-field textarea:focus {
      border-color: rgba(248, 212, 76, 0.58);
      box-shadow: 0 0 0 1px rgba(248, 212, 76, 0.22);
    }

    .editor-simple-modal-error {
      min-height: 18px;
      color: #fca5a5;
      font-size: 12px;
      line-height: 1.4;
    }

    .editor-simple-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 4px;
    }

    @media (max-width: 720px) {
      .editor-simple-toolbar {
        left: 12px;
        right: 12px;
        bottom: 12px;
        transform: none;
        justify-content: space-between;
        gap: 12px;
      }

      .editor-simple-tool-strip {
        gap: 8px;
      }

      .editor-simple-action-strip {
        gap: 8px;
      }

      .editor-simple-tool-button {
        width: 50px;
        height: 50px;
        border-radius: 14px;
      }

      .editor-simple-action-button {
        min-height: 44px;
        padding: 0 14px;
      }

      .editor-simple-toast {
        bottom: 88px;
      }

      .editor-simple-modal-overlay {
        padding: 14px;
      }
    }
  `;
  document.head.appendChild(style);
}

function createEditorView(previewImages: Record<VisibleEditorToolId, string>): EditorView {
  applyEditorStyles();

  const root = document.createElement('div');
  root.className = 'editor-simple-app';
  root.hidden = true;

  const stage = document.createElement('div');
  stage.className = 'editor-simple-stage';

  const toolbar = document.createElement('div');
  toolbar.className = 'editor-simple-toolbar';

  const toolStrip = document.createElement('div');
  toolStrip.className = 'editor-simple-tool-strip';

  const toolButtons = new Map<VisibleEditorToolId, HTMLButtonElement>();
  for (const tool of TOOL_ORDER) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'editor-simple-tool-button';
    button.dataset.tool = tool;
    button.dataset.tooltip = TOOL_LABELS[tool];
    button.setAttribute('aria-label', TOOL_LABELS[tool]);

    const image = document.createElement('img');
    image.src = previewImages[tool];
    image.alt = '';
    button.appendChild(image);

    toolStrip.appendChild(button);
    toolButtons.set(tool, button);
  }

  const divider = document.createElement('div');
  divider.className = 'editor-simple-divider';

  const actionStrip = document.createElement('div');
  actionStrip.className = 'editor-simple-action-strip';

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.className = 'editor-simple-action-button';
  cancelButton.textContent = 'Cancel';

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'editor-simple-action-button is-brand';
  saveButton.textContent = 'Save';

  actionStrip.append(cancelButton, saveButton);
  toolbar.append(toolStrip, divider, actionStrip);

  const toast = document.createElement('div');
  toast.className = 'editor-simple-toast';

  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'editor-simple-modal-overlay';
  modalOverlay.hidden = true;

  const modalCard = document.createElement('section');
  modalCard.className = 'editor-simple-modal-card';
  modalCard.addEventListener('click', (event) => event.stopPropagation());
  modalCard.innerHTML = `
    <h2>Save Track</h2>
    <p>Give this track a name before publishing it.</p>
    <form class="editor-simple-modal-form">
      <div class="editor-simple-modal-field">
        <label for="editor-simple-track-name">Track Name</label>
        <input id="editor-simple-track-name" name="track-name" type="text" maxlength="48" />
      </div>
      <div class="editor-simple-modal-field">
        <label for="editor-simple-track-description">Description</label>
        <textarea id="editor-simple-track-description" name="track-description" spellcheck="true"></textarea>
      </div>
      <div class="editor-simple-modal-error"></div>
      <div class="editor-simple-modal-actions">
        <button type="button" class="editor-simple-action-button" data-modal-cancel>Cancel</button>
        <button type="submit" class="editor-simple-action-button is-brand" data-modal-save>Save</button>
      </div>
    </form>
  `;
  modalOverlay.appendChild(modalCard);

  root.append(stage, toast, toolbar, modalOverlay);
  document.body.appendChild(root);

  const modalNameInput = modalCard.querySelector('#editor-simple-track-name');
  const modalDescriptionInput = modalCard.querySelector('#editor-simple-track-description');
  const modalError = modalCard.querySelector('.editor-simple-modal-error');
  const modalCancelButton = modalCard.querySelector('[data-modal-cancel]');
  const modalSaveButton = modalCard.querySelector('[data-modal-save]');
  const modalForm = modalCard.querySelector('.editor-simple-modal-form');

  if (
    !(modalForm instanceof HTMLFormElement) ||
    !(modalNameInput instanceof HTMLInputElement) ||
    !(modalDescriptionInput instanceof HTMLTextAreaElement) ||
    !(modalError instanceof HTMLElement) ||
    !(modalCancelButton instanceof HTMLButtonElement) ||
    !(modalSaveButton instanceof HTMLButtonElement)
  ) {
    throw new Error('[starter-kit-racing] Save modal chrome missing');
  }

  return {
    root,
    stage,
    toast,
    toolButtons,
    cancelButton,
    saveButton,
    modalOverlay,
    modalForm,
    modalNameInput,
    modalDescriptionInput,
    modalError,
    modalCancelButton,
    modalSaveButton,
  };
}

function toRoadMap(documentData: RacingTrackDocument) {
  const roadMap = new Map<string, EditableRoadTile>();
  for (const tile of documentData.tiles) {
    const definition = getTrackTileDefinition(tile.tile);
    if (!definition || definition.category !== 'track') {
      continue;
    }
    roadMap.set(makeTileKey(tile.x, tile.y), {
      x: tile.x,
      y: tile.y,
      tile: tile.tile as EditableRoadTile['tile'],
      rotation: getNormalizedTileRotation(tile.tile, tile.rotation),
      isFinish: tile.tile === 'track.finish',
    });
  }
  return roadMap;
}

function toDecorationMap(documentData: RacingTrackDocument) {
  const decorationMap = new Map<string, EditableDecorationTile>();
  for (const tile of documentData.tiles) {
    if (tile.tile !== 'deco.forest' && tile.tile !== 'deco.tents') {
      continue;
    }
    decorationMap.set(makeTileKey(tile.x, tile.y), {
      x: tile.x,
      y: tile.y,
      tile: tile.tile,
      rotation: getNormalizedTileRotation(tile.tile, tile.rotation),
    });
  }
  return decorationMap;
}

function rebuildTrackDocument(
  size: RacingTrackDocument['size'],
  roadMap: Map<string, EditableRoadTile>,
  decorationMap: Map<string, EditableDecorationTile>,
) {
  const documentData = createBlankTrackDocument(size.width, size.height);
  const tiles = documentData.tiles;
  for (let index = 0; index < tiles.length; index += 1) {
    const tile = tiles[index]!;
    const key = makeTileKey(tile.x, tile.y);
    const road = roadMap.get(key);
    if (road) {
      tiles[index] = {
        x: road.x,
        y: road.y,
        tile: road.isFinish ? 'track.finish' : road.tile,
        rotation: getNormalizedTileRotation(road.isFinish ? 'track.finish' : road.tile, road.rotation),
      };
      continue;
    }
    const decoration = decorationMap.get(key);
    if (decoration) {
      tiles[index] = {
        x: decoration.x,
        y: decoration.y,
        tile: decoration.tile,
        rotation: getNormalizedTileRotation(decoration.tile, decoration.rotation),
      };
    }
  }
  return sortDocumentTiles(documentData);
}

function getRoadExitMask(tile: Pick<EditableRoadTile, 'tile' | 'rotation'>) {
  const rotation = getNormalizedTileRotation(tile.tile, tile.rotation);
  if (tile.tile === 'track.corner') {
    switch (rotation) {
      case 0:
        return 5;
      case 1:
        return 6;
      case 2:
        return 10;
      case 3:
        return 9;
    }
  }
  return rotation % 2 === 0 ? 12 : 3;
}

function bitCount(mask: number) {
  return ((mask >> 3) & 1) + ((mask >> 2) & 1) + ((mask >> 1) & 1) + (mask & 1);
}

function getRoadConnectivityMask(roadMap: Map<string, EditableRoadTile>, x: number, y: number) {
  let mask = 0;
  for (const direction of DIRECTION_BITS) {
    const neighbor = roadMap.get(makeTileKey(x + direction.dx, y + direction.dy));
    if (!neighbor) {
      continue;
    }
    if (getRoadExitMask(neighbor) & direction.opposite) {
      mask |= direction.bit;
    }
  }
  return mask;
}

function getRoadPresenceMask(roadMap: Map<string, EditableRoadTile>, x: number, y: number) {
  let mask = 0;
  for (const direction of DIRECTION_BITS) {
    if (roadMap.has(makeTileKey(x + direction.dx, y + direction.dy))) {
      mask |= direction.bit;
    }
  }
  return mask;
}

function connectedExitCount(roadMap: Map<string, EditableRoadTile>, x: number, y: number) {
  const cell = roadMap.get(makeTileKey(x, y));
  if (!cell) {
    return 0;
  }
  return bitCount(getRoadExitMask(cell) & getRoadConnectivityMask(roadMap, x, y));
}

function pickBestPair(mask: number, roadMap: Map<string, EditableRoadTile>, x: number, y: number) {
  const active = DIRECTION_BITS.filter((direction) => mask & direction.bit);
  if (active.length <= 2) {
    return mask;
  }

  let bestMask = active[0]!.bit | active[1]!.bit;
  let bestScore = -1;
  let bestIsCorner = false;

  for (let leftIndex = 0; leftIndex < active.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < active.length; rightIndex += 1) {
      const left = active[leftIndex]!;
      const right = active[rightIndex]!;
      const pairMask = left.bit | right.bit;
      const isCorner = pairMask !== 3 && pairMask !== 12;
      const score =
        connectedExitCount(roadMap, x + left.dx, y + left.dy) +
        connectedExitCount(roadMap, x + right.dx, y + right.dy);
      if ((isCorner && !bestIsCorner) || (isCorner === bestIsCorner && score > bestScore)) {
        bestMask = pairMask;
        bestScore = score;
        bestIsCorner = isCorner;
      }
    }
  }

  return bestMask;
}

function getAvailableMask(roadMap: Map<string, EditableRoadTile>, x: number, y: number) {
  let mask = 0;
  for (const direction of DIRECTION_BITS) {
    const neighbor = roadMap.get(makeTileKey(x + direction.dx, y + direction.dy));
    if (!neighbor) {
      continue;
    }
    const exits = getRoadExitMask(neighbor);
    if (exits & direction.opposite) {
      mask |= direction.bit;
      continue;
    }
    if (bitCount(exits & getRoadConnectivityMask(roadMap, neighbor.x, neighbor.y)) < 2) {
      mask |= direction.bit;
    }
  }
  return mask;
}

function resolveRoadBaseFromMask(mask: number) {
  const resolved = ROAD_AUTOTILE[mask];
  if (!resolved) {
    throw new Error(`[starter-kit-racing] Unsupported road autotile mask ${mask}`);
  }
  return resolved;
}

function resolveRoadTile(roadMap: Map<string, EditableRoadTile>, x: number, y: number) {
  const connectivityMask = getRoadConnectivityMask(roadMap, x, y);
  if (connectivityMask !== 0) {
    return resolveRoadBaseFromMask(connectivityMask);
  }

  const presenceMask = getRoadPresenceMask(roadMap, x, y);
  if (presenceMask !== 0) {
    for (const direction of DIRECTION_BITS) {
      if (!(presenceMask & direction.bit)) {
        continue;
      }
      const neighbor = roadMap.get(makeTileKey(x + direction.dx, y + direction.dy));
      if (!neighbor) {
        continue;
      }
      const exits = getRoadExitMask(neighbor);
      return exits & 12
        ? { tile: 'track.straight' as const, rotation: 0 }
        : { tile: 'track.straight' as const, rotation: 1 };
    }
  }

  return resolveRoadBaseFromMask(0);
}

function resolveNewRoadTile(roadMap: Map<string, EditableRoadTile>, x: number, y: number) {
  const availableMask = getAvailableMask(roadMap, x, y);
  if (bitCount(availableMask) >= 3) {
    return resolveRoadBaseFromMask(pickBestPair(availableMask, roadMap, x, y));
  }
  return resolveRoadBaseFromMask(availableMask);
}

function resolveRoadCell(roadMap: Map<string, EditableRoadTile>, x: number, y: number, isNew = false) {
  const tile = roadMap.get(makeTileKey(x, y));
  if (!tile) {
    return;
  }

  const proposal = isNew ? resolveNewRoadTile(roadMap, x, y) : resolveRoadTile(roadMap, x, y);
  if (!isNew) {
    const currentConnected = getRoadExitMask(tile) & getRoadConnectivityMask(roadMap, x, y);
    if ((getRoadExitMask(proposal) & currentConnected) !== currentConnected) {
      return;
    }
  }

  if (tile.isFinish && proposal.tile !== 'track.straight') {
    return;
  }

  tile.tile = tile.isFinish ? 'track.finish' : proposal.tile;
  tile.rotation = proposal.rotation;
}

function resolveRoadCellAndNeighbors(roadMap: Map<string, EditableRoadTile>, x: number, y: number, isNew = false) {
  resolveRoadCell(roadMap, x, y, isNew);
  resolveRoadCell(roadMap, x, y - 1);
  resolveRoadCell(roadMap, x, y + 1);
  resolveRoadCell(roadMap, x + 1, y);
  resolveRoadCell(roadMap, x - 1, y);
}

function applyTrackTool(
  baseDocument: RacingTrackDocument,
  tool: MutationToolId,
  x: number,
  y: number,
) {
  const roadMap = toRoadMap(baseDocument);
  const decorationMap = toDecorationMap(baseDocument);
  const key = makeTileKey(x, y);

  switch (tool) {
    case 'road': {
      decorationMap.delete(key);
      if (roadMap.has(key)) {
        return rebuildTrackDocument(baseDocument.size, roadMap, decorationMap);
      }
      roadMap.set(key, {
        x,
        y,
        tile: 'track.straight',
        rotation: 0,
        isFinish: false,
      });
      resolveRoadCellAndNeighbors(roadMap, x, y, true);
      return rebuildTrackDocument(baseDocument.size, roadMap, decorationMap);
    }
    case 'finish': {
      decorationMap.delete(key);
      const currentFinish = Array.from(roadMap.values()).find((tile) => tile.isFinish) ?? null;
      if (currentFinish && (currentFinish.x !== x || currentFinish.y !== y)) {
        currentFinish.isFinish = false;
        currentFinish.tile = 'track.straight';
        resolveRoadCellAndNeighbors(roadMap, currentFinish.x, currentFinish.y);
      }

      const existing = roadMap.get(key);
      if (existing) {
        existing.isFinish = true;
        existing.tile = 'track.finish';
        resolveRoadCellAndNeighbors(roadMap, x, y);
      } else {
        roadMap.set(key, {
          x,
          y,
          tile: 'track.finish',
          rotation: 0,
          isFinish: true,
        });
        resolveRoadCellAndNeighbors(roadMap, x, y, true);
      }

      const placed = roadMap.get(key);
      if (!placed || placed.tile !== 'track.finish') {
        throw new Error('Finish line must sit on a straight road segment.');
      }
      return rebuildTrackDocument(baseDocument.size, roadMap, decorationMap);
    }
    case 'forest':
    case 'tents': {
      const road = roadMap.get(key);
      if (road?.isFinish) {
        throw new Error('Move the finish line before placing a decoration here.');
      }
      if (road) {
        roadMap.delete(key);
        resolveRoadCell(roadMap, x, y - 1);
        resolveRoadCell(roadMap, x, y + 1);
        resolveRoadCell(roadMap, x + 1, y);
        resolveRoadCell(roadMap, x - 1, y);
      }
      decorationMap.set(key, {
        x,
        y,
        tile: tool === 'forest' ? 'deco.forest' : 'deco.tents',
        rotation: 0,
      });
      return rebuildTrackDocument(baseDocument.size, roadMap, decorationMap);
    }
    case 'erase': {
      if (decorationMap.delete(key)) {
        return rebuildTrackDocument(baseDocument.size, roadMap, decorationMap);
      }
      const road = roadMap.get(key);
      if (!road || road.isFinish) {
        return rebuildTrackDocument(baseDocument.size, roadMap, decorationMap);
      }
      roadMap.delete(key);
      resolveRoadCell(roadMap, x, y - 1);
      resolveRoadCell(roadMap, x, y + 1);
      resolveRoadCell(roadMap, x + 1, y);
      resolveRoadCell(roadMap, x - 1, y);
      return rebuildTrackDocument(baseDocument.size, roadMap, decorationMap);
    }
  }
}

function getPreviewTileForTool(
  documentData: RacingTrackDocument,
  tool: VisibleEditorToolId,
  cell: { x: number; y: number } | null,
) {
  if (!cell) {
    return null;
  }
  try {
    const next = applyTrackTool(documentData, tool, cell.x, cell.y);
    return next.tiles.find((tile) => tile.x === cell.x && tile.y === cell.y) ?? null;
  } catch {
    return null;
  }
}

function showToast(view: EditorView, message: string, isError = false) {
  view.toast.textContent = message;
  view.toast.classList.add('show');
  view.toast.classList.toggle('is-error', isError);
  window.clearTimeout((showToast as { timer?: number }).timer);
  (showToast as { timer?: number }).timer = window.setTimeout(() => {
    view.toast.classList.remove('show');
    view.toast.classList.remove('is-error');
  }, 2600);
}

export async function createTrackEditorController({
  sdk,
  renderer,
  canvas,
  tileModels,
  onCancelRequested,
  onSaveCompleted,
}: CreateTrackEditorControllerOptions) {
  const previewImages = renderEditorToolPreviewImages(tileModels, renderer);
  const view = createEditorView(previewImages);
  const scene = new TrackEditorScene(renderer, canvas, tileModels);
  const trackApi = sdk.assets.custom.forSpec<RacingTrackDocument>(RACING_TRACK_ASSET_SPEC_REF);

  await scene.initialize();
  scene.resize(window.innerWidth, window.innerHeight);

  let editorState: EditorTrackState | null = null;
  let selectedTool: VisibleEditorToolId = 'road';
  let hoverCell: { x: number; y: number } | null = null;
  let busy = false;
  let visible = false;
  let spacePressed = false;
  let dragMode: 'pan' | 'paint' | null = null;
  let lastPointer = { x: 0, y: 0 };
  let saveModalState: SaveModalState | null = null;

  try {
    editorState = loadPersistedEditorSession();
  } catch (error) {
    console.error('[starter-kit-racing] failed to restore local editor draft', error);
    window.localStorage.removeItem(EDITOR_SESSION_STORAGE_KEY);
  }

  const requireEditorState = () => {
    if (!editorState) {
      throw new Error('[starter-kit-racing] Editor session is missing');
    }
    return editorState;
  };

  const syncModalUi = () => {
    const modalOpen = saveModalState !== null;
    view.modalOverlay.hidden = !modalOpen;
    if (!saveModalState) {
      return;
    }
    if (view.modalNameInput.value !== saveModalState.name) {
      view.modalNameInput.value = saveModalState.name;
    }
    if (view.modalDescriptionInput.value !== saveModalState.description) {
      view.modalDescriptionInput.value = saveModalState.description;
    }
    view.modalError.textContent = saveModalState.error ?? '';
    view.modalNameInput.disabled = busy;
    view.modalDescriptionInput.disabled = busy;
    view.modalCancelButton.disabled = busy;
    view.modalSaveButton.disabled = busy;
    view.modalSaveButton.textContent = busy ? 'Saving...' : 'Save';
  };

  const renderUi = () => {
    const modalOpen = saveModalState !== null;
    for (const [tool, button] of view.toolButtons) {
      button.classList.toggle('is-active', tool === selectedTool);
      button.disabled = busy || modalOpen;
    }
    view.cancelButton.disabled = busy || modalOpen;
    view.saveButton.disabled = busy || modalOpen;
    view.saveButton.textContent = busy ? 'Saving...' : 'Save';
    syncModalUi();
  };

  const refreshHoverPreview = () => {
    scene.setTool(selectedTool, 0);
    scene.setHoverCell(
      hoverCell,
      editorState
        ? getPreviewTileForTool(editorState.document, selectedTool, hoverCell)
        : null,
    );
  };

  const syncDocumentToScene = (resetView = false) => {
    if (!editorState) {
      return;
    }
    scene.setDocument(editorState.document);
    if (resetView) {
      scene.resetView(editorState.document);
    }
    refreshHoverPreview();
    renderUi();
  };

  const assignDocument = (
    source: EditorTrackState['source'],
    documentData: RacingTrackDocument,
    options: Partial<Omit<EditorTrackState, 'source' | 'document'>> = {},
    resetView = false,
  ) => {
    editorState = {
      source,
      document: sanitizeEditorDocument(cloneTrackDocument(documentData)),
      assetRef: options.assetRef ?? null,
      assetName: options.assetName ?? null,
      displayName: options.displayName ?? '',
      description: options.description ?? null,
    };
    persistEditorSession(editorState);
    syncDocumentToScene(resetView);
  };

  const ensureSession = () => {
    if (editorState) {
      return;
    }
    assignDocument('draft', createStarterTrackDocument(), {
      assetRef: null,
      assetName: null,
      displayName: '',
      description: null,
    }, true);
  };

  const clearSession = () => {
    editorState = null;
    hoverCell = null;
    saveModalState = null;
    persistEditorSession(null);
    scene.setHoverCell(null, null);
    renderUi();
  };

  const closeSaveModal = () => {
    saveModalState = null;
    renderUi();
  };

  const openSaveModal = () => {
    const state = requireEditorState();
    saveModalState = {
      name: state.displayName?.trim() ?? '',
      description: state.description ?? '',
      error: null,
    };
    renderUi();
    window.requestAnimationFrame(() => {
      view.modalNameInput.focus();
      view.modalNameInput.select();
    });
  };

  const promptLoginIfNeeded = async () => {
    if (sdk.me.isLoggedIn) {
      return true;
    }
    try {
      await sdk.me.promptLogin();
    } catch (error) {
      console.warn('[starter-kit-racing] track save login prompt did not complete', error);
    }
    return sdk.me.isLoggedIn;
  };

  const requireValidDocument = () => {
    const state = requireEditorState();
    const validDocument = sanitizeEditorDocument(state.document);
    const status = buildStatusMessage(validDocument);
    if (!status.valid) {
      throw new Error(status.message);
    }
    deriveTrackRuntime(validDocument);
    return validDocument;
  };

  const getPublishMetadata = () => {
    const state = requireEditorState();
    const displayName = state.displayName?.trim() ?? '';
    if (!displayName) {
      throw new Error('Track name is required.');
    }
    const assetName = state.assetName ?? createDraftAssetName(displayName);
    if (state.assetName !== assetName) {
      editorState = {
        ...state,
        assetName,
      };
      persistEditorSession(editorState);
    }
    return {
      assetName,
      displayName,
      description: state.description ?? '',
    };
  };

  const isMetadataRequired = (state: EditorTrackState) => state.source === 'draft' && !(state.displayName?.trim());

  const reportEditorError = (error: unknown) => {
    console.error('[starter-kit-racing] editor action failed', error);
    showToast(view, normalizeEditorErrorMessage(error), true);
  };

  const publishCurrentTrack = async () => {
    if (!sdk.me.isLoggedIn) {
      throw new Error('Sign in to save tracks.');
    }
    const validDocument = requireValidDocument();
    const metadata = getPublishMetadata();
    busy = true;
    renderUi();
    try {
      const preview = await scene.capturePreviewBlob();
      const result = await trackApi.publish({
        ...metadata,
        json: validDocument,
        preview,
      });
      const assetRef = result.version?.assetRef;
      if (!assetRef) {
        throw new Error('[starter-kit-racing] published track asset ref missing');
      }
      const savedTrack: LoadedTrackState = {
        source: 'owned_asset',
        document: normalizeTrackDocument(result.json),
        assetRef,
        assetName: result.asset.assetName,
        displayName: result.asset.displayName,
        description: result.asset.description,
        multiplayerRoomConfig: createMultiplayerRoomConfig(assetRef),
      };
      editorState = {
        source: savedTrack.source,
        document: sanitizeEditorDocument(cloneTrackDocument(savedTrack.document)),
        assetRef: savedTrack.assetRef,
        assetName: savedTrack.assetName,
        displayName: savedTrack.displayName,
        description: savedTrack.description,
      };
      persistEditorSession(editorState);
      await onSaveCompleted(savedTrack);
      clearSession();
    } finally {
      busy = false;
      renderUi();
    }
  };

  const handleSaveRequest = async () => {
    if (busy) {
      return;
    }
    const loggedIn = await promptLoginIfNeeded();
    if (!loggedIn) {
      return;
    }
    try {
      requireValidDocument();
    } catch (error) {
      reportEditorError(error);
      return;
    }
    const state = requireEditorState();
    if (isMetadataRequired(state)) {
      openSaveModal();
      return;
    }
    try {
      await publishCurrentTrack();
    } catch (error) {
      reportEditorError(error);
    }
  };

  const handleCancelRequest = () => {
    if (busy) {
      return;
    }
    clearSession();
    onCancelRequested();
  };

  const applyModalMetadata = () => {
    if (!saveModalState) {
      throw new Error('[starter-kit-racing] Save modal is not open');
    }
    const name = saveModalState.name.trim();
    if (!name) {
      saveModalState.error = 'Track name is required.';
      syncModalUi();
      return false;
    }
    const state = requireEditorState();
    editorState = {
      ...state,
      assetName: state.assetName ?? createDraftAssetName(name),
      displayName: name,
      description: saveModalState.description.trim() || null,
    };
    persistEditorSession(editorState);
    saveModalState = null;
    renderUi();
    return true;
  };

  const applyToolAtCell = (cell: { x: number; y: number }, overrideTool?: MutationToolId) => {
    const state = requireEditorState();
    const tool = overrideTool ?? selectedTool;
    const nextDocument = applyTrackTool(state.document, tool, cell.x, cell.y);
    assignDocument(
      state.source,
      nextDocument,
      {
        assetRef: state.assetRef,
        assetName: state.assetName,
        displayName: state.displayName,
        description: state.description,
      },
      false,
    );
  };

  const updateHoverFromEvent = (clientX: number, clientY: number) => {
    if (!visible || saveModalState) {
      return;
    }
    hoverCell = scene.pickCell(clientX, clientY);
    refreshHoverPreview();
  };

  if (editorState) {
    syncDocumentToScene(true);
  } else {
    renderUi();
  }

  for (const [tool, button] of view.toolButtons) {
    button.addEventListener('click', () => {
      if (!visible || busy || saveModalState) {
        return;
      }
      selectedTool = tool;
      refreshHoverPreview();
      renderUi();
    });
  }

  view.cancelButton.addEventListener('click', () => {
    handleCancelRequest();
  });

  view.saveButton.addEventListener('click', () => {
    void handleSaveRequest();
  });

  view.modalCancelButton.addEventListener('click', () => {
    if (busy) {
      return;
    }
    closeSaveModal();
  });

  view.modalOverlay.addEventListener('click', () => {
    if (busy || !saveModalState) {
      return;
    }
    closeSaveModal();
  });

  view.modalNameInput.addEventListener('input', () => {
    if (!saveModalState) {
      return;
    }
    saveModalState.name = view.modalNameInput.value;
    if (saveModalState.error) {
      saveModalState.error = null;
      syncModalUi();
    }
  });

  view.modalDescriptionInput.addEventListener('input', () => {
    if (!saveModalState) {
      return;
    }
    saveModalState.description = view.modalDescriptionInput.value;
  });

  view.modalForm.addEventListener('submit', (event) => {
    event.preventDefault();
    void (async () => {
      if (!applyModalMetadata()) {
        return;
      }
      try {
        await publishCurrentTrack();
      } catch (error) {
        reportEditorError(error);
      }
    })();
  });

  view.stage.addEventListener('contextmenu', (event) => {
    if (!visible) {
      return;
    }
    event.preventDefault();
  });

  view.stage.addEventListener(
    'wheel',
    (event) => {
      if (!visible || busy || saveModalState) {
        return;
      }
      event.preventDefault();
      scene.zoomBy(event.deltaY > 0 ? 1 / 1.08 : 1.08);
    },
    { passive: false },
  );

  view.stage.addEventListener('mousedown', (event) => {
    if (!visible || busy || !editorState || saveModalState) {
      return;
    }
    lastPointer = { x: event.clientX, y: event.clientY };
    updateHoverFromEvent(event.clientX, event.clientY);
    if (event.button === 1 || (event.button === 0 && spacePressed)) {
      dragMode = 'pan';
      return;
    }
    if (!hoverCell) {
      return;
    }
    dragMode = 'paint';
    try {
      applyToolAtCell(hoverCell, event.button === 2 ? 'erase' : undefined);
    } catch (error) {
      reportEditorError(error);
    }
  });

  window.addEventListener('mousemove', (event) => {
    if (!visible || busy || saveModalState) {
      return;
    }
    if (dragMode === 'pan') {
      scene.panByPixels(event.clientX - lastPointer.x, event.clientY - lastPointer.y);
      lastPointer = { x: event.clientX, y: event.clientY };
      return;
    }

    updateHoverFromEvent(event.clientX, event.clientY);
    if (dragMode === 'paint' && hoverCell && event.buttons !== 0) {
      try {
        applyToolAtCell(hoverCell, event.buttons === 2 ? 'erase' : undefined);
      } catch (error) {
        reportEditorError(error);
      }
    }
  });

  window.addEventListener('mouseup', () => {
    dragMode = null;
  });

  window.addEventListener('mouseleave', () => {
    dragMode = null;
    hoverCell = null;
    refreshHoverPreview();
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat || !visible) {
      return;
    }
    if (saveModalState && event.code === 'Escape') {
      event.preventDefault();
      if (!busy) {
        closeSaveModal();
      }
      return;
    }
    if (isEditableTarget(event.target)) {
      return;
    }
    if (event.code === 'Escape') {
      event.preventDefault();
      handleCancelRequest();
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      spacePressed = true;
    }
  });

  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') {
      spacePressed = false;
    }
  });

  return {
    openBlankTrack() {
      assignDocument('draft', createStarterTrackDocument(), {
        assetRef: null,
        assetName: null,
        displayName: '',
        description: null,
      }, true);
    },
    openRemixTrack(track: LoadedTrackState) {
      assignDocument(
        'draft',
        track.document,
        {
          assetRef: null,
          assetName: createDraftAssetName(buildDuplicateDisplayName(track.displayName, track.assetName ?? 'racing-track')),
          displayName: buildDuplicateDisplayName(track.displayName, track.assetName ?? 'racing-track'),
          description: track.description,
        },
        true,
      );
    },
    openOwnedTrack(track: LoadedTrackState) {
      assignDocument(
        'owned_asset',
        track.document,
        {
          assetRef: track.assetRef,
          assetName: track.assetName,
          displayName: track.displayName,
          description: track.description,
        },
        true,
      );
    },
    showCurrentSession() {
      ensureSession();
      visible = true;
      view.root.hidden = false;
      saveModalState = null;
      scene.setActive(true);
      refreshHoverPreview();
      renderUi();
      scene.renderFrame();
    },
    hide() {
      visible = false;
      dragMode = null;
      hoverCell = null;
      saveModalState = null;
      view.root.hidden = true;
      scene.setHoverCell(null, null);
      scene.setActive(false);
      renderUi();
    },
    resize(width: number, height: number) {
      scene.resize(width, height);
      if (visible) {
        refreshHoverPreview();
      }
    },
    renderFrame() {
      if (!visible) {
        return;
      }
      scene.renderFrame();
    },
  };
}
