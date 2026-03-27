import type {
  BoxShapeDefinition,
  ConcaveColliderDefinition,
  SphereShapeDefinition,
  Transform12,
} from './prefab-registry';

export type StaticPhysicsBody = {
  key: string;
  prefabKey: string;
  transform: Transform12;
  colliders: readonly (ConcaveColliderDefinition | BoxShapeDefinition | SphereShapeDefinition)[];
};

export const STATIC_PHYSICS_BODIES = [
  {
    "key": "platform",
    "prefabKey": "platform",
    "transform": [
      0.993085,
      0,
      -0.117399,
      0,
      1,
      0,
      0.117399,
      0,
      0.993085,
      0,
      0,
      0
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
          0.275,
          0
        ],
        "size": [
          2,
          0.55,
          2
        ]
      }
    ]
  },
  {
    "key": "platform4",
    "prefabKey": "platform",
    "transform": [
      0.993085,
      0,
      -0.117399,
      0,
      1,
      0,
      0.117399,
      0,
      0.993085,
      -15,
      0,
      4
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
          0.275,
          0
        ],
        "size": [
          2,
          0.55,
          2
        ]
      }
    ]
  },
  {
    "key": "platform5",
    "prefabKey": "platform",
    "transform": [
      0.993085,
      0,
      -0.117399,
      0,
      1,
      0,
      0.117399,
      0,
      0.993085,
      -21.925076,
      0.3466103,
      -2.6836262
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
          0.275,
          0
        ],
        "size": [
          2,
          0.55,
          2
        ]
      }
    ]
  },
  {
    "key": "platform6",
    "prefabKey": "platform",
    "transform": [
      0.9779442,
      0,
      0.20886743,
      0,
      1,
      0,
      -0.20886743,
      0,
      0.9779442,
      -22.07586,
      1.5132568,
      -4.765484
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
          0.275,
          0
        ],
        "size": [
          2,
          0.55,
          2
        ]
      }
    ]
  },
  {
    "key": "platform2",
    "prefabKey": "platform",
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
      -3,
      2,
      -3
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
          0.275,
          0
        ],
        "size": [
          2,
          0.55,
          2
        ]
      }
    ]
  },
  {
    "key": "platform3",
    "prefabKey": "platform",
    "transform": [
      0.966237,
      0,
      -0.257656,
      0,
      1,
      0,
      0.257656,
      0,
      0.966237,
      -3,
      3,
      -5
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
          0.275,
          0
        ],
        "size": [
          2,
          0.55,
          2
        ]
      }
    ]
  },
  {
    "key": "platform-medium",
    "prefabKey": "platform_medium",
    "transform": [
      0.996134,
      0,
      0.0878512,
      0,
      1,
      0,
      -0.0878512,
      0,
      0.996134,
      -3,
      0,
      0
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
          0.275,
          0
        ],
        "size": [
          3,
          0.55,
          3
        ]
      }
    ]
  },
  {
    "key": "platform-medium2",
    "prefabKey": "platform_medium",
    "transform": [
      0.995121,
      0,
      0.0986598,
      0,
      1,
      0,
      -0.0986598,
      0,
      0.995121,
      -5,
      0,
      4
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
          0.275,
          0
        ],
        "size": [
          3,
          0.55,
          3
        ]
      }
    ]
  },
  {
    "key": "platform-medium4",
    "prefabKey": "platform_medium",
    "transform": [
      0.929796,
      0,
      -0.368076,
      0,
      1,
      0,
      0.368076,
      0,
      0.929796,
      -14.9422,
      0.991941,
      0.128304
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
          0.275,
          0
        ],
        "size": [
          3,
          0.55,
          3
        ]
      }
    ]
  },
  {
    "key": "platform-medium3",
    "prefabKey": "platform_medium",
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
      3,
      -6
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
          0.275,
          0
        ],
        "size": [
          3,
          0.55,
          3
        ]
      }
    ]
  },
  {
    "key": "platform-grass-large-round",
    "prefabKey": "platform_grass_large_round",
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
      -7,
      1,
      -2
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
    ]
  },
  {
    "key": "platform-grass-large-round2",
    "prefabKey": "platform_grass_large_round",
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
      -19.31048,
      1,
      2.8319645
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
    ]
  }
] satisfies readonly StaticPhysicsBody[];
