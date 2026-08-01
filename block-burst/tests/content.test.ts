import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const ROOT = new URL("..", import.meta.url).pathname;
const FORBIDDEN = [
  ["Puzzle", "Bricks"].join(" "),
  ["Puzzle", "Bricks"].join(""),
  ["Puzzle", "Bricks", "Legend"].join(" "),
  ["Color", "Block:", "Combo", "Blast"].join(" "),
  ["com", "puzzlegames", "puzzlebrickslegend"].join("."),
  ["I", "vy"].join(""),
  ["apk", "teardown"].join("-"),
  ["lib", "My", "Game"].join(""),
];

test("source and docs do not mention forbidden provenance labels", () => {
  const offenders: string[] = [];
  for (const file of walk(ROOT)) {
    if (!/\.(ts|md|json|html|mjs)$/.test(file)) continue;
    if (file.includes("/node_modules/") || file.includes("/dist/") || file.includes("/vendor/") || file.includes("/tmp/")) continue;
    const text = readFileSync(file, "utf8");
    for (const term of FORBIDDEN) {
      if (text.includes(term)) offenders.push(`${relative(ROOT, file)} contains ${term}`);
    }
  }
  assert.deepEqual(offenders, []);
});

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) yield* walk(path);
    else yield path;
  }
}
