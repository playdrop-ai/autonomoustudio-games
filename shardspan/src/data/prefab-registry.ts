export type Transform12 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];

export type VisualDefinition = {
  modelPath: string;
  transform: Transform12;
};

export type ConcaveColliderDefinition = {
  category: 'concave';
  transform: Transform12;
  shapeId: string;
};

export type BoxShapeDefinition = {
  category: 'box';
  transform: Transform12;
  size: readonly [number, number, number];
};

export type SphereShapeDefinition = {
  category: 'sphere';
  transform: Transform12;
  radius: number;
};

export type TriggerDefinition =
  | ({ role: 'falling-platform' | 'brick-bottom' | 'coin-collect' } & BoxShapeDefinition)
  | ({ role: 'falling-platform' | 'brick-bottom' | 'coin-collect' } & SphereShapeDefinition);

export type PrefabDefinition = {
  key: string;
  visuals: VisualDefinition[];
  colliders: Array<ConcaveColliderDefinition | BoxShapeDefinition | SphereShapeDefinition>;
  triggers: TriggerDefinition[];
};

export const PREFABS = {
  "platform": {
    "key": "platform",
    "visuals": [
      {
        "modelPath": "res://models/platform.glb",
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
          0,
          0
        ]
      }
    ],
    "colliders": [
      {
        "category": "concave",
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
          0,
          0
        ],
        "shapeId": "platform:platform2_StaticBody3D#CollisionShape3D:ConcavePolygonShape3D:ConcavePolygonShape3D_hyw7p"
      }
    ],
    "triggers": []
  },
  "platform_medium": {
    "key": "platform_medium",
    "visuals": [
      {
        "modelPath": "res://models/platform-medium.glb",
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
          0,
          0
        ]
      }
    ],
    "colliders": [
      {
        "category": "concave",
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
          0,
          0
        ],
        "shapeId": "platform_medium:platform-medium2_StaticBody3D#CollisionShape3D:ConcavePolygonShape3D:ConcavePolygonShape3D_gwolp"
      }
    ],
    "triggers": []
  },
  "platform_falling": {
    "key": "platform_falling",
    "visuals": [
      {
        "modelPath": "res://models/platform-falling.glb",
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
          0,
          0
        ]
      }
    ],
    "colliders": [
      {
        "category": "concave",
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
          0,
          0
        ],
        "shapeId": "platform_falling:platform-falling2_StaticBody3D#CollisionShape3D:ConcavePolygonShape3D:ConcavePolygonShape3D_4mmvt"
      }
    ],
    "triggers": [
      {
        "role": "falling-platform",
        "category": "box",
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
          0.6,
          0
        ],
        "size": [
          2,
          0.1,
          2
        ]
      }
    ]
  },
  "platform_grass_large_round": {
    "key": "platform_grass_large_round",
    "visuals": [
      {
        "modelPath": "res://models/platform-grass-large-round.glb",
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
          0,
          0
        ]
      },
      {
        "modelPath": "res://models/grass-small.glb",
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
          -1.2632,
          0.490424,
          1.54658
        ]
      },
      {
        "modelPath": "res://models/grass.glb",
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
          1.38911,
          0.443581,
          1.45133
        ]
      },
      {
        "modelPath": "res://models/grass.glb",
        "transform": [
          -0.403434,
          0,
          0.915009,
          0,
          1,
          0,
          -0.915009,
          0,
          -0.403434,
          0.907642,
          0.443581,
          -1.67143
        ]
      }
    ],
    "colliders": [
      {
        "category": "concave",
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
          0,
          0
        ],
        "shapeId": "platform_grass_large_round:platform-grass-large-round2_StaticBody3D#CollisionShape3D:ConcavePolygonShape3D:ConcavePolygonShape3D_xh0ma"
      }
    ],
    "triggers": []
  },
  "coin": {
    "key": "coin",
    "visuals": [
      {
        "modelPath": "res://models/coin.glb",
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
          0,
          0
        ]
      }
    ],
    "colliders": [],
    "triggers": [
      {
        "role": "coin-collect",
        "category": "sphere",
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
          0.5,
          0
        ],
        "radius": 0.5
      }
    ]
  },
  "brick": {
    "key": "brick",
    "visuals": [
      {
        "modelPath": "res://models/brick.glb",
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
          0,
          0
        ]
      }
    ],
    "colliders": [
      {
        "category": "box",
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
          0.5,
          0
        ],
        "size": [
          1,
          1,
          1
        ]
      }
    ],
    "triggers": [
      {
        "role": "brick-bottom",
        "category": "box",
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
          -0.1,
          0
        ],
        "size": [
          0.5,
          0.25,
          0.5
        ]
      }
    ]
  },
  "cloud": {
    "key": "cloud",
    "visuals": [
      {
        "modelPath": "res://models/cloud.glb",
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
          0,
          0
        ]
      }
    ],
    "colliders": [],
    "triggers": []
  },
  "flag": {
    "key": "flag",
    "visuals": [
      {
        "modelPath": "res://models/flag.glb",
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
          0,
          0
        ]
      }
    ],
    "colliders": [],
    "triggers": []
  }
} satisfies Record<string, PrefabDefinition>;
