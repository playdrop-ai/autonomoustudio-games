import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const source = fs.readFileSync(path.resolve("src/main.ts"), "utf8");
const body = source.match(/function buildEndlessCourseTemplates\(\): EndlessTemplate\[] \{\s*const curated: EndlessTemplate\[] = (\[.*?\]);\s*\n\s*const authored/s)?.[1];
assert(body, "Could not extract the curated endless course template array");

const templates = Function(`"use strict"; return ${body};`)();
assert.equal(templates.length, 10, "The authored opening set must retain ten curated chunks");

for (const [index, template] of templates.entries()) {
  const platform = template.platform;
  assert(platform && Number.isFinite(platform.y), `Template ${index} needs a finite platform y`);
  assert(Number.isFinite(platform.depth) && platform.depth >= 5 && platform.depth <= 11, `Template ${index} has an invalid depth`);
  assert(Number.isFinite(platform.height) && platform.height > 0, `Template ${index} has an invalid height`);
  for (const sliceable of template.sliceables ?? []) {
    assert(["apple", "watermelon", "brick", "sphere", "donut", "baguette", "sausage"].includes(sliceable.type), `Template ${index} contains an unapproved object type`);
    assert(Number.isFinite(sliceable.z) && sliceable.z > 0 && sliceable.z < platform.depth, `Template ${index} object falls outside its platform`);
    assert(Number.isInteger(sliceable.count ?? 1) && (sliceable.count ?? 1) > 0, `Template ${index} has an invalid stack count`);
  }
  assert((template.obstacles ?? []).length === 0, `Template ${index} must not introduce hazards into the simplified core`);
}

assert.deepEqual(templates.slice(0, 3).map((template) => template.platform.depth), [8, 9, 6], "Opening templates drifted");
assert.deepEqual(templates[0].sliceables, [{ type: "brick", y: 0.5, z: 1.4, count: 13 }], "First chunk must present the tall signature brick wall");
assert(source.includes("const openingSequence = [0, 1, 2];"), "Opening plan must be brick wall, fruit lane, then short brick wall");
assert(source.includes("const openingGaps = [1.8, 2, 2.2];"), "Opening gaps must preserve the learned two-tap cadence");
assert(source.includes(": 1.4 + Math.random() * 2.4;"), "Post-opening gap generator must stay inside the dense 1.4-3.8 range");
assert(source.includes("const authored = buildEndlessTemplatePool().filter"), "Endless must incorporate authored level chunks");
assert(source.includes("function chooseEndlessTemplateIndex(): number"), "Endless must sequence authored chunks into approach, dense, challenge, and recovery beats");
assert(source.includes("while (endlessCursorZ < knife.position.z + ENDLESS_GENERATE_AHEAD)"), "Endless generation must extend ahead of the player");
assert(source.includes("const cleanupZ = knife.position.z - ENDLESS_CLEANUP_BEHIND;"), "Endless generation must clean up safely behind the player");

console.log("[endless-generator-parity] passed");
