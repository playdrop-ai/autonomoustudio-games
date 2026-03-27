import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const APP_NAME = 'starter-kit-3d-platformer';
const SOURCE_ROOT = path.resolve('source');
const OUTPUT_ROOT = path.resolve('src/data');
const MAIN_SCENE_PATH = path.join(SOURCE_ROOT, 'scenes/main.tscn');
const ENVIRONMENT_PATH = path.join(SOURCE_ROOT, 'scenes/main-environment.tres');
const PLAYER_SCENE_PATH = path.join(SOURCE_ROOT, 'objects/player.tscn');
const CHARACTER_SCENE_PATH = path.join(SOURCE_ROOT, 'objects/character.tscn');
const PLAYER_SCRIPT_PATH = path.join(SOURCE_ROOT, 'scripts/player.gd');
const VIEW_SCRIPT_PATH = path.join(SOURCE_ROOT, 'scripts/view.gd');
const PROJECT_PATH = path.join(SOURCE_ROOT, 'project.godot');
const LEVEL_OUTPUT_PATH = path.join(OUTPUT_ROOT, 'level-layout.ts');
const PREFAB_OUTPUT_PATH = path.join(OUTPUT_ROOT, 'prefab-registry.ts');
const COLLISION_OUTPUT_PATH = path.join(OUTPUT_ROOT, 'collision-shapes.ts');
const CONFIG_OUTPUT_PATH = path.join(OUTPUT_ROOT, 'game-config.ts');
const RENDER_MANIFEST_OUTPUT_PATH = path.join(OUTPUT_ROOT, 'render-manifest.ts');
const PHYSICS_MANIFEST_OUTPUT_PATH = path.join(OUTPUT_ROOT, 'physics-manifest.ts');
const IDENTITY_TRANSFORM = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0];

const PREFAB_PATH_BY_KEY = {
  platform: 'res://objects/platform.tscn',
  platform_medium: 'res://objects/platform_medium.tscn',
  platform_falling: 'res://objects/platform_falling.tscn',
  platform_grass_large_round: 'res://objects/platform_grass_large_round.tscn',
  coin: 'res://objects/coin.tscn',
  brick: 'res://objects/brick.tscn',
  cloud: 'res://objects/cloud.tscn',
  flag: 'res://models/flag.glb',
};

const WORLD_INSTANCE_KEYS = new Map(Object.entries(PREFAB_PATH_BY_KEY).map(([key, value]) => [value, key]));

const STATIC_RENDER_PREFABS = new Set(['platform', 'platform_medium', 'platform_grass_large_round', 'flag']);
const STATIC_PHYSICS_PREFABS = new Set(['platform', 'platform_medium', 'platform_grass_large_round']);
const SIMPLIFIED_BOX_PREFABS = new Set(['platform', 'platform_medium']);

const PREFAB_FILE_BY_KEY = {
  platform: path.join(SOURCE_ROOT, 'objects/platform.tscn'),
  platform_medium: path.join(SOURCE_ROOT, 'objects/platform_medium.tscn'),
  platform_falling: path.join(SOURCE_ROOT, 'objects/platform_falling.tscn'),
  platform_grass_large_round: path.join(SOURCE_ROOT, 'objects/platform_grass_large_round.tscn'),
  coin: path.join(SOURCE_ROOT, 'objects/coin.tscn'),
  brick: path.join(SOURCE_ROOT, 'objects/brick.tscn'),
  cloud: path.join(SOURCE_ROOT, 'objects/cloud.tscn'),
};

function transform12ToMatrix(transform) {
  const [xx, xy, xz, yx, yy, yz, zx, zy, zz, tx, ty, tz] = transform;
  return [
    xx, yx, zx, tx,
    xy, yy, zy, ty,
    xz, yz, zz, tz,
    0, 0, 0, 1,
  ];
}

function multiplyMatrices(left, right) {
  const output = new Array(16).fill(0);
  for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      for (let index = 0; index < 4; index += 1) {
        output[row * 4 + column] += left[row * 4 + index] * right[index * 4 + column];
      }
    }
  }
  return output;
}

function matrixToTransform12(matrix) {
  return [
    matrix[0], matrix[4], matrix[8],
    matrix[1], matrix[5], matrix[9],
    matrix[2], matrix[6], matrix[10],
    matrix[3], matrix[7], matrix[11],
  ];
}

function multiplyTransforms(left, right) {
  return matrixToTransform12(multiplyMatrices(transform12ToMatrix(left), transform12ToMatrix(right)));
}

function createTranslationTransform(x, y, z) {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1, x, y, z];
}

function computeVertexBounds(vertices) {
  const min = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  const max = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY];

  for (let index = 0; index < vertices.length; index += 3) {
    min[0] = Math.min(min[0], vertices[index]);
    min[1] = Math.min(min[1], vertices[index + 1]);
    min[2] = Math.min(min[2], vertices[index + 2]);
    max[0] = Math.max(max[0], vertices[index]);
    max[1] = Math.max(max[1], vertices[index + 1]);
    max[2] = Math.max(max[2], vertices[index + 2]);
  }

  return {
    center: [
      (min[0] + max[0]) * 0.5,
      (min[1] + max[1]) * 0.5,
      (min[2] + max[2]) * 0.5,
    ],
    size: [
      Math.max(0.01, max[0] - min[0]),
      Math.max(0.01, max[1] - min[1]),
      Math.max(0.01, max[2] - min[2]),
    ],
  };
}

function toLines(input) {
  return input.replace(/\r\n/g, '\n').split('\n');
}

function isNumberLiteral(value) {
  return /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value);
}

function parseQuotedString(value) {
  return JSON.parse(value);
}

function parseNumberList(value) {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => Number.parseFloat(entry));
}

function parseStringList(value) {
  const matches = value.match(/"([^"]*)"/g) ?? [];
  return matches.map((entry) => JSON.parse(entry));
}

function parseValue(value) {
  const trimmed = value.trim();

  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return parseQuotedString(trimmed);
  }
  if (trimmed === 'true') {
    return true;
  }
  if (trimmed === 'false') {
    return false;
  }
  if (isNumberLiteral(trimmed)) {
    return Number.parseFloat(trimmed);
  }
  if (trimmed.startsWith('ExtResource(')) {
    return { refType: 'ext', id: trimmed.slice(13, -2) };
  }
  if (trimmed.startsWith('SubResource(')) {
    return { refType: 'sub', id: trimmed.slice(13, -2) };
  }
  if (trimmed.startsWith('NodePath(')) {
    return trimmed.slice(10, -2);
  }
  if (trimmed.startsWith('PackedStringArray(')) {
    return parseStringList(trimmed);
  }
  if (trimmed.startsWith('PackedVector3Array(')) {
    return parseNumberList(trimmed.slice('PackedVector3Array('.length, -1));
  }
  if (trimmed.startsWith('Vector2(')) {
    return parseNumberList(trimmed.slice('Vector2('.length, -1));
  }
  if (trimmed.startsWith('Vector3(')) {
    return parseNumberList(trimmed.slice('Vector3('.length, -1));
  }
  if (trimmed.startsWith('Color(')) {
    return parseNumberList(trimmed.slice('Color('.length, -1));
  }
  if (trimmed.startsWith('Transform3D(')) {
    return parseNumberList(trimmed.slice('Transform3D('.length, -1));
  }
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed;
    }
  }
  return trimmed;
}

function parseHeaderAttributes(input) {
  const attributes = {};
  const pattern = /(\w+)=((?:"[^"]*")|(?:\[[^\]]*\])|(?:[A-Za-z_]+\([^)]*\))|(?:[^\s]+))/g;
  let match = pattern.exec(input);

  while (match) {
    attributes[match[1]] = parseValue(match[2]);
    match = pattern.exec(input);
  }

  return attributes;
}

function parseDocument(input) {
  const blocks = [];
  let current = null;

  for (const line of toLines(input)) {
    if (line.startsWith('[') && line.endsWith(']')) {
      if (current) {
        blocks.push(current);
      }
      current = {
        header: line.slice(1, -1),
        lines: [],
      };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    blocks.push(current);
  }

  const extResources = new Map();
  const subResources = new Map();
  const nodes = [];
  let resource = null;

  for (const block of blocks) {
    const separatorIndex = block.header.indexOf(' ');
    const blockType = separatorIndex === -1 ? block.header : block.header.slice(0, separatorIndex);
    const rawAttributes = separatorIndex === -1 ? '' : block.header.slice(separatorIndex + 1);
    const attributes = parseHeaderAttributes(rawAttributes);
    const properties = {};

    for (const line of block.lines) {
      if (!line.trim() || line.trimStart().startsWith(';')) {
        continue;
      }
      const propertyMatch = line.match(/^([^=]+?)\s*=\s*(.+)$/);
      if (!propertyMatch) {
        continue;
      }
      properties[propertyMatch[1].trim()] = parseValue(propertyMatch[2]);
    }

    if (blockType === 'ext_resource') {
      extResources.set(attributes.id, {
        type: attributes.type,
        path: attributes.path,
      });
      continue;
    }

    if (blockType === 'sub_resource') {
      subResources.set(attributes.id, {
        type: attributes.type,
        properties,
      });
      continue;
    }

    if (blockType === 'node') {
      nodes.push({
        ...attributes,
        properties,
      });
      continue;
    }

    if (blockType === 'resource') {
      resource = properties;
    }
  }

  const nodeByName = new Map(nodes.map((node) => [node.name, node]));

  return {
    extResources,
    subResources,
    nodes,
    nodeByName,
    resource,
  };
}

function readDocument(filePath) {
  return parseDocument(readFileSync(filePath, 'utf8'));
}

function ensureArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`[${APP_NAME}] ${label} is missing or invalid`);
  }
  return value;
}

function ensureNumber(value, label) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`[${APP_NAME}] ${label} is missing or invalid`);
  }
  return value;
}

function ensureSubResource(document, reference, label) {
  if (!reference || reference.refType !== 'sub') {
    throw new Error(`[${APP_NAME}] ${label} sub-resource reference missing`);
  }
  const resource = document.subResources.get(reference.id);
  if (!resource) {
    throw new Error(`[${APP_NAME}] ${label} sub-resource ${reference.id} missing`);
  }
  return resource;
}

function ensureExtResource(document, reference, label) {
  if (!reference || reference.refType !== 'ext') {
    throw new Error(`[${APP_NAME}] ${label} ext-resource reference missing`);
  }
  const resource = document.extResources.get(reference.id);
  if (!resource) {
    throw new Error(`[${APP_NAME}] ${label} ext-resource ${reference.id} missing`);
  }
  return resource;
}

function getTransform(node) {
  return Array.isArray(node.properties.transform) ? node.properties.transform : IDENTITY_TRANSFORM;
}

function getParentNode(document, node) {
  if (!node.parent || node.parent === '.') {
    return null;
  }
  return document.nodeByName.get(node.parent) ?? null;
}

function getLocalNodeTransform(document, node) {
  const parentNode = getParentNode(document, node);
  if (!parentNode) {
    return getTransform(node);
  }
  return multiplyTransforms(getLocalNodeTransform(document, parentNode), getTransform(node));
}

function getShapeDefinition(document, node, prefabKey) {
  const shape = ensureSubResource(document, node.properties.shape, `${prefabKey}:${node.name}:shape`);
  const transform = getLocalNodeTransform(document, node);

  if (shape.type === 'ConcavePolygonShape3D') {
    const points = ensureArray(shape.properties.data, `${prefabKey}:${node.name}:concaveData`);
    return {
      category: 'concave',
      transform,
      shapeId: `${prefabKey}:${node.name}:${shape.type}:${node.properties.shape.id}`,
      points,
    };
  }

  if (shape.type === 'BoxShape3D') {
    return {
      category: 'box',
      transform,
      size: ensureArray(shape.properties.size, `${prefabKey}:${node.name}:boxSize`),
    };
  }

  if (shape.type === 'SphereShape3D') {
    return {
      category: 'sphere',
      transform,
      radius: typeof shape.properties.radius === 'number' ? shape.properties.radius : 0.5,
    };
  }

  if (shape.type === 'CapsuleShape3D') {
    return {
      category: 'capsule',
      transform,
      radius: ensureNumber(shape.properties.radius, `${prefabKey}:${node.name}:capsuleRadius`),
      height: ensureNumber(shape.properties.height, `${prefabKey}:${node.name}:capsuleHeight`),
    };
  }

  throw new Error(`[${APP_NAME}] Unsupported shape ${shape.type} in ${prefabKey}:${node.name}`);
}

function inferVisualModelPath(document, node, prefabKey) {
  const ext = ensureExtResource(document, node.instance, `${prefabKey}:${node.name}:instance`);
  if (!ext.path.endsWith('.glb') && !ext.path.endsWith('.tscn')) {
    throw new Error(`[${APP_NAME}] Unsupported visual instance path ${ext.path} in ${prefabKey}`);
  }
  return ext.path;
}

function buildPrefabDefinition(prefabKey, document) {
  if (prefabKey === 'flag') {
    return {
      key: 'flag',
      visuals: [
        {
          modelPath: 'res://models/flag.glb',
          transform: IDENTITY_TRANSFORM,
        },
      ],
      colliders: [],
      triggers: [],
    };
  }

  const visuals = [];
  const colliders = [];
  const triggers = [];

  for (const node of document.nodes) {
    if (node.instance) {
      const modelPath = inferVisualModelPath(document, node, prefabKey);
      if (modelPath.endsWith('.glb')) {
        visuals.push({
          modelPath,
          transform: getLocalNodeTransform(document, node),
        });
      }
    }

    if (node.type !== 'CollisionShape3D') {
      continue;
    }

    const parentNode = getParentNode(document, node);
    const shape = getShapeDefinition(document, node, prefabKey);
    const isTrigger =
      (parentNode && parentNode.type === 'Area3D') ||
      (node.parent === '.' && document.nodes[0]?.type === 'Area3D') ||
      node.parent === 'BottomDetector';

    if (shape.category === 'capsule') {
      continue;
    }

    if (isTrigger) {
      triggers.push({
        role:
          prefabKey === 'platform_falling'
            ? 'falling-platform'
            : prefabKey === 'brick'
              ? 'brick-bottom'
              : 'coin-collect',
        ...shape,
      });
      continue;
    }

    colliders.push(shape);
  }

  if (prefabKey === 'coin' && visuals.length === 0) {
    visuals.push({
      modelPath: 'res://models/coin.glb',
      transform: IDENTITY_TRANSFORM,
    });
  }

  return {
    key: prefabKey,
    visuals,
    colliders,
    triggers,
  };
}

function buildPrefabRegistry() {
  const collisionShapes = {};
  const prefabs = {};

  for (const [prefabKey, filePath] of Object.entries(PREFAB_FILE_BY_KEY)) {
    const document = readDocument(filePath);
    const prefab = buildPrefabDefinition(prefabKey, document);

    for (const collider of prefab.colliders) {
      if (collider.category === 'concave') {
        collisionShapes[collider.shapeId] = collider.points;
        delete collider.points;
      }
    }

    prefabs[prefabKey] = prefab;
  }

  prefabs.flag = buildPrefabDefinition('flag', { nodes: [] });

  return { prefabs, collisionShapes };
}

function buildCharacterConfig() {
  const characterDocument = readDocument(CHARACTER_SCENE_PATH);
  const overrideNodes = characterDocument.nodes.filter((node) => Array.isArray(node.properties.transform));

  return {
    modelPath: 'res://models/character.glb',
    nodeOverrides: overrideNodes.map((node) => ({
      path: node.parent.replace(/^character\//, '') ? `${node.parent.replace(/^character\//, '')}/${node.name}` : node.name,
      transform: node.properties.transform,
    })),
  };
}

function parseNumericAssignment(input, identifier) {
  const pattern = new RegExp(`${identifier}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`);
  const match = input.match(pattern);
  if (!match) {
    throw new Error(`[${APP_NAME}] Missing numeric assignment for ${identifier}`);
  }
  return Number.parseFloat(match[1]);
}

function buildInputMap(projectText) {
  const sectionMatch = projectText.match(/\[input\]([\s\S]*?)\n\[/);
  if (!sectionMatch) {
    throw new Error(`[${APP_NAME}] Input section missing from project.godot`);
  }

  const section = sectionMatch[1];
  const actionMap = {};
  for (const action of ['move_right', 'move_left', 'move_forward', 'move_back', 'jump', 'camera_left', 'camera_right', 'camera_up', 'camera_down', 'zoom_in', 'zoom_out']) {
    if (!section.includes(`${action}={`)) {
      throw new Error(`[${APP_NAME}] Input action ${action} missing from project.godot`);
    }
    actionMap[action] = true;
  }

  return actionMap;
}

function buildGameConfig() {
  const mainDocument = readDocument(MAIN_SCENE_PATH);
  const environmentDocument = readDocument(ENVIRONMENT_PATH);
  const playerScene = readDocument(PLAYER_SCENE_PATH);
  const playerScript = readFileSync(PLAYER_SCRIPT_PATH, 'utf8');
  const viewScript = readFileSync(VIEW_SCRIPT_PATH, 'utf8');
  const projectText = readFileSync(PROJECT_PATH, 'utf8');

  const playerNode = mainDocument.nodeByName.get('Player');
  const viewNode = mainDocument.nodeByName.get('View');
  const cameraNode = mainDocument.nodeByName.get('Camera');
  const sunNode = mainDocument.nodeByName.get('Sun');

  if (!playerNode || !viewNode || !cameraNode || !sunNode) {
    throw new Error(`[${APP_NAME}] Main scene is missing one or more required nodes`);
  }

  const playerColliderNode = playerScene.nodes.find((node) => node.type === 'CollisionShape3D');
  if (!playerColliderNode) {
    throw new Error(`[${APP_NAME}] Player scene missing collision shape`);
  }
  const playerCollider = getShapeDefinition(playerScene, playerColliderNode, 'player');
  if (playerCollider.category !== 'capsule') {
    throw new Error(`[${APP_NAME}] Expected capsule collider for player scene`);
  }

  const environment = environmentDocument.resource;
  if (!environment) {
    throw new Error(`[${APP_NAME}] Environment resource missing`);
  }

  return {
    playerSpawnTransform: getTransform(playerNode),
    viewTransform: getTransform(viewNode),
    cameraLocalTransform: getTransform(cameraNode),
    cameraFov: ensureNumber(cameraNode.properties.fov, 'camera:fov'),
    sunTransform: getTransform(sunNode),
    sunShadowOpacity:
      typeof sunNode.properties.shadow_opacity === 'number' ? sunNode.properties.shadow_opacity : 1,
    environment: {
      backgroundColor: ensureArray(environment.background_color, 'environment:backgroundColor'),
      ambientLightColor: ensureArray(environment.ambient_light_color, 'environment:ambientLightColor'),
      toneMappingExposure: ensureNumber(environment.tonemap_exposure, 'environment:toneMappingExposure'),
      glowIntensity: ensureNumber(environment.glow_intensity, 'environment:glowIntensity'),
      adjustmentBrightness: ensureNumber(environment.adjustment_brightness, 'environment:adjustmentBrightness'),
      adjustmentContrast: ensureNumber(environment.adjustment_contrast, 'environment:adjustmentContrast'),
      adjustmentSaturation: ensureNumber(environment.adjustment_saturation, 'environment:adjustmentSaturation'),
    },
    playerController: {
      movementSpeed: parseNumericAssignment(playerScript, 'movement_speed') / 60,
      jumpStrength: parseNumericAssignment(playerScript, 'jump_strength'),
      gravityAcceleration: 25,
      fallResetY: -10,
      velocityLerp: 10,
      rotationLerp: 10,
      modelScaleLerp: 10,
      playerCollider,
    },
    cameraController: {
      zoomMinimum: parseNumericAssignment(viewScript, 'zoom_minimum'),
      zoomMaximum: parseNumericAssignment(viewScript, 'zoom_maximum'),
      zoomSpeed: parseNumericAssignment(viewScript, 'zoom_speed'),
      rotationSpeed: parseNumericAssignment(viewScript, 'rotation_speed'),
      positionLerp: 4,
      rotationLerp: 6,
      zoomLerp: 8,
      pitchMin: -80,
      pitchMax: -10,
      defaultZoom: 10,
    },
    inputActions: buildInputMap(projectText),
    character: buildCharacterConfig(),
  };
}

function buildLevelLayout() {
  const mainDocument = readDocument(MAIN_SCENE_PATH);
  const worldInstances = [];

  for (const node of mainDocument.nodes) {
    if (node.parent !== 'World' || !node.instance) {
      continue;
    }

    const extResource = ensureExtResource(mainDocument, node.instance, `main:${node.name}`);
    const prefabKey = WORLD_INSTANCE_KEYS.get(extResource.path);
    if (!prefabKey) {
      throw new Error(`[${APP_NAME}] Unsupported world instance ${node.name} -> ${extResource.path}`);
    }

    worldInstances.push({
      name: node.name,
      prefabKey,
      transform: getTransform(node),
    });
  }

  if (worldInstances.length !== 40) {
    throw new Error(`[${APP_NAME}] Expected 40 world instances, received ${worldInstances.length}`);
  }

  return worldInstances;
}

function simplifyStaticCollider(prefabKey, collider, collisionShapes) {
  if (collider.category !== 'concave' || !SIMPLIFIED_BOX_PREFABS.has(prefabKey)) {
    return collider;
  }

  const vertices = collisionShapes[collider.shapeId];
  if (!vertices) {
    throw new Error(`[${APP_NAME}] Missing collision shape ${collider.shapeId}`);
  }
  const bounds = computeVertexBounds(vertices);
  return {
    category: 'box',
    transform: multiplyTransforms(
      collider.transform,
      createTranslationTransform(bounds.center[0], bounds.center[1], bounds.center[2]),
    ),
    size: bounds.size,
  };
}

function buildStaticRenderGroups(levelLayout, prefabs) {
  const groups = new Map();

  for (const instance of levelLayout) {
    if (!STATIC_RENDER_PREFABS.has(instance.prefabKey)) {
      continue;
    }
    const prefab = prefabs[instance.prefabKey];
    if (!prefab) {
      throw new Error(`[${APP_NAME}] Missing prefab ${instance.prefabKey} for render manifest`);
    }

    for (const visual of prefab.visuals) {
      const groupKey = JSON.stringify({
        prefabKey: instance.prefabKey,
        modelPath: visual.modelPath,
      });
      let group = groups.get(groupKey);
      if (!group) {
        group = {
          key: `${instance.prefabKey}:${visual.modelPath}:${groups.size}`,
          prefabKey: instance.prefabKey,
          modelPath: visual.modelPath,
          decorative:
            instance.prefabKey === 'flag' || /\/grass(?:-small)?\.glb$/i.test(visual.modelPath),
          transforms: [],
        };
        groups.set(groupKey, group);
      }
      group.transforms.push(multiplyTransforms(instance.transform, visual.transform));
    }
  }

  return [...groups.values()].sort((left, right) => left.key.localeCompare(right.key));
}

function buildStaticPhysicsBodies(levelLayout, prefabs, collisionShapes) {
  return levelLayout
    .filter((instance) => STATIC_PHYSICS_PREFABS.has(instance.prefabKey))
    .map((instance) => {
      const prefab = prefabs[instance.prefabKey];
      if (!prefab) {
        throw new Error(`[${APP_NAME}] Missing prefab ${instance.prefabKey} for physics manifest`);
      }
      return {
        key: instance.name,
        prefabKey: instance.prefabKey,
        transform: instance.transform,
        colliders: prefab.colliders.map((collider) =>
          simplifyStaticCollider(instance.prefabKey, collider, collisionShapes),
        ),
      };
    })
    .filter((body) => body.colliders.length > 0);
}

function renderCollisionModule(collisionShapes) {
  const lines = Object.entries(collisionShapes)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([shapeId, values]) => `  ${JSON.stringify(shapeId)}: new Float32Array(${JSON.stringify(values)})`)
    .join(',\n');

  return `export const CONCAVE_COLLISION_SHAPES = {\n${lines}\n} as const;\n`;
}

function renderPrefabModule(prefabs) {
  return `export type Transform12 = readonly [
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

export const PREFABS = ${JSON.stringify(prefabs, null, 2)} satisfies Record<string, PrefabDefinition>;
`;
}

function renderLevelModule(levelLayout) {
  return `import type { Transform12 } from './prefab-registry';

export type LevelInstance = {
  name: string;
  prefabKey: string;
  transform: Transform12;
};

export const LEVEL_INSTANCES = ${JSON.stringify(levelLayout, null, 2)} satisfies readonly LevelInstance[];
`;
}

function renderStaticRenderManifest(staticRenderGroups) {
  return `import type { Transform12 } from './prefab-registry';

export type StaticRenderGroup = {
  key: string;
  prefabKey: string;
  modelPath: string;
  decorative: boolean;
  transforms: readonly Transform12[];
};

export const STATIC_RENDER_GROUPS = ${JSON.stringify(staticRenderGroups, null, 2)} satisfies readonly StaticRenderGroup[];
`;
}

function renderStaticPhysicsManifest(staticPhysicsBodies) {
  return `import type {
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

export const STATIC_PHYSICS_BODIES = ${JSON.stringify(staticPhysicsBodies, null, 2)} satisfies readonly StaticPhysicsBody[];
`;
}

function renderConfigModule(config) {
  return `import type { Transform12 } from './prefab-registry';

export type CapsuleColliderDefinition = {
  category: 'capsule';
  transform: Transform12;
  radius: number;
  height: number;
};

export const GAME_CONFIG = ${JSON.stringify(config, null, 2)} as const satisfies {
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
`;
}

function writeOrCheck(filePath, output, checkMode) {
  if (checkMode) {
    const existing = readFileSync(filePath, 'utf8');
    if (existing !== output) {
      throw new Error(`[${APP_NAME}] ${path.basename(filePath)} is stale. Run npm run convert.`);
    }
    return;
  }

  writeFileSync(filePath, output, 'utf8');
}

function main() {
  const checkMode = process.argv.includes('--check');
  const levelLayout = buildLevelLayout();
  const { prefabs, collisionShapes } = buildPrefabRegistry();
  const staticRenderGroups = buildStaticRenderGroups(levelLayout, prefabs);
  const staticPhysicsBodies = buildStaticPhysicsBodies(levelLayout, prefabs, collisionShapes);
  const config = buildGameConfig();

  const outputs = [
    [LEVEL_OUTPUT_PATH, `${renderLevelModule(levelLayout).trim()}\n`],
    [PREFAB_OUTPUT_PATH, `${renderPrefabModule(prefabs).trim()}\n`],
    [COLLISION_OUTPUT_PATH, `${renderCollisionModule(collisionShapes).trim()}\n`],
    [CONFIG_OUTPUT_PATH, `${renderConfigModule(config).trim()}\n`],
    [RENDER_MANIFEST_OUTPUT_PATH, `${renderStaticRenderManifest(staticRenderGroups).trim()}\n`],
    [PHYSICS_MANIFEST_OUTPUT_PATH, `${renderStaticPhysicsManifest(staticPhysicsBodies).trim()}\n`],
  ];

  for (const [filePath, output] of outputs) {
    writeOrCheck(filePath, output, checkMode);
  }

  if (checkMode) {
    console.log(`[${APP_NAME}] Conversion outputs are current.`);
    return;
  }

  for (const [filePath] of outputs) {
    console.log(`[${APP_NAME}] Wrote ${filePath}`);
  }
}

main();
