import type { Transform12 } from './prefab-registry';

export type CapsuleColliderDefinition = {
  category: 'capsule';
  transform: Transform12;
  radius: number;
  height: number;
};

export const GAME_CONFIG = {
  "playerSpawnTransform": [
    1,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    1,
    0,
    0.49277484,
    0
  ],
  "viewTransform": [
    0.707107,
    -0.298836,
    0.640856,
    0,
    0.906308,
    0.422618,
    -0.707107,
    -0.298836,
    0.640856,
    0,
    0,
    0
  ],
  "cameraLocalTransform": [
    1,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    1,
    0,
    0,
    10
  ],
  "cameraFov": 40,
  "sunTransform": [
    -0.422618,
    -0.694272,
    0.582563,
    0,
    0.642788,
    0.766044,
    -0.906308,
    0.323744,
    -0.271654,
    0,
    0,
    0
  ],
  "sunShadowOpacity": 0.75,
  "environment": {
    "backgroundColor": [
      0.752941,
      0.776471,
      0.827451,
      1
    ],
    "ambientLightColor": [
      0.80999845,
      0.843779,
      0.9999983,
      1
    ],
    "toneMappingExposure": 0.9,
    "glowIntensity": 2,
    "adjustmentBrightness": 0.9,
    "adjustmentContrast": 1.1,
    "adjustmentSaturation": 1.1
  },
  "playerController": {
    "movementSpeed": 4.166666666666667,
    "jumpStrength": 7,
    "gravityAcceleration": 25,
    "fallResetY": -10,
    "velocityLerp": 10,
    "rotationLerp": 10,
    "modelScaleLerp": 10,
    "playerCollider": {
      "category": "capsule",
      "transform": [
        1,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        1,
        0,
        0.55,
        0
      ],
      "radius": 0.3,
      "height": 1
    }
  },
  "cameraController": {
    "zoomMinimum": 16,
    "zoomMaximum": 4,
    "zoomSpeed": 10,
    "rotationSpeed": 120,
    "positionLerp": 4,
    "rotationLerp": 6,
    "zoomLerp": 8,
    "pitchMin": -80,
    "pitchMax": -10,
    "defaultZoom": 10
  },
  "inputActions": {
    "move_right": true,
    "move_left": true,
    "move_forward": true,
    "move_back": true,
    "jump": true,
    "camera_left": true,
    "camera_right": true,
    "camera_up": true,
    "camera_down": true,
    "zoom_in": true,
    "zoom_out": true
  },
  "character": {
    "modelPath": "res://models/character.glb",
    "nodeOverrides": [
      {
        "path": "root/leg-left",
        "transform": [
          0.965926,
          0,
          0.258819,
          0,
          1,
          0,
          -0.258819,
          0,
          0.965926,
          0.125,
          0.17625,
          -0.02375
        ]
      },
      {
        "path": "root/leg-right",
        "transform": [
          0.965926,
          0,
          -0.258819,
          0,
          1,
          0,
          0.258819,
          0,
          0.965926,
          -0.125,
          0.17625,
          -0.02375
        ]
      },
      {
        "path": "root/torso",
        "transform": [
          1,
          0,
          0,
          0,
          0.996194,
          0.0871557,
          0,
          -0.0871557,
          0.996194,
          -1.80478e-15,
          0.17625,
          -0.02375
        ]
      },
      {
        "path": "root/torso/arm-left",
        "transform": [
          0.707107,
          0.707107,
          0,
          -0.707107,
          0.707107,
          0,
          0,
          0,
          1,
          0.3,
          0.175,
          0
        ]
      },
      {
        "path": "root/torso/arm-right",
        "transform": [
          0.707107,
          -0.707107,
          0,
          0.707107,
          0.707107,
          0,
          0,
          0,
          1,
          -0.3,
          0.1195,
          0
        ]
      },
      {
        "path": "root/torso/antenna",
        "transform": [
          1,
          0,
          0,
          0,
          0.999999,
          0,
          0,
          0,
          0.999999,
          0,
          0.6,
          0
        ]
      }
    ]
  }
} as const satisfies {
  playerSpawnTransform: Transform12;
  viewTransform: Transform12;
  cameraLocalTransform: Transform12;
  cameraFov: number;
  sunTransform: Transform12;
  sunShadowOpacity: number;
  environment: {
    backgroundColor: readonly [number, number, number, number];
    ambientLightColor: readonly [number, number, number, number];
    toneMappingExposure: number;
    glowIntensity: number;
    adjustmentBrightness: number;
    adjustmentContrast: number;
    adjustmentSaturation: number;
  };
  playerController: {
    movementSpeed: number;
    jumpStrength: number;
    gravityAcceleration: number;
    fallResetY: number;
    velocityLerp: number;
    rotationLerp: number;
    modelScaleLerp: number;
    playerCollider: CapsuleColliderDefinition;
  };
  cameraController: {
    zoomMinimum: number;
    zoomMaximum: number;
    zoomSpeed: number;
    rotationSpeed: number;
    positionLerp: number;
    rotationLerp: number;
    zoomLerp: number;
    pitchMin: number;
    pitchMax: number;
    defaultZoom: number;
  };
  inputActions: Record<string, boolean>;
  character: {
    modelPath: string;
    nodeOverrides: Array<{ path: string; transform: Transform12 }>;
  };
};
