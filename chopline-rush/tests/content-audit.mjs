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
  assert(source.includes('const STARTER_KNIFE_ID = "chopping";'), "The supplied chopping knife must remain the starter model");
  assert(source.includes('sourceAxis: "x"') && source.includes("bladeDirection: -1"), "Knife models must declare explicit visual axes and blade direction");
}

function auditEndlessContract(source) {
  assert(source.includes('let selectedMode: Mode = "endless";'), "The app must boot into endless mode");
  assert(source.includes('newRun("endless", 0, true);'), "Endless must be the direct playable route");
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
  assert(source.includes("const FLIP_COOLDOWN = 0.28;"), "Repeated taps must reject accidental sub-280ms double taps");
  assert(source.includes("const TAP_ROTATION_ANGLE = Math.PI * 1.5;"), "Each controlled flip must target the reference 270-degree contact pose");
  assert(source.includes("Math.max(0, knife.velocity.y) + AIR_TAP_LIFT"), "Air taps must add bounded lift without stair-stepping above the course");
  assert(source.includes("knife.rotation + TAP_ROTATION_ANGLE"), "Air taps must add another visible rotation");
  assert(source.includes("const KNIFE_VISUAL_X = 0;"), "The knife must stay on the course centerline");
  assert(source.includes("readyAngle: (Math.PI * 2) / 3"), "Knife skins must use the blade-forward planted angle");
  assert(!source.includes("qualifiesInitialCut"), "Blade contact must not be rejected by hidden speed or progress gates");
  assert(source.includes("function getCuttingBladeOBBAt"), "Sliceables must use a cutting region that excludes the hilt");
  assert(source.includes("function contactTimesById("), "Blade and handle collisions must be resolved per physical target by contact order");
  assert(source.includes("CUT_CONTACT_TIME_EPSILON"), "Simultaneous blade and handle overlap needs a deterministic blade-first tolerance");
  assert(source.includes("function stageHandleSliceProof(): void"), "Handle-only target contact must have a deterministic regression fixture");
  assert(!source.includes("bladeWillHit"), "Handle overlap must never predictively award a future blade cut");
  assert(source.includes("function enterRotatingStick(platformEntity: PlatformEntity): void"), "Bad-angle blade landings must rotate into a stick");
  assert(source.includes("knife.landingPunch = 0.75 + impactSpeed * 0.25;"), "Blade landings must have impact squash");
  assert(source.includes("spawnSlicePieces(slice);"), "A cut must spawn persistent physical halves");
  assert(!source.includes("collapseCutStackRemainder"), "Untouched wall courses must remain intact");
  assert(source.includes("const REFERENCE_WALL_CUT_COURSES = 7;"), "The reference wall payoff must stop after seven physical course cuts");
  assert(source.includes('if (type === "brick") {'), "Brick walls need dedicated intact and split geometry");
  assert(source.includes("interiorColorForSlice(type, stackIndex)"), "Cut brick courses must expose authored interior colors");
  assert(source.includes("spawnScorePopup(position, points);"), "Cuts must show immediate +1 feedback");
  assert(!source.includes("spawnScorePopup(bladeHit.group.position, acceptedHits.length);"), "Wall courses must keep individual +1 feedback");
  assert(source.includes("knife.velocity.z = Math.max(SLICE_FORWARD_SPEED_MIN"), "Cutting must preserve forward travel through the target");
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
