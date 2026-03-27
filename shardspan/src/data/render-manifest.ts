import type { Transform12 } from './prefab-registry';

export type StaticRenderGroup = {
  key: string;
  prefabKey: string;
  modelPath: string;
  decorative: boolean;
  transforms: readonly Transform12[];
};

export const STATIC_RENDER_GROUPS = [
  {
    "key": "flag:res://models/flag.glb:5",
    "prefabKey": "flag",
    "modelPath": "res://models/flag.glb",
    "decorative": true,
    "transforms": [
      [
        0.707107,
        0,
        -0.707107,
        0,
        1,
        0,
        0.707107,
        0,
        0.707107,
        0,
        3.48077,
        -6
      ]
    ]
  },
  {
    "key": "platform_grass_large_round:res://models/grass-small.glb:3",
    "prefabKey": "platform_grass_large_round",
    "modelPath": "res://models/grass-small.glb",
    "decorative": true,
    "transforms": [
      [
        1,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        1,
        -8.2632,
        1.490424,
        -0.45341999999999993
      ],
      [
        1,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        1,
        -20.57368,
        1.490424,
        4.3785445
      ]
    ]
  },
  {
    "key": "platform_grass_large_round:res://models/grass.glb:4",
    "prefabKey": "platform_grass_large_round",
    "modelPath": "res://models/grass.glb",
    "decorative": true,
    "transforms": [
      [
        1,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        1,
        -5.6108899999999995,
        1.443581,
        -0.54867
      ],
      [
        -0.403434,
        0,
        0.915009,
        0,
        1,
        0,
        -0.915009,
        0,
        -0.403434,
        -6.092358,
        1.443581,
        -3.67143
      ],
      [
        1,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        1,
        -17.92137,
        1.443581,
        4.2832945
      ],
      [
        -0.403434,
        0,
        0.915009,
        0,
        1,
        0,
        -0.915009,
        0,
        -0.403434,
        -18.402838,
        1.443581,
        1.1605345000000002
      ]
    ]
  },
  {
    "key": "platform_grass_large_round:res://models/platform-grass-large-round.glb:2",
    "prefabKey": "platform_grass_large_round",
    "modelPath": "res://models/platform-grass-large-round.glb",
    "decorative": false,
    "transforms": [
      [
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
      [
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
      ]
    ]
  },
  {
    "key": "platform_medium:res://models/platform-medium.glb:1",
    "prefabKey": "platform_medium",
    "modelPath": "res://models/platform-medium.glb",
    "decorative": false,
    "transforms": [
      [
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
      [
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
      [
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
      [
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
      ]
    ]
  },
  {
    "key": "platform:res://models/platform.glb:0",
    "prefabKey": "platform",
    "modelPath": "res://models/platform.glb",
    "decorative": false,
    "transforms": [
      [
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
      [
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
      [
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
      [
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
      [
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
      [
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
      ]
    ]
  }
] satisfies readonly StaticRenderGroup[];
