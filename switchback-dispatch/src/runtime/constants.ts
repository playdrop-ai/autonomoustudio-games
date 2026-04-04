import * as THREE from 'three';

export const CANVAS_ID = 'game-canvas';
export const START_OVERLAY_ID = 'start-overlay';
export const MODE_BAR_ID = 'mode-bar';
export const MODE_SOLO_BUTTON_ID = 'mode-solo-button';
export const MODE_MULTIPLAYER_BUTTON_ID = 'mode-multiplayer-button';
export const OVERLAY_STATUS_ID = 'overlay-status';
export const VEHICLE_PICKER_SHELL_ID = 'vehicle-picker-shell';
export const UNSUPPORTED_OVERLAY_ID = 'unsupported-overlay';
export const PLAYER_LABEL_LAYER_ID = 'player-label-layer';
export const VEHICLE_PICKER_SELECTOR = '[data-vehicle-id]';
export const TOUCH_CONTROLS_ID = 'touch-controls';
export const TOUCH_STEERING_ZONE_ID = 'touch-steering-zone';
export const TOUCH_STEERING_KNOB_ID = 'touch-steering-knob';
export const TOUCH_GAS_BUTTON_ID = 'touch-gas-button';
export const TOUCH_BRAKE_BUTTON_ID = 'touch-brake-button';
export const DESKTOP_CONTROL_HINTS_ID = 'desktop-control-hints';
export const DESKTOP_KEY_W_ID = 'desktop-key-w';
export const DESKTOP_KEY_A_ID = 'desktop-key-a';
export const DESKTOP_KEY_S_ID = 'desktop-key-s';
export const DESKTOP_KEY_D_ID = 'desktop-key-d';
export const DEBUG_MODE_SELECTOR = '[data-debug-mode]';
export const DEBUG_PANEL_ID = 'debug-panel';

export const FIXED_DT = 1 / 60;
export const TRACK_SCALE = 0.75;
export const GRID_STEP = 9.99 * TRACK_SCALE;
export const GRID_HEIGHT = TRACK_SCALE;
export const TRACK_Y = -0.5;
export const SPHERE_RADIUS = 0.5;
export const VEHICLE_MODEL_OFFSET_Y = 0.84;
export const DRIVE_SPEED_FACTOR = 0.5;
export const TORQUE_MULTIPLIER = 162;
export const REVERSE_SPEED_FACTOR = 1 / 3;
export const CAMERA_LERP_SPEED = 4;
export const CAMERA_ZOOM_LERP_SPEED = 0.5;
export const CAMERA_ZOOM_NEAR_DISTANCE = 7.5;
export const CAMERA_ZOOM_FAR_DISTANCE = 10.5;
export const DRIFT_THRESHOLD = 0.25;
export const MAP_CAMERA_MARGIN = GRID_STEP * 1.75;
export const MAP_CAMERA_HEIGHT = 40;
export const VEHICLE_MODEL_SCALE = 0.5;
export const AO_RESOLUTION_SCALE = 0.75;
export const AO_BLEND_INTENSITY = 0.55;
export const BLOOM_THRESHOLD = 0.97;
export const BLOOM_STRENGTH = 0.05;
export const BLOOM_RADIUS = 0.18;
export const AMBIENT_FILL_INTENSITY = 0.42;
export const SUN_LIGHT_INTENSITY = 1.15;
export const SUN_SHADOW_INTENSITY = 0.58;
export const GAMEPAD_DEADZONE = 0.15;
export const GAMEPAD_MENU_DEADZONE = 0.5;
export const STEERING_DRAG_RANGE = 60;
export const STEERING_KNOB_TRAVEL = 40;

export const DEBUG_BACKGROUND_COLOR = new THREE.Color(0x0b1220);
export const VEHICLE_BODY_REST_POSITION = new THREE.Vector3(0, 0.2, 0);
export const VEHICLE_BODY_BOUNCE_POSITION = new THREE.Vector3(0, 0.1, 0);
export const GODOT_BACKGROUND_COLOR = new THREE.Color(0.6756064, 0.76438403, 0.97408944);
export const GODOT_AMBIENT_COLOR = new THREE.Color(0.6144546, 0.7034585, 0.81702733);

export const START_SPHERE_POSITION = new THREE.Vector3(0, 0.5, GRID_STEP);
export const WORLD_UP = new THREE.Vector3(0, 1, 0);

export const CAMERA_RIG_QUATERNION = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().set(
    0.707107,
    -0.40558,
    0.579228,
    0,
    0,
    0.819152,
    0.573576,
    0,
    -0.707107,
    -0.40558,
    0.579228,
    0,
    0,
    0,
    0,
    1,
  ),
);

export const CAMERA_OFFSET = new THREE.Vector3(0, 0, 16).applyQuaternion(CAMERA_RIG_QUATERNION);
export const SUN_POSITION_DIRECTION = new THREE.Vector3(0.582564, 0.766044, -0.271654).normalize();

export const TRACK_KIND_TO_MODEL = {
  empty: 'empty',
  forest: 'forest',
  tents: 'tents',
  corner: 'corner',
  finish: 'finish',
  straight: 'straight',
} as const;

const GODOT_ORTHO_BASES = [
  [1, 0, 0, 0, 1, 0, 0, 0, 1],
  [0, -1, 0, 1, 0, 0, 0, 0, 1],
  [-1, 0, 0, 0, -1, 0, 0, 0, 1],
  [0, 1, 0, -1, 0, 0, 0, 0, 1],
  [1, 0, 0, 0, 0, -1, 0, 1, 0],
  [0, 0, 1, 1, 0, 0, 0, 1, 0],
  [-1, 0, 0, 0, 0, 1, 0, 1, 0],
  [0, 0, -1, -1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, -1, 0, 0, 0, -1],
  [0, 1, 0, 1, 0, 0, 0, 0, -1],
  [-1, 0, 0, 0, 1, 0, 0, 0, -1],
  [0, -1, 0, -1, 0, 0, 0, 0, -1],
  [1, 0, 0, 0, 0, 1, 0, -1, 0],
  [0, 0, -1, 1, 0, 0, 0, -1, 0],
  [-1, 0, 0, 0, 0, -1, 0, -1, 0],
  [0, 0, 1, -1, 0, 0, 0, -1, 0],
  [0, 0, 1, 0, 1, 0, -1, 0, 0],
  [0, -1, 0, 0, 0, 1, -1, 0, 0],
  [0, 0, -1, 0, -1, 0, -1, 0, 0],
  [0, 1, 0, 0, 0, -1, -1, 0, 0],
  [0, 0, 1, 0, -1, 0, 1, 0, 0],
  [0, 1, 0, 0, 0, 1, 1, 0, 0],
  [0, 0, -1, 0, 1, 0, 1, 0, 0],
  [0, -1, 0, 0, 0, -1, 1, 0, 0],
] as const;

export const GODOT_ORTHO_MATRICES = GODOT_ORTHO_BASES.map((basis) =>
  new THREE.Matrix4().set(
    basis[0],
    basis[1],
    basis[2],
    0,
    basis[3],
    basis[4],
    basis[5],
    0,
    basis[6],
    basis[7],
    basis[8],
    0,
    0,
    0,
    0,
    1,
  ),
);

export const MODEL_URLS = {
  decorationEmpty: './assets/models/decoration-empty.glb',
  vehicleTruckYellow: './assets/models/vehicle-truck-yellow.glb',
  vehicleTruckRed: './assets/models/vehicle-truck-red.glb',
  vehicleTruckGreen: './assets/models/vehicle-truck-green.glb',
  vehicleTruckPurple: './assets/models/vehicle-truck-purple.glb',
  vehicleMotorcycle: './assets/models/vehicle-motorcycle.glb',
  decorationForest: './assets/models/decoration-forest.glb',
  decorationTents: './assets/models/decoration-tents.glb',
  trackCorner: './assets/models/track-corner.glb',
  trackFinish: './assets/models/track-finish.glb',
  trackStraight: './assets/models/track-straight.glb',
  smoke: './assets/sprites/smoke.png',
  audioTruckEngine: './assets/audio/engine.ogg',
  audioMotorcycleEngine: './assets/audio/engine-motorcycle.ogg',
  audioSkid: './assets/audio/skid.ogg',
  audioImpact: './assets/audio/impact.ogg',
} as const;
