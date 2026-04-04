import {
  DESKTOP_CONTROL_HINTS_ID,
  DESKTOP_KEY_A_ID,
  DESKTOP_KEY_D_ID,
  DESKTOP_KEY_S_ID,
  DESKTOP_KEY_W_ID,
  DEBUG_MODE_SELECTOR,
  DEBUG_PANEL_ID,
  MODE_BAR_ID,
  MODE_MULTIPLAYER_BUTTON_ID,
  MODE_SOLO_BUTTON_ID,
  OVERLAY_STATUS_ID,
  PLAYER_LABEL_LAYER_ID,
  START_OVERLAY_ID,
  TOUCH_BRAKE_BUTTON_ID,
  TOUCH_CONTROLS_ID,
  TOUCH_GAS_BUTTON_ID,
  TOUCH_STEERING_KNOB_ID,
  TOUCH_STEERING_ZONE_ID,
  UNSUPPORTED_OVERLAY_ID,
  VEHICLE_PICKER_SELECTOR,
  VEHICLE_PICKER_SHELL_ID,
} from './constants';
import {
  type DesktopControlHintsElements,
  type DebugMode,
  type DebugToggleButtons,
  type OverlayUiElements,
  type TouchControlsElements,
  PLAYER_VEHICLE_IDS,
  type VehicleId,
  type VehiclePickerOptions,
  vehicleDisplayNameFromId,
} from './shared';

export function setUnsupportedOverlayVisible(visible: boolean) {
  const overlay = document.getElementById(UNSUPPORTED_OVERLAY_ID);
  if (!overlay) {
    throw new Error('[starter-kit-racing] #unsupported-overlay missing');
  }
  overlay.hidden = !visible;
}

export function setStartOverlayVisible(visible: boolean) {
  const overlay = document.getElementById(START_OVERLAY_ID);
  if (!overlay) {
    throw new Error('[starter-kit-racing] #start-overlay missing');
  }
  overlay.hidden = !visible;
}

export function getOverlayUiElements(): OverlayUiElements {
  const modeBar = document.getElementById(MODE_BAR_ID);
  const soloModeButton = document.getElementById(MODE_SOLO_BUTTON_ID);
  const multiplayerModeButton = document.getElementById(MODE_MULTIPLAYER_BUTTON_ID);
  const vehiclePickerShell = document.getElementById(VEHICLE_PICKER_SHELL_ID);
  const status = document.getElementById(OVERLAY_STATUS_ID);
  if (!(modeBar instanceof HTMLElement)) {
    throw new Error('[starter-kit-racing] #mode-bar missing');
  }
  if (!(soloModeButton instanceof HTMLButtonElement)) {
    throw new Error('[starter-kit-racing] #mode-solo-button missing');
  }
  if (!(multiplayerModeButton instanceof HTMLButtonElement)) {
    throw new Error('[starter-kit-racing] #mode-multiplayer-button missing');
  }
  if (!(vehiclePickerShell instanceof HTMLElement)) {
    throw new Error('[starter-kit-racing] #vehicle-picker-shell missing');
  }
  if (!(status instanceof HTMLElement)) {
    throw new Error('[starter-kit-racing] #overlay-status missing');
  }
  return {
    modeBar,
    soloModeButton,
    multiplayerModeButton,
    vehiclePickerShell,
    status,
  };
}

export function setModeBarVisible(elements: OverlayUiElements, visible: boolean) {
  elements.modeBar.hidden = !visible;
}

export function setModeSelection(elements: OverlayUiElements, selectedMode: 'solo' | 'multiplayer') {
  const soloSelected = selectedMode === 'solo';
  elements.soloModeButton.setAttribute('aria-pressed', soloSelected ? 'true' : 'false');
  elements.soloModeButton.classList.toggle('is-selected', soloSelected);
  elements.multiplayerModeButton.setAttribute('aria-pressed', soloSelected ? 'false' : 'true');
  elements.multiplayerModeButton.classList.toggle('is-selected', !soloSelected);
}

export function setOverlayStatus(elements: OverlayUiElements, message: string | null) {
  elements.status.hidden = !message;
  elements.status.textContent = message ?? '';
}

export function setVehiclePickerShellVisible(elements: OverlayUiElements, visible: boolean) {
  elements.vehiclePickerShell.hidden = !visible;
}

export function getPlayerLabelLayerElement() {
  const element = document.getElementById(PLAYER_LABEL_LAYER_ID);
  if (!(element instanceof HTMLElement)) {
    throw new Error('[starter-kit-racing] #player-label-layer missing');
  }
  return element;
}

export function setTouchControlsVisible(visible: boolean) {
  const touchControls = document.getElementById(TOUCH_CONTROLS_ID);
  if (!touchControls) {
    throw new Error('[starter-kit-racing] #touch-controls missing');
  }
  touchControls.hidden = !visible;
}

export function setDesktopControlHintsVisible(visible: boolean) {
  const desktopControlHints = document.getElementById(DESKTOP_CONTROL_HINTS_ID);
  if (!desktopControlHints) {
    throw new Error('[starter-kit-racing] #desktop-control-hints missing');
  }
  desktopControlHints.hidden = !visible;
}

export function setTouchDeviceMode(enabled: boolean) {
  document.body.classList.toggle('touch-device', enabled);
}

export function getDebugModeFromLocation(search: string): DebugMode {
  return new URLSearchParams(search).get('debug') === 'physics' ? 'physics' : 'render';
}

export function shouldShowDebugUi(search: string) {
  return new URLSearchParams(search).get('debugUi') === '1';
}

export function setDebugPanelVisible(visible: boolean) {
  const debugPanel = document.getElementById(DEBUG_PANEL_ID);
  if (!debugPanel) {
    throw new Error('[starter-kit-racing] #debug-panel missing');
  }
  debugPanel.hidden = !visible;
}

export function getTouchControlsElements(): TouchControlsElements {
  const container = document.getElementById(TOUCH_CONTROLS_ID);
  const steeringZone = document.getElementById(TOUCH_STEERING_ZONE_ID);
  const steeringKnob = document.getElementById(TOUCH_STEERING_KNOB_ID);
  const gasButton = document.getElementById(TOUCH_GAS_BUTTON_ID);
  const brakeButton = document.getElementById(TOUCH_BRAKE_BUTTON_ID);
  if (!(container instanceof HTMLElement)) {
    throw new Error('[starter-kit-racing] #touch-controls missing');
  }
  if (!(steeringZone instanceof HTMLElement)) {
    throw new Error('[starter-kit-racing] #touch-steering-zone missing');
  }
  if (!(steeringKnob instanceof HTMLElement)) {
    throw new Error('[starter-kit-racing] #touch-steering-knob missing');
  }
  if (!(gasButton instanceof HTMLElement)) {
    throw new Error('[starter-kit-racing] #touch-gas-button missing');
  }
  if (!(brakeButton instanceof HTMLElement)) {
    throw new Error('[starter-kit-racing] #touch-brake-button missing');
  }
  return {
    container,
    steeringZone,
    steeringKnob,
    gasButton,
    brakeButton,
  };
}

export function getDesktopControlHintsElements(): DesktopControlHintsElements {
  const container = document.getElementById(DESKTOP_CONTROL_HINTS_ID);
  const keyW = document.getElementById(DESKTOP_KEY_W_ID);
  const keyA = document.getElementById(DESKTOP_KEY_A_ID);
  const keyS = document.getElementById(DESKTOP_KEY_S_ID);
  const keyD = document.getElementById(DESKTOP_KEY_D_ID);
  if (!(container instanceof HTMLElement)) {
    throw new Error('[starter-kit-racing] #desktop-control-hints missing');
  }
  if (!(keyW instanceof HTMLElement)) {
    throw new Error('[starter-kit-racing] #desktop-key-w missing');
  }
  if (!(keyA instanceof HTMLElement)) {
    throw new Error('[starter-kit-racing] #desktop-key-a missing');
  }
  if (!(keyS instanceof HTMLElement)) {
    throw new Error('[starter-kit-racing] #desktop-key-s missing');
  }
  if (!(keyD instanceof HTMLElement)) {
    throw new Error('[starter-kit-racing] #desktop-key-d missing');
  }
  return {
    container,
    keyW,
    keyA,
    keyS,
    keyD,
  };
}

export function getDebugToggleButtons(): DebugToggleButtons {
  const buttons = Array.from(document.querySelectorAll(DEBUG_MODE_SELECTOR));
  const options = {} as Partial<DebugToggleButtons>;
  for (const element of buttons) {
    if (!(element instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-racing] debug toggle must use buttons');
    }
    const mode = element.dataset.debugMode;
    if (mode !== 'render' && mode !== 'physics') {
      throw new Error('[starter-kit-racing] invalid debug toggle button');
    }
    options[mode] = element;
  }
  if (!options.render || !options.physics) {
    throw new Error('[starter-kit-racing] missing debug toggle buttons');
  }
  return options as DebugToggleButtons;
}

export function setDebugModeSelection(options: DebugToggleButtons, selectedMode: DebugMode) {
  for (const mode of ['render', 'physics'] as const) {
    const button = options[mode];
    const selected = mode === selectedMode;
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    button.classList.toggle('is-selected', selected);
  }
}

export function isVehicleId(value: string): value is VehicleId {
  return PLAYER_VEHICLE_IDS.some((candidate) => candidate === value);
}

export function getVehiclePickerOptions(): VehiclePickerOptions {
  const buttons = Array.from(document.querySelectorAll(VEHICLE_PICKER_SELECTOR));
  const options = {} as Partial<VehiclePickerOptions>;
  for (const element of buttons) {
    if (!(element instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-racing] vehicle picker must use buttons');
    }
    const vehicleId = element.dataset.vehicleId;
    if (!vehicleId || !isVehicleId(vehicleId)) {
      throw new Error('[starter-kit-racing] invalid vehicle picker button');
    }
    const preview = element.querySelector('[data-vehicle-preview]');
    if (!(preview instanceof HTMLImageElement)) {
      throw new Error(`[starter-kit-racing] missing vehicle preview for ${vehicleId}`);
    }
    options[vehicleId] = { button: element, preview };
  }
  for (const vehicleId of PLAYER_VEHICLE_IDS) {
    if (!options[vehicleId]) {
      throw new Error(`[starter-kit-racing] missing vehicle picker button for ${vehicleId}`);
    }
  }
  return options as VehiclePickerOptions;
}

export function setVehiclePickerSelection(options: VehiclePickerOptions, selectedVehicleId: VehicleId | null) {
  for (const vehicleId of PLAYER_VEHICLE_IDS) {
    const selected = selectedVehicleId !== null && vehicleId === selectedVehicleId;
    options[vehicleId].button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    options[vehicleId].button.classList.toggle('is-selected', selected);
  }
}

export function setVehiclePickerPreviewImages(
  options: VehiclePickerOptions,
  previewImages: Record<VehicleId, string>,
) {
  for (const vehicleId of PLAYER_VEHICLE_IDS) {
    options[vehicleId].preview.src = previewImages[vehicleId];
    options[vehicleId].preview.alt = `${vehicleDisplayNameFromId(vehicleId)} preview`;
  }
}
