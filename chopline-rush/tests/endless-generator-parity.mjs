import fs from "node:fs";
import path from "node:path";

// Static audit of the zone-based endless generator: authored structure, escalation
// monotonicity, object-type allowlist, and assembly safeguards.

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const source = fs.readFileSync(path.join(root, "src/main.ts"), "utf8");

const zonesMatch = source.match(/function buildEndlessZones\(\): ZoneDef\[\] \{([\s\S]*?)\n  return zones;\n\}/);
assert(zonesMatch, "buildEndlessZones with an explicit zones return is missing");
const zonesSource = zonesMatch[1];

const zoneBlocks = [...zonesSource.matchAll(/name: "([^"]+)",\s*length: ([\d.]+),\s*gap: \[([\d.]+), ([\d.]+)\],\s*accent: 0x[0-9a-f]{6},/g)];
assert(zoneBlocks.length === 5, `Expected 5 authored zones, found ${zoneBlocks.length}`);

const expectedNames = ["Picnic Meadow", "Orchard Steps", "Brick Alley", "Windy Shelves", "Chef's Gauntlet"];
const names = zoneBlocks.map((match) => match[1]);
assert(JSON.stringify(names) === JSON.stringify(expectedNames), `Zone names drifted: ${JSON.stringify(names)}`);

let previousMin = 0;
let previousMax = 0;
for (const match of zoneBlocks) {
  const gapMin = Number(match[3]);
  const gapMax = Number(match[4]);
  assert(gapMin < gapMax, `Zone ${match[1]} gap range is inverted`);
  assert(gapMin >= previousMin && gapMax >= previousMax, `Zone ${match[1]} does not escalate gaps monotonically`);
  previousMin = gapMin;
  previousMax = gapMax;
}

const zoneParts = zonesSource.split(/name: "/).slice(1);
assert(zoneParts.length === 5, "Zone splitting failed");
const chunkCounts = zoneParts.map((zonePart) => (zonePart.match(/platform: \{/g) ?? []).length);
for (let index = 0; index < chunkCounts.length; index += 1) {
  assert(chunkCounts[index] >= 6, `Zone ${expectedNames[index]} has only ${chunkCounts[index]} chunks; minimum is 6`);
}

const allowedTypes = new Set(["brick", "orange", "emoji", "camera", "donut", "baguette", "sausage", "apple", "watermelon", "wooden_stake", "book", "cheese", "cube", "spikes"]);
for (const typeMatch of zonesSource.matchAll(/type: "([^"]+)"/g)) {
  assert(allowedTypes.has(typeMatch[1]), `Unexpected object type in zones: ${typeMatch[1]}`);
}

for (let index = 0; index < 2; index += 1) {
  assert(!zoneParts[index].includes("obstacles:"), `Zone ${expectedNames[index]} must stay obstacle-free`);
}

for (const depthMatch of zonesSource.matchAll(/depth: ([\d.]+)/g)) {
  const depth = Number(depthMatch[1]);
  assert(depth >= 4 && depth <= 12, `Chunk platform depth out of playable range: ${depth}`);
}

assert(source.includes("const openingSequence = [0, 1, 2, 3];"), "The authored opening sequence must stay deterministic");
assert(source.includes("const openingGaps = [1.55, 1.1, 1.4, 1.6];"), "The authored opening cadence must stay deterministic");
assert(source.includes('sliceables: [{ type: "brick", y: 0.5, z: 1.4, count: 13 }]'), "The signature opening brick wall is missing");
assert(source.includes("zone.gap[0] + Math.random() * (zone.gap[1] - zone.gap[0])"), "Gaps must come from the zone gap range");
assert(source.includes("endlessTailGapCreep"), "The final zone must creep difficulty over distance");
assert(source.includes("endlessLastChunkKey"), "Chunk selection must avoid immediate repeats");
assert(source.includes("endlessLastHadObstacle && chunkHasObstacles"), "Obstacle chunks must never spawn twice in a row");
assert(source.includes("const ENDLESS_GENERATE_AHEAD = 120;"), "Generate-ahead distance drifted");
assert(source.includes("const ENDLESS_CLEANUP_BEHIND = 60;"), "Cleanup-behind distance drifted");
assert(source.includes("function spawnZoneGate"), "Zone boundaries must spawn gates");

// Same-platform obstacles must leave a landing pocket wider than the blade's kill reach
for (const chunkMatch of zonesSource.matchAll(/obstacles: \[([\s\S]*?)\]/g)) {
  const positionsOnly = chunkMatch[1].replace(/rotation: \{[^}]*\}/g, "");
  const zs = [...positionsOnly.matchAll(/z: ([\d.]+)/g)].map((m) => Number(m[1])).sort((a, b) => a - b);
  for (let i = 1; i < zs.length; i += 1) {
    assert(zs[i] - zs[i - 1] >= 7, `Same-chunk spikes only ${(zs[i] - zs[i - 1]).toFixed(1)} apart; minimum spacing is 7 to avoid trap pockets`);
  }
}
assert(source.includes("function celebrateZone"), "Zone crossings must celebrate");

console.log("[endless-generator-parity] passed");
