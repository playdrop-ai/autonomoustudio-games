import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.join(root, filePath), "utf8"));
}

function assertFile(filePath) {
  assert(fs.existsSync(path.join(root, filePath)), `Missing file: ${filePath}`);
}

function extractArraySection(source, declaration) {
  const match = source.match(new RegExp(`const ${declaration}[^=]*= \\[(.*?)\\n\\];`, "s"));
  assert(match, `Could not find ${declaration}`);
  return match[1];
}

function auditWorkspace() {
  const parentCataloguePath = path.join(root, "..", "catalogue.json");
  if (!fs.existsSync(parentCataloguePath)) return;
  const parentCatalogue = JSON.parse(fs.readFileSync(parentCataloguePath, "utf8"));
  assert(Object.keys(parentCatalogue).length === 0, "Workspace root catalogue.json must stay empty");
}

function auditCatalogue() {
  const pkg = readJson("package.json");
  const catalogue = readJson("catalogue.json");
  assert(Array.isArray(catalogue.apps) && catalogue.apps.length === 1, "Catalogue must contain one app");
  const app = catalogue.apps[0];

  assert(app.name === "chopline-rush", "Catalogue app name mismatch");
  assert(app.version === pkg.version && app.version === "1.1.0", "Endless-only release version must be 1.1.0");
  assert(app.type === "GAME", "Catalogue type must be GAME");
  assert(app.file === "dist/index.html", "Catalogue must point at dist/index.html");
  assert(app.visibility === "PUBLIC", "Catalogue visibility must be PUBLIC");
  assert(app.authMode === "OPTIONAL", "Catalogue auth mode must be OPTIONAL");
  assert(app.previewable === true, "Game must remain previewable");
  assert(app.surfaceTargets?.mobilePortrait === true, "Mobile portrait must be the primary supported surface");
  assert(app.surfaceTargets?.mobileLandscape === false, "Mobile landscape must stay disabled");
  assert(app.surfaceTargets?.desktop === true, "Desktop compatibility must remain available");

  const leaderboards = app.leaderboards ?? [];
  assert(leaderboards.length === 1 && leaderboards[0].key === "endless_score", "Only endless_score may be configured");
  assert(leaderboards[0].scoreType === "INTEGER" && leaderboards[0].sort === "DESC", "Endless leaderboard must rank integer scores descending");
  assert((app.achievements ?? []).length === 0, "The simplified product must not expose achievements");
  assert(JSON.stringify(app.design) === JSON.stringify({
    genre: "game-genre/arcade",
    coreGameplay: "core-gameplay/runner",
    perspective: "perspective/3d-third-person",
    controls: "game-controls/tap",
    visualStyle: "visual-style/stylized",
    progression: "game-progression/endless",
    feel: "game-feel/juicy",
  }), "Catalogue design tags must describe the portrait endless knife runner");

  assertFile(app.listing.icon);
  assertFile(app.listing.heroLandscape);
  assertFile(app.listing.heroPortrait);
  for (const media of [...(app.listing.screenshotsLandscape ?? []), ...(app.listing.screenshotsPortrait ?? [])]) assertFile(media);
}

function auditOwnedAssets(source) {
  const knifeSection = extractArraySection(source, "KNIVES");
  const modelPaths = Array.from(knifeSection.matchAll(/model: "([^"]+)"/g), (match) => match[1]);
  const imagePaths = Array.from(knifeSection.matchAll(/image: "([^"]+)"/g), (match) => match[1]);
  const sourceRefs = Array.from(knifeSection.matchAll(/sourceRef: "([^"]+)"/g), (match) => match[1]);
  assert(modelPaths.length === 6 && imagePaths.length === 6 && sourceRefs.length === 6, "Every knife must have a model, preview, and PlayDrop source ref");
  for (const filePath of [...modelPaths, ...imagePaths]) assertFile(filePath);
  assert(source.includes('const STARTER_KNIFE_ID = "cooking";'), "The two-tone cooking knife must be the starter model for silhouette readability");
  assert(source.includes('sourceAxis: "x"') && source.includes("bladeDirection: -1"), "Knife models must declare explicit visual axes and blade direction");
}

function auditEndlessContract(source) {
  assert(source.includes('let selectedMode: Mode = "endless";'), "The app must boot into endless mode");
  assert(source.includes("async function startRun(): Promise<void>") && source.includes("newRun(true);"), "Endless must be the only playable route");
  assert(source.includes('const openingSequence = [0, 1, 2, 3];'), "The curated opening sequence must remain deterministic");
  assert(source.includes("const openingGaps = [1.55, 1.1, 1.4, 1.6];"), "The learned opening cadence must remain deterministic");
  assert(source.includes(": 1.4 + Math.random() * 2.4;"), "Post-opening endless gaps must stay dense and inside the playable flip range");
  assert(source.includes("return curated;"), "Endless must use the reviewed authored chunk pool");
  assert(source.includes('sliceables: [{ type: "brick", y: 0.5, z: 1.4, count: 13 }]'), "The close opening brick wall is missing");
  assert(source.includes('{ type: "emoji", y: 0.5, z: 5.5 }') && source.includes('{ type: "camera", y: 0.5, z: 2.2 }'), "The observed orange, emoji, and camera opening beats are missing");
  assert(/function scoreForSlice\([^)]*\): number \{[\s\S]*?return 1;\s*\}/.test(source), "Every cut must be worth exactly one point");
  assert(source.includes("currentRun.coinsAwarded += 1;"), "Every cut must collect one coin");
  assert(source.includes("profile.coins += 1;"), "Collected coins must immediately update the persistent wallet");
  assert(source.includes('await platform.submitLeaderboard(LEADERBOARD_ENDLESS, profile.endlessBest);'), "Best endless score must submit to PlayDrop");
  assert(!source.includes("await platform.submitLeaderboard(LEADERBOARD_LEVEL"), "The removed level leaderboard must not submit");
  assert(source.includes('endlessTimer.style.display = "none";'), "Endless must not use the old survival timer");
}

function auditGameplayParity(source) {
  assert(source.includes("const FLIP_COOLDOWN = 0.4;"), "Taps must respect the 0.4s cooldown of the verified feel model");
  assert(source.includes("const BASE_FLIP_Y = 10;") && source.includes("const BASE_FLIP_Z = 8;"), "Launch impulse must stay 10 up / 8 forward");
  assert(source.includes("const GRAVITY = -20;") && source.includes("const ROTATION_SPEED = 7;"), "Gravity and rotation speed must stay -20 / 7");
  assert(source.includes("knife.velocity.set(0, BASE_FLIP_Y, BASE_FLIP_Z);"), "Every accepted tap must refresh launch velocity absolutely, never add partial lift");
  assert(source.includes("const minTarget = rotation + Math.PI;"), "Rotation targets must advance at least half a turn per tap");
  assert(source.includes("return n * Math.PI * 2 + ready;"), "Rotation targets must always land on the canonical blade-down angle");
  assert(source.includes("function nearestCanonicalAngle"), "Slice-lock must ease toward the nearest canonical angle");
  assert(source.includes("const SLICE_LOCK_MIN_ANGLE"), "Slice-lock entry must be gated by blade angle");
  assert(source.includes("knife.velocity.z = hasSiblingBelow ? 0 : knife.velocity.z * 0.3;"), "Slice-lock must stop forward travel and carve down through stacks");
  assert(source.includes("const SLICE_ROT_SPEED = 8;"), "Slice-lock rotation must ease at 8 rad/s");
  assert(source.includes("bladeWillHit"), "Handle-first contact must forgive cuts the blade would complete within a half turn");
  assert(source.includes("knife.velocity.z = -knife.velocity.z * 0.5;"), "Handle bounces must reverse and halve forward speed while preserving fall");
  assert(source.includes("function enterRotatingStick(platformEntity: PlatformEntity): void"), "Bad-angle blade landings must rotate into a stick");
  assert(source.includes("const MIN_STICK_ALIGNMENT = 0.3;"), "Stick alignment must reject blades pointing away from the face");
  assert(source.includes("const KNIFE_VISUAL_X = 0;"), "The knife must stay on the course centerline");
  assert(source.includes("readyAngle: (Math.PI * 2) / 3"), "Knife skins must use the blade-forward planted angle");
  assert(source.includes("knife.landingPunch = 0.75 + impactSpeed * 0.25;"), "Blade landings must have impact squash");
  assert(source.includes("spawnSlicePieces(slice);"), "A cut must spawn persistent physical halves");
  assert(source.includes("const FRAGMENT_GRAVITY = -15;"), "Cut halves must use the scripted slide/fall/settle fragment model");
  assert(source.includes('piece.phase = "falling";') && source.includes("lockPieceRestAngle(piece);"), "Fragments must slide off the edge, tumble, and settle");
  assert(source.includes('if (type === "brick") {'), "Brick walls need dedicated intact and split geometry");
  assert(source.includes("interiorColorForSlice(type, stackIndex)"), "Cut brick courses must expose authored interior colors");
  assert(source.includes("spawnScorePopup(position, points);"), "Cuts must show immediate +1 feedback");
  assert(source.includes("hitStopTime = Math.max(hitStopTime, 0.04);"), "Cut contact must hold a brief hit stop");
  assert(source.includes("startCameraShake("), "Cuts and landings must drive camera impact");
}

function auditShopContract(source) {
  const themeSection = extractArraySection(source, "THEMES");
  const themeIds = Array.from(themeSection.matchAll(/id: "([^"]+)"/g), (match) => match[1]);
  assert(JSON.stringify(themeIds) === JSON.stringify(["forest", "beach", "sunset"]), "Shop must contain exactly the three approved themes");
  assert(source.includes("profile.ownedThemes.push(theme.id);"), "Theme purchases must persist ownership");
  assert(source.includes("profile.equippedTheme = theme.id;"), "Theme selection must persist the active theme");
  assert(!source.includes('void platform.unlockAchievements(profile.ownedKnives.length'), "Knife upgrades must not call removed achievements");
}

function main() {
  auditWorkspace();
  auditCatalogue();
  const source = fs.readFileSync(path.join(root, "src/main.ts"), "utf8");
  auditOwnedAssets(source);
  auditEndlessContract(source);
  auditGameplayParity(source);
  auditShopContract(source);
  assertFile("SPECS.md");
  assertFile("dist/index.html");
  console.log("[content-audit] passed");
}

main();
